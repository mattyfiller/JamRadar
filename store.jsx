// JamRadar — store with localStorage primary cache + optional Supabase sync.
//
// When Supabase is configured AND a user is signed in, mutations also push to
// the user's row in `profiles` (debounced). On first sign-in we migrate the
// local state to the server. Without Supabase or while signed out, behaviour
// is identical to single-device localStorage.

const JR_LS_KEY = 'jamradar.v1';

const DEFAULT_PREFS = {
  onboarded: false,
  // 'rider' = browsing as a rider
  // 'organizer' = posts events from a venue / club / event series
  // 'shop'      = posts gear deals from an action-sports retailer
  // Set during onboarding; can be switched anytime via tweaks panel.
  accountType: 'rider',
  // For organizer accounts only; collected during onboarding.
  organizerName: '',          // "Blue Mountain Park Crew" / "Sweet Skis" / etc.
  organizerKind: 'mountain',  // mountain | indoor | shop | brand | club | skatepark | event-organizer
  // For shop accounts only.
  shopName:   '',             // "Sweet Skis" / "Underpass Skate" / etc.
  shopWebsite: '',            // root site, used to generate affiliate links + verify
  shopSports: ['snowboard'],  // which sports the shop sells (drives default sport on posted deals)
  sports: ['snowboard', 'ski'],
  city: 'Toronto',
  radius: 50,
  types: ['Rail jam', 'Park event', 'Indoor session'],
  notif: 'instant',
  skill: 'Intermediate',
  betaBannerSeen: false,
  // Rider-identity prefs surfaced on Profile.
  displayName: '',
  openToRide: false,
  accolades: [],
};

