const V = 'budget-v1';
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

  // La page elle-même : réseau d'abord pour récupérer les mises à jour, cache en secours.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(r => { caches.open(V).then(c => c.put('./index.html', r.clone())); return r; })
        .catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }

  // Le reste (icônes, polices) : cache d'abord, rafraîchi en arrière-plan.
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req)
        .then(r => { if (r.ok || r.type === 'opaque') caches.open(V).then(c => c.put(req, r.clone())); return r; })
        .catch(() => hit);
      return hit || net;
    })
  );
});
