// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { CARD_WIDTH_MM, CardCalibrator } from "./card-calibrator";
import { setLocale } from "../../i18n";

afterEach(() => setLocale("ko"));

function mount(): HTMLElement {
  const host = document.createElement("div");
  document.body.append(host);
  return host;
}

describe("CardCalibrator", () => {
  it("초기 px/mm 를 반영하고 카드 폭 = pxPerMm × 85.6mm", () => {
    const host = mount();
    const c = new CardCalibrator({ host, initialPxPerMm: 4, screenPx: { w: 1920, h: 1080 } });
    expect(c.value).toBe(4);
    const card = host.querySelector<HTMLElement>(".card-calibrator-card");
    expect(card?.style.width).toBe(`${4 * CARD_WIDTH_MM}px`);
    c.destroy();
  });

  it("슬라이더 input 이 값과 카드 폭·직접입력 필드를 갱신", () => {
    const host = mount();
    const c = new CardCalibrator({ host, initialPxPerMm: 4, screenPx: { w: 1920, h: 1080 } });
    const slider = host.querySelector<HTMLInputElement>(".card-calibrator-slider");
    const number = host.querySelector<HTMLInputElement>(".card-calibrator-number");
    if (!slider || !number) throw new Error("no controls");
    slider.value = "5.5";
    slider.dispatchEvent(new Event("input"));
    expect(c.value).toBe(5.5);
    expect(number.value).toBe("5.5");
    const card = host.querySelector<HTMLElement>(".card-calibrator-card");
    expect(card?.style.width).toBe(`${5.5 * CARD_WIDTH_MM}px`);
    c.destroy();
  });

  it("직접입력이 값을 갱신하고 범위를 벗어나면 클램프", () => {
    const host = mount();
    const c = new CardCalibrator({ host, initialPxPerMm: 4 });
    const number = host.querySelector<HTMLInputElement>(".card-calibrator-number");
    if (!number) throw new Error("no field");
    number.value = "3.1";
    number.dispatchEvent(new Event("input"));
    expect(c.value).toBeCloseTo(3.1, 6);
    number.value = "999";
    number.dispatchEvent(new Event("input"));
    expect(c.value).toBe(8); // MAX
    c.destroy();
  });

  it("환산값 readout 에 px/mm 와 대각 인치 추정을 쓴다", () => {
    const host = mount();
    const c = new CardCalibrator({ host, initialPxPerMm: 4, screenPx: { w: 1920, h: 1080 } });
    const readout = host.querySelector<HTMLElement>(".card-calibrator-readout");
    // hypot(1920,1080)/(4·25.4) ≈ 21.7"
    expect(readout?.textContent).toMatch(/4\.00 px\/mm/);
    expect(readout?.textContent).toMatch(/21\.7/);
    c.destroy();
  });

  it("화면 크기를 모르면 대각 인치는 — 로 표시", () => {
    const host = mount();
    const c = new CardCalibrator({ host, initialPxPerMm: 4, screenPx: { w: 0, h: 0 } });
    const readout = host.querySelector<HTMLElement>(".card-calibrator-readout");
    expect(readout?.textContent).toContain("—");
    c.destroy();
  });

  it("destroy 후 DOM 에서 제거된다", () => {
    const host = mount();
    const c = new CardCalibrator({ host, initialPxPerMm: 4 });
    expect(host.querySelector(".card-calibrator")).not.toBeNull();
    c.destroy();
    expect(host.querySelector(".card-calibrator")).toBeNull();
  });
});
