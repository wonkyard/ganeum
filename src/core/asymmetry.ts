/**
 * 좌우손 비대칭 지수 (spec §4.2).
 *
 *   asymmetry = (오른손 TP − 왼손 TP) / mean(오른손 TP, 왼손 TP)
 *
 * 정밀 측정에서 양손을 모두 잰 경우에만 정의된다. 한 손이라도 유효한 분석 결과가
 * 없거나(측정 부족) 처리율이 양수가 아니면 `null` — 지어내지 않는다.
 *
 * 부호: 오른손이 더 빠르면 양수, 왼손이 더 빠르면 음수. UI 는 크기(절댓값)를 % 로
 * 보여준다.
 */

/** `computeAsymmetry` 입력 — 유효 처리율만 있으면 된다 (`SessionOk` 가 구조적으로 만족). */
export interface HandThroughput {
  /** 유효 처리율 (bits/s). */
  throughput: number;
}

export function computeAsymmetry(
  right: HandThroughput | null | undefined,
  left: HandThroughput | null | undefined,
): number | null {
  if (!right || !left) return null;
  const r = right.throughput;
  const l = left.throughput;
  if (!Number.isFinite(r) || !Number.isFinite(l) || r <= 0 || l <= 0) return null;
  const mean = (r + l) / 2;
  if (mean <= 0) return null;
  return (r - l) / mean;
}
