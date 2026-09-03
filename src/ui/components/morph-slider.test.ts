// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { MorphSlider } from "./morph-slider";
import { buildMorphAxis } from "../../adapt/morph";
import { setLocale } from "../../i18n";

afterEach(() => setLocale("ko"));

function mount(): HTMLElement {
  const host = document.createElement("div");
  document.body.append(host);
  return host;
}

const axisWithMe = buildMorphAxis({
  me: { a: -0.05, b: 0.3, we: 55, weSource: "measured", confident: true },
  calibrationPxPerMm: null,
});
const axisNoMe = buildMorphAxis({
  me: { a: -0.05, b: 0.3, we: 55, weSource: "nominal-fallback", confident: false },
  calibrationPxPerMm: null,
});

describe("MorphSlider", () => {
  it("프리셋 눈금 3개 + '나' 마커 (활성 축)", () => {
    const host = mount();
    const s = new MorphSlider({ host, axis: axisWithMe, onChange: () => {} });
    expect(host.querySelectorAll(".morph-slider-tick")).toHaveLength(3);
    expect(host.querySelector(".morph-slider-me")).not.toBeNull();
    s.destroy();
  });

  it("퇴화 축이면 '나' 마커 없음", () => {
    const host = mount();
    const s = new MorphSlider({ host, axis: axisNoMe, onChange: () => {} });
    expect(host.querySelector(".morph-slider-me")).toBeNull();
    s.destroy();
  });

  it("input 이벤트가 정규화 t 로 onChange 를 부른다", () => {
    const host = mount();
    const seen: number[] = [];
    const s = new MorphSlider({ host, axis: axisWithMe, initialT: 0.2, onChange: (t) => seen.push(t) });
    const input = host.querySelector(".morph-slider-input") as HTMLInputElement;
    input.value = "0.8";
    input.dispatchEvent(new Event("input"));
    expect(seen).toEqual([0.8]);
    expect(s.value).toBe(0.8);
    s.destroy();
  });

  it("setT 가 위치를 옮기고 onChange 를 부른다", () => {
    const host = mount();
    const seen: number[] = [];
    const s = new MorphSlider({ host, axis: axisWithMe, onChange: (t) => seen.push(t) });
    s.setT(1);
    expect(seen).toEqual([1]);
    expect(s.value).toBe(1);
    s.destroy();
  });

  it("aria-valuetext 에 가까운 스톱 라벨", () => {
    const host = mount();
    const s = new MorphSlider({ host, axis: axisWithMe, initialT: 0, onChange: () => {} });
    const input = host.querySelector(".morph-slider-input") as HTMLInputElement;
    expect(input.getAttribute("aria-valuetext")).toBe("젊은 성인");
    s.destroy();
  });
});
