# JamRadar — Event Ingest Pipeline

Daily Node.js job that pulls candidate events from external sources, dedupes them against the existing event database, and inserts new ones into Supabase. Medium-confidence dedupe matches are queued for admin review.

Sources currently supported:
- **Eventbrite** (free Public API)
- **iCal** (`.ics` calendar feeds, generic)
- **Reddit** (regional subs, keyword scan)

The pipeline runs once per day via GitHub Actions. You can also run it manually.

---

## Architecture (in 30 seconds)

```
config.json
    │
    ▼
index.js   ←── runs each adapter, dedupes, writes to Supabase
    │
    ├── adapters/eventbrite.js
    ├── adapters/ical.js
    └── adapters/reddit.js
            │
            ▼
        dedupe.js   ←── identical to client-side fuzzy match in store.jsx
            │
            ▼
    Supabase events table   ←── insert new
    Supabase pending_merges  ←── queue medium-confidence matches
```

Three classifications per candidate:
| Score | Action |
|---|---|
| ≥ 0.85 | Skip — we already have this event |
| 0.5 – 0.85 | Queue in `pending_merges` for admin review |
| < 0.5 | Insert as a new event with `status: 'pending'` |

---

## Required environment variables

Set as **GitHub Actions secrets** (Settings → Secrets and variables → Actions):

| Secret | Where to get it |
|---|---|
| `SUPABASE_URL` | Supabase Dashboard → Project Settings → API → "Project URL" |
| `SUPABASE_SERVICE_ROLE_KEY` | Same page → "service_role" key (NOT the anon key — this one bypasses RLS) |
| `EVENTBRITE_TOKEN` | https://www.eventbrite.com/account-settings/apps → "Create new app" → use the "Personal OAuth token" |

The Eventbrite token is optional — the adapter skips gracefully if not set. iCal and Reddit need no auth.

---

## Run locally (for testing)

```bash
cd ingest
npm install
SUPABASE_URL=https://xxx.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=eyJ... \
EVENTBRITE_TOKEN=YOUR_TOKEN \
DRY_RUN=1 \
node index.js
```

`DRY_RUN=1` skips writing to Supabase — good for the first sanity check.

---

## Deploy to GitHub Actions (one-time)

1. Push your code to a GitHub repo (private is fine).
2. **Settings → Secrets and variables → Actions** → add the three secrets above.
3. The workflow file is already in `.github/workflows/ingest-events.yml`.
4. Confirm it's listed under the **Actions** tab. The first scheduled run happens at 11:00 UTC the next day.
5. To run it manually right now: Actions → "Ingest events" → **Run workflow** → optionally tick "dry_run" to test without writing.

---

## Configuration (`config.json`)

### Eventbrite
```json
"eventbrite": {
  "enabled": true,
  "categories": ["108"],            // 108 = Sports & Fitness
  "keywords": ["snowboard", "ski", "skate", "rail jam", "park day", "demo day"],
  "regions": [
    { "city": "Toronto", "lat": 43.6532, "lon": -79.3832, "within": "200km" },
    ...
  ]
}
```

For each (region × keyword) pair, the adapter does one API call. Default config = 4 regions × 6 keywords = 24 calls/day. Eventbrite's free tier is 1,000 calls/hour.

### iCal
```json
"ical": {
  "enabled": true,
  "feeds": [
    {
      "name": "tremblant",
      "url": "https://www.tremblant.ca/calendar.ics",
      "org": "Mont Tremblant",
      "verified": true,
      "trust_tier": 2,
      "default_lat": 46.2117,
      "default_lon": -74.5841,
      "default_distance_km": 142,
      "color": 230
    }
  ]
}
```

To find a resort's iCal feed: try `<resort>.com/calendar.ics` first, or look at their events page source for a `webcal://` or `.ics` link. Most don't publish one — that's fine, the iCal adapter no-ops if there are no feeds.

### Reddit
```json
"reddit": {
  "enabled": true,
  "subreddits": ["snowboard", "skiing", "skateboarding", "Whistler"],
  "keywords":   ["jam", "rail", "comp", "demo", "session", "throwdown"]
}
```

Posts whose titles contain any keyword get pulled in as candidates. Most will be discussion posts not real events; admin review handles that.

---

## How dedupe works

Every candidate goes through two layers:

### Layer 1 — Source identity (deterministic)
If the candidate's `(source, external_id)` already exists in the database, **upsert** in place. This is how re-running the scraper tomorrow doesn't create duplicates of yesterday's events.

### Layer 2 — Cross-source fuzzy match
For candidates that aren't in the source identity map (i.e., new from this source's perspective), compare against every event in the database using:

| Signal | Weight |
|---|---|
| Same date | 0.40 |
| Title similarity (Jaccard on word sets) | 0.30 × similarity |
| Venue similarity | 0.15 × similarity |
| Same organizer | 0.10 |
| Same event type | 0.05 |
| Same sport | 0.05 |

Threshold gating:
- **≥ 0.85** → skip (we already have it)
- **0.5 – 0.85** → queue in `pending_merges` for admin review
- **< 0.5** → insert as a new event

Without same-date AND > 0.3 title overlap, the score is capped at 0.4 — prevents random unrelated events from getting flagged.

---

## Adding a new adapter

1. Create `adapters/your-source.js`. Export a function:
   ```js
   export async function fetchYourSource(config, env) {
     // ... fetch + normalize ...
     return arrayOfNormalizedEvents;
   }
   ```
2. Each event needs (at minimum):
   ```js
   {
     external_id, source: 'your-source', trust_tier: 1,
     title, when_text, location, sport, type,
     status: 'pending'
   }
   ```
3. Wire it into `index.js`:
   ```js
   import { fetchYourSource } from './adapters/your-source.js';
   if (config.your_source?.enabled) {
     candidates.push(...await fetchYourSource(config.your_source, env));
   }
   ```
4. Add a config block in `config.json`.

---

## Troubleshooting

**"SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required"** — secrets missing. Check GitHub Actions secrets.

**"insert failed: new row violates row-level security policy"** — you're using the anon key, not the service-role key. The service-role key bypasses RLS; the anon key doesn't.

**Eventbrite returns no results for a region** — try widening `within` (e.g., `"500km"`). Categories beyond 108 (Sports) aren't searched by default.

**An iCal feed returns garbage** — likely the URL points to an HTML page, not a real `.ics` file. Visit it in a browser; the response should start with `BEGIN:VCALENDAR`.

**Reddit returns 429 (rate limited)** — slow down or reduce subreddits in config. We already pause 1 sec between requests.

**Pending merges queue grows fast** — your dedupe threshold may need tuning. Drop `MERGE_QUEUE_THRESHOLD` in `dedupe.js` from 0.5 to 0.55 to reduce false positives, or raise it to 0.45 to catch more.

---

## Adding a future adapter idea — LLM-extracted events

For sites where CSS selectors break or never existed, feed the page HTML to a small LLM (Claude Haiku, GPT-4o-mini) with a structured-output prompt:

```
Given the following HTML, extract events as JSON conforming to this schema:
{ title, date, location, description, ... }
Return [] if no events found.
```

Cost: ~$0.01 per page. For 50 mountain pages nightly = ~$15/month. Add as `adapters/llm-scraper.js` once you've built the basic per-source scrapers and want to cover the long tail.