function loadStore() {
  try {
    const raw = localStorage.getItem(JR_LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function saveStore(state) {
  try { localStorage.setItem(JR_LS_KEY, JSON.stringify(state)); }
  catch { /* quota / private mode — fine */ }
}

// One persistent reducer for everything that should survive reload.
// Returns [state, actions] where actions are stable handlers.
function useJamStore() {
  const seedEvents = window.JR_DATA.EVENTS;
  const initial = React.useMemo(() => {
    const stored = loadStore() || {};
    return {
      prefs:         { ...DEFAULT_PREFS, ...(stored.prefs || {}) },
      events:        stored.events        || seedEvents,
      savedIds:      stored.savedIds      || ['e2', 'e5'],
      goingIds:      stored.goingIds      || [],
      followedOrgs:  stored.followedOrgs  || [],
      readNotifIds:  stored.readNotifIds  || [],
      notifications: stored.notifications || [],
    };
  }, []);

  const [state, setState] = React.useState(initial);
  const [user, setUser] = React.useState(null);  // current Supabase user, or null

  // Persist locally on every change.
  React.useEffect(() => { saveStore(state); }, [state]);

  // Watch Supabase auth state. On first sign-in, push the local state up; on
  // subsequent sign-ins, pull the remote state down.
  React.useEffect(() => {
    if (!window.JR_SUPABASE_READY) return;
    let cancelled = false;
    (async () => {
      const u = await window.JR_AUTH.getUser();
      if (!cancelled) setUser(u);
      if (u) await syncOnSignIn(u, state, setState);
    })();
    const unsub = window.JR_AUTH.onAuthChange(async (newUser) => {
      setUser(newUser);
      if (newUser) await syncOnSignIn(newUser, state, setState);
    });
    return () => { cancelled = true; unsub?.(); };
  }, []);

  // When Supabase is configured, swap the in-memory event list for the
  // shared-DB version on mount, and re-fetch periodically. If anything fails
  // we keep the seed; the app never breaks.
  React.useEffect(() => {
    if (!window.JR_SUPABASE_READY) return;
    let cancelled = false;
    const refresh = async () => {
      const fresh = await fetchEventsFromServer();
      if (cancelled || !fresh) return;
      setState(s => ({ ...s, events: fresh }));
    };
    refresh();
    // Re-pull every 60s so newly-published events appear without a hard refresh.
    const t = setInterval(refresh, 60_000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  // Debounce server writes so we don't fire one round-trip per keystroke.
  const pushTimerRef = React.useRef(null);
  React.useEffect(() => {
    if (!user || !window.JR_SUPABASE) return;
    clearTimeout(pushTimerRef.current);
    pushTimerRef.current = setTimeout(() => pushToServer(user, state), 600);
    return () => clearTimeout(pushTimerRef.current);
  }, [state, user]);

  const actions = React.useMemo(() => ({
    setPrefs: (patch) =>
      setState(s => ({ ...s, prefs: { ...s.prefs, ...patch } })),
    completeOnboarding: (prefs) =>
      setState(s => ({ ...s, prefs: { ...s.prefs, ...prefs, onboarded: true } })),
    toggleSaved: (id) =>
      setState(s => ({ ...s, savedIds: s.savedIds.includes(id)
        ? s.savedIds.filter(x => x !== id) : [...s.savedIds, id] })),
    toggleGoing: (id) =>
      setState(s => ({ ...s, goingIds: s.goingIds.includes(id)
        ? s.goingIds.filter(x => x !== id) : [...s.goingIds, id] })),
    toggleFollow: (org) =>
      setState(s => ({ ...s, followedOrgs: s.followedOrgs.includes(org)
        ? s.followedOrgs.filter(x => x !== org) : [...s.followedOrgs, org] })),
    markAllNotifsRead: () =>
      setState(s => ({
        ...s,
        readNotifIds: [
          ...window.JR_DATA.NOTIFICATIONS.map(n => n.id),
          ...s.notifications.map(n => n.id),
        ],
      })),
    publishEvent: (event) => {
      // Optimistic local insert so the UI updates immediately.
      setState(s => ({ ...s, events: [event, ...s.events] }));
      // If Supabase is wired, mirror to the DB so other devices see it.
      if (window.JR_SUPABASE_READY && user) {
        publishToServer(event, user).catch(e =>
          console.warn('[JamRadar] publishEvent server write failed:', e.message));
      }
    },
    editEvent: (id, patch) => {
      setState(s => ({ ...s, events: s.events.map(e =>
        e.id === id ? { ...e, ...patch } : e) }));
      if (window.JR_SUPABASE_READY && user) {
        editOnServer(id, patch).catch(e =>
          console.warn('[JamRadar] editEvent server write failed:', e.message));
      }
    },
    approveEvent: (id) => {
      setState(s => {
        const ev = s.events.find(e => e.id === id);
        const events = s.events.map(e => e.id === id ? { ...e, status: 'approved' } : e);
        // Auto-ping the rider when an event matching their sports gets approved.
        const matchesUser = ev && (!s.prefs.sports?.length || s.prefs.sports.includes(ev.sport));
        const notifications = (matchesUser && ev) ? [{
          id: 'auto-' + id,
          kind: 'new',
          text: `New ${ev.type.toLowerCase()} near you`,
          sub: `${ev.title} · ${ev.org}`,
          time: 'Just now',
          unread: true,
          eventId: id,
        }, ...s.notifications] : s.notifications;
        return { ...s, events, notifications };
      });
      if (window.JR_SUPABASE_READY && user) {
        editOnServer(id, { status: 'approved' }).catch(e =>
          console.warn('[JamRadar] approveEvent server write failed:', e.message));
      }
    },
    rejectEvent: (id) => {
      setState(s => ({ ...s, events: s.events.filter(e => e.id !== id) }));
      if (window.JR_SUPABASE_READY && user) {
        editOnServer(id, { status: 'rejected' }).catch(e =>
          console.warn('[JamRadar] rejectEvent server write failed:', e.message));
      }
    },
    featureEvent: (id) => {
      let willBeFeatured = false;
      setState(s => {
        const ev = s.events.find(e => e.id === id);
        willBeFeatured = ev && !ev.featured;
        const events = s.events.map(e => e.id === id ? { ...e, featured: !e.featured } : e);
        const notifications = (willBeFeatured && ev) ? [{
          id: 'feat-' + id + '-' + Date.now(),
          kind: 'new',
          text: 'Featured this week',
          sub: `${ev.title} · ${ev.org}`,
          time: 'Just now',
          unread: true,
          eventId: id,
        }, ...s.notifications] : s.notifications;
        return { ...s, events, notifications };
      });
      if (window.JR_SUPABASE_READY && user) {
        editOnServer(id, { featured: willBeFeatured }).catch(e =>
          console.warn('[JamRadar] featureEvent server write failed:', e.message));
      }
    },
    // ─── Marketplace (peer-to-peer gear listings) ─────────────────────
    // List: rider posts a used board / jacket / etc. for sale. Active immediately
    // (riders trust riders); admin can flag spam. Phase 2 will add Stripe Checkout
    // with our application_fee skim — same insert path, the Buy button just
    // routes through Stripe and the webhook flips status='sold'.
    publishListing: async (listing) => {
      if (!window.JR_SUPABASE_READY || !user) {
        throw new Error('Sign in first to list gear.');
      }
      const sb = window.JR_SUPABASE;
      const row = {
        seller_user_id: user.id,
        seller_name:    state.prefs.displayName?.trim() || (user.email?.split('@')[0]) || 'Rider',
        title:          listing.title,
        description:    listing.description || null,
        brand:          listing.brand || null,
        size:           listing.size  || null,
        condition:      listing.condition,
        sport:          listing.sport,
        category:       listing.category || null,
        price:          listing.price,
        currency:       listing.currency || 'USD',
        photos:         listing.photos || [],
        location:       listing.location || null,
        shipping:       listing.shipping || 'local-only',
        shipping_cost:  listing.shipping_cost || null,
      };
      const { data, error } = await sb.from('gear_listings').insert([row]).select();
      if (error) throw new Error(error.message);
      window.dispatchEvent(new CustomEvent('jr:toast', {
        detail: { msg: 'Listed — buyers can contact you now' },
      }));
      return data?.[0];
    },
    // Mark one of MY listings as sold. Doesn't claim a buyer (RLS blocks that
    // for self-marks); the Stripe webhook is the only path that sets sold_to.
    markListingSold: async (id) => {
      if (!window.JR_SUPABASE_READY) return;
      const { error } = await window.JR_SUPABASE
        .from('gear_listings')
        .update({ status: 'sold', sold_at: new Date().toISOString() })
        .eq('id', id);
      if (error) console.warn('[markListingSold] failed:', error.message);
    },
    withdrawListing: async (id) => {
      if (!window.JR_SUPABASE_READY) return;
      const { error } = await window.JR_SUPABASE
        .from('gear_listings')
        .update({ status: 'withdrawn' })
        .eq('id', id);
      if (error) console.warn('[withdrawListing] failed:', error.message);
    },

    // Shop posts a new gear deal. Inserts into gear_deals with status='pending'
    // for admin review. RLS gates promotion fields server-side; the client
    // also explicitly omits them. Resolves to the inserted row on success.
    publishDeal: async (deal) => {
      if (!window.JR_SUPABASE_READY || !user) {
        throw new Error('Supabase not configured / not signed in');
      }
      const sb = window.JR_SUPABASE;
      // Pre-compute a stable external_id so re-posting the same product
      // upserts in place rather than duplicating.
      const t = String(deal.title || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
      const p = Math.round((Number(deal.price) || 0) * 100);
      let h = 0;
      const key = `${t}|${p}`;
      for (let i = 0; i < key.length; i++) h = ((h << 5) - h) + key.charCodeAt(i);
      const externalId = `shop:${user.id}::${(h >>> 0).toString(36)}`;

      const row = {
        external_id:  externalId,
        source:       `shop:${user.id}`,
        shop:         deal.shop,
        shop_user_id: user.id,
        title:        deal.title,
        sport:        deal.sport,
        price:        deal.price,
        original:     deal.original,
        off_pct:      deal.off_pct,
        reg_link:     deal.reg_link,
        status:       'pending',           // RLS will reject anything else
      };
      const { data, error } = await sb.from('gear_deals')
        .upsert([row], { onConflict: 'source,external_id' })
        .select();
      if (error) throw new Error(error.message);
      window.dispatchEvent(new CustomEvent('jr:toast', {
        detail: { msg: 'Deal submitted for review' },
      }));
      return data?.[0];
    },
    // Verify an organizer — bumps org_verified=true on every event whose
    // org_name matches. Optimistic local update + server write for each
    // affected event. Server-side RLS gates this to admins (events_admin_update).
    verifyOrg: (orgName) => {
      const targets = state.events.filter(e => e.org === orgName && !e.orgVerified);
      setState(s => ({
        ...s,
        events: s.events.map(e => e.org === orgName ? { ...e, orgVerified: true } : e),
      }));
      if (window.JR_SUPABASE_READY && user) {
        for (const ev of targets) {
          editOnServer(ev.id, { org_verified: true, trust_tier: 2 }).catch(err =>
            console.warn('[JamRadar] verifyOrg server write failed for', ev.id, '·', err.message));
        }
      }
    },
    // Fuzzy dedupe — exposed so CreateEvent can pre-flight check before insert.
    findDuplicates: (candidate) => findDuplicates(candidate, state.events),
    // Pending-merges actions used by the Admin → Pending Merges tab. All
    // no-op if Supabase isn't configured (the queue lives there, not locally).
    fetchPendingMerges: () => fetchPendingMerges(),
    resolvePendingMerge: (id, action) => resolvePendingMerge(id, action, user),
    // Live gear_deals — auto-approved by the ingest pipeline, public-readable
    // via the gear_deals_public_read RLS policy. Returns [] if Supabase isn't
    // configured; GearScreen falls back to seed data in that case.
    fetchGearDeals: () => fetchGearDeals(),
    addNotification: (notif) => {
      setState(s => ({ ...s, notifications: [{ ...notif, time: notif.time || 'Just now', unread: true }, ...s.notifications] }));
      // Mirror to a real OS notification when the user has granted permission.
      // The Notification API only delivers while the page is open (true push
      // would need a service-worker subscription + server) — but this is what
      // the toggle on the You tab actually does today.
      try {
        if (typeof window !== 'undefined' && 'Notification' in window
            && Notification.permission === 'granted') {
          new Notification('JamRadar · ' + (notif.text || 'Update'), {
            body: notif.sub || '',
            icon: '/icon.svg',
            tag: notif.id || undefined,   // collapse repeated notifs of the same id
          });
        }
      } catch { /* permission state changed or browser quirk — ignore */ }
    },
    resetAll: () => {
      try { localStorage.removeItem(JR_LS_KEY); } catch {}
      setState({
        prefs: { ...DEFAULT_PREFS },
        events: seedEvents,
        savedIds: ['e2', 'e5'],
        goingIds: [],
        followedOrgs: [],
        readNotifIds: [],
        notifications: [],
      });
    },
  }), []);

  return [state, actions, user];
}

// On sign-in, attempt to load the server-side profile. If none exists, this
// is a first sign-in: push the local state up. Otherwise, prefer the server
// version (it's the multi-device source of truth).
async function syncOnSignIn(user, localState, setState) {
  try {
    const sb = window.JR_SUPABASE;
    const { data, error } = await sb
      .from('profiles')
      .select('state')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error && error.code !== 'PGRST116') {
      console.warn('[JamRadar] profile fetch failed:', error.message);
      return;
    }
    if (data?.state) {
      // Returning user: server wins.
      setState((prev) => ({ ...prev, ...data.state }));
    } else {
      // First sign-in: seed the server with whatever's local.
      await sb.from('profiles').insert({
        user_id: user.id,
        email: user.email,
        state: stateForServer(localState),
      });
    }
  } catch (e) {
    console.warn('[JamRadar] sync-on-signin failed:', e.message);
  }
}

async function pushToServer(user, state) {
  try {
    await window.JR_SUPABASE
      .from('profiles')
      .upsert({
        user_id: user.id,
        email: user.email,
        state: stateForServer(state),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
  } catch (e) {
    console.warn('[JamRadar] state push failed:', e.message);
  }
}

// Don't ship the seed event list to the server — it lives in code, not state.
// Only the user's actual choices need to round-trip.
function stateForServer(state) {
  return {
    prefs:         state.prefs,
    savedIds:      state.savedIds,
    goingIds:      state.goingIds,
    followedOrgs:  state.followedOrgs,
    readNotifIds:  state.readNotifIds,
    // notifications + events stay local; they're regenerated from server data
    // (or seed) on each load. Keeps profile rows small.
  };
}

// ─────────────────────────────────────────────────────────────
// Event I/O against Supabase. All wrapped in try/catch and a check on
// JR_SUPABASE_READY — calling these without config is a no-op.
// ─────────────────────────────────────────────────────────────

// Pull approved + own-pending events from Supabase, normalized to the shape
// the rest of the app expects (matches data.jsx's seed format).
async function fetchEventsFromServer() {
  try {
    const sb = window.JR_SUPABASE;
    if (!sb) return null;
    const { data, error } = await sb
      .from('events')
      .select('*')
      .order('starts_at', { ascending: true });
    if (error) {
      console.warn('[JamRadar] events fetch failed:', error.message);
      return null;
    }
    return (data || []).map(rowToEvent);
  } catch (e) {
    console.warn('[JamRadar] events fetch threw:', e.message);
    return null;
  }
}

async function publishToServer(event, user) {
  const sb = window.JR_SUPABASE;
  if (!sb) return;
  const row = eventToRow(event, user);
  const { error } = await sb.from('events').insert(row);
  if (error) throw error;
}

async function editOnServer(id, patch) {
  const sb = window.JR_SUPABASE;
  if (!sb) return;
  // Only write the patched fields, mapped to DB column names.
  const dbPatch = {};
  if ('title'       in patch) dbPatch.title = patch.title;
  if ('desc'        in patch) dbPatch.description = patch.desc;
  if ('description' in patch) dbPatch.description = patch.description;
  if ('poster'      in patch) dbPatch.poster = patch.poster;
  if ('cost'        in patch) dbPatch.cost = patch.cost;
  if ('regLink'     in patch) dbPatch.reg_link = patch.regLink;
  if ('skill'       in patch) dbPatch.skill_level = patch.skill;
  if ('when'        in patch) dbPatch.when_text = patch.when;
  if ('location'    in patch) dbPatch.location = patch.location;
  if ('status'      in patch) dbPatch.status = patch.status;
  if ('featured'    in patch) dbPatch.featured = patch.featured;
  if ('live'        in patch) dbPatch.live = patch.live;
  const { error } = await sb.from('events').update(dbPatch).eq('id', id);
  if (error) throw error;
}

// Map a Supabase row → the shape components expect (camelCase, flattened).
function rowToEvent(row) {
  return {
    id:           row.id,
    title:        row.title,
    desc:         row.description || '',
    poster:       row.poster || null,
    org:          row.org_name || '',
    orgVerified:  !!row.org_verified,
    sport:        row.sport,
    type:         row.type,
    skill:        row.skill_level,
    when:         row.when_text || '',
    cost:         row.cost,
    prize:        row.prize,
    regLink:      row.reg_link,
    location:     row.location,
    coords:       row.coords,
    distanceKm:   row.distance_km != null ? Number(row.distance_km) : null,
    indoor:       /indoor/i.test(row.type || '') || row.sport === 'indoor',
    going:        row.going_count || 0,
    live:         !!row.live,
    featured:     !!row.featured,
    status:       row.status,
    color:        row.color || 95,
    sponsors:     row.sponsors || [],
    results:      row.results || null,
    updates:      row.updates || null,
    deadline:     null,  // not stored in DB yet
    saved:        false, // per-user, computed elsewhere
  };
}

// Map a candidate event from CreateEvent → a Supabase row payload.
function eventToRow(event, user) {
  return {
    external_id:  event.id?.startsWith('u') ? null : event.id,  // user-published events get a fresh server id
    source:       user ? `user:${user.id}` : 'user',
    // Trust + verification flags are admin-set; never trust the client value
    // (RLS now enforces this anyway, but defense-in-depth).
    trust_tier:   0,
    title:        event.title,
    description:  event.desc || '',
    poster:       event.poster || null,
    org_name:     event.org || null,
    org_user_id:  user?.id || null,
    org_verified: false,
    sport:        event.sport || null,
    type:         event.type || null,
    skill_level:  event.skill || null,
    // Parse the user's display when-string ("Sat · Nov 14 · 7:00 PM") to a
    // real ISO timestamp so the Discover sort and the past-event archival
    // both see this event in chronological order. Falls back to null if
    // unparseable — Discover already sorts NULLs LAST.
    starts_at:    parseWhenToISO(event.when),
    when_text:    event.when || null,
    location:     event.location || null,
    coords:       event.coords || null,
    lat:          event.lat ?? null,
    lon:          event.lon ?? null,
    distance_km:  event.distanceKm ?? null,
    cost:         event.cost || null,
    prize:        event.prize || null,
    reg_link:     event.regLink || null,
    going_count:  event.going || 0,
    // Featured + status are also admin-only, regardless of what the client passes.
    featured:     false,
    live:         !!event.live,
    status:       'pending',
    color:        event.color || 95,
    sponsors:     event.sponsors || [],
    results:      event.results || null,
    updates:      event.updates || null,
  };
}

// Parse the human "Sat · Nov 14 · 7:00 PM" or ISO datetime string into a real
// timestamp. Returns null if we can't pin a specific day. Best-effort — used
// for sort ordering, not for canonical display.
function parseWhenToISO(when) {
  if (!when) return null;
  const s = String(when).trim();
  // Already-ISO date or datetime — pass through.
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s);
    return isNaN(d) ? null : d.toISOString();
  }
  // "Sat · Nov 14 · 7:00 PM" style.
  const MONTHS = { jan:0, feb:1, mar:2, apr:3, may:4, jun:5, jul:6, aug:7, sep:8, oct:9, nov:10, dec:11 };
  const m = s.toLowerCase().match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})(?:.*?(\d{1,2}):(\d{2})\s*(am|pm)?)?/);
  if (!m) return null;
  const month = MONTHS[m[1]];
  const day = parseInt(m[2], 10);
  let hour = m[3] ? parseInt(m[3], 10) : 0;
  const min = m[4] ? parseInt(m[4], 10) : 0;
  if (m[5] === 'pm' && hour < 12) hour += 12;
  if (m[5] === 'am' && hour === 12) hour = 0;
  // Year inference: if month is in the past (more than 30 days back), assume next year.
  const now = new Date();
  let year = now.getFullYear();
  const candidate = new Date(year, month, day, hour, min);
  if (candidate.getTime() < now.getTime() - 30 * 86400_000) year += 1;
  return new Date(year, month, day, hour, min).toISOString();
}

// ─────────────────────────────────────────────────────────────
// Fuzzy dedupe — the Layer-2 logic that runs before any insert.
// Returns matches sorted by descending score.
// ─────────────────────────────────────────────────────────────

function findDuplicates(candidate, allEvents) {
  if (!candidate?.title) return [];
  const cand = normalizeForCompare(candidate);
  const scored = [];
  for (const e of allEvents) {
    if (e.id === candidate.id) continue;          // editing self is fine
    const score = scoreSimilarity(cand, normalizeForCompare(e));
    // Threshold mirrors ingest/dedupe.js — 0.65 is the noise floor.
    if (score >= 0.65) scored.push({ event: e, score });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, 5);
}

function normalizeForCompare(e) {
  return {
    id:       e.id,
    title:    cleanText(e.title || ''),
    venue:    cleanText(e.location || ''),
    org:      cleanText(e.org || ''),
    sport:    e.sport || '',
    type:     e.type || '',
    when:     extractDayKey(e.when || ''),     // "Nov 14" → "1114"
    distance: e.distanceKm ?? null,
  };
}

function cleanText(s) {
  return String(s || '').toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// "Sat · Nov 14 · 7:00 PM" → "1114" (month+day, year-agnostic for fuzzy match)
function extractDayKey(when) {
  const MONTHS = { jan:'01', feb:'02', mar:'03', apr:'04', may:'05', jun:'06',
                   jul:'07', aug:'08', sep:'09', oct:'10', nov:'11', dec:'12' };
  const m = (when || '').toLowerCase().match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})/);
  if (!m) return '';
  return MONTHS[m[1]] + String(parseInt(m[2], 10)).padStart(2, '0');
}

// 0.0–1.0 score combining title similarity, date match, venue match, etc.
function scoreSimilarity(a, b) {
  // Hard requirement: same date is a strong signal.
  const sameDate = a.when && b.when && a.when === b.when;
  const bothHaveDates = a.when && b.when;
  // Title (Jaccard on word sets, gives credit for partial overlap).
  const titleSim = jaccard(a.title.split(' '), b.title.split(' '));
  // Venue: same exact city/place name? close to it?
  const venueSim = a.venue && b.venue && (a.venue === b.venue
    ? 1
    : (jaccard(a.venue.split(' '), b.venue.split(' '))));
  const sameType  = a.type  && b.type  && a.type  === b.type;
  const sameOrg   = a.org   && b.org   && a.org   === b.org;
  const sameSport = a.sport && b.sport && a.sport === b.sport;

  // Score is weighted sum, capped at 1.0.
  let s = 0;
  if (sameDate)        s += 0.4;
  s += titleSim * 0.3;
  s += (venueSim || 0) * 0.15;
  if (sameOrg)         s += 0.1;
  if (sameType)        s += 0.05;
  if (sameSport)       s += 0.05;     // weakly corroborating

  // Without a same-date AND some title overlap, we can't be confident.
  if (!sameDate && titleSim < 0.3) return Math.min(s, 0.4);
  // Both dated, dates differ → treat as recurring instances, not duplicates.
  if (bothHaveDates && !sameDate)   return Math.min(s, 0.6);
  return Math.min(s, 1.0);
}

function jaccard(a, b) {
  if (!a.length || !b.length) return 0;
  const A = new Set(a.filter(w => w.length > 2));
  const B = new Set(b.filter(w => w.length > 2));
  const intersect = [...A].filter(x => B.has(x)).length;
  const union = new Set([...A, ...B]).size;
  return union === 0 ? 0 : intersect / union;
}

// ─────────────────────────────────────────────────────────────
// Public riders. Reads the public_riders view, which exposes only safe fields
// (name/sports/skill/city/accolades) for users with openToRide=true.
// Returns an empty array if Supabase isn't configured — caller falls back
// to the hardcoded seed list in data.jsx.
// ─────────────────────────────────────────────────────────────
async function fetchRiders() {
  try {
    const sb = window.JR_SUPABASE;
    if (!sb) return [];
    const { data, error } = await sb
      .from('public_riders')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(50);
    if (error) {
      console.warn('[JamRadar] public_riders fetch failed:', error.message);
      return [];
    }
    // Normalize each row into the same shape RidersNearbySection expects.
    return (data || []).map(r => {
      const sports = Array.isArray(r.sports) ? r.sports : [];
      const accolades = Array.isArray(r.accolades) ? r.accolades : [];
      return {
        id: 'sb:' + r.id,
        name: r.display_name || 'Rider',
        initials: (r.display_name || 'R')
          .split(/\s+/).map(s => s[0]).slice(0, 2).join('').toUpperCase() || 'R',
        homeMountain: '',
        city: r.city || '',
        sports,
        skill: r.skill || 'Intermediate',
        bio: '',
        available: true,                  // they wouldn't be in this view otherwise
        distanceKm: null,                 // unknown without geocoding the city
        color: 95 + (Math.abs(hashCode(r.id)) % 200),  // stable per-user gradient
        accolades,
        _real: true,                      // marker so UI can distinguish if needed
      };
    });
  } catch (e) {
    console.warn('[JamRadar] public_riders fetch threw:', e.message);
    return [];
  }
}
// Cheap deterministic hash to give each rider a stable color.
function hashCode(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i);
  return h | 0;
}
window.JR_FETCH_RIDERS = fetchRiders;

