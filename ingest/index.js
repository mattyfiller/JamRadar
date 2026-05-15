// JamRadar — daily ingest runner.
// Pulls candidate events from each enabled adapter, dedupes against the
// existing `events` table, then either inserts new ones, queues
// medium-confidence matches in `pending_merges`, or skips outright.
//
// Required env vars (set as GitHub Actions secrets):
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY    (NOT the anon key — service-role bypasses RLS)
//   EVENTBRITE_TOKEN             (optional, only if Eventbrite adapter enabled)

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

import { fetchEventbriteEvents } from './adapters/eventbrite.js';
import { fetchICalEvents } from './adapters/ical.js';
import { fetchRedditEvents } from './adapters/reddit.js';
import { fetchJsonLdEvents } from './adapters/jsonld.js';
import { fetchHtmlScrapedEvents } from './adapters/html-scraper.js';
import { fetchLLMEvents } from './adapters/llm.js';
import { fetchGearDeals } from './adapters/gear-deals.js';
import { findBestMatch, THRESHOLDS } from './dedupe.js';
import { shutdownRender } from './render.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(readFileSync(join(__dirname, 'config.json'), 'utf8'));

const DRY_RUN = process.env.DRY_RUN === '1';

async function main() {
  const t0 = Date.now();
  const env = process.env;
  console.info(`[ingest] starting at ${new Date().toISOString()} (DRY_RUN=${DRY_RUN})`);

  // 1. Connect to Supabase with the service-role key (bypasses RLS).
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[ingest] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
    process.exit(1);
  }
  const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
    realtime: { transport: ws },   // Node 20 needs an explicit WebSocket
  });

  try {
    return await runPipeline(sb, env, t0);
  } finally {
    // Whether the pipeline crashed mid-run or finished cleanly, always shut
    // the headless browser down so the GitHub Action exits within seconds
    // instead of hanging until its timeout.
    await shutdownRender();
  }
}

