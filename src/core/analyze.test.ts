import { describe, expect, it } from "vitest";
import { analyzeSession, type SessionOk } from "./analyze";
import { indexOfDifficulty } from "./fitts";
import { sampleStdDev } from "./stats";
import type { Condition, Tap } from "./types";

/** MT = a + b·ID 를 정확히 따르는 합성 조건. 첫 탭은 워밍업 더미. */
function syntheticCondition(
  A: number,
  W: number,
  a: number,
  b: number,
  devs: number[] = [-8, -4, 0, 4, 8],
): Condition {
  const id = indexOfDifficulty(A, W);
  const mt = a + b * id;
  const taps: Tap[] = [{ mt: 1.5, dx: 0, dy: 0, devAxis: 0, devOrtho: 0, error: false }];
  for (const d of devs) {
    taps.push({ mt, dx: d, dy: 0, devAxis: d, devOrtho: 0, error: false });
  }
  return { A, displayedA: A, Ae: A, W, ID: id, taps };
}

function ok(r: ReturnType<typeof analyzeSession>): SessionOk {
  if (r.status !== "ok") throw new Error(`expected ok, got ${r.status}`);
  return r;
}

describe("analyzeSession", () => {
  it("완주 세션에서 (a, b, r², TP) 를 계산 — 골든", () => {
    const A_TRUE = 0.2;
    const B_TRUE = 0.1;
    const r = ok(
      analyzeSession([
        syntheticCondition(600, 24, A_TRUE, B_TRUE),
        syntheticCondition(400, 40, A_TRUE, B_TRUE),
        syntheticCondition(240, 60, A_TRUE, B_TRUE),
      ]),
    );

    expect(r.usedConditions).toBe(3);
    expect(r.fitts.a).toBeCloseTo(A_TRUE, 6);
    expect(r.fitts.b).toBeCloseTo(B_TRUE, 6);
    expect(r.fitts.r2).toBeCloseTo(1, 6);
    expect(r.errorRate).toBe(0);
    expect(r.throughput).toBeGreaterThan(0);
    expect(Number.isFinite(r.throughput)).toBe(true);
    expect(r.confident).toBe(true);
    expect(r.points).toHaveLength(3);
  });

  it("워밍업 탭을 버려서 회귀에 영향 없음 (dropWarmup)", () => {
    const conditions = [
      syntheticCondition(600, 24, 0.2, 0.1),
      syntheticCondition(400, 40, 0.2, 0.1),
      syntheticCondition(240, 60, 0.2, 0.1),
    ];
    const withDrop = ok(analyzeSession(conditions, { dropWarmup: true }));
    const noDrop = ok(analyzeSession(conditions, { dropWarmup: false }));
    expect(withDrop.fitts.a).toBeCloseTo(0.2, 6);
    expect(withDrop.fitts.b).toBeCloseTo(0.1, 6);
    expect(Math.abs(noDrop.fitts.a - 0.2)).toBeGreaterThan(0.05);
  });

  it("P0-4 골든: errorRate = 놓친 타깃 수 / 전체 타깃 수 (탭 수 아님)", () => {
    const c = syntheticCondition(400, 40, 0.2, 0.1);
    c.taps[2].error = true; // 워밍업 제외 후 5개 중 1개
    const r = ok(
      analyzeSession(
        [c, syntheticCondition(600, 24, 0.2, 0.1), syntheticCondition(240, 60, 0.2, 0.1)],
        { dropWarmup: true },
      ),
    );
    // 조건당 타깃 5개 × 3조건 = 15, 놓친 타깃 1 → 1/15.
    expect(r.errorRate).toBeCloseTo(1 / 15, 6);
  });

  it("P0-2 골든: We = 전 조건 축투영 오차 pooled 표본SD × 4.133", () => {
    // 세 조건 모두 dev = [-10,-5,0,5,10] (워밍업 제외). pool = 15개, 각 조건 5개 반복.
    const devs = [-10, -5, 0, 5, 10];
    const r = ok(
      analyzeSession([
        syntheticCondition(600, 24, 0.2, 0.1, devs),
        syntheticCondition(400, 40, 0.2, 0.1, devs),
        syntheticCondition(240, 60, 0.2, 0.1, devs),
      ]),
    );
    const pooled = [...devs, ...devs, ...devs];
    expect(r.we).toBeCloseTo(4.133 * sampleStdDev(pooled), 6);
    expect(r.weSource).toBe("measured");
  });

  it("P0-2: 축투영 산포를 못 구하면 nominal-fallback + 명목 너비 평균", () => {
    // 모든 dev 가 0 → pooled SD 0.
    const zero = [0, 0, 0, 0, 0];
    const r = ok(
      analyzeSession([
        syntheticCondition(600, 24, 0.2, 0.1, zero),
        syntheticCondition(400, 40, 0.2, 0.1, zero),
        syntheticCondition(240, 60, 0.2, 0.1, zero),
      ]),
    );
    expect(r.weSource).toBe("nominal-fallback");
    expect(r.we).toBeCloseTo((24 + 40 + 60) / 3, 6);
  });

  it("P0-3 골든: 처리율의 Ae 는 조건에 기록된 실측 이동 거리를 쓴다", () => {
    // 같은 조건인데 Ae 만 다르게 → IDe 가 달라져 TP 가 달라져야 한다.
    const base = syntheticCondition(600, 24, 0.2, 0.1, [-10, -5, 0, 5, 10]);
    const near: Condition = { ...base, Ae: 300 };
    const far: Condition = { ...base, Ae: 900 };
    const other1 = syntheticCondition(400, 40, 0.2, 0.1, [-10, -5, 0, 5, 10]);
    const other2 = syntheticCondition(240, 60, 0.2, 0.1, [-10, -5, 0, 5, 10]);
    const rNear = ok(analyzeSession([near, other1, other2]));
    const rFar = ok(analyzeSession([far, other1, other2]));
    expect(rFar.throughput).toBeGreaterThan(rNear.throughput);
  });

  it("P0-5: 유효 조건이 2개 미만이면 throw 하지 않고 insufficient", () => {
    const r = analyzeSession([syntheticCondition(400, 40, 0.2, 0.1)]);
    expect(r.status).toBe("insufficient");
    if (r.status === "insufficient") expect(r.reason).toBe("too-few-conditions");
  });

  it("P0-5: 조건이 아예 없으면 insufficient/no-conditions", () => {
    const r = analyzeSession([]);
    expect(r).toEqual({ status: "insufficient", reason: "no-conditions", usedConditions: 0 });
  });

  it("탭이 2개 미만인 조건은 분석에서 제외", () => {
    const thin: Condition = {
      A: 400,
      displayedA: 400,
      Ae: 396,
      W: 40,
      ID: indexOfDifficulty(400, 40),
      taps: [{ mt: 1.2, dx: 0, dy: 0, devAxis: 0, devOrtho: 0, error: false }],
    };
    const r = analyzeSession([
      thin,
      syntheticCondition(600, 24, 0.2, 0.1),
      syntheticCondition(240, 60, 0.2, 0.1),
    ]);
    expect(r.status).toBe("ok");
    if (r.status === "ok") expect(r.usedConditions).toBe(2);
  });

  it("P0-5: 음수 기울기면 confident=false (헛소리 해설 억제)", () => {
    // ID 가 클수록 MT 가 작아지는 역설적 데이터 → b < 0.
    const c1 = syntheticCondition(600, 24, 0.9, -0.1);
    const c2 = syntheticCondition(400, 40, 0.9, -0.1);
    const c3 = syntheticCondition(240, 60, 0.9, -0.1);
    const r = ok(analyzeSession([c1, c2, c3]));
    expect(r.fitts.b).toBeLessThan(0);
    expect(r.confident).toBe(false);
  });
});
