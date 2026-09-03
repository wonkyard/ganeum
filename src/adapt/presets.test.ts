import { describe, expect, it } from "vitest";
import { CITATIONS } from "./citations";
import {
  ADAPT_PRESETS,
  DEFAULT_PX_PER_MM,
  endpointSdPx,
  getPreset,
} from "./presets";

describe("adapt presets", () => {
  it("세 프리셋(young/elderly/tremor)이 있다", () => {
    expect(ADAPT_PRESETS.map((p) => p.id)).toEqual(["young", "elderly", "tremor"]);
  });

  it("손떨림만 estimated=true (문헌 공백)", () => {
    expect(getPreset("young").estimated).toBe(false);
    expect(getPreset("elderly").estimated).toBe(false);
    expect(getPreset("tremor").estimated).toBe(true);
  });

  it("a 는 음수(초), b 는 양수이고 young < elderly < tremor 로 가팔라진다", () => {
    const [young, elderly, tremor] = ADAPT_PRESETS;
    expect(young.a).toBeLessThan(0);
    expect(elderly.a).toBeLessThan(0);
    expect(young.b).toBeGreaterThan(0);
    expect(elderly.b).toBeGreaterThan(young.b);
    expect(tremor.b).toBeGreaterThan(elderly.b);
  });

  it("SI(초) 스케일 — 문헌 ms ÷ 1000", () => {
    expect(getPreset("young")).toMatchObject({ a: -0.025, b: 0.224 });
    expect(getPreset("elderly")).toMatchObject({ a: -0.071, b: 0.333 });
    expect(getPreset("tremor")).toMatchObject({ a: -0.071, b: 0.45 });
  });

  it("각 프리셋의 citationKey 가 CITATIONS 에 존재한다", () => {
    for (const p of ADAPT_PRESETS) {
      expect(CITATIONS[p.citationKey]).toBeTruthy();
    }
  });

  it("endpointSdPx: 보정값 우선, 없으면 문서화된 기본(3.8)", () => {
    expect(DEFAULT_PX_PER_MM).toBe(3.8);
    expect(endpointSdPx(getPreset("young"), null)).toBeCloseTo(1.8 * 3.8, 10);
    expect(endpointSdPx(getPreset("young"), 5)).toBeCloseTo(9.0, 10);
  });

  it("알 수 없는 id 는 던진다", () => {
    // @ts-expect-error 의도적으로 잘못된 id
    expect(() => getPreset("bogus")).toThrow();
  });
});
