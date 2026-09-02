import { describe, expect, it } from "vitest";
import { leastSquares } from "./regression";

describe("leastSquares", () => {
  it("정확히 선형인 데이터에서 a, b 를 복원하고 r²=1", () => {
    const xs = [1, 2, 3, 4, 5];
    const ys = xs.map((x) => 0.187 + 0.092 * x);
    const fit = leastSquares(xs, ys);
    expect(fit.a).toBeCloseTo(0.187, 10);
    expect(fit.b).toBeCloseTo(0.092, 10);
    expect(fit.r2).toBeCloseTo(1, 10);
  });

  it("손계산 골든 케이스: a=1.3, b=0.9, r²=0.81", () => {
    // 점 (1,2)(2,3)(3,5)(4,4)(5,6): Sxx=10, Sxy=9 → b=0.9, a=1.3
    // SSres=1.9, SStot=10 → r²=0.81
    const fit = leastSquares([1, 2, 3, 4, 5], [2, 3, 5, 4, 6]);
    expect(fit.a).toBeCloseTo(1.3, 10);
    expect(fit.b).toBeCloseTo(0.9, 10);
    expect(fit.r2).toBeCloseTo(0.81, 10);
    expect(fit.n).toBe(5);
  });

  it("y 가 상수면 r²=1 로 처리", () => {
    const fit = leastSquares([1, 2, 3], [4, 4, 4]);
    expect(fit.b).toBeCloseTo(0, 12);
    expect(fit.r2).toBe(1);
  });

  it("길이 불일치 / 점 부족 / 수직선은 예외", () => {
    expect(() => leastSquares([1, 2], [1])).toThrow(RangeError);
    expect(() => leastSquares([1], [1])).toThrow(RangeError);
    expect(() => leastSquares([2, 2, 2], [1, 2, 3])).toThrow(RangeError);
  });
});
