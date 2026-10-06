/* App-shell and public-market cache only. Financial state stays in IndexedDB. */
const VERSION = "ek-shell-v2";
const CORE = [
  "/app",
  "/app/home",
  "/app/plan",
  "/app/budget",
  "/app/reserve",
  "/app/goals",
  "/app/portfolio",
  "/app/capital",
  "/app/history",
  "/app/settings",
  "/offline.html",
  "/manifest.webmanifest",
  "/api/market",
  "/icons/wallet-192.png",
  "/icons/wallet-512.png",
  "/icons/wallet-180.png",
  "/icons/wallet-maskable-512.png",
  "/app/scenario",
];
self.addEventListener("install", (event) =>
  event.waitUntil(
    (async () => {
      const cache = await caches.open(VERSION);
      for (const url of CORE) {
        try {
          const response = await fetch(url);
          if (!response.ok) continue;
          await cache.put(url, response.clone());
          if (response.headers.get("content-type")?.includes("text/html")) {
            const html = await response.text();
            const assets = [
              ...html.matchAll(/(?:src|href)="(\/_next\/static\/[^"<>]+)"/g),
            ].map((m) => m[1].replaceAll("&amp;", "&"));
            await Promise.all(
              [...new Set(assets)].map(async (path) => {
                try {
                  const res = await fetch(path);
                  if (res.ok) await cache.put(path, res);
                } catch {}
              }),
            );
          }
        } catch {}
      }
    })(),
  ),
);
self.addEventListener("activate", (event) =>
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys())
        if (name.startsWith("ek-shell-") && name !== VERSION)
          await caches.delete(name);
      await self.clients.claim();
    })(),
  ),
);
self.addEventListener("fetch", (event) => {
  const req = event.request,
    url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  // Next router prefetches may be cancelled. Let the browser handle their
  // lifetime and headers; they are not offline HTML navigation responses.
  if (req.headers.has("RSC") || url.searchParams.has("_rsc")) return;
  if (
    url.pathname.startsWith("/api/") &&
    !["/api/market", "/api/history"].includes(url.pathname)
  )
    return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(VERSION);
      if (
        url.pathname.startsWith("/_next/static/") ||
        url.pathname.startsWith("/icons/")
      ) {
        const stored = await cache.match(req);
        if (stored) return stored;
      }
      try {
        const response = await fetch(req);
        if (
          response.ok &&
          (url.pathname.startsWith("/_next/static/") ||
            url.pathname.startsWith("/app") ||
            ["/api/market", "/api/history"].includes(url.pathname) ||
            url.pathname.startsWith("/icons/"))
        )
          await cache.put(req, response.clone());
        return response;
      } catch {
        const stored = await cache.match(req);
        if (stored) return stored;
        if (req.mode === "navigate")
          return (
            (await cache.match(url.pathname)) ||
            (await cache.match("/app")) ||
            (await cache.match("/offline.html"))
          );
        return new Response("Offline", { status: 503 });
      }
    })(),
  );
});
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