// ─────────────────────────────────────────────────────────────
// Public gear deals. Reads gear_deals (status='approved'), which the ingest
// pipeline writes daily. Normalized into the same shape as the seed entries
// in data.jsx so GearScreen can render either source unchanged.
// ─────────────────────────────────────────────────────────────
async function fetchGearDeals() {
  try {
    const sb = window.JR_SUPABASE;
    if (!sb) return [];
    const { data, error } = await sb
      .from('gear_deals')
      .select('*')
      .eq('status', 'approved')
      .order('off_pct', { ascending: false, nullsFirst: false })
      .limit(60);
    if (error) {
      console.warn('[JamRadar] gear_deals fetch failed:', error.message);
      return [];
    }
    return (data || []).map(d => ({
      id:         'sb:' + d.id,
      shop:       d.shop || 'Shop',
      kind:       'Affiliate',
      title:      d.title,
      sale:       Number(d.price),
      original:   d.original != null ? Number(d.original) : null,
      off:        d.off_pct,
      sport:      d.sport || 'snowboard',
      distanceKm: null,                // unknown without geocoding the shop
      sponsored:  false,
      reg_link:   d.reg_link || null,  // GearCard can use this for an outbound click
      _real:      true,
    }));
  } catch (e) {
    console.warn('[JamRadar] gear_deals fetch threw:', e.message);
    return [];
  }
}
window.JR_FETCH_GEAR_DEALS = fetchGearDeals;

