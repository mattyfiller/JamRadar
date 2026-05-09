// Eventbrite Public API adapter.
// Free tier: 1000 calls/hour, no payment needed.
// Get a token at https://www.eventbrite.com/account-settings/apps → "Personal token".
// Set env var EVENTBRITE_TOKEN before running.

const API_BASE = 'https://www.eventbriteapi.com/v3';

const SPORT_FOR_KEYWORD = (text) => {
  const lower = (text || '').toLowerCase();
  if (/skate/.test(lower)) return 'skate';
  if (/snowboard|snow board|park|jam|rail/.test(lower)) return 'snowboard';
  if (/\bski\b|skiing/.test(lower)) return 'ski';
  if (/indoor|treadmill|dome/.test(lower)) return 'indoor';
  if (/mtb|mountain bike|bike park/.test(lower)) return 'mtb';
  if (/bmx/.test(lower)) return 'bmx';
  return 'snowboard'; // safe default for the launch sport
};

const TYPE_FOR_KEYWORD = (text) => {
  const lower = (text || '').toLowerCase();
  if (/rail jam/.test(lower)) return 'Rail jam';
  if (/banked slalom/.test(lower)) return 'Banked slalom';
  if (/gear swap/.test(lower)) return 'Gear swap';
  if (/film/.test(lower)) return 'Film night';
  if (/clinic|coaching/.test(lower)) return 'Freestyle clinic';
  if (/demo/.test(lower)) return 'Demo day';
  if (/comp|competition/.test(lower)) {
    if (/snowboard/.test(lower)) return 'Snowboard comp';
    if (/ski/.test(lower)) return 'Ski comp';
  }
  if (/skate jam|bowl jam/.test(lower)) return 'Skate jam';
  if (/indoor|treadmill/.test(lower)) return 'Indoor session';
  return 'Park event';
};

export async function fetchEventbriteEvents(config, env) {
  const token = env.EVENTBRITE_TOKEN;
  if (!token) {
    console.warn('[eventbrite] EVENTBRITE_TOKEN not set, skipping');
    return [];
  }
  const out = [];

  for (const region of config.regions || []) {
    for (const keyword of config.keywords || []) {
      const url = new URL(`${API_BASE}/events/search/`);
      url.searchParams.set('q', keyword);
      url.searchParams.set('location.latitude', String(region.lat));
      url.searchParams.set('location.longitude', String(region.lon));
      url.searchParams.set('location.within', region.within || '100km');
      url.searchParams.set('sort_by', 'date');
      url.searchParams.set('start_date.range_start', new Date().toISOString());
      url.searchParams.set('expand', 'venue,organizer');
      url.searchParams.set('token', token);

      try {
        const res = await fetch(url);
        if (!res.ok) {
          console.warn(`[eventbrite] ${region.city}/${keyword} → HTTP ${res.status}`);
          continue;
        }
        const data = await res.json();
        for (const e of (data.events || [])) {
          out.push(normalizeEventbriteEvent(e));
        }
      } catch (err) {
        console.warn(`[eventbrite] ${region.city}/${keyword} → ${err.message}`);
      }

      // Rate-limit politely (1 req/sec).
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  console.info(`[eventbrite] fetched ${out.length} candidate events`);
  return out;
}

function normalizeEventbriteEvent(e) {
  const haystack = [e.name?.text, e.description?.text].filter(Boolean).join(' ');
  return {
    external_id:  e.id,
    source:       'eventbrite',
    trust_tier:   1,                    // bumped to 2 after admin whitelists Eventbrite as a trusted source
    title:        e.name?.text || 'Untitled event',
    description:  e.description?.text || '',
    poster:       e.logo?.original?.url || e.logo?.url || null,
    org_name:     e.organizer?.name || 'Eventbrite',
    org_verified: false,
    sport:        SPORT_FOR_KEYWORD(haystack),
    type:         TYPE_FOR_KEYWORD(haystack),
    skill_level:  null,
    starts_at:    e.start?.utc || null,
    when_text:    formatWhen(e.start?.local),
    location:     formatVenue(e.venue),
    coords:       e.venue?.latitude && e.venue?.longitude
      ? `${e.venue.latitude}° N · ${Math.abs(e.venue.longitude)}° W` : null,
    lat:          e.venue?.latitude ? Number(e.venue.latitude) : null,
    lon:          e.venue?.longitude ? Number(e.venue.longitude) : null,
    distance_km:  null,
    cost:         e.is_free ? 'Free' : null,   // Eventbrite ticketing data lives behind /events/{id}/ticket_classes
    prize:        null,
    reg_link:     e.url || null,
    going_count:  0,
    featured:     false,
    live:         false,
    status:       'pending',
    color:        95,
    sponsors:     [],
    results:      null,
    updates:      null,
    raw:          { source: 'eventbrite', id: e.id },
  };
}

function formatVenue(v) {
  if (!v) return null;
  const parts = [v.name, v.address?.city, v.address?.region]
    .filter(Boolean);
  return parts.join(' · ');
}

function formatWhen(local) {
  if (!local) return null;
  // local is "2026-11-14T19:00:00" — convert to "Sat · Nov 14 · 7:00 PM"
  const d = new Date(local);
  if (isNaN(d)) return local;
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const day = DAYS[d.getDay()];
  const mo  = MONTHS[d.getMonth()];
  const dn  = d.getDate();
  const h   = d.getHours();
  const min = String(d.getMinutes()).padStart(2, '0');
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = ((h + 11) % 12) + 1;
  return `${day} · ${mo} ${dn} · ${h12}:${min} ${period}`;
}
