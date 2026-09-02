/*
 * 가늠 service worker — 수동 작성 스텁 (스펙 §8: 의존성 최소).
 *
 * 주 1–2 범위에서는 "앱 셸을 캐시해 오프라인 첫 페인트를 보장한다"까지만 한다.
 * 정밀한 프리캐시 목록 / 버전 회전 / 측정·결과 오프라인 완성은 주 7–8 항목.
 *
 * CACHE_VERSION 을 올리면 이전 캐시는 activate 에서 정리된다.
 */
const CACHE_VERSION = "ganeum-shell-v1";
const APP_SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) {
    return;
  }
  // Network-first for navigations, cache-first for static assets.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((hit) => hit || caches.match("./index.html"))),
    );
    return;
  }
  event.respondWith(
    caches.match(request).then((hit) => {
      if (hit) return hit;
      return fetch(request).then((response) => {
        if (response.ok && response.type === "basic") {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    }),
  );
});
