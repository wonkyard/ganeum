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
