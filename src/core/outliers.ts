/**
 * 이상치 제거 — 중앙값 ±3·MAD 밖의 값을 버린다 (스펙 §4.2).
 * 조건별 이동시간(MT) 에 적용한다. MAD 가 0 이면(값이 거의 동일) 제거하지 않는다.
 */
import { mad, median } from "./stats";

export interface OutlierSplit<T> {
  kept: T[];
  removed: T[];
}

export function removeOutliers(
  xs: readonly number[],
  k = 3,
): OutlierSplit<number> {
  return partitionByOutlier(xs, (x) => x, k);
}

/** 숫자 키를 뽑아내는 콜백으로 임의 객체 배열에도 쓸 수 있게 한 버전. */
export function partitionByOutlier<T>(
  items: readonly T[],
  value: (item: T) => number,
  k = 3,
): OutlierSplit<T> {
  const values = items.map(value);
  const med = median(values);
  const spread = mad(values);
  if (!Number.isFinite(spread) || spread === 0) {
    return { kept: [...items], removed: [] };
  }
  const lo = med - k * spread;
  const hi = med + k * spread;
  const kept: T[] = [];
  const removed: T[] = [];
  for (const item of items) {
    const v = value(item);
    if (v < lo || v > hi) removed.push(item);
    else kept.push(item);
  }
  return { kept, removed };
}
