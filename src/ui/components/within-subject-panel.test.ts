// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { createWithinSubjectPanel, presetOverlays } from "./within-subject-panel";
import { setLocale } from "../../i18n";
import type { FittsChart } from "../../render/fitts-chart";

afterEach(() => setLocale("ko"));

function fakeChart(): { chart: FittsChart; calls: Array<[string, boolean]> } {
  const calls: Array<[string, boolean]> = [];
  const chart = {
    setOverlay: (id: string, visible: boolean) => calls.push([id, visible]),
  } as unknown as FittsChart;
  return { chart, calls };
}

describe("presetOverlays", () => {
  it("프리셋 3종, 모두 기본 숨김", () => {
    const ov = presetOverlays();
    expect(ov.map((o) => o.id)).toEqual(["young", "elderly", "tremor"]);
    expect(ov.every((o) => o.visible === false)).toBe(true);
  });
});

describe("WithinSubjectPanel", () => {
  it("칩 4개 (나 + 프리셋 3), '나' 는 기본 켜짐", () => {
    const { chart, calls } = fakeChart();
    const panel = createWithinSubjectPanel({ chart, imprecise: false });
    const chips = panel.querySelectorAll(".wsp-chip");
    expect(chips).toHaveLength(4);
    expect(chips[0].getAttribute("aria-pressed")).toBe("true");
    expect(chips[1].getAttribute("aria-pressed")).toBe("false");
    // 초기 동기화: me=on, 프리셋=off
    expect(calls).toContainEqual(["me", true]);
    expect(calls).toContainEqual(["young", false]);
  });

  it("프리셋 칩 클릭이 오버레이를 토글", () => {
    const { chart, calls } = fakeChart();
    const panel = createWithinSubjectPanel({ chart, imprecise: false });
    const tremorChip = panel.querySelectorAll(".wsp-chip")[3] as HTMLButtonElement;
    calls.length = 0;
    tremorChip.click();
    expect(tremorChip.getAttribute("aria-pressed")).toBe("true");
    expect(calls).toEqual([["tremor", true]]);
    tremorChip.click();
    expect(calls).toEqual([["tremor", true], ["tremor", false]]);
  });

  it("출처 링크 상시 (고유 인용 2개)", () => {
    const { chart } = fakeChart();
    const panel = createWithinSubjectPanel({ chart, imprecise: false });
    const links = panel.querySelectorAll(".wsp-citations a");
    expect(links).toHaveLength(2);
    expect((links[0] as HTMLAnchorElement).getAttribute("href")).toMatch(/^https?:\/\//);
  });

  it("인구 백분위·'상위 N%' 문구 없음", () => {
    const { chart } = fakeChart();
    const panel = createWithinSubjectPanel({ chart, imprecise: false });
    expect(panel.textContent).not.toMatch(/상위|백분위|percentile/i);
  });

  it("imprecise 면 주의 문구 노출", () => {
    const { chart } = fakeChart();
    const panel = createWithinSubjectPanel({ chart, imprecise: true });
    expect(panel.querySelector(".wsp-warn")?.textContent).toContain("부정확");
  });
});

describe("WithinSubjectPanel — 좌우손 비교 (5-6-b §2)", () => {
  it("handComparison 이 있으면 왼손/오른손 · 비대칭 라인", () => {
    const { chart } = fakeChart();
    const panel = createWithinSubjectPanel({
      chart,
      imprecise: false,
      handComparison: { right: 4.6, left: 3.9, asymmetry: (4.6 - 3.9) / 4.25 },
    });
    const line = panel.querySelector(".wsp-hand-compare")?.textContent ?? "";
    expect(line).toContain("왼손 3.9");
    expect(line).toContain("오른손 4.6");
    expect(line).toContain("비대칭 16%");
  });

  it("비대칭 null 이면 '양손을 모두' 안내", () => {
    const { chart } = fakeChart();
    const panel = createWithinSubjectPanel({
      chart,
      imprecise: false,
      handComparison: { right: 4.6, left: 3.9, asymmetry: null },
    });
    expect(panel.querySelector(".wsp-hand-compare")?.textContent).toContain("양손을 모두");
  });

  it("handComparison 없으면 라인 없음", () => {
    const { chart } = fakeChart();
    const panel = createWithinSubjectPanel({ chart, imprecise: false });
    expect(panel.querySelector(".wsp-hand-compare")).toBeNull();
  });
});

describe("WithinSubjectPanel — 시점 비교 (5-6-b §3)", () => {
  const prev = {
    throughput: 4.0,
    fit: { a: 0.2, b: 0.09, r2: 0.95 },
    date: "2026-08-20T10:00:00.000Z",
    lowConfidence: false,
  };

  it("history 가 있으면 '지난 측정' 오버레이 칩(5번째) 추가 + 델타 라인", () => {
    const { chart, calls } = fakeChart();
    const panel = createWithinSubjectPanel({
      chart,
      imprecise: false,
      history: { previous: prev, deltaThroughput: 0.3 },
    });
    expect(panel.querySelectorAll(".wsp-chip")).toHaveLength(5);
    expect(panel.querySelectorAll(".wsp-chip")[4].textContent).toContain("지난 측정");
    expect(calls).toContainEqual(["prev", false]);
    const delta = panel.querySelector(".wsp-history-delta")?.textContent ?? "";
    expect(delta).toContain("+0.3");
    expect(delta).toContain("↑");
  });

  it("델타가 음수면 ↓, 0 근처면 flat 문구", () => {
    const down = createWithinSubjectPanel({
      chart: fakeChart().chart,
      imprecise: false,
      history: { previous: prev, deltaThroughput: -0.4 },
    });
    expect(down.querySelector(".wsp-history-delta")?.textContent).toContain("↓");

    const flat = createWithinSubjectPanel({
      chart: fakeChart().chart,
      imprecise: false,
      history: { previous: prev, deltaThroughput: 0.02 },
    });
    expect(flat.querySelector(".wsp-history-delta")?.textContent).toContain("거의 같");
  });

  it("추이 3점 이상이면 스파크라인 SVG, 저신뢰 점은 회색 클래스", () => {
    const { chart } = fakeChart();
    const panel = createWithinSubjectPanel({
      chart,
      imprecise: false,
      history: {
        previous: prev,
        deltaThroughput: 0.3,
        trend: [
          { date: "2026-08-10T00:00:00.000Z", throughput: 3.8, lowConfidence: true },
          { date: "2026-08-20T00:00:00.000Z", throughput: 4.0, lowConfidence: false },
          { date: "2026-08-30T00:00:00.000Z", throughput: 4.3, lowConfidence: false },
        ],
      },
    });
    const spark = panel.querySelector("svg.wsp-sparkline");
    expect(spark).not.toBeNull();
    expect(spark?.querySelectorAll("circle")).toHaveLength(3);
    expect(spark?.querySelectorAll("circle.is-lowconf")).toHaveLength(1);
    expect(panel.querySelector(".wsp-sparkline-path")?.getAttribute("d")).toMatch(/^M /);
  });

  it("추이 2점이면 스파크라인 없음", () => {
    const { chart } = fakeChart();
    const panel = createWithinSubjectPanel({
      chart,
      imprecise: false,
      history: { previous: prev, deltaThroughput: 0.3 },
    });
    expect(panel.querySelector("svg.wsp-sparkline")).toBeNull();
  });

  it("직전 세션이 저신뢰면 경고 문구", () => {
    const { chart } = fakeChart();
    const panel = createWithinSubjectPanel({
      chart,
      imprecise: false,
      history: { previous: { ...prev, lowConfidence: true }, deltaThroughput: 0.3 },
    });
    expect(panel.querySelector(".wsp-history-lowconf")?.textContent).toContain("신뢰도");
  });
});
