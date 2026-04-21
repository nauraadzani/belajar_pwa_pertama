const CACHE_NAME = "pwa-template-v2";
const BASE = "/belajar_pwa_pertama";
const OFFLINE_URL = `${BASE}/offline.html`;

const PRECACHE_ASSETS = [
  `${BASE}/`,
  `${BASE}/index.html`,
  `${BASE}/offline.html`,
  `${BASE}/css/style.css`,
  `${BASE}/js/app.js`,
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting()) // langsung aktif tanpa tunggu tab lama
  );
});

// ✅ FIX 2: Bersihkan cache lama saat activate
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim()) // ambil kendali semua tab langsung
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET") return;
  if (url.protocol === "chrome-extension:") return;

  // Navigasi (HTML) → network-first, fallback cache, fallback offline.html
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(response => {
          // ✅ Cache halaman yang berhasil diakses
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          return response;
        })
        .catch(() =>
          caches.match(request)
            .then(cached => cached || caches.match(OFFLINE_URL))
        )
    );
    return;
  }

  // Asset lokal → stale-while-revalidate (logika sudah benar)
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then(cached => {
        const fetchPromise = fetch(request)
          .then(response => {
            if (response?.status === 200 && response.type === "basic") {
              caches.open(CACHE_NAME)
                .then(cache => cache.put(request, response.clone()));
            }
            return response;
          })
          .catch(() => caches.match(OFFLINE_URL));

        return cached || fetchPromise;
      })
    );
    return;
  }

  // Resource eksternal → network-first, fallback cache → offline.html
  event.respondWith(
    fetch(request)
      .then(response => {
        if (response?.ok) {
          caches.open(CACHE_NAME)
            .then(cache => cache.put(request, response.clone()));
        }
        return response;
      })
      .catch(() =>
        caches.match(request)
          .then(r => r || caches.match(OFFLINE_URL))
      )
  );
});