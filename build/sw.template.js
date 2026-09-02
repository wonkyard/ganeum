/*
 * 가늠 service worker — 빌드 시 `vite.config.ts` 의 serviceWorkerPrecache 플러그인이
 * 아래 두 플레이스홀더를 실제 빌드 산출물(캐시 이름 · 에셋 목록)로 치환한다
 * (brief-3A §4 D1). 이 템플릿 자체는 번들되지 않는다.
 *
 * 정책:
 * - install: 빌드가 낸 에셋 목록 전체를 프리캐시한다 → 첫 로드 후 완전 오프라인.
 * - activate: 캐시 이름(빌드 해시 포함)이 다른 이전 캐시를 정리한다.
 * - fetch: 오프라인 우선(캐시 우선) + 온라인이면 백그라운드로 갱신
 *   (stale-while-revalidate). 네비게이션도 캐시 우선이라 비행기 모드 새로고침이 된다.
 */
const CACHE_VERSION = "__CACHE_VERSION__";
const PRECACHE = __PRECACHE_LIST__;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_VERSION).then((cache) =>
      cache.match(request, { ignoreSearch: true }).then((hit) => {
        const network = fetch(request)
          .then((response) => {
            if (response && response.ok && response.type === "basic") {
              cache.put(request, response.clone());
            }
            return response;
          })
          .catch(() =>
            request.mode === "navigate" ? cache.match("./index.html") : undefined,
          );
        // 오프라인 우선: 캐시가 있으면 즉시 주고 네트워크는 뒤에서 갱신.
        return hit || network;
      }),
    ),
  );
});
