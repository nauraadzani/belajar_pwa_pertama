self.addEventListener("fetch", event => {
  const request = event.request;

  // Handle navigasi (HALAMAN)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/offline.html"))
    );
    return;
  }

  // Asset lokal → stale-while-revalidate
  if (request.url.startsWith(self.location.origin)) {
    event.respondWith(
      caches.match(request).then(cached => {
        const fetchPromise = fetch(request).then(networkResponse => {
          if (networkResponse.ok) {
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, networkResponse.clone());
            });
          }
          return networkResponse;
        });

        return cached || fetchPromise;
      })
    );
    return;
  }

  // Eksternal → network-first + fallback
  event.respondWith(
    fetch(request).catch(() =>
      caches.match(request) || caches.match("/offline.html")
    )
  );
});