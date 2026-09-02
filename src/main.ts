import "./styles/tokens.css";
import "./styles/app.css";
import { createApp, type AppHandle } from "./app";
import { applyTheme } from "./a11y/theme";
import { loadPrefs } from "./storage/profiles";
import { setLocale, t } from "./i18n";

// 저장된 설정을 첫 페인트 전에 반영 (테마 깜빡임 방지).
const prefs = loadPrefs();
applyTheme(prefs.theme);
setLocale(prefs.locale);

// index.html 의 부트스트랩 텍스트(스킵 링크)를 i18n 으로 채운다 — HTML 에 리터럴 안 남김.
for (const node of document.querySelectorAll<HTMLElement>("[data-i18n]")) {
  const key = node.dataset.i18n as Parameters<typeof t>[0];
  node.textContent = t(key);
}

const root = document.querySelector<HTMLElement>("[data-app-root]");
if (!root) throw new Error("앱 루트(main[data-app-root])를 찾을 수 없습니다");

const app = createApp(root);

// 프로덕션에서만 service worker 등록 (스펙 §8). 실패는 조용히 무시.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      /* 오프라인 캐시는 있으면 좋은 것 — 없다고 앱이 막히면 안 됨 */
    });
  });
}

// 개발 빌드에만 노출되는 결정적 자동화 훅 (Playwright 가 사용).
// 프로덕션 번들에는 tree-shake 로 빠진다.
if (import.meta.env.DEV) {
  (window as unknown as { __ganeum: AppHandle }).__ganeum = app;
}
