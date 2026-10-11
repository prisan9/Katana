/* Katana service worker: keeps the app, its dictionary and the libraries it fetches available offline.
   Speech models are cached separately by the speech library. */
const V = 'katana-v5';
const KEEP = [V, 'katana-big', 'katana-fonts', 'katana-voice'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(['./', 'index.html', 'manifest.webmanifest', 'icon.png'])).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('katana-') && !KEEP.includes(k)).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
const cacheFirst = (name, r) => caches.open(name).then(async c => (await c.match(r)) || fetch(r).then(res => { if (res.ok || res.type === 'opaque') c.put(r, res.clone()); return res; }));
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || r.headers.has('range')) return;
  const u = new URL(r.url);
  if (u.origin === location.origin) {
    if (u.pathname.endsWith('/jmdict.tsv')) { e.respondWith(cacheFirst('katana-big', r)); return; }
    e.respondWith(fetch(r).then(res => { if (res.ok) caches.open(V).then(c => c.put(r, res.clone())); return res; })
      .catch(() => caches.match(r).then(m => m || (r.mode === 'navigate' ? caches.match('index.html') : Response.error()))));
    return;
  }
  if (u.hostname === 'cdn.jsdelivr.net') { e.respondWith(cacheFirst('katana-big', r)); return; }   /* pinned versions never change */
  if (/fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)) {
    e.respondWith(caches.open('katana-fonts').then(async c => { const m = await c.match(r); const f = fetch(r).then(res => { c.put(r, res.clone()); return res; }).catch(() => m); return m || f; }));
  }
});
