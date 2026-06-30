const CACHE = 'times-v1';

// Tài nguyên cache ngay khi cài
const PRECACHE = ['/', '/thong-ke', '/lo-gan', '/lich', '/manifest.json', '/icon.svg'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const { request } = e;
  const url = new URL(request.url);

  // API: network-first, fallback báo offline
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({ error: 'Offline — không có kết nối mạng' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );
    return;
  }

  // Tài nguyên tĩnh & trang: cache-first, fallback network rồi cache
  e.respondWith(
    caches.match(request).then(cached => {
      const network = fetch(request).then(res => {
        if (res.ok && url.origin === self.location.origin) {
          caches.open(CACHE).then(c => c.put(request, res.clone()));
        }
        return res;
      });
      return cached ?? network;
    })
  );
});
