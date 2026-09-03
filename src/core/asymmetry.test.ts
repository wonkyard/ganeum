import { describe, expect, it } from "vitest";
import { computeAsymmetry } from "./asymmetry";

describe("computeAsymmetry", () => {
  it("골든: 왼손 3.9 / 오른손 4.6 → 약 16% (screen-design S3)", () => {
    const a = computeAsymmetry({ throughput: 4.6 }, { throughput: 3.9 });
    expect(a).not.toBeNull();
    expect(a as number).toBeCloseTo(0.1647, 4);
    expect(Math.round((a as number) * 100)).toBe(16);
  });

  it("대칭이면 0", () => {
    expect(computeAsymmetry({ throughput: 4.2 }, { throughput: 4.2 })).toBe(0);
  });

  it("부호: 왼손이 더 빠르면 음수", () => {
    const a = computeAsymmetry({ throughput: 3.5 }, { throughput: 4.5 });
    expect(a as number).toBeLessThan(0);
    expect(a as number).toBeCloseTo(-0.25, 10);
  });

  it("한 손만 있으면 null", () => {
    expect(computeAsymmetry({ throughput: 4.6 }, null)).toBeNull();
    expect(computeAsymmetry(null, { throughput: 3.9 })).toBeNull();
    expect(computeAsymmetry(null, null)).toBeNull();
    expect(computeAsymmetry(undefined, undefined)).toBeNull();
  });

  it("처리율이 양수가 아니거나 유한하지 않으면 null", () => {
    expect(computeAsymmetry({ throughput: 0 }, { throughput: 4 })).toBeNull();
    expect(computeAsymmetry({ throughput: -1 }, { throughput: 4 })).toBeNull();
    expect(computeAsymmetry({ throughput: Number.NaN }, { throughput: 4 })).toBeNull();
    expect(computeAsymmetry({ throughput: Number.POSITIVE_INFINITY }, { throughput: 4 })).toBeNull();
  });

  it("SessionOk 형태(throughput 필드)를 그대로 받아들인다", () => {
    const right = { status: "ok", throughput: 5.0, confident: true } as unknown as {
      throughput: number;
    };
    const left = { status: "ok", throughput: 4.0, confident: true } as unknown as {
      throughput: number;
    };
    expect(computeAsymmetry(right, left)).toBeCloseTo((5 - 4) / 4.5, 10);
  });
});
