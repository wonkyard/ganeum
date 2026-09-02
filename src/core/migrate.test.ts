import { describe, expect, it } from "vitest";
import { FutureSchemaError, migrateProfile, needsMigration } from "./migrate";
import { CURRENT_SCHEMA } from "./types";

describe("migrateProfile", () => {
  it("버전 필드 없는 v0 데이터를 최신(v2) 으로 올리며 기본값을 채움", () => {
    const raw = { id: "abc", createdAt: "2026-01-01T00:00:00.000Z", conditions: [] };
    const p = migrateProfile(raw);
    expect(p.schema).toBe(CURRENT_SCHEMA);
    expect(p.id).toBe("abc");
    expect(p.hand).toBe("right");
    expect(p.pointerType).toBe("mouse");
    expect(p.calibrated).toBe(false);
    expect(p.viewport).toEqual({ w: 0, h: 0, dpr: 1, pxPerMm: null });
    expect(p.fitts).toEqual({ a: 0, b: 0, r2: 0 });
    expect(p.asymmetry).toBeNull();
    // v2 필드 (brief-3A P0-8).
    expect(p.sessionId).toBe("abc");
    expect(p.appVersion).toBe("unknown");
    expect(p.we).toBe(0);
    expect(p.weSource).toBe("nominal-fallback");
  });

  it("P0-8 골든: v1 → v2 마이그레이션 — devAxis/devOrtho·We·세션 필드 채움", () => {
    const v1 = {
      schema: 1,
      id: "p1",
      createdAt: "2026-02-02T00:00:00.000Z",
      pointerType: "mouse",
      hand: "right",
      mode: "quick",
      calibrated: false,
      viewport: { w: 800, h: 600, dpr: 2, pxPerMm: null },
      conditions: [
        {
          A: 600,
          W: 24,
          ID: 4.7,
          taps: [
            { mt: 1.4, dx: 0, dy: 0, error: false }, // 워밍업
            { mt: 0.5, dx: -10, dy: 3, error: false },
            { mt: 0.5, dx: -5, dy: -2, error: false },
            { mt: 0.5, dx: 0, dy: 1, error: false },
            { mt: 0.5, dx: 5, dy: 0, error: false },
            { mt: 0.5, dx: 10, dy: -1, error: false },
          ],
        },
      ],
      fitts: { a: 0.2, b: 0.1, r2: 0.95 },
      throughput: 4.2,
      errorRate: 0,
      consistencySD: 0.02,
      asymmetry: null,
    };
    const p = migrateProfile(v1);
    expect(p.schema).toBe(2);
    expect(p.sessionId).toBe("p1");
    expect(p.appVersion).toBe("unknown");
    // devAxis/devOrtho 는 dx/dy 로 폴백 채움.
    expect(p.conditions[0].taps[1].devAxis).toBe(-10);
    expect(p.conditions[0].taps[1].devOrtho).toBe(3);
    expect(p.conditions[0].displayedA).toBe(600);
    expect(p.conditions[0].Ae).toBe(600);
    // We 재계산: 워밍업 제외 dev(=dx) [-10,-5,0,5,10] pooled → 4.133·SD.
    expect(p.weSource).toBe("measured");
    expect(p.we).toBeGreaterThan(0);
  });

  it("v0 인데 id 도 없으면 새 id 를 생성", () => {
    const p = migrateProfile({});
    expect(typeof p.id).toBe("string");
    expect(p.id.length).toBeGreaterThan(0);
  });

  it("v1 인데 conditions 가 배열이 아니거나 이미 we/sessionId 가 있으면 보존", () => {
    const weird = migrateProfile({ schema: 1, id: "w1", conditions: "oops", we: 42, sessionId: "s9" });
    expect(weird.schema).toBe(2);
    expect(weird.we).toBe(42);
    expect(weird.weSource).toBe("nominal-fallback");
    expect(weird.sessionId).toBe("s9");
    expect(weird.conditions).toEqual([]);
  });

  it("이미 현재 버전이면 그대로 통과", () => {
    const current = migrateProfile({ id: "x", conditions: [] });
    expect(migrateProfile(current)).toEqual(current);
  });

  it("미래 버전은 FutureSchemaError", () => {
    expect(() => migrateProfile({ schema: 99 })).toThrow(FutureSchemaError);
  });

  it("객체가 아니면 TypeError", () => {
    expect(() => migrateProfile(null)).toThrow(TypeError);
    expect(() => migrateProfile("nope")).toThrow(TypeError);
  });
});

describe("needsMigration", () => {
  it("버전 없음 / 낮음 → true, 현재 → false", () => {
    expect(needsMigration({})).toBe(true);
    expect(needsMigration({ schema: 0 })).toBe(true);
    expect(needsMigration({ schema: CURRENT_SCHEMA })).toBe(false);
    expect(needsMigration(null)).toBe(false);
  });
});
