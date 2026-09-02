import { describe, expect, it } from "vitest";
import { FutureSchemaError, migrateProfile, needsMigration } from "./migrate";
import { CURRENT_SCHEMA } from "./types";

describe("migrateProfile", () => {
  it("버전 필드 없는 v0 데이터를 v1 로 올리며 기본값을 채움", () => {
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
  });

  it("v0 인데 id 도 없으면 새 id 를 생성", () => {
    const p = migrateProfile({});
    expect(typeof p.id).toBe("string");
    expect(p.id.length).toBeGreaterThan(0);
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
