const CACHE_NAME = "mealwise-pwa-v166";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-512-maskable.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Do NOT cache Supabase or Gemini/Google calls
  if (url.hostname.includes("supabase.co") || url.hostname.includes("googleapis.com")) {
    return;
  }

  // Cache-first only for static assets / app shell
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});