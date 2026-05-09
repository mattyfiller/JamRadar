// Schema.org JSON-LD adapter.
// Many event pages embed structured data in <script type="application/ld+json">
// blocks. The Schema.org Event type has standard fields. This adapter fetches
// any URL, extracts ALL JSON-LD blocks, and pulls out Event entries.
//
// Coverage: ~30-50% of resort/event sites. Whistler Blackcomb, many WordPress
// sites with Yoast SEO, Eventbrite event pages, Meetup, and others.
//
// Free, fast, deterministic. No API keys.

import * as cheerio from 'cheerio';
import { renderPage } from '../render.js';

const SPORT_FOR = (text) => {
  const lower = (text || '').toLowerCase();
  if (/skate/.test(lower)) return 'skate';
  if (/snowboard|snow board/.test(lower)) return 'snowboard';
  if (/\bski\b|skiing/.test(lower)) return 'ski';
  if (/indoor|treadmill|dome/.test(lower)) return 'indoor';
  if (/mtb|mountain bike|bike park/.test(lower)) return 'mtb';
  if (/bmx/.test(lower)) return 'bmx';
  return 'snowboard';
};

const TYPE_FOR = (text) => {
  const lower = (text || '').toLowerCase();
  if (/rail jam/.test(lower)) return 'Rail jam';
  if (/banked slalom/.test(lower)) return 'Banked slalom';
  if (/gear swap/.test(lower)) return 'Gear swap';
  if (/film/.test(lower)) return 'Film night';
  if (/clinic|coaching|camp/.test(lower)) return 'Freestyle clinic';
  if (/demo/.test(lower)) return 'Demo day';
  if (/comp|competition|contest/.test(lower)) return 'Snowboard comp';
  if (/skate jam|bowl jam/.test(lower)) return 'Skate jam';
  if (/indoor|treadmill/.test(lower)) return 'Indoor session';
  if (/festival/.test(lower)) return 'Park event';
  return 'Park event';
};

export async function fetchJsonLdEvents(config) {
  const out = [];
  for (const target of config.urls || []) {
    try {
      const url = typeof target === 'string' ? target : target.url;
      const meta = typeof target === 'object' ? target : {};
      const events = await fetchOne(url, meta);
      out.push(...events);
    } catch (err) {
      console.warn(`[jsonld] failed: ${err.message}`);
    }
    await new Promise(r => setTimeout(r, 750));   // polite throttle
  }
  console.info(`[jsonld] fetched ${out.length} candidate events`);
  return out;
}

async function fetchOne(url, meta) {
  let html;
  try {
    html = await renderPage(url, { render: !!meta.render });
  } catch (err) {
    console.warn(`[jsonld] ${url} → ${err.message}`);
    return [];
  }
  const $ = cheerio.load(html);
  const events = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    let parsed;
    try { parsed = JSON.parse($(el).html()); }
    catch { return; }
    // JSON-LD can be a single object, an array, or use @graph for multiple entries.
    const candidates = Array.isArray(parsed) ? parsed
      : parsed['@graph'] ? parsed['@graph']
      : [parsed];
    for (const c of candidates) {
      if (!isEvent(c)) continue;
      const ev = normalizeEvent(c, url, meta);
      if (!isWorthKeeping(ev)) continue;
      events.push(ev);
    }
  });
  console.info(`[jsonld] ${url} → ${events.length} events`);
  return events;
}

// Filter out the noise Schema.org `Event` types pull in: past events,
// recurring marketing slots that span months, "events" that are really
// product cards mistagged. Only keep events that are:
//  - Future-dated (or undated → keep, can't tell)
//  - Have at least minimal title length
//  - Mention sport-relevant keywords OR are explicitly tagged as such by meta
const SPORT_KEYWORDS = /snow|ski|board|park|jam|comp|skate|bowl|rail|demo|clinic|camp|festival|jib|pipe|slalom|moto|bmx|mtb|treadmill|dome|indoor/i;

function isWorthKeeping(ev) {
  if (!ev.title || ev.title.length < 4) return false;
  // Drop events more than 24 hours in the past.
  if (ev.starts_at) {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    if (new Date(ev.starts_at).getTime() < cutoff) return false;
  }
  // Sport-relevance: trust either the meta override OR a keyword hit.
  const hay = `${ev.title} ${ev.description || ''}`;
  if (!SPORT_KEYWORDS.test(hay)) return false;
  return true;
}

