// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import {
  FittsWidget,
  predictFitts,
  FITTS_A_MS,
  FITTS_B_MS,
  AMPLITUDE_RANGE,
  WIDTH_RANGE,
} from "./fitts-widget";
import { setLocale } from "../../i18n";

afterEach(() => setLocale("ko"));

function mount(): HTMLElement {
  const host = document.createElement("div");
  document.body.append(host);
  return host;
}

describe("predictFitts (순수 계산)", () => {
  it("MT = a + b·log2(A/W + 1) 손계산과 일치", () => {
    // A = 200, W = 50 → ID = log2(5) = 2.321928…
    const { id, mtMs } = predictFitts(200, 50);
    expect(id).toBeCloseTo(Math.log2(200 / 50 + 1), 10);
    expect(mtMs).toBeCloseTo(FITTS_A_MS + FITTS_B_MS * Math.log2(5), 10);
  });

  it("A = 0 이면 ID = 0, MT = a", () => {
    const { id, mtMs } = predictFitts(0, 40);
    expect(id).toBe(0);
    expect(mtMs).toBe(FITTS_A_MS);
  });

  it("멀수록·작을수록 MT 가 단조 증가", () => {
    expect(predictFitts(240, 40).mtMs).toBeGreaterThan(predictFitts(80, 40).mtMs);
    expect(predictFitts(160, 20).mtMs).toBeGreaterThan(predictFitts(160, 80).mtMs);
  });
});

describe("FittsWidget", () => {
  it("초기 상태를 정의역 안으로 클램프하고 readout 을 렌더한다", () => {
    const host = mount();
    const w = new FittsWidget({ host, initialAmplitudePx: 9999, initialWidthPx: 1 });
    const s = w.getState();
    expect(s.amplitudePx).toBe(AMPLITUDE_RANGE.max);
    expect(s.widthPx).toBe(WIDTH_RANGE.min);
    const readout = host.querySelector(".fitts-widget-readout") as HTMLElement;
    expect(readout.textContent).toContain("MT");
    w.destroy();
  });

  it("거리 슬라이더를 움직이면 예측 MT 텍스트가 바뀐다", () => {
    const host = mount();
    let last: number | null = null;
    const w = new FittsWidget({
      host,
      initialAmplitudePx: 60,
      initialWidthPx: 48,
      onChange: (st) => {
        last = st.mtMs;
      },
    });
    const readout = host.querySelector(".fitts-widget-readout") as HTMLElement;
    const before = readout.textContent;
    const dist = host.querySelectorAll<HTMLInputElement>(".fitts-widget-range")[0];
    dist.value = "240";
    dist.dispatchEvent(new Event("input"));
    expect(readout.textContent).not.toBe(before);
    expect(w.getState().amplitudePx).toBe(240);
    expect(last).toBeGreaterThan(0);
    w.destroy();
  });

  it("크기 슬라이더를 키우면 예측 MT 가 줄어든다", () => {
    const host = mount();
    const w = new FittsWidget({ host, initialAmplitudePx: 200, initialWidthPx: 20 });
    const mtSmall = w.getState().mtMs;
    const size = host.querySelectorAll<HTMLInputElement>(".fitts-widget-range")[1];
    size.value = "96";
    size.dispatchEvent(new Event("input"));
    expect(w.getState().mtMs).toBeLessThan(mtSmall);
    w.destroy();
  });

  it("타깃 화살표키로도 거리·크기를 조절한다 (키보드 대체 경로)", () => {
    const host = mount();
    const w = new FittsWidget({ host, initialAmplitudePx: 120, initialWidthPx: 48 });
    const target = host.querySelector(".fitts-widget-target") as SVGElement;
    const a0 = w.getState().amplitudePx;
    target.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    expect(w.getState().amplitudePx).toBeGreaterThan(a0);
    const wd0 = w.getState().widthPx;
    target.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    expect(w.getState().widthPx).toBeLessThan(wd0);
    w.destroy();
  });

  it("reduced-motion 이면 data 속성이 붙고 destroy 후 제거된다", () => {
    const host = mount();
    const w = new FittsWidget({ host, reducedMotion: true });
    expect(host.querySelector(".fitts-widget")?.hasAttribute("data-reduced-motion")).toBe(true);
    w.destroy();
    expect(host.querySelector(".fitts-widget")).toBeNull();
  });
});