// ─────────────────────────────────────────────────────────────
// Marketplace listings — anyone can read active rows, sellers see their own
// withdrawn/sold via the listings_public_read RLS policy.
// ─────────────────────────────────────────────────────────────
async function fetchGearListings() {
  try {
    const sb = window.JR_SUPABASE;
    if (!sb) return [];
    const { data, error } = await sb
      .from('gear_listings')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(80);
    if (error) {
      console.warn('[JamRadar] gear_listings fetch failed:', error.message);
      return [];
    }
    return data || [];
  } catch (e) {
    console.warn('[JamRadar] gear_listings fetch threw:', e.message);
    return [];
  }
}
window.JR_FETCH_GEAR_LISTINGS = fetchGearListings;

// ─────────────────────────────────────────────────────────────
// Pending merges (admin queue for medium-confidence dedupe matches).
// ─────────────────────────────────────────────────────────────

async function fetchPendingMerges() {
  try {
    const sb = window.JR_SUPABASE;
    if (!sb) return [];
    const { data, error } = await sb
      .from('pending_merges')
      .select('*, match_event:events!pending_merges_match_event_id_fkey(*)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (error) {
      console.warn('[JamRadar] pending_merges fetch failed:', error.message);
      return [];
    }
    return (data || []).map(row => ({
      id: row.id,
      candidate: row.candidate,
      candidateSource: row.candidate_source,
      matchEventId: row.match_event_id,
      matchEvent: row.match_event ? rowToEvent(row.match_event) : null,
      score: Number(row.score),
      status: row.status,
      createdAt: row.created_at,
    }));
  } catch (e) {
    console.warn('[JamRadar] pending_merges fetch threw:', e.message);
    return [];
  }
}

