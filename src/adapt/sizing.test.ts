import { describe, expect, it } from "vitest";
import {
  ADJACENCY_GAP_RATIO,
  predictedMovementTime,
  sizing,
  WELFORD_ENTROPY_FACTOR,
  WSTAR_1D_PER_SIGMA,
  WSTAR_2D_PER_SIGMA,
  type SizingInput,
} from "./sizing";

const base: SizingInput = { a: -0.025, b: 0.224, we: 40, acPx: 300, viewportMinSide: 800 };

describe("sizing — 닫힌 식 크기 산정", () => {
  it("작은 We(40px): σ≈9.68, W*_1d≈39.75, 바닥값 44 가 이긴다", () => {
    const r = sizing(base, null);
    expect(r).not.toBeNull();
    if (!r) return;
    const sigma = 40 / WELFORD_ENTROPY_FACTOR;
    expect(sigma).toBeCloseTo(9.68, 2);
    expect(WSTAR_1D_PER_SIGMA * sigma).toBeCloseTo(39.75, 1);
    expect(r.wStar).toBe(44);
    expect(r.floored).toBe(true);
    expect(r.clamped).toBe(false);
  });

  it("큰 We(200px): W*_1d≈198.8 가 그대로, 상한 미적용", () => {
    const r = sizing({ ...base, we: 200, viewportMinSide: 4000 }, null);
    expect(r).not.toBeNull();
    if (!r) return;
    expect(r.wStar).toBeCloseTo(198.77, 1);
    expect(r.floored).toBe(false);
    expect(r.clamped).toBe(false);
  });

  it("W*_1d / We ≈ 0.994, W*_2d / We ≈ 0.614", () => {
    expect(WSTAR_1D_PER_SIGMA / WELFORD_ENTROPY_FACTOR).toBeCloseTo(0.994, 3);
    expect(WSTAR_2D_PER_SIGMA / WELFORD_ENTROPY_FACTOR).toBeCloseTo(0.614, 3);
    const r = sizing({ ...base, we: 200, viewportMinSide: 4000 }, null);
    if (!r) return;
    expect(r.wStar2dNote / 200).toBeCloseTo(0.614, 3);
  });

  it("보정되면 바닥값에 9mm, 상한에 25mm 가 더해진다", () => {
    const r = sizing({ ...base, we: 40 }, 3.8);
    if (!r) return;
    // floor = 44 + 9·3.8 = 78.2, W*_1d(≈39.75) 보다 크므로 바닥값이 결정
    expect(r.wStar).toBeCloseTo(78.2, 5);
    expect(r.floored).toBe(true);
  });

  it("상한에 걸리면 clamped=true (작은 뷰포트 + 보정)", () => {
    const r = sizing({ ...base, we: 200, viewportMinSide: 320 }, 3.8);
    if (!r) return;
    // ceil = min(320·0.25=80, 25·3.8=95) = 80
    expect(r.wStar).toBe(80);
    expect(r.clamped).toBe(true);
    expect(r.floored).toBe(false);
  });

  it("gap = max(8, 24 − W*, W* · 0.35)", () => {
    const small = sizing(base, null); // wStar 44
    if (small) expect(small.gap).toBeCloseTo(Math.max(8, 24 - 44, 44 * ADJACENCY_GAP_RATIO), 6);

    const large = sizing({ ...base, we: 200, viewportMinSide: 4000 }, null);
    if (large) expect(large.gap).toBeCloseTo(large.wStar * ADJACENCY_GAP_RATIO, 6);
  });

  it("퇴화 입력(we ≤ 0 / NaN)은 null", () => {
    expect(sizing({ ...base, we: 0 }, null)).toBeNull();
    expect(sizing({ ...base, we: -5 }, null)).toBeNull();
    expect(sizing({ ...base, we: NaN }, null)).toBeNull();
  });

  it("b ≤ 0 이어도 null 이 아니고 예측 이동시간을 계산한다", () => {
    const r = sizing({ ...base, b: -0.1 }, null);
    expect(r).not.toBeNull();
    if (r) expect(Number.isFinite(r.predictedMtAdapted)).toBe(true);
  });

  it("예측 이동시간 predMT(W): W 에 대해 단조 감소, W=We 에서 default", () => {
    expect(predictedMovementTime(-0.025, 0.224, 300, 20)).toBeGreaterThan(
      predictedMovementTime(-0.025, 0.224, 300, 40),
    );
    expect(predictedMovementTime(-0.025, 0.224, 300, 40)).toBeGreaterThan(
      predictedMovementTime(-0.025, 0.224, 300, 80),
    );
    const r = sizing(base, null);
    if (r) expect(r.predictedMtDefault).toBeCloseTo(predictedMovementTime(-0.025, 0.224, 300, 40), 10);
  });
});
