import { describe, expect, it } from "vitest";
import {
  conditionThroughput,
  effectiveIndexOfDifficulty,
  effectiveThroughput,
  effectiveWidth,
} from "./throughput";

describe("effectiveWidth", () => {
  it("We = 4.133 · 표본SD — 손계산 골든", () => {
    // dev = [-10,-5,0,5,10]: 표본분산 = 250/4 = 62.5, SD = sqrt(62.5) = 7.90569415
    // We = 4.133 · 7.90569415 = 32.67423392
    expect(effectiveWidth([-10, -5, 0, 5, 10])).toBeCloseTo(32.6742339, 6);
  });

  it("점이 1개 이하면 SD=0 → We=0", () => {
    expect(effectiveWidth([3])).toBe(0);
  });
});

describe("effectiveIndexOfDifficulty", () => {
  it("IDe = log2(Ae/We + 1)", () => {
    // log2(200 / 32.674234 + 1) = log2(7.1210312) = 2.8320861
    expect(effectiveIndexOfDifficulty(200, 32.674234)).toBeCloseTo(2.8320861, 6);
  });
  it("We ≤ 0 은 예외", () => {
    expect(() => effectiveIndexOfDifficulty(100, 0)).toThrow(RangeError);
  });
});

describe("conditionThroughput / effectiveThroughput", () => {
  it("손계산 골든: ae=200, mt=0.5, dev=[-10..10] → tp ≈ 5.6642", () => {
    const c = conditionThroughput(200, [0.5, 0.5, 0.5, 0.5, 0.5], [-10, -5, 0, 5, 10]);
    expect(c.we).toBeCloseTo(32.6742339, 6);
    expect(c.ide).toBeCloseTo(2.8320861, 6);
    expect(c.mt).toBeCloseTo(0.5, 12);
    expect(c.tp).toBeCloseTo(5.6641723, 5);
  });

  it("전체 TP 는 조건별 TP 의 평균", () => {
    const { perCondition, tp } = effectiveThroughput([
      { ae: 200, movementTimes: [0.5, 0.5, 0.5, 0.5, 0.5], deviations: [-10, -5, 0, 5, 10] },
      { ae: 200, movementTimes: [1, 1, 1, 1, 1], deviations: [-10, -5, 0, 5, 10] },
    ]);
    expect(perCondition).toHaveLength(2);
    expect(tp).toBeCloseTo((perCondition[0].tp + perCondition[1].tp) / 2, 10);
  });

  it("조건이 없으면 예외", () => {
    expect(() => effectiveThroughput([])).toThrow(RangeError);
  });

  it("착지 산포가 0 이면 명목 너비로 폴백, 없으면 예외", () => {
    const c = conditionThroughput(200, [0.5, 0.5], [0, 0], 40);
    expect(c.we).toBe(40);
    expect(c.ide).toBeCloseTo(Math.log2(200 / 40 + 1), 10);
    expect(() => conditionThroughput(200, [0.5], [0])).toThrow(RangeError);
  });
});