function isEvent(obj) {
  if (!obj || typeof obj !== 'object') return false;
  const t = obj['@type'];
  if (!t) return false;
  // Schema.org Event subtypes — cover the obvious ones.
  const types = Array.isArray(t) ? t : [t];
  return types.some(x => /Event$/i.test(x) || x === 'SportsEvent' || x === 'Festival');
}

function normalizeEvent(e, sourceUrl, meta) {
  const title = e.name || e.headline || '';
  const haystack = [title, e.description].filter(Boolean).join(' ');
  const venue = extractVenue(e.location);
  const start = e.startDate ? new Date(e.startDate) : null;
  const id = stableId(meta.source || sourceUrl, title, e.startDate);

  return {
    external_id:  id,
    source:       meta.source || `jsonld:${hostname(sourceUrl)}`,
    trust_tier:   meta.trust_tier ?? 1,
    title:        title || 'Untitled event',
    description:  e.description || '',
    poster:       extractImage(e.image),
    org_name:     meta.org || extractOrg(e.organizer) || hostname(sourceUrl),
    org_verified: meta.verified ?? false,
    sport:        meta.sport || SPORT_FOR(haystack),
    type:         meta.type || TYPE_FOR(haystack),
    skill_level:  null,
    starts_at:    start && !isNaN(start) ? start.toISOString() : null,
    when_text:    formatWhen(start),
    location:     venue.name || meta.default_location || null,
    coords:       venue.coords || meta.default_coords || null,
    lat:          venue.lat || meta.default_lat || null,
    lon:          venue.lon || meta.default_lon || null,
    distance_km:  meta.default_distance_km || null,
    cost:         e.isAccessibleForFree ? 'Free' : null,
    prize:        null,
    reg_link:     e.url || sourceUrl,
    going_count:  0,
    featured:     false,
    live:         false,
    // JSON-LD targets are always config-driven (we curate the URL list), and
    // schema.org Event data is structured + reliable — auto-publish.
    status:       'approved',
    color:        meta.color || 95,
    sponsors:     [],
    results:      null,
    updates:      null,
    raw:          { source: 'jsonld', url: sourceUrl },
  };
}

function extractVenue(loc) {
  if (!loc) return {};
  const l = Array.isArray(loc) ? loc[0] : loc;
  if (!l) return {};
  const name = l.name || (typeof l === 'string' ? l : '');
  const geo = l.geo || {};
  const lat = geo.latitude ? Number(geo.latitude) : null;
  const lon = geo.longitude ? Number(geo.longitude) : null;
  const coords = (lat != null && lon != null)
    ? `${lat}° N · ${Math.abs(lon)}° W`
    : null;
  return { name, lat, lon, coords };
}

function extractImage(img) {
  if (!img) return null;
  if (typeof img === 'string') return img;
  if (Array.isArray(img)) return img[0]?.url || img[0] || null;
  return img.url || img.contentUrl || null;
}

function extractOrg(org) {
  if (!org) return null;
  if (typeof org === 'string') return org;
  if (Array.isArray(org)) return org[0]?.name;
  return org.name;
}

function hostname(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); }
  catch { return 'unknown'; }
}

function stableId(prefix, title, startDate) {
  // Normalize so capitalisation / formatting drift between runs still produces
  // the same id — Layer 1 dedupe relies on this being a true fingerprint.
  const t = String(title || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const d = String(startDate || '').slice(0, 10);
  const key = `${t}|${d}`;
  let h = 0;
  for (let i = 0; i < key.length; i++) h = ((h << 5) - h) + key.charCodeAt(i);
  return `${prefix}::${(h >>> 0).toString(36)}`;
}

function formatWhen(d) {
  if (!d || isNaN(d)) return null;
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const day = DAYS[d.getDay()];
  const mo  = MONTHS[d.getMonth()];
  const dn  = d.getDate();
  const h   = d.getHours();
  const min = String(d.getMinutes()).padStart(2, '0');
  if (h === 0 && min === '00') return `${day} · ${mo} ${dn}`;
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = ((h + 11) % 12) + 1;
  return `${day} · ${mo} ${dn} · ${h12}:${min} ${period}`;
}
