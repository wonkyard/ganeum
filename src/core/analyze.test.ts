import { describe, expect, it } from "vitest";
import { analyzeSession } from "./analyze";
import { indexOfDifficulty } from "./fitts";
import type { Condition, Tap } from "./types";

/** MT = a + b·ID 를 정확히 따르는 합성 조건을 만든다(첫 탭은 워밍업 더미). */
function syntheticCondition(A: number, W: number, a: number, b: number): Condition {
  const id = indexOfDifficulty(A, W);
  const mt = a + b * id;
  const taps: Tap[] = [];
  // 워밍업 탭 1개 + 착지 오차 대칭 5개.
  taps.push({ mt: 1.5, dx: 0, dy: 0, error: false });
  for (const dx of [-8, -4, 0, 4, 8]) {
    taps.push({ mt, dx, dy: 0, error: false });
  }
  return { A, W, ID: id, taps };
}

describe("analyzeSession", () => {
  it("완주 세션에서 (a, b, r², TP) 를 계산 — 골든", () => {
    const A_TRUE = 0.2;
    const B_TRUE = 0.1;
    const conditions = [
      syntheticCondition(600, 24, A_TRUE, B_TRUE),
      syntheticCondition(400, 40, A_TRUE, B_TRUE),
      syntheticCondition(240, 60, A_TRUE, B_TRUE),
    ];

    const r = analyzeSession(conditions);

    expect(r.usedConditions).toBe(3);
    expect(r.fitts.a).toBeCloseTo(A_TRUE, 6);
    expect(r.fitts.b).toBeCloseTo(B_TRUE, 6);
    expect(r.fitts.r2).toBeCloseTo(1, 6);
    expect(r.errorRate).toBe(0);
    expect(r.throughput).toBeGreaterThan(0);
    expect(Number.isFinite(r.throughput)).toBe(true);
  });

  it("워밍업 탭을 버려서 회귀에 영향 없음 (dropWarmup)", () => {
    const conditions = [
      syntheticCondition(600, 24, 0.2, 0.1),
      syntheticCondition(400, 40, 0.2, 0.1),
      syntheticCondition(240, 60, 0.2, 0.1),
    ];
    const withDrop = analyzeSession(conditions, { dropWarmup: true });
    const noDrop = analyzeSession(conditions, { dropWarmup: false });
    expect(withDrop.fitts.a).toBeCloseTo(0.2, 6);
    expect(withDrop.fitts.b).toBeCloseTo(0.1, 6);
    // 워밍업(느린 첫 탭)을 포함하면 회귀 계수가 편향된다.
    expect(Math.abs(noDrop.fitts.a - 0.2)).toBeGreaterThan(0.05);
  });

  it("오류 탭 비율을 집계", () => {
    const c = syntheticCondition(400, 40, 0.2, 0.1);
    c.taps[2].error = true; // 워밍업 제외 후 5개 중 1개
    const r = analyzeSession(
      [c, syntheticCondition(600, 24, 0.2, 0.1), syntheticCondition(240, 60, 0.2, 0.1)],
      { dropWarmup: true },
    );
    expect(r.errorRate).toBeCloseTo(1 / 15, 6);
  });

  it("유효 조건이 2개 미만이면 예외", () => {
    expect(() => analyzeSession([syntheticCondition(400, 40, 0.2, 0.1)])).toThrow(RangeError);
  });
});
