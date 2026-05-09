// Generic iCal (.ics) feed adapter.
// Configured per-feed in config.json. Most resorts don't publish iCal, but
// when they do it's the cleanest possible source — exact dates, locations,
// descriptions, no scraping required.
//
// To find a resort's iCal feed: try "<resort>.com/calendar.ics" or check
// "view source" on their events page for a Subscribe-to-calendar link.

import ical from 'node-ical';

const SPORT_FOR_KEYWORD = (text) => {
  const lower = (text || '').toLowerCase();
  if (/skate/.test(lower)) return 'skate';
  if (/snowboard|snow board/.test(lower)) return 'snowboard';
  if (/\bski\b|skiing/.test(lower)) return 'ski';
  if (/indoor|treadmill|dome/.test(lower)) return 'indoor';
  return 'snowboard';
};

const TYPE_FOR_KEYWORD = (text) => {
  const lower = (text || '').toLowerCase();
  if (/rail jam/.test(lower)) return 'Rail jam';
  if (/banked slalom/.test(lower)) return 'Banked slalom';
  if (/gear swap/.test(lower)) return 'Gear swap';
  if (/film/.test(lower)) return 'Film night';
  if (/clinic/.test(lower)) return 'Freestyle clinic';
  if (/demo/.test(lower)) return 'Demo day';
  if (/comp|competition/.test(lower)) return 'Snowboard comp';
  if (/skate jam|bowl jam/.test(lower)) return 'Skate jam';
  if (/indoor|treadmill/.test(lower)) return 'Indoor session';
  return 'Park event';
};

export async function fetchICalEvents(config) {
  const out = [];
  for (const feed of config.feeds || []) {
    if (!feed.url) continue;
    try {
      const data = await ical.async.fromURL(feed.url);
      for (const key of Object.keys(data)) {
        const ev = data[key];
        if (ev.type !== 'VEVENT') continue;
        if (!ev.start || ev.start < new Date()) continue;     // skip past events
        out.push(normalizeICalEvent(ev, feed));
      }
      console.info(`[ical:${feed.name || 'unnamed'}] fetched ${out.length} events from ${feed.url}`);
    } catch (err) {
      console.warn(`[ical] ${feed.url} → ${err.message}`);
    }
  }
  return out;
}

function normalizeICalEvent(e, feed) {
  const haystack = [e.summary, e.description].filter(Boolean).join(' ');
  return {
    external_id:  e.uid,
    source:       `ical:${feed.name || 'generic'}`,
    trust_tier:   feed.trust_tier ?? 1,
    title:        e.summary || 'Untitled event',
    description:  e.description || '',
    poster:       null,
    org_name:     feed.org || feed.name || 'Resort calendar',
    org_verified: feed.verified ?? false,
    sport:        feed.sport || SPORT_FOR_KEYWORD(haystack),
    type:         TYPE_FOR_KEYWORD(haystack),
    skill_level:  null,
    starts_at:    e.start?.toISOString() || null,
    when_text:    formatWhen(e.start),
    location:     e.location || feed.default_location || null,
    coords:       feed.default_coords || null,
    lat:          feed.default_lat || null,
    lon:          feed.default_lon || null,
    distance_km:  feed.default_distance_km || null,
    cost:         null,
    prize:        null,
    reg_link:     e.url || null,
    going_count:  0,
    featured:     false,
    live:         false,
    // ICS feeds are config-driven (we curate which calendars to subscribe to) → auto-approve.
    status:       'approved',
    color:        feed.color || 95,
    sponsors:     [],
    results:      null,
    updates:      null,
    raw:          { source: 'ical', feed: feed.name, uid: e.uid },
  };
}

function formatWhen(d) {
  if (!d) return null;
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const day = DAYS[d.getDay()];
  const mo  = MONTHS[d.getMonth()];
  const dn  = d.getDate();
  const h   = d.getHours();
  const min = String(d.getMinutes()).padStart(2, '0');
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = ((h + 11) % 12) + 1;
  // If time is midnight UTC it's probably an all-day event — drop the time bit.
  if (h === 0 && min === '00') return `${day} · ${mo} ${dn}`;
  return `${day} · ${mo} ${dn} · ${h12}:${min} ${period}`;
}