async function resolvePendingMerge(id, action, user) {
  // action: 'merged' | 'split' | 'discarded'
  const sb = window.JR_SUPABASE;
  if (!sb) throw new Error('Supabase not configured');

  // Read the row first so we can act on it (for 'split' we insert the candidate
  // as a new event; for 'merged' we patch the matched event).
  const { data: row, error: getErr } = await sb
    .from('pending_merges').select('*').eq('id', id).maybeSingle();
  if (getErr || !row) throw new Error(getErr?.message || 'not found');

  if (action === 'split') {
    const { error: insErr } = await sb.from('events').insert(row.candidate);
    if (insErr) throw insErr;
  } else if (action === 'merged' && row.match_event_id) {
    // Best-effort patch: only fill in fields the matched event lacks.
    const { data: matched } = await sb.from('events')
      .select('*').eq('id', row.match_event_id).maybeSingle();
    const cand = row.candidate || {};
    const patch = {};
    ['poster', 'description', 'reg_link', 'cost', 'prize', 'starts_at',
     'lat', 'lon', 'coords', 'location'].forEach(k => {
      if (!matched?.[k] && cand[k]) patch[k] = cand[k];
    });
    if (Object.keys(patch).length) {
      const { error: updErr } = await sb.from('events').update(patch).eq('id', row.match_event_id);
      if (updErr) throw updErr;
    }
  }
  // Mark the queue row resolved.
  await sb.from('pending_merges').update({
    status: action,
    decided_by: user?.id || null,
    decided_at: new Date().toISOString(),
  }).eq('id', id);
}

