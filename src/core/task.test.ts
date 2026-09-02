import { describe, expect, it } from "vitest";
import { crissCrossOrder, designConditions, generateTargetLayout } from "./task";
import { indexOfDifficulty } from "./fitts";

describe("crissCrossOrder", () => {
  it("N=11 이면 지름을 가로지르는 순서, 모든 타깃 정확히 한 번", () => {
    const order = crissCrossOrder(11);
    expect(order).toEqual([0, 6, 1, 7, 2, 8, 3, 9, 4, 10, 5]);
    expect(new Set(order).size).toBe(11);
  });

  it("N=5", () => {
    expect(crissCrossOrder(5)).toEqual([0, 3, 1, 4, 2]);
  });

  it("짝수 / 3 미만은 예외", () => {
    expect(() => crissCrossOrder(10)).toThrow(RangeError);
    expect(() => crissCrossOrder(1)).toThrow(RangeError);
  });
});

describe("generateTargetLayout", () => {
  const layout = generateTargetLayout({
    center: { x: 200, y: 200 },
    amplitude: 300,
    width: 40,
    count: 11,
  });

  it("타깃 개수와 반지름", () => {
    expect(layout.positions).toHaveLength(11);
    expect(layout.radius).toBe(150);
  });

  it("모든 타깃이 중심에서 반지름 거리", () => {
    for (const p of layout.positions) {
      const d = Math.hypot(p.x - 200, p.y - 200);
      expect(d).toBeCloseTo(150, 8);
    }
  });

  it("첫 타깃은 12시 방향(중심 바로 위)", () => {
    expect(layout.positions[0].x).toBeCloseTo(200, 8);
    expect(layout.positions[0].y).toBeCloseTo(50, 8);
  });

  it("마주 보는 타깃 사이 거리 = 진폭", () => {
    // criss-cross 로 0 다음 방문하는 타깃(인덱스 6)이 대략 반대편.
    const a = layout.positions[0];
    const b = layout.positions[6];
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(290);
  });
});

describe("designConditions", () => {
  it("quick 은 조건 3개, ID 는 큰→작은 순서로 대략 5/3.5/2.5", () => {
    const specs = designConditions("quick", 1000);
    expect(specs).toHaveLength(3);
    expect(specs[0].ID).toBeGreaterThan(specs[1].ID);
    expect(specs[1].ID).toBeGreaterThan(specs[2].ID);
    expect(specs[0].ID).toBeCloseTo(5, 0);
    expect(specs[1].ID).toBeCloseTo(3.5, 0);
    expect(specs[2].ID).toBeCloseTo(2.5, 0);
  });

  it("precise 는 조건 9개, W 는 플랫폼 최소 히트 크기 아래로 안 내려감", () => {
    const specs = designConditions("precise", 1000, 12);
    expect(specs).toHaveLength(9);
    for (const s of specs) expect(s.W).toBeGreaterThanOrEqual(12);
  });

  it("각 조건의 ID 가 log2(A/W+1) 과 일치", () => {
    for (const s of designConditions("quick", 800)) {
      expect(s.ID).toBeCloseTo(indexOfDifficulty(s.A, s.W), 12);
    }
  });

  it("같은 (A,W) 는 같은 조건 ID", () => {
    const a = designConditions("quick", 800);
    const b = designConditions("quick", 800);
    expect(a.map((s) => s.id)).toEqual(b.map((s) => s.id));
  });
});
