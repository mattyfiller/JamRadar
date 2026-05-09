// LLM-assisted event extraction.
// Pluggable: works with EITHER Anthropic's API directly OR OpenRouter
// (OpenAI-compatible surface that proxies to Claude/GPT/Llama/etc.).
//
// Config-driven. Falls back to OpenRouter automatically when:
//   OPENROUTER_API_KEY is set AND ANTHROPIC_API_KEY is not.
// Direct Anthropic when ANTHROPIC_API_KEY is set.
//
// Per-page cost is roughly the same either way (~$0.005–$0.01 with Haiku).

import * as cheerio from 'cheerio';
import { renderPage } from '../render.js';

const ANTHROPIC_API  = 'https://api.anthropic.com/v1/messages';
const OPENROUTER_API = 'https://openrouter.ai/api/v1/chat/completions';

// Default models per provider. Override with `config.llm.model`.
const DEFAULT_MODELS = {
  anthropic:  'claude-haiku-4-5',
  openrouter: 'anthropic/claude-haiku-4.5',
};

const MAX_BODY_CHARS = 12000;
const MIN_BODY_CHARS = 100;          // below this is almost certainly an SPA shell

const SYSTEM_PROMPT = `You extract events from web pages. Given the visible text content of a page, return a JSON array of events. Each event MUST have:
- title (string)
- date (ISO 8601 datetime if known, or null)
- venue (string or null)
- description (short string, max 200 chars)
- type (one of: "Rail jam","Park event","Ski comp","Snowboard comp","Banked slalom","Demo day","Freestyle clinic","Indoor session","Skate jam","Gear swap","Film night")
- sport (one of: "snowboard","ski","skate","indoor","mtb","bmx")

Only include real upcoming events. Skip recap pages, archives, navigation. If no events, return [].
Return ONLY a JSON array. No prose, no markdown, no explanation.`;

function pickProvider(env, config) {
  if (config.provider) return config.provider;
  if (env.OPENROUTER_API_KEY) return 'openrouter';
  if (env.ANTHROPIC_API_KEY)  return 'anthropic';
  return null;
}

export async function fetchLLMEvents(config, env) {
  const provider = pickProvider(env, config);
  if (!provider) {
    console.warn('[llm] no provider key (set OPENROUTER_API_KEY or ANTHROPIC_API_KEY), skipping');
    return [];
  }
  const apiKey = provider === 'openrouter' ? env.OPENROUTER_API_KEY : env.ANTHROPIC_API_KEY;
  const model = config.model || DEFAULT_MODELS[provider];
  console.info(`[llm] using ${provider} / ${model}`);

  const out = [];
  for (const target of config.urls || []) {
    const url = typeof target === 'string' ? target : target.url;
    const meta = typeof target === 'object' ? target : {};
    try {
      const events = await extractFrom(url, meta, { provider, apiKey, model });
      out.push(...events);
    } catch (err) {
      console.warn(`[llm] ${url}: ${err.message}`);
    }
    await new Promise(r => setTimeout(r, 1500));
  }
  console.info(`[llm] extracted ${out.length} candidate events`);
  return out;
}

async function extractFrom(url, meta, { provider, apiKey, model }) {
  // 1. Fetch + clean the page (render via Playwright if configured).
  let html;
  try {
    html = await renderPage(url, { render: !!meta.render });
  } catch (err) {
    console.warn(`[llm] ${url} → ${err.message}`);
    return [];
  }
  const $ = cheerio.load(html);
  $('script, style, nav, footer, header, aside, form').remove();
  let body = $('main, article, [class*="event"], body').first().text();
  body = body.replace(/\s+/g, ' ').trim();
  if (body.length > MAX_BODY_CHARS) body = body.slice(0, MAX_BODY_CHARS);
  if (body.length < MIN_BODY_CHARS) {
    console.warn(`[llm] ${url} too short (${body.length} chars) — likely a JS SPA, skipping`);
    return [];
  }

  // 2. Send to the chosen provider.
  const text = provider === 'openrouter'
    ? await callOpenRouter(apiKey, model, body, url)
    : await callAnthropic(apiKey, model, body, url);
  if (!text) return [];

  // 3. Parse — extract the first balanced JSON array. Tolerates markdown
  // fences, leading/trailing prose, and "[]\n\nNo events visible" answers.
  const arrText = extractFirstJsonArray(text);
  if (!arrText) return [];
  let events;
  try { events = JSON.parse(arrText); }
  catch (e) {
    console.warn(`[llm] ${url} → parse error (${e.message}): ${arrText.slice(0, 200)}`);
    return [];
  }
  if (!Array.isArray(events)) return [];
  console.info(`[llm] ${url} → ${events.length} events extracted`);
  return events.map(e => normalizeLLMEvent(e, url, meta));
}