// One-time helper: paste this in the browser console after running schema.sql
// to push the seed events from data.jsx into your Supabase events table.
// Idempotent — re-running is safe (skips events that already match by title+date).
//
// RLS: the insert policy requires `status='pending'`, so we insert pending and
// then update to 'approved' (the owner-update policy permits us to set status
// on rows we just inserted).
window.seedEventsToSupabase = async function seedEventsToSupabase() {
  if (!window.JR_SUPABASE_READY) {
    console.error('[JamRadar] Supabase not configured.');
    return;
  }
  const u = await window.JR_AUTH.getUser();
  if (!u) {
    console.error('[JamRadar] Sign in first — RLS requires an authenticated user to insert.');
    return;
  }
  const sb = window.JR_SUPABASE;
  const seed = window.JR_DATA.EVENTS || [];
  // Pull existing so we can skip dupes by (title + when).
  const { data: existing } = await sb.from('events').select('title, when_text');
  const seen = new Set((existing || []).map(r => r.title + '|' + (r.when_text || '')));
  const toInsert = seed
    .filter(e => !seen.has(e.title + '|' + (e.when || '')))
    .map(e => ({ ...eventToRow(e, u), status: 'pending' }));   // RLS requires 'pending' on insert
  if (toInsert.length === 0) {
    console.info('[JamRadar] All seed events already in Supabase.');
    return;
  }
  // Step 1 — insert as pending
  const { data: inserted, error: insErr } = await sb
    .from('events')
    .insert(toInsert)
    .select('id');
  if (insErr) {
    console.error('[JamRadar] seed insert failed:', insErr.message);
    return;
  }
  // Step 2 — flip them all to approved (RLS owner-update permits this).
  const ids = (inserted || []).map(r => r.id);
  if (ids.length) {
    const { error: updErr } = await sb
      .from('events')
      .update({ status: 'approved', featured: false })
      .in('id', ids);
    if (updErr) {
      console.warn('[JamRadar] seed approve step failed:', updErr.message);
      console.warn('[JamRadar] Events were seeded but stayed in pending. Approve them in Admin → Pending tab.');
      return;
    }
  }
  console.info(`[JamRadar] Seeded ${ids.length} events to Supabase, all approved.`);
  console.info('[JamRadar] Refresh the app — they should appear within ~60 seconds (sooner if you reload).');
};

window.useJamStore = useJamStore;
window.JR_DEFAULT_PREFS = DEFAULT_PREFS;
window.JR_FIND_DUPLICATES = findDuplicates;
