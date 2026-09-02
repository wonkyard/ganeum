/**
 * `prefers-reduced-motion` 훅. 스펙 §9 — 회귀선 빌드/카운트업/모프에 축약 경로를 태우는
 * 단일 진실 공급원. 서버/테스트에서 matchMedia 가 없으면 "축약 안 함"으로 안전하게 폴백.
 */

const QUERY = "(prefers-reduced-motion: reduce)";

function mediaQuery(): MediaQueryList | null {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return null;
  return window.matchMedia(QUERY);
}

export function prefersReducedMotion(): boolean {
  return mediaQuery()?.matches ?? false;
}

/** 변경 구독. 반환값 호출로 해제. reduced-motion 미지원 환경에서는 즉시 1회만 알림. */
export function onReducedMotionChange(listener: (reduced: boolean) => void): () => void {
  const mq = mediaQuery();
  listener(mq?.matches ?? false);
  if (!mq) return () => {};

  const handler = (event: MediaQueryListEvent): void => listener(event.matches);
  mq.addEventListener("change", handler);
  return () => mq.removeEventListener("change", handler);
}

/** 모션 지속시간을 상황에 맞게 고른다(ms). reduced 면 0. */
export function motionDuration(normalMs: number): number {
  return prefersReducedMotion() ? 0 : normalMs;
}
