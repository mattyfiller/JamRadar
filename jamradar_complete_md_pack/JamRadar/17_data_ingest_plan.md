# 17 - Data Ingest Plan

How JamRadar finds events automatically. Starts with manual curation, scales to feeds + scrapers + LLM-assisted parsing as the user base grows.

Region: **North America first** (Canada + US). Europe and elsewhere are out of scope until v2.

---

## 1. The honest truth about event discovery

Event information lives in eight overlapping places. None of them have a clean public API:

1. **Resort-owned event calendar pages** (HTML, sometimes JSON-backed)
2. **Eventbrite** (has a real API, free tier, big chunk of mid-size events live here)
3. **iCal feeds** (`.ics` URLs) — some resorts publish these but they're not advertised
4. **Resort Instagram / Facebook** (closed APIs, against TOS to scrape)
5. **Local shop / club newsletters and Instagram**
6. **Reddit** — `/r/snowboarding`, `/r/skiing`, `/r/skateboarding`, regional subs
7. **Word of mouth / posters** (the original problem the app solves)
8. **Pass-program portals** — Epic Mountain Rewards, Ikon Pass, Mountain Collective member pages

A pure scraping approach is fragile. A pure manual approach doesn't scale. The only viable answer is **layered ingest** — multiple ingest types running in parallel, each handling the events it can.

---

## 2. Three-phase rollout

### Phase 1: Manual curation (now → first 100 active riders)

**Goal:** prove the app is useful before building infrastructure.

- One curator (you) browses major mountain event pages weekly
- Use the existing Admin dashboard to add events
- Target: 30–50 events live per week across the launch region
- Time investment: 2–5 hours / week

**Why first:** the bar to ingest infrastructure is high — backend, cron, monitoring, per-source maintenance. That investment only pays off after the app has product–market fit. Ship to riders, get feedback, *then* automate.

### Phase 2: Feed-based ingest (≈100–1,000 riders)

**Goal:** cover 60% of events automatically; manual for the rest.

Sources we can pull cleanly:

- **Eventbrite API** — free tier, well-documented, covers maybe 30–40% of mid-size mountain/skate events
- **iCal feeds** — discoverable per resort, no auth, easy to parse
- **Reddit JSON API** — public, free, useful for community-posted jams and shop nights
- **Resort RSS feeds** — rare but worth checking
- **Pass program member portals** — Epic, Ikon, Mountain Collective sometimes expose calendars to logged-in users

What we still curate manually:
- Resorts with no machine-readable calendar
- Indoor facility schedules (mostly bespoke booking platforms)
- Local skate/shop events
- Anything from Instagram / Facebook

Engineering effort: 2–3 weeks one-time for the ingest framework; ongoing maintenance ~2 hours/week as scrapers break.

### Phase 3: Scrapers + LLM parsing (1,000+ riders)

**Goal:** 90%+ automation. Maintenance shifts from "writing scrapers" to "reviewing flagged anomalies."

- Build per-site scrapers for the top 50 North American resorts
- Run nightly via cron
- Use a small LLM (GPT-4o-mini or Claude Haiku) as a fallback parser when CSS selectors miss — feed the page HTML, ask for events as JSON
- Admin dashboard surfaces:
  - New events (auto-publish if from a verified source)
  - Anomalies (significant date or price changes)
  - Source failures (a scraper returned 0 events when it usually returns 5+)

LLM parsing handles the long tail of small mountains where building dedicated scrapers would never pay off.

---

## 3. Source taxonomy — what we're targeting

### North American mountain operators

