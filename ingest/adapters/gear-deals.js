// Gear-deals adapter — LLM-extracted from shop sale/clearance pages.
//
// Why not Schema.org? Most shop category pages either:
//   - have no JSON-LD at all (evo)
//   - only expose a CollectionPage > ItemList of names+URLs (no prices)
// Getting prices structurally would require fetching each product page —
// expensive across thousands of deals. The LLM reads the rendered HTML the
// way a human would and extracts {title, price, original, off_pct} per card.
//
// Cost: ~$0.005–0.015 per page × ~8 pages × 30 days ≈ $1.20–$3.60/month.

import * as cheerio from 'cheerio';
import { renderPage } from '../render.js';

const ANTHROPIC_API  = 'https://api.anthropic.com/v1/messages';
const OPENROUTER_API = 'https://openrouter.ai/api/v1/chat/completions';

const DEFAULT_MODELS = {
  anthropic:  'claude-haiku-4-5',
  openrouter: 'anthropic/claude-haiku-4.5',
};

// Body cap was 14000 originally. Bumping to 22000 because the markdown
// URL injection adds ~80-150 chars per anchor; with a typical 30-product
// page hosting 60-90 anchors, the original cap was truncating actual
// products on Tactics ski / jenson / ccs and the LLM saw only nav.
// 22000 chars at ~4 chars/token ≈ 5500 input tokens, still well under
// Claude Haiku's 200k context.
const MAX_BODY_CHARS = 22000;
const MIN_BODY_CHARS = 200;

const SYSTEM_PROMPT = `You extract gear deals from shop sale pages. Given the visible text content, return a JSON array of products on sale. Each item MUST have:
- title (string, including brand if visible)
- price (number, current sale price in dollars; null if unknown)
- original (number, regular price in dollars before discount; null if unknown)
- url (absolute URL of the product page — look for URLs in [brackets] adjacent to product titles in the input text; null if no bracketed URL is near the product)
- image (absolute URL of the product photo — look for URLs in [IMG:...] tags adjacent to the product; null if none nearby)
- sport (one of: "snowboard","ski","skate","mtb","bmx" — guess from product name and category)

The page text contains URLs in square brackets right after each linkable element (e.g. "Burton Custom 158 [https://shop.com/burton-custom-158] [IMG:https://cdn.shop.com/burton-custom-158.jpg]"). Match each product to the URL + image bracketed nearest its title.

Only include items that are clearly on sale (have a discount or "sale" indicator). Skip non-sale items, navigation, accessories like screws/wax unless they're a real listed deal. Return up to 30 items max. Return ONLY a JSON array. No prose, no markdown.`;

function pickProvider(env, config) {
  if (config.provider) return config.provider;
  if (env.OPENROUTER_API_KEY) return 'openrouter';
  if (env.ANTHROPIC_API_KEY)  return 'anthropic';
  return null;
}

export async function fetchGearDeals(config, env = process.env) {
  const provider = pickProvider(env, config);
  if (!provider) {
    console.warn('[gear-deals] no LLM provider key (set OPENROUTER_API_KEY or ANTHROPIC_API_KEY), skipping');
    return [];
  }
  const apiKey = provider === 'openrouter' ? env.OPENROUTER_API_KEY : env.ANTHROPIC_API_KEY;
  const model = config.model || DEFAULT_MODELS[provider];

  const out = [];
  for (const target of config.urls || []) {
    const url = typeof target === 'string' ? target : target.url;
    const meta = typeof target === 'object' ? target : {};
    try {
      const deals = await extractFrom(url, meta, { provider, apiKey, model });
      out.push(...deals);
    } catch (err) {
      console.warn(`[gear-deals] ${url}: ${err.message}`);
    }
    await new Promise(r => setTimeout(r, 1500));
  }
  console.info(`[gear-deals] extracted ${out.length} candidate deals`);

  // Pre-display link validation. Many LLM-extracted URLs are wrong: hash
  // anchors, "Sale" landing pages instead of the product, or pages the
  // retailer has already pulled. Hitting each one with a short-timeout
  // request before insert prevents dead links from ever reaching the app.
  // Per-run, this adds ~30-60s on top of the LLM cost, well worth it.
  const validated = await validateLinks(out);
  return validated;
}

