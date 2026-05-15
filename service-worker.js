// JamRadar — service worker
// Cache-first for the app shell (so the app loads instantly + works offline);
// stale-while-revalidate for CDN scripts (React, Babel, Leaflet, fonts, tiles);
// network-first navigation fallback so HTML updates aren't pinned forever.

const VERSION   = 'jamradar-v30';
const CACHE     = `${VERSION}-shell`;
const RUNTIME   = `${VERSION}-runtime`;

const APP_SHELL = [
  '/',
  '/JamRadar.html',
  '/landing.html',
  '/offline.html',
  '/styles.css',
  '/manifest.webmanifest',
  '/icon.svg',
  '/icon-maskable.svg',
  '/app.jsx',
  '/config.jsx',
  '/data.jsx',
  '/store.jsx',
  '/supabase-config.jsx',
  '/ui.jsx',
  '/ios-frame.jsx',
  '/tweaks-panel.jsx',
  '/screens-onboarding.jsx',
  '/screens-main.jsx',
  '/screens-detail.jsx',
  '/screens-org-profile.jsx',
  '/screens-rider-profile.jsx',
  '/screens-riders.jsx',
  '/screens-shop.jsx',
  '/screens-marketplace.jsx',
  '/screens-admin.jsx',
  '/screens-auth.jsx',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(APP_SHELL))
  );
  // We no longer skipWaiting() unconditionally on install. The page-side
  // updatefound handler explicitly posts SKIP_WAITING when it's safe to
  // swap, then listens for controllerchange to reload. Keeps the in-flight
  // page from getting torn down mid-action.
});

// Allow the page to trigger a takeover when the user explicitly opts in
// (taps the "Update available" toast). The auto-reload-on-controllerchange
// flow was disruptive — taps mid-interaction landed on a freshly-loaded
// home screen, indistinguishable from "back button didn't work."
self.addEventListener('message', (event) => {
  if (!event.data) return;
  if (event.data.type === 'SKIP_WAITING' || event.data.type === 'SKIP_WAITING_AND_RELOAD') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  // HTML navigations: network-first, fall back to cached shell, then offline.html.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then((res) => {
        const clone = res.clone();
        caches.open(CACHE).then((c) => c.put(req, clone)).catch(() => {});
        return res;
      }).catch(async () => (await caches.match('/JamRadar.html')) || caches.match('/offline.html'))
    );
    return;
  }

  if (sameOrigin) {
    // Static app files: cache-first.
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).then((res) => {
        const clone = res.clone();
        caches.open(CACHE).then((c) => c.put(req, clone)).catch(() => {});
        return res;
      }))
    );
    return;
  }

  // Cross-origin (CDN, tiles): stale-while-revalidate.
  event.respondWith(
    caches.open(RUNTIME).then(async (cache) => {
      const cached = await cache.match(req);
      const networkPromise = fetch(req).then((res) => {
        if (res && res.status === 200) cache.put(req, res.clone()).catch(() => {});
        return res;
      }).catch(() => cached);
      return cached || networkPromise;
    })
  );
});