| Operator | Brands | Approx event volume |
|---|---|---|
| **Vail Resorts** | Whistler Blackcomb, Park City, Heavenly, Breckenridge, Vail, Beaver Creek, Keystone, Northstar, Kirkwood, Stowe, Mt Sunapee, Crested Butte, Stevens Pass, etc. (~37 resorts) | High |
| **Alterra** | Mammoth, Palisades Tahoe, Steamboat, Tremblant, Stratton, Crystal, Big Bear, June, Snowshoe, Deer Valley, Solitude, Sugarbush, Winter Park (~17 resorts) | High |
| **Boyne Resorts** | Big Sky, Sugarloaf, Sunday River, Loon, Brighton, Boyne Mtn, Boyne Highlands | Medium |
| **Powdr** | Copper, Killington, Pico, Mt Bachelor, Eldora, Boreal, Lee Canyon, Woodward | Medium |
| **Independents** | Jackson Hole, Telluride, Aspen Snowmass, Taos, Sun Valley, the Banff trio (Norquay, Sunshine, Lake Louise), Tremblant, Mont-Sainte-Anne, Le Massif, Blue Mountain (ON), Bromont, Sommet Saint-Sauveur | High |

Priority order for Phase 1 manual curation:

**Tier 1 (top 15 — highest event density + biggest cultural pull):**
1. Whistler Blackcomb
2. Park City / Deer Valley
3. Mammoth
4. Palisades Tahoe (Squaw)
5. Aspen Snowmass
6. Jackson Hole
7. Big Sky
8. Killington
9. Stratton
10. Mont Tremblant
11. Sunshine Village (Banff)
12. Lake Louise
13. Mt Bachelor
14. Crystal Mountain
15. Stevens Pass

**Tier 2 (next 35 — broader regional coverage)** — fill in by region.

### Indoor training facilities

These are smaller operators with bespoke booking systems. Manually catalog them.

North American indoor ski/snowboard facilities (incomplete list — there are ~20-30 across the continent):
- **Snobahn** (Centennial, CO)
- **Big Snow American Dream** (East Rutherford, NJ — only real indoor slope in NA)
- **Glide House** (Markham, ON) [seeded]
- **Northern Slope** (Toronto, ON) [seeded]
- **Powderkeg Indoor Ski** (Carrollton, GA)
- **Maxxtracks** (Burlington, ON)
- **Whistler Treadmill** (Whistler, BC)
- **Boreal Mountain Snowflex** (CO)

Each has its own booking page; mostly manual until Phase 3.

### Skate

- **Vans Park Series** events (international tour, US stops)
- **Tampa Pro / Am**
- **Dew Tour**
- **King of the Road**
- **Local skatepark Instagram accounts** (the bulk of jam events)

Scrape Instagram is risky (TOS). Eventbrite + Reddit + manual is more sustainable.

### Gear / shop events

- Major outdoor retailer event calendars (REI, Mountain Equipment Co-op, Comor, Patagonia, etc.)
- Local ski/snowboard/skate shops — shop newsletter sign-ups, manual

---

## 4. Technical architecture

### Adapter pattern

One **source adapter** per data-source type. Each conforms to:

```ts
interface SourceAdapter {
  name: string;                 // "eventbrite", "ical", "scraper:vail-resorts"
  config: Record<string, any>;  // URL, selectors, API keys
  fetch(): Promise<RawEvent[]>; // returns raw, source-specific events
  normalize(raw: RawEvent): NormalizedEvent;  // maps to JamRadar schema
}

interface NormalizedEvent {
  externalId: string;        // for dedupe across runs
  source: string;            // adapter name
  title: string;
  date: string;              // ISO
  endDate?: string;
  venue: { name, city, state, lat, lon };
  type: EventType;
  sport: Sport;
  cost?: string;
  registrationUrl?: string;
  description: string;
  posterUrl?: string;
}
```

Adapters to build, in order:

1. **EventbriteAdapter** — Eventbrite Public API. Filter by category=sports + region. ~3 days of work.
2. **ICalAdapter** — generic .ics parser, takes a feed URL. ~1 day.
3. **RedditAdapter** — Reddit JSON. Scan target subs for keywords (jam, comp, demo). ~2 days.
4. **ResortScraperBase** — Playwright + per-site selector config. ~2 days for the framework, ~half a day per resort to onboard a new one.
5. **LLMScraperAdapter** — Phase 3. Pass HTML to a small LLM with a structured-output prompt. ~3 days.