async function validateLinks(deals, concurrency = 8) {
  const live = [];
  let dropped = 0;
  let withoutUrl = 0;
  const queue = deals.slice();

  async function worker() {
    while (queue.length) {
      const deal = queue.shift();
      if (!deal.reg_link) {
        // Keep deals that have no URL so the gradient-fallback card at
        // least shows pricing — the marketplace was sometimes empty without
        // them. But mark them so the UI can hide the "View" button.
        withoutUrl++;
        live.push(deal);
        continue;
      }
      const ok = await checkUrl(deal.reg_link);
      if (ok) live.push(deal);
      else dropped++;
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));
  console.info(`[gear-deals] link-check: ${live.length - withoutUrl} live, ${dropped} dead-dropped, ${withoutUrl} without-url-kept`);
  return live;
}

async function checkUrl(url) {
  // Many storefronts (Shopify especially) return 405 to HEAD or 403 with
  // an empty body. Try HEAD first (cheap), fall back to a ranged GET that
  // reads only the first 1KB to confirm 200, then aborts.
  try {
    const headRes = await fetchWithTimeout(url, {
      method: 'HEAD',
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; JamRadarBot/1.0; +https://jamradar.netlify.app)' },
    }, 6000);
    if (headRes.status >= 200 && headRes.status < 400) return true;
    if (headRes.status !== 405 && headRes.status !== 403) return false;
  } catch {
    // fall through to ranged GET
  }
  try {
    const getRes = await fetchWithTimeout(url, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; JamRadarBot/1.0; +https://jamradar.netlify.app)',
        'Range': 'bytes=0-1023',
      },
    }, 8000);
    return getRes.status >= 200 && getRes.status < 400;
  } catch {
    return false;
  }
}

