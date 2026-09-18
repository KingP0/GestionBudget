const V = 'budget-v1.1';
const SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './icon-180.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  // The app page always comes from the network when online, so a new version
  // shows up at the next launch; the saved copy keeps the app working offline.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(r => { caches.open(V).then(c => c.put('./index.html', r.clone())); return r; })
        .catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }

  // Icons and fonts load instantly from the saved copy and refresh in the
  // background.
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req)
        .then(r => { if (r.ok || r.type === 'opaque') caches.open(V).then(c => c.put(req, r.clone())); return r; })
        .catch(() => hit);
      return hit || net;
    })
  );
});
