import { describe, expect, it } from "vitest";
import { buildMorphAxis, initialMorphT, morphAt, presetWe, type MorphMeInput } from "./morph";
import { DEFAULT_PX_PER_MM, getPreset } from "./presets";
import { WELFORD_ENTROPY_FACTOR } from "./sizing";

const young = getPreset("young");
const elderly = getPreset("elderly");
const tremor = getPreset("tremor");

/** 미보정 축 (프리셋만, "나" 없음). */
const presetOnly = buildMorphAxis({ me: null, calibrationPxPerMm: null });

describe("presetWe — 프리셋 산포(mm) → We(px)", () => {
  it("We = 4.133 · SD · pxPerMm (미보정 기본값)", () => {
    expect(presetWe(young, null)).toBeCloseTo(1.8 * DEFAULT_PX_PER_MM * WELFORD_ENTROPY_FACTOR, 6);
    expect(presetWe(tremor, null)).toBeCloseTo(7.0 * DEFAULT_PX_PER_MM * WELFORD_ENTROPY_FACTOR, 6);
  });

  it("보정값이 있으면 그것으로 환산한다", () => {
    expect(presetWe(elderly, 5)).toBeCloseTo(3.8 * 5 * WELFORD_ENTROPY_FACTOR, 6);
  });
});

describe("buildMorphAxis — 축 구성", () => {
  it("프리셋만: 스톱 3개, We 오름차순 young < elderly < tremor", () => {
    expect(presetOnly.stops.map((s) => s.id)).toEqual(["young", "elderly", "tremor"]);
    const wes = presetOnly.stops.map((s) => s.we);
    expect(wes[0]).toBeLessThan(wes[1]);
    expect(wes[1]).toBeLessThan(wes[2]);
  });

  it("끝 스톱 위치는 0 과 1, weMin/weMax 는 프리셋 min/max", () => {
    expect(presetOnly.stops[0].pos).toBe(0);
    expect(presetOnly.stops[2].pos).toBe(1);
    expect(presetOnly.weMin).toBeCloseTo(presetWe(young, null), 6);
    expect(presetOnly.weMax).toBeCloseTo(presetWe(tremor, null), 6);
  });

  it("'나' 없으면 meDisabled=false 가 아니라 meAt=null (스톱에도 없음)", () => {
    expect(presetOnly.meAt).toBeNull();
    expect(presetOnly.meDisabled).toBe(true);
    expect(presetOnly.stops.some((s) => s.id === "me")).toBe(false);
  });
});

describe("morphAt — 보간", () => {
  it("t=0 은 정확히 최소 프리셋(young), t=1 은 정확히 최대 프리셋(tremor)", () => {
    const lo = morphAt(presetOnly, 0);
    expect(lo.a).toBe(young.a);
    expect(lo.b).toBe(young.b);
    expect(lo.we).toBeCloseTo(presetWe(young, null), 6);

    const hi = morphAt(presetOnly, 1);
    expect(hi.a).toBe(tremor.a);
    expect(hi.b).toBe(tremor.b);
    expect(hi.estimated).toBe(true); // 손떨림은 추정
  });

  it("elderly 위치에서 정확히 elderly 값", () => {
    const pos = presetOnly.stops[1].pos;
    const mid = morphAt(presetOnly, pos);
    expect(mid.a).toBeCloseTo(elderly.a, 10);
    expect(mid.b).toBeCloseTo(elderly.b, 10);
  });

  it("young↔elderly 중간은 선형 보간값", () => {
    const posE = presetOnly.stops[1].pos;
    const q = morphAt(presetOnly, posE / 2);
    expect(q.a).toBeCloseTo((young.a + elderly.a) / 2, 10);
    expect(q.b).toBeCloseTo((young.b + elderly.b) / 2, 10);
    expect(q.estimated).toBe(false); // tremor 구간 아님
  });

  it("elderly↔tremor 구간은 estimated=true", () => {
    const posE = presetOnly.stops[1].pos;
    const q = morphAt(presetOnly, posE + (1 - posE) / 2);
    expect(q.estimated).toBe(true);
  });

  it("범위 밖 t 는 끝으로 클램프", () => {
    expect(morphAt(presetOnly, -3).a).toBe(young.a);
    expect(morphAt(presetOnly, 9).a).toBe(tremor.a);
    expect(morphAt(presetOnly, NaN).a).toBe(young.a);
  });
});

