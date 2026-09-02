/**
 * 최소제곱 단순선형회귀:  y = a + b·x   (여기서 y = MT, x = ID).
 * 결정계수 r² 를 함께 낸다.
 */

export interface LinearFit {
  a: number;
  b: number;
  r2: number;
  n: number;
}

export function leastSquares(xs: readonly number[], ys: readonly number[]): LinearFit {
  const n = xs.length;
  if (n !== ys.length) throw new RangeError("x 와 y 의 길이가 다릅니다");
  if (n < 2) throw new RangeError("회귀에는 점이 2개 이상 필요합니다");

  let sx = 0;
  let sy = 0;
  for (let i = 0; i < n; i++) {
    sx += xs[i];
    sy += ys[i];
  }
  const mx = sx / n;
  const my = sy / n;

  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    sxx += dx * dx;
    sxy += dx * dy;
    syy += dy * dy;
  }

  if (sxx === 0) throw new RangeError("x 값이 모두 같아 기울기를 정의할 수 없습니다");

  const b = sxy / sxx;
  const a = my - b * mx;
  // r² = (설명된 분산) / (전체 분산). syy = 0 이면 y 가 상수 → 완전 적합으로 본다.
  const r2 = syy === 0 ? 1 : (b * sxy) / syy;

  return { a, b, r2, n };
}