// Walk forward from the first `[` and return the substring that ends at the
// matching `]`. Handles prose before/after, code fences, and quoted strings
// that contain bracket characters. Returns null if no balanced array exists.
function extractFirstJsonArray(s) {
  const start = s.indexOf('[');
  if (start === -1) return null;
  let depth = 0, inString = false, escape = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (escape) { escape = false; continue; }
    if (inString) {
      if (c === '\\') escape = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') inString = true;
    else if (c === '[') depth++;
    else if (c === ']') {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  return null;
}

async function callAnthropic(apiKey, model, body, url) {
  const resp = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `Extract events from this page (URL: ${url}):\n\n${body}` }],
    }),
  });
  if (!resp.ok) {
    const err = await resp.text();
    console.warn(`[llm/anthropic] HTTP ${resp.status}: ${err.slice(0, 200)}`);
    return null;
  }
  const json = await resp.json();
  return json.content?.[0]?.text || '';
}

async function callOpenRouter(apiKey, model, body, url) {
  const resp = await fetch(OPENROUTER_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      // OpenRouter recommends these for analytics/abuse-protection scoring.
      'HTTP-Referer': 'https://jamradar.netlify.app',
      'X-Title': 'JamRadar Ingest',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4000,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: `Extract events from this page (URL: ${url}):\n\n${body}` },
      ],
    }),
  });
  if (!resp.ok) {
    const err = await resp.text();
    console.warn(`[llm/openrouter] HTTP ${resp.status}: ${err.slice(0, 200)}`);
    return null;
  }
  const json = await resp.json();
  return json.choices?.[0]?.message?.content || '';
}

function normalizeLLMEvent(e, url, meta) {
  const start = e.date ? new Date(e.date) : null;
  // Config-driven sources (meta.org set) come from a hand-curated resort
  // events page — bump trust to tier 1 so the index pipeline auto-approves
  // them. Ad-hoc LLM extractions (no meta.org) stay at tier 0 / pending.
  const isCurated = !!meta.org;
  return {
    external_id:  stableId(meta.source || `llm:${hostname(url)}`, e.title, e.date),
    source:       meta.source || `llm:${hostname(url)}`,
    trust_tier:   isCurated ? 1 : 0,
    title:        e.title || 'Untitled event',
    description:  e.description || '',
    poster:       null,
    org_name:     meta.org || hostname(url),
    org_verified: meta.verified ?? false,
    sport:        e.sport || meta.sport || 'snowboard',
    type:         e.type  || meta.type  || 'Park event',
    skill_level:  null,
    starts_at:    start && !isNaN(start) ? start.toISOString() : null,
    when_text:    formatWhen(start),
    location:     e.venue || meta.default_location || null,
    coords:       meta.default_coords || null,
    lat:          meta.default_lat || null,
    lon:          meta.default_lon || null,
    distance_km:  meta.default_distance_km || null,
    cost:         null,
    prize:        null,
    reg_link:     url,
    going_count:  0,
    featured:     false,
    live:         false,
    // Curated resort feeds → publish straight to Discover. Ad-hoc URLs stay
    // pending so the admin can vet them.
    status:       isCurated ? 'approved' : 'pending',
    color:        meta.color || 95,
    sponsors:     [],
    results:      null,
    updates:      null,
    raw:          { source: 'llm', url },
  };
}

function hostname(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); }
  catch { return 'unknown'; }
}
function stableId(prefix, title, date) {
  // Normalize inputs so re-runs produce the same id even when the LLM tweaks
  // capitalization or returns different date formats. This is what makes the
  // Layer 1 (source + external_id) dedupe path actually catch repeat events
  // instead of letting them leak through to the noisier Layer 2 fuzzy matcher.
  const t = String(title || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const d = String(date || '').slice(0, 10);   // YYYY-MM-DD only
  const key = `${t}|${d}`;
  let h = 0;
  for (let i = 0; i < key.length; i++) h = ((h << 5) - h) + key.charCodeAt(i);
  return `${prefix}::${(h >>> 0).toString(36)}`;
}
function formatWhen(d) {
  if (!d || isNaN(d)) return null;
  const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const period = d.getHours() >= 12 ? 'PM' : 'AM';
  const h12 = ((d.getHours() + 11) % 12) + 1;
  const min = String(d.getMinutes()).padStart(2, '0');
  if (d.getHours() === 0 && d.getMinutes() === 0) {
    return `${DAYS[d.getDay()]} · ${MONTHS[d.getMonth()]} ${d.getDate()}`;
  }
  return `${DAYS[d.getDay()]} · ${MONTHS[d.getMonth()]} ${d.getDate()} · ${h12}:${min} ${period}`;
}
