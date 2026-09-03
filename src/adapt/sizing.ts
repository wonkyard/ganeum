/**
 * 유효 너비 기반 크기 산정 (brief-3A §8 정정 반영).
 *
 * 핵심: 권장 히트 크기 W* 는 **닫힌 식**이다 — "경계 탐색" 루프가 아니다.
 * 사용자의 유효 너비 We 에서 엔드포인트 산포 σ 를 얻고(`σ = We / √(2πe)`),
 * "축별(1차원) 예측 오류율 ≤ 4%" 를 만족하는 최소 크기를 정규분위수로 바로 계산한다.
 *
 *   σ       = We / 4.133                     4.133 = √(2πe), Welford 엔트로피 등가 너비
 *   W*_1d   = 2σ · Φ⁻¹(0.98) = 4.1075 · σ    축별 1D 예측 오류율 ≤ 4%
 *   W*_2d   = σ · √(−2·ln 0.04) = 2.537 · σ   2D 원형 컨트롤(Rayleigh)에서 오류율 4% — 표시 전용
 *
 * a, b, A_c 는 W* 산정에 **들어가지 않는다**. 예측 이동시간은 별도로 표시되는 값이다
 * ("이 크기에서 예상 이동시간", `predMT(W) = a + b·log2(A_c/W + 1)`).
 *
 * 이 모델은 최적해가 아니라 **방어 가능한 휴리스틱**이다(간격 비율 포함).
 */

/** √(2πe) — Welford 엔트로피 등가 너비 상수. `σ = We / 이 값`. */
export const WELFORD_ENTROPY_FACTOR = 4.133;
/** W*_1d = 이 값 · σ. `2 · Φ⁻¹(0.98)` = 2 · 2.05375. 브리프에 핀됨. */
export const WSTAR_1D_PER_SIGMA = 4.1075;
/** W*_2d = 이 값 · σ. `√(−2·ln 0.04)`. 브리프에 핀됨. */
export const WSTAR_2D_PER_SIGMA = 2.537;
/** 인접 간격 휴리스틱 계수 (파생 아님 — 이름 있는 상수). 브리프에 핀됨. */
export const ADJACENCY_GAP_RATIO = 0.35;

/** WCAG 2.5.8 최소 타깃 (CSS px). */
export const WCAG_MIN_PX = 24;
/** 플랫폼 권장 최소 터치 타깃 (CSS px). */
export const PLATFORM_MIN_PX = 44;
/** 보정된 경우 바닥값에 더하는 물리 여유 (mm). */
export const CAL_FLOOR_MM = 9;
/** 보정된 경우 상한 (mm). */
export const CAL_CEIL_MM = 25;
/** 미보정 시 상한 = 뷰포트 최소변 × 이 비율. */
export const VIEWPORT_CEIL_RATIO = 0.25;
/** 최소 간격 (CSS px). */
export const MIN_GAP_PX = 8;
/** 간격 산정의 하한 목표 (CSS px). `24 − W*` 항에 쓴다. */
export const GAP_TARGET_PX = 24;

export interface SizingInput {
  /** 절편 a (초) — 예측 이동시간에만 쓴다. */
  a: number;
  /** 기울기 b (초/bit) — 예측 이동시간에만 쓴다. */
  b: number;
  /** 사용자의 유효 너비 We (CSS px). `<= 0` 이면 산정 불가 → `null` 반환. */
  we: number;
  /** 이 컨트롤의 전형적 이동 거리 (CSS px) — 예측 이동시간에만 쓴다. */
  acPx: number;
  /** 뷰포트 최소변 (CSS px). 상한 계산에 쓴다. `<= 0` 이면 뷰포트 상한을 무시한다. */
  viewportMinSide: number;
}

export interface SizingResult {
  /** 권장 히트 크기 (CSS px) — 축별 1D 기준. */
  wStar: number;
  /** 같은 오류율 기준의 2D(Rayleigh) 크기 (CSS px) — "왜?" 정직성 수치, 표시 전용. */
  wStar2dNote: number;
  /** 기본 크기(= 현재 유효 너비 We)에서 예측 이동시간 (초) — 표시 전용. */
  predictedMtDefault: number;
  /** wStar 에서 예측 이동시간 (초). */
  predictedMtAdapted: number;
  /** 권장 인접 간격 (CSS px). */
  gap: number;
  /** 바닥값이 결과를 결정했는지 (→ "나" 위치에서 변화 없음 안내). */
  floored: boolean;
  /** 상한에 걸렸는지 (→ "측정 매우 불안정"). */
  clamped: boolean;
}

/** `a + b · log2(acPx / W + 1)` — 예측 이동시간(초). W, acPx 는 CSS px. */
export function predictedMovementTime(a: number, b: number, acPx: number, w: number): number {
  const amp = Math.max(0, acPx);
  const width = Math.max(1e-6, w);
  return a + b * Math.log2(amp / width + 1);
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.min(Math.max(x, lo), hi);
}

/**
 * 권장 히트 크기·간격·예측 이동시간을 한 번에 산정한다.
 *
 * 퇴화 입력 가드: `we <= 0` (weSource="nominal-fallback" 인 세션) → `null` 을 반환하고
 * 호출부가 "측정 불안정" 상태를 렌더한다. `b <= 0` 은 여기서 막지 않는다 —
 * 예측 이동시간은 계산하되 호출부의 신뢰도 게이트(3A `SessionOk.confident`)가 억제한다.
 *
 * @param calibrationPxPerMm 화면 보정값(CSS px per mm). 없으면 물리 바닥값/상한을 생략.
 */
export function sizing(
  input: SizingInput,
  calibrationPxPerMm: number | null,
): SizingResult | null {
  const { a, b, we, acPx, viewportMinSide } = input;
  if (!(we > 0) || !Number.isFinite(we)) return null;

  const sigma = we / WELFORD_ENTROPY_FACTOR;
  const wStar1d = WSTAR_1D_PER_SIGMA * sigma;
  const wStar2dNote = WSTAR_2D_PER_SIGMA * sigma;

  const calibrated = calibrationPxPerMm != null && calibrationPxPerMm > 0;

  let floor = Math.max(WCAG_MIN_PX, PLATFORM_MIN_PX);
  if (calibrated) floor += CAL_FLOOR_MM * (calibrationPxPerMm as number);

  let ceil = Infinity;
  if (viewportMinSide > 0) ceil = Math.min(ceil, viewportMinSide * VIEWPORT_CEIL_RATIO);
  if (calibrated) ceil = Math.min(ceil, CAL_CEIL_MM * (calibrationPxPerMm as number));

  const flooredValue = Math.max(wStar1d, floor);
  const wStar = clamp(flooredValue, Math.min(floor, ceil), ceil);
  const floored = flooredValue === floor;
  const clamped = flooredValue > ceil;

  const gap = Math.max(MIN_GAP_PX, GAP_TARGET_PX - wStar, wStar * ADJACENCY_GAP_RATIO);

  return {
    wStar,
    wStar2dNote,
    predictedMtDefault: predictedMovementTime(a, b, acPx, we),
    predictedMtAdapted: predictedMovementTime(a, b, acPx, wStar),
    gap,
    floored,
    clamped,
  };
}
