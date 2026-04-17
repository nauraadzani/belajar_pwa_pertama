const CACHE_NAME = "pwa-template-v2";
const OFFLINE_URL = self.registration.scope + "offline.html";

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);

  // Abaikan non-GET & chrome-extension
  if (request.method !== "GET") return;
  if (url.protocol === "chrome-extension:") return;

  // 🔹 Navigasi (HTML) → cache-first, fallback offline.html
  if (request.mode === "navigate") {
    event.respondWith(
      caches.match(request)
        .then(cached => cached || fetch(request))
        .catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // 🔹 Asset lokal → stale-while-revalidate
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then(cached => {
        // Selalu fetch di background untuk update cache
        const fetchPromise = fetch(request)
          .then(response => {
            if (response && response.status === 200 && response.type === "basic") {
              const clone = response.clone();
              caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
            }
            return response;
          })
          .catch(() => caches.match(OFFLINE_URL));

        // Kembalikan cache dulu, fetch jalan di background
        return cached || fetchPromise;
      })
    );
    return;
  }

  // 🔹 Resource eksternal → network-first, fallback cache → offline.html
  event.respondWith(
    fetch(request)
      .then(response => {
        // ✅ Cache response eksternal jika valid
        if (response && response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      })
      .catch(() =>
        // ✅ Promise chain yang benar (bukan pakai ||)
        caches.match(request).then(r => r || caches.match(OFFLINE_URL))
      )
  );
});