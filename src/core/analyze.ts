/**
 * 한 세션의 원시 탭 기록 → Fitts 회귀 + 유효 처리율 + 보조 지표.
 * outlier 제거 → 회귀 → 처리율 파이프라인을 한 곳에서 조립한다.
 *
 * brief-3A 반영:
 * - P0-1 유효 너비 계산에 `devAxis`(접근 축 투영 오차)를 쓴다. `dx` 아님.
 * - P0-2 We 를 한 숫자로 pool 해서 노출한다 (`we`, `weSource`).
 * - P0-3 처리율의 `Ae` 는 조건에 기록된 실측 이동 거리(`Condition.Ae`).
 * - P0-4 타깃당 엔드포인트 1개 (`Condition.taps` 가 이미 타깃당 1개). errorRate 는
 *   "놓친 타깃 수 / 전체 타깃 수".
 * - P0-5 UI 로 throw 하지 않는다. 유효 조건 부족은 `{ status: "insufficient" }`.
 *   축투영 오차에도 중앙값 ±k·MAD 이상치 제거. 신뢰도 게이트(`r²<0.7 || b<=0`).
 */
import { indexOfDifficulty } from "./fitts";
import { leastSquares } from "./regression";
import { partitionByOutlier } from "./outliers";
import { mean, sampleStdDev } from "./stats";
import { effectiveThroughput, pooledEffectiveWidth, type ConditionInput } from "./throughput";
import type { Condition, FittsFit, WeSource } from "./types";

export interface SessionOk {
  status: "ok";
  fitts: FittsFit;
  /** 유효 처리율 (bits/s). */
  throughput: number;
  /** 유효 너비 We (CSS px). */
  we: number;
  weSource: WeSource;
  /** 놓친 타깃 / 전체 타깃 (0–1). */
  errorRate: number;
  /** 조건 내 MT 표준편차의 평균 (s). 낮을수록 안정적. */
  consistencySD: number;
  /** 분석에 실제로 쓰인 조건 수. */
  usedConditions: number;
  /**
   * 신뢰도 게이트(brief-3A P0-5). `r² ≥ 0.7 && b > 0` 이면 true.
   * false 면 S3 는 단정적 해설 대신 "다시 측정" 을 제안한다.
   */
  confident: boolean;
  /** 차트용 조건별 점: (nominal ID, 평균 MT[초]). */
  points: Array<{ id: number; mt: number }>;
}

export interface SessionInsufficient {
  status: "insufficient";
  reason: "no-conditions" | "too-few-conditions";
  usedConditions: number;
}

export type SessionAnalysis = SessionOk | SessionInsufficient;

export interface AnalyzeOptions {
  /** 첫 탭(0→1)을 워밍업으로 버릴지. 기본 true. */
  dropWarmup?: boolean;
  /** MAD 배수. 기본 3. */
  outlierK?: number;
}

/** 신뢰도 게이트 임계 — brief-3A §6 고정 상수. */
const R2_GATE = 0.7;

export function analyzeSession(
  conditions: readonly Condition[],
  opts: AnalyzeOptions = {},
): SessionAnalysis {
  const dropWarmup = opts.dropWarmup ?? true;
  const outlierK = opts.outlierK ?? 3;

  if (conditions.length === 0) {
    return { status: "insufficient", reason: "no-conditions", usedConditions: 0 };
  }

  const ids: number[] = [];
  const mts: number[] = [];
  const tpInputs: ConditionInput[] = [];
  const devAxisByCondition: number[][] = [];
  const perConditionSD: number[] = [];
  let totalTargets = 0;
  let missedTargets = 0;

  for (const cond of conditions) {
    const taps = dropWarmup ? cond.taps.slice(1) : cond.taps.slice();
    if (taps.length < 2) continue;

    // 이동시간 이상치 제거 (중앙값 ±k·MAD).
    const { kept: keptByMt } = partitionByOutlier(taps, (t) => t.mt, outlierK);
    // 축투영 오차 이상치 제거 — 캔버스를 가로지른 스트레이 탭이 We 를 부풀리는 것 방지.
    const { kept } = partitionByOutlier(keptByMt, (t) => t.devAxis, outlierK);
    if (kept.length < 2) continue;

    totalTargets += kept.length;
    missedTargets += kept.filter((t) => t.error).length;

    const keptMts = kept.map((t) => t.mt);
    const meanMt = mean(keptMts);

    const geomA = cond.displayedA > 0 ? cond.displayedA : cond.A;
    ids.push(indexOfDifficulty(geomA, cond.W));
    mts.push(meanMt);
    perConditionSD.push(sampleStdDev(keptMts));
    devAxisByCondition.push(kept.map((t) => t.devAxis));

    const ae = cond.Ae > 0 ? cond.Ae : geomA;
    tpInputs.push({
      ae,
      movementTimes: keptMts,
      deviations: kept.map((t) => t.devAxis),
      fallbackWidth: cond.W,
    });
  }

  if (ids.length < 2) {
    return { status: "insufficient", reason: "too-few-conditions", usedConditions: ids.length };
  }

  const fit = leastSquares(ids, mts);
  const { tp } = effectiveThroughput(tpInputs);
  const pooled = pooledEffectiveWidth(devAxisByCondition);

  return {
    status: "ok",
    fitts: { a: fit.a, b: fit.b, r2: fit.r2 },
    throughput: tp,
    we: pooled.source === "measured" ? pooled.we : nominalWe(conditions),
    weSource: pooled.source,
    errorRate: totalTargets === 0 ? 0 : missedTargets / totalTargets,
    consistencySD: mean(perConditionSD),
    usedConditions: ids.length,
    confident: fit.r2 >= R2_GATE && fit.b > 0,
    points: ids.map((id, i) => ({ id, mt: mts[i] })),
  };
}

/** 폴백 We: 조건들의 명목 너비 평균 (실측 산포를 못 구했을 때). */
function nominalWe(conditions: readonly Condition[]): number {
  return mean(conditions.map((c) => c.W));
}
