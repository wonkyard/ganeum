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
    const specs = designConditions("precise", 1000);
    expect(specs).toHaveLength(9);
    for (const s of specs) expect(s.W).toBeGreaterThanOrEqual(12);
  });

  it("P0-7: touch quick 은 W 바닥값 ≥ 24 CSS px, ID 는 큰→작은 순서", () => {
    const specs = designConditions("quick", 288, "touch");
    expect(specs).toHaveLength(3);
    for (const s of specs) expect(s.W).toBeGreaterThanOrEqual(24);
    expect(specs[0].ID).toBeGreaterThan(specs[1].ID);
    expect(specs[1].ID).toBeGreaterThan(specs[2].ID);
    // 손가락으로 현실적인 상단 난이도 (2mm 타깃 금지).
    expect(specs[0].ID).toBeLessThan(4.2);
  });

  it("P0-7: mouse quick 바닥값은 touch 보다 작다 (계기 정밀도)", () => {
    const mouse = designConditions("quick", 288, "mouse");
    const touch = designConditions("quick", 288, "touch");
    expect(mouse[0].W).toBeLessThan(touch[0].W);
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

describe("designConditions — 정밀 측정 (5-6-b)", () => {
  it("9개 = 3 진폭 × 3 너비 격자", () => {
    const specs = designConditions("precise", 1000, "mouse");
    expect(specs).toHaveLength(9);
    const amps = [...new Set(specs.map((s) => Math.round(s.A)))].sort((a, b) => a - b);
    expect(amps).toEqual([300, 500, 700]);
    const widths = [...new Set(specs.map((s) => Math.round(s.W)))].sort((a, b) => a - b);
    expect(widths).toEqual([12, 24, 48]);
    // 격자가 온전한가: 각 (A,W) 조합이 정확히 한 번.
    const pairs = specs.map((s) => `${Math.round(s.A)}x${Math.round(s.W)}`).sort();
    expect(new Set(pairs).size).toBe(9);
  });

  it("반환이 ID 오름차순 (쉬움 → 어려움 램프)", () => {
    const specs = designConditions("precise", 1000, "mouse");
    for (let i = 1; i < specs.length; i++) {
      expect(specs[i].ID).toBeGreaterThanOrEqual(specs[i - 1].ID);
    }
    // quick 은 반대로 (어려운 것 먼저) 유지된다.
    const quick = designConditions("quick", 1000);
    expect(quick[0].ID).toBeGreaterThan(quick[quick.length - 1].ID);
  });

  it("포인터타입 바닥값: touch 24 / mouse 12 CSS px 유지", () => {
    const touch = designConditions("precise", 1000, "touch");
    for (const s of touch) expect(s.W).toBeGreaterThanOrEqual(24);
    expect([...new Set(touch.map((s) => Math.round(s.W)))].sort((a, b) => a - b)).toEqual([
      24, 48, 96,
    ]);
    const mouse = designConditions("precise", 1000, "mouse");
    expect(Math.min(...mouse.map((s) => s.W))).toBe(12);
  });

  it("각 조건의 ID 가 log2(A/W+1) 과 일치", () => {
    for (const s of designConditions("precise", 900, "touch")) {
      expect(s.ID).toBeCloseTo(indexOfDifficulty(s.A, s.W), 12);
    }
  });

  it("결정적: 같은 입력이면 같은 조건 ID 순서", () => {
    const a = designConditions("precise", 777, "mouse");
    const b = designConditions("precise", 777, "mouse");
    expect(a.map((s) => s.id)).toEqual(b.map((s) => s.id));
  });
});
