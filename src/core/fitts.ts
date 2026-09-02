/**
 * Fitts 의 법칙 — 난이도 지수(ID).
 *
 * Shannon 형식 (MacKenzie, 1992):  ID = log2(A / W + 1)   [bits]
 *   A = 진폭(이동 거리), W = 타깃 너비. 둘 다 같은 단위(px 또는 mm).
 */

export function indexOfDifficulty(amplitude: number, width: number): number {
  if (width <= 0) throw new RangeError("타깃 너비 W 는 0보다 커야 합니다");
  if (amplitude < 0) throw new RangeError("진폭 A 는 음수일 수 없습니다");
  return Math.log2(amplitude / width + 1);
}

/** 예측 이동시간: MT = a + b·ID. */
export function predictMovementTime(fit: { a: number; b: number }, id: number): number {
  return fit.a + fit.b * id;
}
