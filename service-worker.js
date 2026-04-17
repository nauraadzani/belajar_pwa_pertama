self.addEventListener("fetch", event => {
  const request = event.request;

  // 🔹 Handle navigasi (HTML)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(self.registration.scope + "offline.html")
      )
    );
    return;
  }

  // 🔹 Asset lokal → stale-while-revalidate + fallback
  if (request.url.startsWith(self.location.origin)) {
    event.respondWith(
      caches.match(request).then(cached => {
        const fetchPromise = fetch(request)
          .then(response => {
            if (
              response &&
              response.status === 200 &&
              response.type === "basic"
            ) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then(cache =>
                cache.put(request, clone)
              );
            }
            return response;
          })
          .catch(() =>
            caches.match(self.registration.scope + "offline.html")
          );

        return cached || fetchPromise;
      })
    );
    return;
  }

  // 🔹 Eksternal → network-first
  event.respondWith(
    fetch(request).catch(() =>
      caches.match(request) ||
      caches.match(self.registration.scope + "offline.html")
    )
  );
});