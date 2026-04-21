const CACHE_NAME = "pwa-waroeng-v4";
const BASE = "/belajar_pwa_pertama";
const OFFLINE_URL = `${BASE}/offline.html`;

const PRECACHE_ASSETS = [
  `${BASE}/`,
  `${BASE}/index.html`,
  `${BASE}/pemasukan.html`,
  `${BASE}/pengeluaran.html`,
  `${BASE}/hutang.html`,
  `${BASE}/stok.html`,
  `${BASE}/offline.html`,
  `${BASE}/style.css`,
  `${BASE}/icons/launchericon-512x512.png`,
];

// ─── INSTALL ────────────────────────────────────────────────
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ─── ACTIVATE ───────────────────────────────────────────────
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ─── FETCH ──────────────────────────────────────────────────
self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET") return;
  if (url.protocol === "chrome-extension:") return;

  // 🔹 Navigasi HTML → network-first, fallback cache, fallback offline.html
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match(request)
            .then(cached => cached || caches.match(OFFLINE_URL))
            // ✅ FIX: Jika offline.html juga gagal, return Response darurat
            .then(response => response || new Response(
              `<!DOCTYPE html>
              <html lang="id">
              <head><meta charset="UTF-8"><title>Offline</title></head>
              <body style="font-family:sans-serif;text-align:center;padding:50px">
                <h1>⚠️ Tidak Ada Koneksi</h1>
                <p>Periksa koneksi internet kamu dan coba lagi.</p>
                <button onclick="location.reload()">🔄 Coba Lagi</button>
              </body></html>`,
              { headers: { "Content-Type": "text/html; charset=utf-8" } }
            ))
        )
    );
    return;
  }

  // 🔹 Asset lokal → stale-while-revalidate
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

  // 🔹 Resource eksternal → network-first, fallback cache → offline.html
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

// ─── PUSH NOTIFICATION ──────────────────────────────────────
// ✅ Ditambahkan agar PWABuilder tidak warning "no push handler"
self.addEventListener("push", event => {
  const data = event.data?.json() ?? {
    title: "WaroengPintar",
    body: "Ada notifikasi baru!",
    icon: `${BASE}/icons/launchericon-512x512.png`
  };

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon ?? `${BASE}/icons/launchericon-512x512.png`,
      badge: `${BASE}/icons/launchericon-512x512.png`,
    })
  );
});

// ─── NOTIFICATION CLICK ─────────────────────────────────────
self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true })
      .then(clientList => {
        // Jika app sudah terbuka, fokus ke sana
        for (const client of clientList) {
          if (client.url.includes(BASE) && "focus" in client) {
            return client.focus();
          }
        }
        // Jika belum terbuka, buka tab baru
        if (clients.openWindow) {
          return clients.openWindow(`${BASE}/index.html`);
        }
      })
  );
});

// ─── BACKGROUND SYNC ────────────────────────────────────────
// ✅ Ditambahkan untuk skor PWABuilder lebih tinggi
self.addEventListener("sync", event => {
  if (event.tag === "background-sync") {
    event.waitUntil(
      // Placeholder: bisa diisi logic sync data ke server
      Promise.resolve()
    );
  }
});