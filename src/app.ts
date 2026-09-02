/**
 * 앱 셸 — 라우터 배선 + 최상위 에러 경계만 (brief-3A §5, P0-5).
 * 화면 자체는 `src/ui/screens/*` 에 있고 `app.ts` 는 얇게 유지한다.
 *
 * 라우트: `#/`, `#/setup`, `#/measure`, `#/results/:id`, `#/card/:id`.
 * `measuring` 중 새로고침/이탈 → 진행 버림, `#/` 로 (screen-design 상태 흐름).
 */
import { createRouter } from "./ui/router";
import { prefersReducedMotion, onReducedMotionChange } from "./a11y/reduced-motion";
import { loadPrefs } from "./storage/profiles";
import { onLocaleChange, t } from "./i18n";
import { el } from "./ui/dom";
import type { MountContext } from "./ui/screen";
import { renderHome } from "./ui/screens/s0-home";
import { renderSetup } from "./ui/screens/s1-setup";
import { renderMeasure, type MeasureHandle } from "./ui/screens/s2-measure";
import { renderResults } from "./ui/screens/s3-results";
import { renderCard } from "./ui/screens/s5-card";

export interface AppHandle {
  /** 자동화/스모크 훅 — 현재 타깃을 표시 좌표로 누른다. */
  tapCurrentTarget(): void;
  /** 자동화 훅 — 현재 타깃 중심의 뷰포트 좌표. */
  currentTargetPoint(): { x: number; y: number } | null;
  /** 현재 라우트. */
  route(): string;
}

export function createApp(root: HTMLElement): AppHandle {
  const router = createRouter(() => mount(renderHome, {}));
  let cleanups: Array<() => void> = [];
  let measure: MeasureHandle | null = null;

  const reducedMotion = (): boolean => {
    const override = loadPrefs().reducedMotionOverride;
    return override ?? prefersReducedMotion();
  };

  const unmount = (): void => {
    for (const fn of cleanups.splice(0)) {
      try {
        fn();
      } catch {
        /* 정리 실패가 다음 화면을 막지 않도록 */
      }
    }
    measure = null;
    root.replaceChildren();
  };

  const mount = (render: (ctx: MountContext) => void, params: Record<string, string>): void => {
    unmount();
    const ctx: MountContext = {
      host: root,
      params,
      go: (path) => router.go(path),
      addCleanup: (fn) => cleanups.push(fn),
      reducedMotion,
      rerender: () => router.reload(),
    };
    try {
      render(ctx);
    } catch (err) {
      renderErrorBoundary(err);
    }
  };

  const renderErrorBoundary = (err: unknown): void => {
    if (typeof console !== "undefined") console.error("[ganeum] 화면 렌더 실패", err);
    root.replaceChildren();
    const section = el("section", { class: "screen screen-recover" });
    const retry = el("button", { type: "button", class: "btn-primary" }, t("error.retry"));
    retry.addEventListener("click", () => router.go("/setup"));
    section.append(
      el("h1", { tabindex: "-1" }, t("error.title")),
      el("p", {}, t("error.body")),
      retry,
    );
    root.append(section);
    (section.querySelector("h1") as HTMLElement).focus();
  };

  router
    .add("/", () => mount(renderHome, {}))
    .add("/setup", () => mount(renderSetup, {}))
    .add("/measure", () =>
      mount((ctx) => {
        measure = renderMeasure(ctx);
      }, {}),
    )
    .add("/results/:id", (m) => mount(renderResults, m.params))
    .add("/card/:id", (m) => mount(renderCard, m.params))
    .start();

  // 테마/언어/모션 설정이 바뀌면 현재 화면을 다시 그린다. 이 구독은 앱 수명 동안 유지.
  onLocaleChange(() => router.reload());
  onReducedMotionChange(() => {
    // 측정 중에는 재마운트하지 않는다 (진행이 날아감). 그 외에는 반영.
    if (!router.current().startsWith("/measure")) router.reload();
  });

  return {
    tapCurrentTarget: () => measure?.tapCurrentTarget(),
    currentTargetPoint: () => measure?.currentTargetPoint() ?? null,
    route: () => router.current(),
  };
}
