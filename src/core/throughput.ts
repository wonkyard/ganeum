/**
 * 유효 처리율 (effective throughput, TP) — ISO 9241-411 권장 지표.
 *
 * 정확도 보정을 위해 명목 너비 W 대신 실제 착지 산포로부터 유효 너비 We 를 쓴다.
 *
 *   We  = 4.133 · SD(endpoint deviations)      (스펙 §4.2 — 표본 SD)
 *   IDe = log2(Ae / We + 1)                     (Ae = 평균 실제 이동 거리)
 *   TP  = mean( IDe / MT )                       [bits/s]  (조건별 평균의 평균)
 *
 * `deviations` 는 접근 축(이전 타깃 → 이번 타깃)에 투영한 1차원 부호付き 오차(px).
 * 축 투영은 렌더 레이어의 책임이고, 여기 core 는 그 1차원 수열만 받는다.
 */
import { mean, sampleStdDev } from "./stats";

const WE_FACTOR = 4.133; // 정규분포에서 4.133·SD 가 96% 구간(±2.066σ)에 해당.

export function effectiveWidth(deviations: readonly number[]): number {
  return WE_FACTOR * sampleStdDev(deviations);
}

/** We 의 SD ↔ We 환산 상수. `σ_endpoint = We / WE_FACTOR` (brief-3A §6). */
export const EFFECTIVE_WIDTH_FACTOR = WE_FACTOR;

export interface PooledWidth {
  /** 유효 너비 We (입력과 같은 단위). */
  we: number;
  /** 실측 SD 로 구했는지(`measured`), 표본이 부족해 못 구했는지(`nominal-fallback`). */
  source: "measured" | "nominal-fallback";
  /** pool 에 실제로 들어간 표본 수. */
  n: number;
}

/**
 * brief-3A P0-2 의 **고정된 We 정의**:
 * 모든 조건의 (워밍업·이상치 제거 후) 축투영 오차를 하나로 pool 한 표본 SD × 4.133.
 * 한 숫자, 방어 가능, 테스트 쉬움.
 *
 * pool 표본이 2개 미만이면 SD 를 정의할 수 없으므로 `nominal-fallback` 을 돌려주고
 * `we` 는 0 으로 둔다 — 호출부(분석/저장)가 명목 너비로 대체하고 배지를 띄운다.
 */
export function pooledEffectiveWidth(deviationsByCondition: readonly (readonly number[])[]): PooledWidth {
  const pooled: number[] = [];
  for (const series of deviationsByCondition) pooled.push(...series);
  const sd = sampleStdDev(pooled);
  if (pooled.length < 2 || sd === 0) {
    return { we: 0, source: "nominal-fallback", n: pooled.length };
  }
  return { we: WE_FACTOR * sd, source: "measured", n: pooled.length };
}

export function effectiveIndexOfDifficulty(ae: number, we: number): number {
  if (we <= 0) throw new RangeError("유효 너비 We 는 0보다 커야 합니다");
  return Math.log2(ae / we + 1);
}

export interface ConditionThroughput {
  /** 유효 너비 (px). */
  we: number;
  /** 유효 난이도 (bits). */
  ide: number;
  /** 평균 이동시간 (s). */
  mt: number;
  /** 이 조건의 처리율 (bits/s). */
  tp: number;
}

export function conditionThroughput(
  ae: number,
  movementTimes: readonly number[],
  deviations: readonly number[],
  fallbackWidth?: number,
): ConditionThroughput {
  let we = effectiveWidth(deviations);
  if (we <= 0) {
    // 착지 산포를 추정할 수 없음(탭 부족 또는 완전 동일 지점).
    // 정직하게 명목 너비로 폴백한다 — IDe 를 지어내지 않는다.
    if (!fallbackWidth || fallbackWidth <= 0) {
      throw new RangeError("유효 너비를 추정할 수 없고 폴백 너비도 없습니다");
    }
    we = fallbackWidth;
  }
  const ide = effectiveIndexOfDifficulty(ae, we);
  const mt = mean(movementTimes);
  return { we, ide, mt, tp: ide / mt };
}

export interface ConditionInput {
  ae: number;
  movementTimes: number[];
  deviations: number[];
  /** 착지 산포를 못 구할 때 쓸 명목 너비 W. */
  fallbackWidth?: number;
}

/** 조건별 처리율의 평균 = ISO 권장 유효 처리율. */
export function effectiveThroughput(conditions: readonly ConditionInput[]): {
  perCondition: ConditionThroughput[];
  tp: number;
} {
  if (conditions.length === 0) throw new RangeError("조건이 최소 1개 필요합니다");
  const perCondition = conditions.map((c) =>
    conditionThroughput(c.ae, c.movementTimes, c.deviations, c.fallbackWidth),
  );
  return { perCondition, tp: mean(perCondition.map((c) => c.tp)) };
}