async function fetchWithTimeout(url, opts, ms) {
  // AbortSignal.timeout works in Node 20 but older runtimes don't have it,
  // so use the manual AbortController pattern for portability.
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

async function extractFrom(url, meta, { provider, apiKey, model }) {
  // 1. Render + clean.
  let html;
  try { html = await renderPage(url, { render: !!meta.render }); }
  catch (err) {
    console.warn(`[gear-deals] ${url} → ${err.message}`);
    return [];
  }
  const $ = cheerio.load(html);
  $('script, style, nav, footer, header, aside, form').remove();

  // Convert product anchor tags into markdown links BEFORE stripping. Without
  // this the LLM sees plain text only and can't return URLs, so reg_link ends
  // up null on shops where the markup wraps each product card in <a href>.
  // We only inline link text + href when the link is product-like (anchored
  // to the same shop hostname or a path). Limits to ~100 chars of link text
  // to avoid stuffing the prompt with nav links.
  $('a[href]').each((_, el) => {
    const $a = $(el);
    const href = $a.attr('href') || '';
    const text = $a.text().replace(/\s+/g, ' ').trim();
    if (!text || text.length > 120) return;
    if (/^(sort|filter|login|sign in|cart|wishlist|account|menu|search|view all|see more|next|previous)$/i.test(text)) return;
    if (/#$|^javascript:|^mailto:|^tel:/i.test(href)) return;
    const abs = absoluteUrl(href, url);
    // Look for a product image. Anchors that wrap the whole product card
    // (Shopify) have the <img> inside; others (React/Next product grids)
    // put it in a sibling <img> or <picture>, or use CSS background-image
    // on a div. Walk three places: inside the anchor, the anchor's parent
    // (covers the sibling-picture pattern), and the anchor's first child.
    const imgUrl = findImageNear($a, url);
    const imgTag = imgUrl ? ` [IMG:${imgUrl}]` : '';
    $a.replaceWith(` ${text} [${abs}]${imgTag} `);
  });

  // Try a few candidate containers and keep the LONGEST match — different
  // shops use very different markup (Shopify, custom React, etc.) and the
  // first <main> is often a wrapper around navigation rather than products.
  const candidates = [
    '[class*="product-grid"]',
    '[class*="ProductGrid"]',
    '[class*="product-list"]',
    '[class*="ProductList"]',
    '[class*="collection"]',
    '[class*="Collection"]',
    '[class*="search-results"]',
    '[class*="catalog"]',
    'main',
    'body',
  ];
  let body = '';
  for (const sel of candidates) {
    const t = $(sel).first().text().replace(/\s+/g, ' ').trim();
    if (t.length > body.length) body = t;
    if (body.length > MAX_BODY_CHARS) break;
  }
  if (body.length > MAX_BODY_CHARS) body = body.slice(0, MAX_BODY_CHARS);
  if (body.length < MIN_BODY_CHARS) {
    console.warn(`[gear-deals] ${url} too short (${body.length} chars), skipping`);
    return [];
  }

  // 2. Send to provider.
  const text = provider === 'openrouter'
    ? await callOpenRouter(apiKey, model, body, url)
    : await callAnthropic(apiKey, model, body, url);
  if (!text) return [];

  // 3. Parse — extract first balanced JSON array, ignoring any prose before/after.
  const arrText = extractFirstJsonArray(text);
  if (!arrText) {
    // Treat "no array found" the same as an empty result; the LLM often returns
    // something like "```json\n[]\n```\n\nNo products visible." for blocked pages.
    return [];
  }
  let deals;
  try { deals = JSON.parse(arrText); }
  catch (e) {
    console.warn(`[gear-deals] ${url} → parse error (${e.message}): ${arrText.slice(0, 150)}`);
    return [];
  }
  if (!Array.isArray(deals)) return [];
  if (deals.length === 0) {
    console.info(`[gear-deals] ${url} → 0 deals (page likely blocked or empty)`);
    return [];
  }

  console.info(`[gear-deals] ${url} → ${deals.length} deals extracted`);
  return deals.map(d => normalize(d, url, meta)).filter(Boolean);
}

async function callAnthropic(apiKey, model, body, url) {
  const resp = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model, max_tokens: 4000, system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `Extract sale items from this shop page (URL: ${url}):\n\n${body}` }],
    }),
  });
  if (!resp.ok) {
    console.warn(`[gear-deals/anthropic] HTTP ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
    return null;
  }
  return (await resp.json()).content?.[0]?.text || '';
}

async function callOpenRouter(apiKey, model, body, url) {
  const resp = await fetch(OPENROUTER_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://jamradar.netlify.app',
      'X-Title': 'JamRadar Ingest',
    },
    body: JSON.stringify({
      model, max_tokens: 4000,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: `Extract sale items from this shop page (URL: ${url}):\n\n${body}` },
      ],
    }),
  });
  if (!resp.ok) {
    console.warn(`[gear-deals/openrouter] HTTP ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
    return null;
  }
  return (await resp.json()).choices?.[0]?.message?.content || '';
}

