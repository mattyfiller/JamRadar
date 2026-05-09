// Generic CSS-selector HTML scraper.
// For sites that don't expose JSON-LD or iCal — we configure per-site CSS
// selectors to extract event cards. Each site = one config block in
// config.json under html_scrapers[].
//
// Robust to missing fields, returns null where data isn't found rather than
// crashing the whole adapter run.

import * as cheerio from 'cheerio';
import { renderPage } from '../render.js';

export async function fetchHtmlScrapedEvents(config) {
  const out = [];
  for (const site of config.sites || []) {
    try {
      const events = await scrapeOne(site);
      out.push(...events);
    } catch (err) {
      console.warn(`[html-scraper:${site.name}] failed: ${err.message}`);
    }
    await new Promise(r => setTimeout(r, 1000));
  }
  console.info(`[html-scraper] fetched ${out.length} candidate events`);
  return out;
}

async function scrapeOne(site) {
  let html;
  try {
    html = await renderPage(site.url, { render: !!site.render });
  } catch (err) {
    console.warn(`[html-scraper:${site.name}] ${err.message}`);
    return [];
  }
  const $ = cheerio.load(html);
  const events = [];
  $(site.selectors.card).each((_, el) => {
    const $el = $(el);
    const title = pick($, $el, site.selectors.title);
    if (!title) return;
    const dateRaw = pick($, $el, site.selectors.date);
    const desc = pick($, $el, site.selectors.description);
    const link = pickAttr($, $el, site.selectors.link, 'href') || site.url;
    const img  = pickAttr($, $el, site.selectors.image, 'src');
    const venue = pick($, $el, site.selectors.venue);
    const cost  = pick($, $el, site.selectors.cost);

    const start = parseLooseDate(dateRaw);
    events.push({
      external_id:  stableId(site.name, title, dateRaw),
      source:       `scraper:${site.name}`,
      trust_tier:   site.trust_tier ?? 1,
      title,
      description:  desc || '',
      poster:       img ? absoluteUrl(img, site.url) : null,
      org_name:     site.org || site.name,
      org_verified: site.verified ?? false,
      sport:        site.sport || guessSport(title + ' ' + (desc || '')),
      type:         site.type || guessType(title + ' ' + (desc || '')),
      skill_level:  null,
      starts_at:    start ? start.toISOString() : null,
      when_text:    formatWhen(start) || dateRaw,
      location:     venue || site.default_location || null,
      coords:       site.default_coords || null,
      lat:          site.default_lat || null,
      lon:          site.default_lon || null,
      distance_km:  site.default_distance_km || null,
      cost:         cost || null,
      prize:        null,
      reg_link:     absoluteUrl(link, site.url),
      going_count:  0,
      featured:     false,
      live:         false,
      // CSS-selector scrapers are config-driven (we wrote the selectors) → auto-approve.
      status:       'approved',
      color:        site.color || 95,
      sponsors:     [],
      results:      null,
      updates:      null,
      raw:          { scraper: site.name },
    });
  });
  console.info(`[html-scraper:${site.name}] ${events.length} events from ${site.url}`);
  return events;
}

function pick($, $el, sel) {
  if (!sel) return null;
  const found = $el.find(sel).first();
  return found.text()?.trim() || null;
}
function pickAttr($, $el, sel, attr) {
  if (!sel) return null;
  return $el.find(sel).first().attr(attr) || null;
}
function absoluteUrl(href, base) {
  if (!href) return null;
  try { return new URL(href, base).toString(); }
  catch { return href; }
}

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
const guessSport = SPORT_FOR;
const guessType = TYPE_FOR;

function parseLooseDate(raw) {
  if (!raw) return null;
  // Try native Date.parse first.
  const d = new Date(raw);
  if (!isNaN(d.getTime())) return d;
  // Fallback: month-name + day-number.
  const MONTHS = { jan:0, feb:1, mar:2, apr:3, may:4, jun:5, jul:6, aug:7, sep:8, oct:9, nov:10, dec:11 };
  const m = raw.toLowerCase().match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})/);
  if (m) {
    const yearGuess = (new Date()).getFullYear();
    return new Date(Date.UTC(yearGuess, MONTHS[m[1]], parseInt(m[2], 10)));
  }
  return null;
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

function stableId(prefix, title, dateRaw) {
  // Normalize so casing / whitespace drift doesn't bust Layer 1 dedupe.
  const t = String(title || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const d = String(dateRaw || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const key = `${t}|${d}`;
  let h = 0;
  for (let i = 0; i < key.length; i++) h = ((h << 5) - h) + key.charCodeAt(i);
  return `${prefix}::${(h >>> 0).toString(36)}`;
}