### Dedupe + normalization

Events appear in multiple sources (a Whistler comp on Eventbrite *and* the resort's own site *and* Reddit). Dedupe key: `(title-fuzzy-hash, date, venue.city)`. The first source wins; later sources can patch missing fields (e.g., add a registration URL).

### Storage + cron

- **Backend**: Supabase Postgres (Tier 2 work; see [12_technical_roadmap.md](12_technical_roadmap.md))
- **Schedule**: GitHub Actions cron (free) for weekly + nightly jobs; or Supabase Edge Functions on a schedule
- **Logs**: a `source_runs` table tracking last-run-at, count, errors per adapter

### Approval queue

Stays the same as today's Admin dashboard:
- Auto-publish from **trusted** sources (Eventbrite, official iCal, the operator scrapers we've validated)
- **Pending** for new/unknown sources, scraper anomalies, LLM-extracted events
- Admin reviews + approves or rejects

---

## 5. Cost / budget

### Phase 1 (manual)
- $0 in software
- Time: 2–5 hours / week curator effort

### Phase 2 (feeds)
- $0 — Eventbrite + iCal + Reddit are all free
- Hosting: free (GitHub Actions cron, Supabase free tier)
- Time: 2–3 weeks engineering setup + ~2 hours/week maintenance

### Phase 3 (scrapers + LLM)
- LLM costs: ~$10–30 / month for 50 resorts × nightly runs (Claude Haiku / GPT-4o-mini)
- SerpAPI (optional, for Google Events scraping): $50/month
- Hosting: still free tier viable until ~10k events
- Time: 2–4 weeks engineering + ~half a day / week maintenance

---

## 6. Recommended starting move (this month)

Don't wait for Phase 2. Start filling the launch region today:

1. **Pick a launch sub-region.** Per the existing launch plan, Ontario and Banff/Canmore are reasonable starts.
2. **Spend two evenings building a manual seed list:**
   - 50 events across the next 2 months
   - 20 venue profiles (resorts, indoor facilities, shops)
   - 10 gear deals from local shops
3. **Add them via the Admin dashboard.**
4. **Share the install link with riders in that region.**
5. **Watch what they tap, save, register for.** That tells you which event types and which mountains to prioritize for Phase 2 ingest.

Phase 2 starts only when manual curation becomes a bottleneck. That's the point — invest in automation when the cost of *not* automating starts to hurt, not before.

---

## 7. Out of scope for v1

These are fine ideas but defer them:

- **Push notifications driven by ingest** — needs Tier 2 backend + push infra
- **User-submitted events** — moderation cost is high; let organizers post events instead via the existing CreateEvent flow
- **Image extraction from poster photos** — neat but unnecessary; organizers upload posters in CreateEvent already
- **Partnerships with Vail / Alterra for direct API access** — only viable after we have substantial rider traction; until then, scraping/feeds are good enough

---

## 8. Risk and mitigations

| Risk | Mitigation |
|---|---|
| Resort scrapers break when sites change | Auto-detect via "0 events returned" alerts, LLM fallback parser |
| Eventbrite rate limits | Free tier covers expected volume; can upgrade if needed |
| Duplicate events across sources | Fuzzy dedupe key; admin merges in approval queue |
| LLM hallucinations (Phase 3) | Mark LLM-sourced events as `pending`; admin reviews before publish |
| TOS issues with Instagram/Facebook | Don't scrape — encourage organizers to post directly via CreateEvent |
| Stale events | Nightly cleanup job marks past-dated events as `archived` |

---

## TL;DR

- **Now**: Manual curation. 2-5 hrs/wk, no infrastructure.
- **~100 riders in**: Build Eventbrite + iCal + Reddit adapters. ~3 weeks engineering.
- **~1,000 riders in**: Per-resort scrapers + LLM parsing for the long tail. Ongoing.
- **Always**: Admin approval queue is the safety valve.
