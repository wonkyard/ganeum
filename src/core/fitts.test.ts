import { describe, expect, it } from "vitest";
import { indexOfDifficulty, predictMovementTime } from "./fitts";

describe("indexOfDifficulty (Shannon 형식, MacKenzie 1992)", () => {
  it("A/W+1 이 2의 거듭제곱이면 정수 bits", () => {
    expect(indexOfDifficulty(50, 50)).toBeCloseTo(1, 12); // log2(2)
    expect(indexOfDifficulty(96, 32)).toBeCloseTo(2, 12); // log2(4)
    expect(indexOfDifficulty(210, 30)).toBeCloseTo(3, 12); // log2(8)
  });

  it("MacKenzie 표 예: A=192, W=24 → log2(9) ≈ 3.169925", () => {
    expect(indexOfDifficulty(192, 24)).toBeCloseTo(3.169925001, 8);
  });

  it("W ≤ 0 또는 A < 0 은 예외", () => {
    expect(() => indexOfDifficulty(100, 0)).toThrow(RangeError);
    expect(() => indexOfDifficulty(100, -5)).toThrow(RangeError);
    expect(() => indexOfDifficulty(-1, 10)).toThrow(RangeError);
  });
});

describe("predictMovementTime", () => {
  it("MT = a + b·ID", () => {
    expect(predictMovementTime({ a: 0.187, b: 0.092 }, 4)).toBeCloseTo(0.555, 10);
  });
});
