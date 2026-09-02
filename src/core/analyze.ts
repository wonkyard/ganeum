/**
 * 한 세션의 원시 탭 기록 → Fitts 회귀 + 유효 처리율 + 보조 지표.
 * outlier 제거 → 회귀 → 처리율 파이프라인을 한 곳에서 조립한다.
 */
import { indexOfDifficulty } from "./fitts";
import { leastSquares } from "./regression";
import { partitionByOutlier } from "./outliers";
import { mean, sampleStdDev } from "./stats";
import { effectiveThroughput, type ConditionInput } from "./throughput";
import type { Condition, FittsFit } from "./types";

export interface SessionAnalysis {
  fitts: FittsFit;
  throughput: number;
  errorRate: number;
  /** 조건 내 MT 표준편차의 평균 (s). 낮을수록 안정적. */
  consistencySD: number;
  /** 분석에 실제로 쓰인 조건 수(탭이 부족한 조건은 제외). */
  usedConditions: number;
}

export interface AnalyzeOptions {
  /** 첫 탭(0→1)을 워밍업으로 버릴지. 기본 true. */
  dropWarmup?: boolean;
  /** MAD 배수. 기본 3. */
  outlierK?: number;
}

export function analyzeSession(
  conditions: readonly Condition[],
  opts: AnalyzeOptions = {},
): SessionAnalysis {
  const dropWarmup = opts.dropWarmup ?? true;
  const outlierK = opts.outlierK ?? 3;

  const ids: number[] = [];
  const mts: number[] = [];
  const tpInputs: ConditionInput[] = [];
  const perConditionSD: number[] = [];
  let totalTaps = 0;
  let errorTaps = 0;

  for (const cond of conditions) {
    const taps = dropWarmup ? cond.taps.slice(1) : cond.taps.slice();
    if (taps.length < 2) continue;

    totalTaps += taps.length;
    errorTaps += taps.filter((t) => t.error).length;

    // 이동시간 이상치 제거 (중앙값 ±k·MAD).
    const { kept } = partitionByOutlier(taps, (t) => t.mt, outlierK);
    const keptMts = kept.map((t) => t.mt);
    const meanMt = mean(keptMts);

    ids.push(indexOfDifficulty(cond.A, cond.W));
    mts.push(meanMt);
    perConditionSD.push(sampleStdDev(keptMts));

    // 유효 처리율 입력: 접근 축 투영 오차 ≈ dx (원형 배열에서 좌우 방향이 주 이동축).
    tpInputs.push({
      ae: cond.A,
      movementTimes: keptMts,
      deviations: kept.map((t) => t.dx),
      fallbackWidth: cond.W,
    });
  }

  if (ids.length < 2) {
    throw new RangeError("회귀에 쓸 유효 조건이 2개 미만입니다");
  }

  const fit = leastSquares(ids, mts);
  const { tp } = effectiveThroughput(tpInputs);

  return {
    fitts: { a: fit.a, b: fit.b, r2: fit.r2 },
    throughput: tp,
    errorRate: totalTaps === 0 ? 0 : errorTaps / totalTaps,
    consistencySD: mean(perConditionSD),
    usedConditions: ids.length,
  };
}
