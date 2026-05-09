// Reddit JSON adapter — completely free, no auth, no rate limits to speak of
// for low volume. Scans configured subs for posts with event keywords in the
// title (jam, comp, demo, throwdown, etc.). Most matches will be discussion
// posts not actual events; the dedupe queue + admin review handle that.

// Keys MUST be lowercase — config has mixed case ("MTB", "BMXracing",
// "BurtonSnowboards") and the lookup at the bottom of this file lowercases
// before indexing. Forgetting that means MTB posts get tagged as snowboard.
const SPORT_FOR_SUB = {
  snowboard:        'snowboard',
  snowboarding:     'snowboard',
  skiing:           'ski',
  skibum:           'ski',
  skitouring:       'ski',
  backcountry:      'ski',
  skateboarding:    'skate',
  skateparks:       'skate',
  mtb:              'mtb',
  mountainbiking:   'mtb',
  bmx:              'bmx',
  bmxracing:        'bmx',
  whistler:         'snowboard',
  vancouver:        'snowboard',
  laketahoe:        'snowboard',
  colorado:         'snowboard',
  vermont:          'snowboard',
  burtonsnowboards: 'snowboard',
  killington:       'snowboard',
  aspen:            'snowboard',
};

export async function fetchRedditEvents(config) {
  const out = [];
  const seen = new Set();
  for (const sub of config.subreddits || []) {
    const url = `https://www.reddit.com/r/${sub}/new.json?limit=50`;
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'JamRadar-Ingest/1.0' } });
      if (!res.ok) {
        console.warn(`[reddit] /r/${sub} → HTTP ${res.status}`);
        continue;
      }
      const data = await res.json();
      const posts = data.data?.children || [];

      for (const { data: p } of posts) {
        if (!p?.title || seen.has(p.id)) continue;
        const title = p.title.toLowerCase();
        const matched = (config.keywords || []).find(kw => title.includes(kw.toLowerCase()));
        if (!matched) continue;
        // Stricter signal: the post must look like an event announcement, not
        // a discussion/review/question. Require at least one of:
        //   - an explicit date or month name
        //   - a venue/place hint (resort, park, mountain, hill, dome)
        //   - the verb "register" / "tickets" / "tomorrow" / "this weekend"
        if (!looksLikeEventPost(title, p.selftext || '')) continue;
        seen.add(p.id);
        out.push(normalizeRedditPost(p, sub));
      }
    } catch (err) {
      console.warn(`[reddit] /r/${sub} → ${err.message}`);
    }
    await new Promise(r => setTimeout(r, 1000));   // polite throttle
  }
  console.info(`[reddit] fetched ${out.length} candidate event posts`);
  return out;
}

// Heuristics for whether a Reddit post is announcing a real event vs. just
// discussing one. Conservative: rejects "what's everyone's favorite jam?" but
// keeps "Friday rail jam at Underpass — registration open".
const DATE_PATTERN = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}\b|\b\d{1,2}[/-]\d{1,2}\b|\b(mon|tue|wed|thu|fri|sat|sun)[a-z]*\b|\btomorrow\b|\bthis (weekend|sat|sun|fri|saturday|sunday|friday)\b|\btonight\b|\bnext (weekend|sat|sun|fri|saturday|sunday|friday)\b/i;
const VENUE_PATTERN = /\b(resort|mountain|park|hill|dome|skatepark|venue|lodge|terrain|valley)\b/i;
const ACTION_PATTERN = /\b(registration|register|tickets|sign[- ]?up|hosting|presents|kicks off|drops|come out|join us|invite|prize|cash purse|throwdown|happening)\b/i;

function looksLikeEventPost(title, body) {
  const text = `${title} ${body}`;
  // Need at least 2 of the 3 signals.
  let score = 0;
  if (DATE_PATTERN.test(text)) score++;
  if (VENUE_PATTERN.test(text)) score++;
  if (ACTION_PATTERN.test(text)) score++;
  return score >= 2;
}

function normalizeRedditPost(p, sub) {
  // Reddit posts don't carry a structured event date. We use the post's date
  // as a rough placeholder; admin review will correct or discard most of these.
  const created = new Date(p.created_utc * 1000);
  return {
    external_id:  p.id,
    source:       `reddit:${sub}`,
    trust_tier:   0,                                // user-generated; always pending
    title:        p.title,
    description:  p.selftext || '',
    poster:       p.thumbnail && p.thumbnail.startsWith('http') ? p.thumbnail : null,
    org_name:     `r/${sub}`,
    org_verified: false,
    sport:        SPORT_FOR_SUB[sub.toLowerCase()] || 'snowboard',
    type:         null,
    skill_level:  null,
    starts_at:    null,                             // unknown — admin will fix
    when_text:    null,
    location:     null,
    coords:       null,
    lat:          null,
    lon:          null,
    distance_km:  null,
    cost:         null,
    prize:        null,
    reg_link:     `https://reddit.com${p.permalink}`,
    going_count:  0,
    featured:     false,
    live:         false,
    status:       'pending',
    color:        95,
    sponsors:     [],
    results:      null,
    updates:      null,
    raw:          { source: 'reddit', sub, id: p.id, created },
  };
}
