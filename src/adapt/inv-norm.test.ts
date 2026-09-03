import { describe, expect, it } from "vitest";
import { invNorm, PHI_INV_098 } from "./inv-norm";

describe("invNorm — Φ⁻¹ 근사 (Acklam)", () => {
  it("알려진 분위수와 1e-4 내 일치", () => {
    expect(invNorm(0.975)).toBeCloseTo(1.959963985, 4);
    expect(invNorm(0.98)).toBeCloseTo(2.053748911, 4);
    expect(invNorm(0.5)).toBeCloseTo(0, 10);
    expect(invNorm(0.84134475)).toBeCloseTo(1, 4); // Φ(1)
  });

  it("핀된 상수 PHI_INV_098 이 invNorm(0.98) 과 1e-4 내", () => {
    expect(Math.abs(invNorm(0.98) - PHI_INV_098)).toBeLessThan(1e-4);
  });

  it("꼬리 영역도 정확하고 대칭이다", () => {
    expect(invNorm(0.025)).toBeCloseTo(-1.959963985, 4);
    expect(invNorm(0.001)).toBeCloseTo(-3.090232306, 4);
    expect(invNorm(0.1)).toBeCloseTo(-invNorm(0.9), 6);
  });

  it("정의역 밖은 ±Infinity / NaN", () => {
    expect(invNorm(0)).toBe(-Infinity);
    expect(invNorm(1)).toBe(Infinity);
    expect(invNorm(-0.5)).toBe(-Infinity);
    expect(invNorm(2)).toBe(Infinity);
    expect(invNorm(NaN)).toBeNaN();
  });
});
