// JamRadar ingest — fuzzy dedupe.
// Mirrors the algorithm in store.jsx so client + server agree on what counts as
// a duplicate. Anything ≥ 0.85 → auto-skip (we already have it); 0.5–0.85 →
// queue for admin review in `pending_merges`; < 0.5 → insert as new.

const AUTO_SKIP_THRESHOLD = 0.85;
// 0.5 produced lots of false positives where the LLM-extracted candidate just
// happened to share org+sport+type with an unrelated existing event. 0.65
// keeps the queue useful without flooding admins with noise.
const MERGE_QUEUE_THRESHOLD = 0.65;

const MONTHS = {
  jan:'01', feb:'02', mar:'03', apr:'04', may:'05', jun:'06',
  jul:'07', aug:'08', sep:'09', oct:'10', nov:'11', dec:'12',
};

function cleanText(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractDayKey(when) {
  // "Sat · Nov 14 · 7:00 PM" → "1114"
  // ISO date "2026-11-14T19:00:00Z" → "1114"
  if (!when) return '';
  const isoMatch = String(when).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return isoMatch[2] + isoMatch[3];
  const m = String(when).toLowerCase().match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})/);
  return m ? MONTHS[m[1]] + String(parseInt(m[2], 10)).padStart(2, '0') : '';
}

function jaccard(a, b) {
  const A = new Set(a.filter(w => w.length > 2));
  const B = new Set(b.filter(w => w.length > 2));
  if (!A.size || !B.size) return 0;
  const intersect = [...A].filter(x => B.has(x)).length;
  const union = new Set([...A, ...B]).size;
  return union === 0 ? 0 : intersect / union;
}

function normalize(e) {
  return {
    id:    e.id,
    title: cleanText(e.title || ''),
    venue: cleanText(e.location || e.venue || ''),
    org:   cleanText(e.org || e.org_name || ''),
    sport: e.sport || '',
    type:  e.type || '',
    when:  extractDayKey(e.when || e.when_text || e.starts_at || ''),
  };
}

function score(a, b) {
  const sameDate = a.when && b.when && a.when === b.when;
  const bothHaveDates = a.when && b.when;
  const titleSim = jaccard(a.title.split(' '), b.title.split(' '));
  const venueSim = a.venue && b.venue
    ? (a.venue === b.venue ? 1 : jaccard(a.venue.split(' '), b.venue.split(' ')))
    : 0;
  const sameType  = a.type  && b.type  && a.type  === b.type;
  const sameOrg   = a.org   && b.org   && a.org   === b.org;
  const sameSport = a.sport && b.sport && a.sport === b.sport;

  let s = 0;
  if (sameDate)   s += 0.4;
  s += titleSim * 0.3;
  s += venueSim * 0.15;
  if (sameOrg)    s += 0.1;
  if (sameType)   s += 0.05;
  if (sameSport)  s += 0.05;

  if (!sameDate && titleSim < 0.3) return Math.min(s, 0.4);
  // When both events have dates and the dates DON'T match, treat them as
  // recurring instances (e.g. "Yoga in the Wild" every Sunday) rather than
  // duplicates. Cap the score below the merge-queue threshold so they get
  // inserted as separate events instead of stalling in admin review.
  if (bothHaveDates && !sameDate) return Math.min(s, 0.6);
  return Math.min(s, 1.0);
}

/**
 * Compare a candidate event to an array of existing events. Returns the best
 * match (one event + score) or null if nothing crosses MERGE_QUEUE_THRESHOLD.
 */
export function findBestMatch(candidate, existing) {
  if (!candidate?.title) return null;
  const cand = normalize(candidate);
  let best = null;
  for (const e of existing) {
    const s = score(cand, normalize(e));
    if (s >= MERGE_QUEUE_THRESHOLD && (!best || s > best.score)) {
      best = { event: e, score: s };
    }
  }
  return best;
}

export const THRESHOLDS = {
  AUTO_SKIP: AUTO_SKIP_THRESHOLD,
  MERGE_QUEUE: MERGE_QUEUE_THRESHOLD,
};
