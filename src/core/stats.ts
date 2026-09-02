/** 작은 기술통계 헬퍼. core 안에서만 재사용. */

export function mean(xs: readonly number[]): number {
  if (xs.length === 0) return NaN;
  let sum = 0;
  for (const x of xs) sum += x;
  return sum / xs.length;
}

export function median(xs: readonly number[]): number {
  if (xs.length === 0) return NaN;
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * 표본 표준편차 (분모 n-1). MacKenzie / ISO 9241-411 의 유효 너비 계산이
 * 표본 SD 를 쓰므로 여기서도 동일하게 맞춘다. n < 2 이면 0.
 */
export function sampleStdDev(xs: readonly number[]): number {
  const n = xs.length;
  if (n < 2) return 0;
  const m = mean(xs);
  let ss = 0;
  for (const x of xs) ss += (x - m) * (x - m);
  return Math.sqrt(ss / (n - 1));
}

/** 중앙절대편차 (MAD): median(|x - median(x)|). 스케일 팩터 없음(스펙 §4.2 문구 그대로). */
export function mad(xs: readonly number[]): number {
  if (xs.length === 0) return NaN;
  const med = median(xs);
  return median(xs.map((x) => Math.abs(x - med)));
}