async function runPipeline(sb, env, t0) {

  // 2. Load existing events for dedupe comparison.
  // Supabase capped each REST response at 1000 rows by default; the next
  // run-of-the-mill production-sized DB silently misses dedupe matches past
  // row 1001. Page through 1000 at a time until we've drained the table.
  // Also drop archived rows — they're not eligible dedupe targets and they
  // bloat the in-memory comparison set.
  const existing = [];
  const PAGE = 1000;
  for (let offset = 0; ; offset += PAGE) {
    const { data: page, error: loadErr } = await sb
      .from('events')
      .select('id, title, location, org_name, sport, type, when_text, starts_at, source, external_id, status')
      .neq('status', 'archived')
      .range(offset, offset + PAGE - 1);
    if (loadErr) {
      console.error('[ingest] failed to load existing events:', loadErr.message);
      process.exit(1);
    }
    if (!page || page.length === 0) break;
    existing.push(...page);
    if (page.length < PAGE) break;
  }
  console.info(`[ingest] ${existing.length} existing events loaded for dedupe`);

  // Map existing for the source-identity Layer-1 dedupe (deterministic).
  const existingBySourceId = new Map();
  for (const e of existing) {
    if (e.source && e.external_id) {
      existingBySourceId.set(`${e.source}::${e.external_id}`, e);
    }
  }

  // 3. Run each enabled adapter. Order matters for dedupe quality:
  //    high-trust deterministic feeds first (Eventbrite, iCal, JSON-LD,
  //    HTML scraper), then noisier ones (Reddit, LLM) — so by the time
  //    Reddit/LLM candidates are scored, we've already loaded the cleaner
  //    versions of the same events.
  const candidates = [];
  if (config.eventbrite?.enabled) {
    candidates.push(...await fetchEventbriteEvents(config.eventbrite, env));
  }
  if (config.ical?.enabled) {
    candidates.push(...await fetchICalEvents(config.ical));
  }
  if (config.jsonld?.enabled) {
    candidates.push(...await fetchJsonLdEvents(config.jsonld));
  }
  if (config.html_scrapers?.enabled) {
    candidates.push(...await fetchHtmlScrapedEvents(config.html_scrapers));
  }
  if (config.reddit?.enabled) {
    candidates.push(...await fetchRedditEvents(config.reddit));
  }
  if (config.llm?.enabled) {
    candidates.push(...await fetchLLMEvents(config.llm, env));
  }
  console.info(`[ingest] ${candidates.length} total candidates from all adapters`);

  // Internal dedupe — same source listed the same external_id twice in one
  // run (e.g. a resort site lists an event multiple times on the same page).
  // Keep the first occurrence; drop the rest so we don't trip the unique
  // constraint on (source, external_id).
  const seenInRun = new Set();
  const beforeDedup = candidates.length;
  const uniqueCandidates = [];
  for (const c of candidates) {
    const key = `${c.source}::${c.external_id || ''}`;
    if (c.external_id && seenInRun.has(key)) continue;
    if (c.external_id) seenInRun.add(key);
    uniqueCandidates.push(c);
  }
  if (uniqueCandidates.length !== beforeDedup) {
    console.info(`[ingest] dropped ${beforeDedup - uniqueCandidates.length} intra-run duplicates`);
  }
  candidates.length = 0;
  candidates.push(...uniqueCandidates);

  // Gear deals — own table, own write path, own dedupe key.
  let dealsWritten = 0, dealsFailed = 0;
  if (config.gear_deals?.enabled) {
    const rawDeals = await fetchGearDeals(config.gear_deals);

    // Intra-run dedupe — the LLM occasionally returns the same product twice
    // from one page (size/color variants the normalizer can't distinguish),
    // or two pages from the same shop emit colliding stable_ids. Postgres
    // refuses to UPDATE the same row twice in one INSERT, so a single dupe
    // would sink the whole batch. Keep the first occurrence per
    // (source, external_id) and drop the rest.
    const seenDeals = new Set();
    const deals = [];
    for (const d of rawDeals) {
      const key = `${d.source}::${d.external_id || ''}`;
      if (d.external_id && seenDeals.has(key)) continue;
      if (d.external_id) seenDeals.add(key);
      deals.push(d);
    }
    if (deals.length !== rawDeals.length) {
      console.info(`[ingest] gear_deals: dropped ${rawDeals.length - deals.length} intra-run duplicates`);
    }

    if (deals.length && !DRY_RUN) {
      const BATCH = 50;
      for (let i = 0; i < deals.length; i += BATCH) {
        const chunk = deals.slice(i, i + BATCH);
        const { error } = await sb.from('gear_deals').upsert(chunk, {
          onConflict: 'source,external_id',
        });
        if (error) {
          console.warn(`[ingest] gear_deals batch ${i} failed: ${error.message} — salvaging per row`);
          // Per-row salvage: one collision shouldn't kill 49 good rows.
          for (const row of chunk) {
            const { error: rowErr } = await sb.from('gear_deals').upsert([row], {
              onConflict: 'source,external_id',
            });
            if (rowErr) dealsFailed++;
            else dealsWritten++;
          }
        } else {
          dealsWritten += chunk.length;
        }
      }
    }
    console.info(`[ingest] gear deals: ${dealsWritten} written, ${dealsFailed} failed`);
  }

  // 4. Classify each candidate: insert / update / queue-merge / skip.
  let inserted = 0, updated = 0, queued = 0, skipped = 0;
  const inserts = [];
  const upserts = [];
  const merges  = [];

  for (const cand of candidates) {
    // Layer 1 — same source + external_id → upsert in place, never duplicate.
    const sourceKey = `${cand.source}::${cand.external_id}`;
    if (existingBySourceId.has(sourceKey)) {
      upserts.push(cand);
      updated++;
      continue;
    }

    // Layer 2 — fuzzy match against everything we already have.
    const match = findBestMatch(cand, existing);
    if (!match) {
      inserts.push(cand);
      inserted++;
      continue;
    }
    if (match.score >= THRESHOLDS.AUTO_SKIP) {
      // Identical enough to ignore — treat as duplicate of existing event.
      skipped++;
      continue;
    }
    // Medium confidence (0.5–0.85) → queue for admin review.
    merges.push({
      candidate: cand,
      candidate_source: cand.source,
      match_event_id: match.event.id,
      score: match.score,
    });
    queued++;
  }

  // 5. Write to Supabase (skipped under DRY_RUN).
  if (DRY_RUN) {
    console.info(`[ingest] DRY_RUN — would insert ${inserted}, upsert ${updated}, queue ${queued}, skip ${skipped}`);
    return;
  }

  // Resilient writes: chunk into batches and use upsert so a single bad row
  // doesn't sink the whole batch. Track success/failure per chunk.
  const BATCH_SIZE = 50;
  let actualInserted = 0, actualFailed = 0;

  // Combine inserts + upserts — both are upserts on (source, external_id) anyway.
  const allWrites = [...inserts, ...upserts];
  for (let i = 0; i < allWrites.length; i += BATCH_SIZE) {
    const chunk = allWrites.slice(i, i + BATCH_SIZE);
    const { error } = await sb.from('events').upsert(chunk, {
      onConflict: 'source,external_id',
      ignoreDuplicates: false,
    });
    if (error) {
      console.warn(`[ingest] batch ${i}-${i + chunk.length} upsert failed: ${error.message}`);
      actualFailed += chunk.length;
      // Try one-by-one to salvage what we can.
      for (const row of chunk) {
        const { error: rowErr } = await sb.from('events').upsert([row], {
          onConflict: 'source,external_id', ignoreDuplicates: false,
        });
        if (!rowErr) { actualInserted++; actualFailed--; }
      }
    } else {
      actualInserted += chunk.length;
    }
  }

  if (merges.length) {
    for (let i = 0; i < merges.length; i += BATCH_SIZE) {
      const chunk = merges.slice(i, i + BATCH_SIZE);
      const { error } = await sb.from('pending_merges').insert(chunk);
      if (error) {
        console.warn(`[ingest] pending_merges batch ${i}-${i + chunk.length} failed: ${error.message} — falling back to per-row insert`);
        // Same per-row salvage pattern as the events upsert above; one
        // malformed candidate JSON should not sink the whole batch.
        for (const row of chunk) {
          const { error: rowErr } = await sb.from('pending_merges').insert([row]);
          if (rowErr) console.warn(`[ingest] pending_merge row failed: ${rowErr.message}`);
        }
      }
    }
  }

  // Auto-archive past events. A nightly hygiene step that keeps the live
  // events table from filling with stale season data. Anything where
  // starts_at is more than 7 days in the past becomes status='archived'.
  // The .not('starts_at','is',null) guard is critical — without it, a
  // mistakenly-null starts_at on an approved event wouldn't be archived
  // (NULL < timestamp is unknown, treated as false), but a future regression
  // that inverts this comparison would mass-archive everything with NULL.
  // Belt-and-suspenders.
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { error: archErr, count: archived } = await sb.from('events')
    .update({ status: 'archived' }, { count: 'exact' })
    .eq('status', 'approved')
    .not('starts_at', 'is', null)
    .lt('starts_at', cutoff);
  if (archErr) console.warn(`[ingest] auto-archive failed: ${archErr.message}`);
  else if (archived) console.info(`[ingest] auto-archived ${archived} past-dated events`);

  const dt = ((Date.now() - t0) / 1000).toFixed(1);
  console.info(`[ingest] done in ${dt}s — written ${actualInserted}, failed ${actualFailed}, queued ${queued}, skipped ${skipped}`);
}

main().catch((err) => {
  console.error('[ingest] fatal:', err);
  process.exit(1);
});