function normalize(d, sourceUrl, meta) {
  const title = (d.title || '').trim();
  if (!title) return null;
  const price    = Number(d.price);
  const original = Number(d.original);
  if (!Number.isFinite(price) || price <= 0) return null;
  const offPct = Number.isFinite(original) && original > price
    ? Math.round((1 - price / original) * 100)
    : null;
  const url = absoluteUrl(d.url, sourceUrl);
  // Image URL the LLM extracted from the [IMG:url] tag in the body. Must be
  // an http(s) URL, not a data: URL or relative path.
  const image = (typeof d.image === 'string' && /^https?:\/\//i.test(d.image))
    ? absoluteUrl(d.image, sourceUrl)
    : null;
  return {
    external_id: stableId(meta.source || `deals:${hostname(sourceUrl)}`, title, price, url),
    source:      meta.source || `deals:${hostname(sourceUrl)}`,
    title,
    shop:        meta.shop || hostname(sourceUrl),
    sport:       d.sport || meta.sport || guessSport(title),
    price,
    original:    Number.isFinite(original) ? original : null,
    off_pct:     offPct,
    poster:      image,                 // product photo when available; gradient fallback otherwise
    reg_link:    url,
    // Scraped from public sale pages — safe to auto-approve so the rider-side
    // Gear tab can read them via the gear_deals_public_read RLS policy.
    status:      'approved',
    raw:         { source: meta.source, listing_url: sourceUrl },
  };
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

// Walk anchor + its parent looking for an actual product image. Different
// shops attach the image differently: inside the anchor (Shopify),
// as a sibling <picture> (React grids), inside a srcset, or as a CSS
// background-image. We try several attribute spellings because lazy-load
// libraries swap them at runtime — by the time Playwright dumps the DOM
// the live `src` may be a placeholder GIF and the real URL is in
// `data-src` / `data-original` / `srcset`.
function findImageNear($a, baseUrl) {
  // Try inside the anchor first, then climb to the parent (covers the
  // common "anchor for the title + sibling figure for the image" pattern).
  const $scopes = [$a, $a.parent()];
  for (const $scope of $scopes) {
    if (!$scope || $scope.length === 0) continue;

    // 1. <img> with any of the common src attributes.
    const $img = $scope.find('img').first();
    if ($img.length) {
      const candidates = [
        $img.attr('src'),
        $img.attr('data-src'),
        $img.attr('data-srcset'),
        $img.attr('srcset'),
        $img.attr('data-original'),
        $img.attr('data-lazy-src'),
        $img.attr('data-image'),
      ].filter(Boolean);
      for (const candidate of candidates) {
        const firstSrc = candidate.split(/[,\s]/)[0];
        if (firstSrc && !firstSrc.startsWith('data:')) {
          return absoluteUrl(firstSrc, baseUrl);
        }
      }
    }

    // 2. <picture><source srcset="..."> — common on Patagonia / Arc'teryx.
    const $source = $scope.find('source[srcset], source[data-srcset]').first();
    if ($source.length) {
      const srcset = $source.attr('srcset') || $source.attr('data-srcset') || '';
      const firstSrc = srcset.split(/[,\s]/)[0];
      if (firstSrc && !firstSrc.startsWith('data:')) {
        return absoluteUrl(firstSrc, baseUrl);
      }
    }

    // 3. CSS background-image on the anchor or descendant. Many React product
    // grids render the photo as a styled div, not an <img>.
    const $styled = $scope.find('[style*="background-image"]').first();
    const $check = $styled.length ? $styled : $scope;
    const style = $check.attr('style') || '';
    const m = style.match(/background(?:-image)?\s*:\s*url\(["']?([^"')]+)["']?\)/i);
    if (m && m[1] && !m[1].startsWith('data:')) {
      return absoluteUrl(m[1], baseUrl);
    }
  }
  return '';
}

function absoluteUrl(href, base) {
  if (!href) return null;
  try { return new URL(href, base).toString(); }
  catch { return href; }
}
function hostname(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); }
  catch { return 'unknown'; }
}
function stableId(prefix, title, price, url) {
  // Normalize so casing / punctuation drift between runs doesn't create
  // duplicate rows of the same product. Price is folded in so a stale-price
  // re-extraction lands as a new row instead of silently mutating a good one.
  // URL path is folded in so size/color variants of the same product
  // (which the LLM often returns with identical titles + prices) don't
  // collide on the (source, external_id) unique constraint and crash the
  // upsert with "ON CONFLICT DO UPDATE command cannot affect row a second
  // time."
  const t = String(title || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const p = Number.isFinite(price) ? Math.round(price * 100) : 0; // cents → integer
  let urlPath = '';
  try { urlPath = url ? new URL(url).pathname : ''; } catch { urlPath = String(url || ''); }
  const key = `${t}|${p}|${urlPath}`;
  let h = 0;
  for (let i = 0; i < key.length; i++) h = ((h << 5) - h) + key.charCodeAt(i);
  return `${prefix}::${(h >>> 0).toString(36)}`;
}
function guessSport(text) {
  const lower = (text || '').toLowerCase();
  if (/snowboard|board|binding/.test(lower)) return 'snowboard';
  if (/\bski\b|skis|skiing/.test(lower)) return 'ski';
  if (/skate|deck|trucks/.test(lower)) return 'skate';
  if (/mtb|mountain bike/.test(lower)) return 'mtb';
  if (/bmx/.test(lower)) return 'bmx';
  return 'snowboard';
}
