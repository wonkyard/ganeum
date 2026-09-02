import { describe, expect, it } from "vitest";
import { mad, mean, median, sampleStdDev } from "./stats";

describe("stats", () => {
  it("mean", () => {
    expect(mean([1, 2, 3, 4])).toBe(2.5);
    expect(mean([])).toBeNaN();
  });

  it("median — 홀수/짝수", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
    expect(median([])).toBeNaN();
  });

  it("sampleStdDev (n-1 분모)", () => {
    // [2,4,4,4,5,5,7,9]: 평균 5, 편차제곱합 32, /7 → sqrt(32/7)=2.13809
    expect(sampleStdDev([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.13809, 5);
    expect(sampleStdDev([5])).toBe(0);
  });

  it("mad — 스케일 팩터 없음", () => {
    expect(mad([1, 2, 3, 4, 5])).toBe(1); // median dev of [2,1,0,1,2]
  });
});