describe("'나' 스냅", () => {
  const measured = (we: number): MorphMeInput => ({
    a: -0.05,
    b: 0.3,
    we,
    weSource: "measured",
    confident: true,
  });

  it("프리셋 사이 측정값은 브래킷 선형 보간 위치에 스냅", () => {
    const weMid = presetOnly.weMin + (presetOnly.weMax - presetOnly.weMin) * 0.42;
    const axis = buildMorphAxis({ me: measured(weMid), calibrationPxPerMm: null });
    expect(axis.meDisabled).toBe(false);
    expect(axis.meAt).toBeCloseTo(0.42, 6);
    const meStop = axis.stops.find((s) => s.id === "me");
    expect(meStop?.pos).toBeCloseTo(0.42, 6);
    expect(axis.stops).toHaveLength(4);
  });

  it("축 밖 측정값은 클램프 (위/아래)", () => {
    const above = buildMorphAxis({ me: measured(presetOnly.weMax * 2), calibrationPxPerMm: null });
    expect(above.meAt).toBe(1);
    const below = buildMorphAxis({ me: measured(1), calibrationPxPerMm: null });
    expect(below.meAt).toBe(0);
  });

  it("weSource='nominal-fallback' 이면 '나' 비활성 + 안내 경로", () => {
    const axis = buildMorphAxis({
      me: { ...measured(44), weSource: "nominal-fallback" },
      calibrationPxPerMm: null,
    });
    expect(axis.meDisabled).toBe(true);
    expect(axis.meAt).toBeNull();
    expect(axis.stops.some((s) => s.id === "me")).toBe(false);
  });

  it("we ≤ 0 도 퇴화로 비활성", () => {
    const axis = buildMorphAxis({ me: measured(0), calibrationPxPerMm: null });
    expect(axis.meDisabled).toBe(true);
  });

  it("'나' 가 축 끝점을 대체하지 않는다 — morphAt(0/1) 은 여전히 프리셋", () => {
    const axis = buildMorphAxis({ me: measured(presetOnly.weMax * 5), calibrationPxPerMm: null });
    expect(morphAt(axis, 1).a).toBe(tremor.a);
    expect(morphAt(axis, 1).b).toBe(tremor.b);
  });

  it("morphAt 이 '나' 스톱을 통과해 보간한다", () => {
    const weMid = presetOnly.weMin + (presetOnly.weMax - presetOnly.weMin) * 0.5;
    const me = measured(weMid);
    const axis = buildMorphAxis({ me, calibrationPxPerMm: null });
    const at = morphAt(axis, 0.5);
    expect(at.a).toBeCloseTo(me.a, 10);
    expect(at.b).toBeCloseTo(me.b, 10);
  });
});

describe("initialMorphT", () => {
  it("'나' 활성이면 meAt", () => {
    const weMid = presetOnly.weMin + (presetOnly.weMax - presetOnly.weMin) * 0.3;
    const axis = buildMorphAxis({
      me: { a: -0.05, b: 0.3, we: weMid, weSource: "measured", confident: true },
      calibrationPxPerMm: null,
    });
    expect(initialMorphT(axis)).toBeCloseTo(0.3, 6);
  });

  it("'나' 비활성이면 elderly 위치로 폴백", () => {
    expect(initialMorphT(presetOnly)).toBeCloseTo(presetOnly.stops[1].pos, 6);
  });
});

describe("보정 축", () => {
  it("보정값이 프리셋 We 를 비례 확대하지만 정규화 위치는 유지", () => {
    const cal = buildMorphAxis({ me: null, calibrationPxPerMm: 6 });
    expect(cal.weMax / cal.weMin).toBeCloseTo(presetOnly.weMax / presetOnly.weMin, 6);
    expect(cal.stops[1].pos).toBeCloseTo(presetOnly.stops[1].pos, 6);
  });
});
