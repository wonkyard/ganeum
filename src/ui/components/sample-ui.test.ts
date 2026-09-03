// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { SampleUI, BASE_HIT_SIZE_PX, BASE_GAP_PX } from "./sample-ui";
import { sizing } from "../../adapt/sizing";
import { setLocale } from "../../i18n";

afterEach(() => setLocale("ko"));

function mount(): HTMLElement {
  const host = document.createElement("div");
  document.body.append(host);
  return host;
}

const bigHand = sizing(
  { a: -0.071, b: 0.45, we: 110, acPx: 160, viewportMinSide: 800 },
  null,
);

describe("SampleUI", () => {
  it("키패드 12키 렌더 + 숫자 입력이 표시를 갱신", () => {
    const host = mount();
    const ui = new SampleUI({ host });
    const keys = host.querySelectorAll(".sample-ui-key");
    expect(keys).toHaveLength(12);
    (host.querySelector('[data-key="1"]') as HTMLButtonElement).click();
    (host.querySelector('[data-key="2"]') as HTMLButtonElement).click();
    expect(host.querySelector(".sample-ui-display")?.textContent).toBe("12");
    (host.querySelector('[data-key="back"]') as HTMLButtonElement).click();
    expect(host.querySelector(".sample-ui-display")?.textContent).toBe("1");
    (host.querySelector('[data-key="clear"]') as HTMLButtonElement).click();
    expect(host.querySelector(".sample-ui-display")?.textContent).toBe("");
    ui.destroy();
  });

  it("adapted 모드: sizing 결과를 CSS 변수로 설정", () => {
    const host = mount();
    const ui = new SampleUI({ host, initialMode: "adapted" });
    ui.applySizing(bigHand);
    const root = host.querySelector(".sample-ui") as HTMLElement;
    expect(bigHand).not.toBeNull();
    expect(parseFloat(root.style.getPropertyValue("--hit-size"))).toBeCloseTo(bigHand!.wStar, 1);
    expect(parseFloat(root.style.getPropertyValue("--gap"))).toBeCloseTo(bigHand!.gap, 1);
    // 손떨림 프리셋은 기본 44px 보다 훨씬 크다.
    expect(parseFloat(root.style.getPropertyValue("--hit-size"))).toBeGreaterThan(BASE_HIT_SIZE_PX);
    ui.destroy();
  });

  it("base 모드: 기본 배치 값으로 폴백", () => {
    const host = mount();
    const ui = new SampleUI({ host, initialMode: "adapted" });
    ui.applySizing(bigHand);
    ui.setMode("base");
    const root = host.querySelector(".sample-ui") as HTMLElement;
    expect(root.style.getPropertyValue("--hit-size")).toBe(`${BASE_HIT_SIZE_PX}px`);
    expect(root.style.getPropertyValue("--gap")).toBe(`${BASE_GAP_PX}px`);
    ui.destroy();
  });

  it("sizing 이 null 이면 기본 배치", () => {
    const host = mount();
    const ui = new SampleUI({ host });
    ui.applySizing(null);
    const root = host.querySelector(".sample-ui") as HTMLElement;
    expect(root.style.getPropertyValue("--hit-size")).toBe(`${BASE_HIT_SIZE_PX}px`);
    ui.destroy();
  });

  it("reduced-motion 이면 트랜지션 0ms", () => {
    const host = mount();
    const ui = new SampleUI({ host, reducedMotion: true });
    const root = host.querySelector(".sample-ui") as HTMLElement;
    expect(root.style.getPropertyValue("--adapt-transition")).toBe("0ms");
    ui.destroy();
  });

  it("destroy 후 DOM 에서 제거", () => {
    const host = mount();
    const ui = new SampleUI({ host });
    expect(host.querySelector(".sample-ui")).not.toBeNull();
    ui.destroy();
    expect(host.querySelector(".sample-ui")).toBeNull();
  });
});

describe("SampleUI — 로그인 폼 / 미디어 툴바 (brief-5-6-a §2)", () => {
  it("로그인 폼: 필드·버튼·링크 렌더 + 상호작용", () => {
    const host = mount();
    const ui = new SampleUI({ host, kind: "login" });
    expect(ui.getKind()).toBe("login");
    expect(host.querySelectorAll(".sample-ui-field")).toHaveLength(2);
    const submit = host.querySelector(".sample-ui-submit") as HTMLButtonElement;
    const link = host.querySelector(".sample-ui-link") as HTMLAnchorElement;
    expect(submit).not.toBeNull();
    expect(link).not.toBeNull();
    link.click();
    submit.closest("form")!.dispatchEvent(new Event("submit", { cancelable: true }));
    expect(host.querySelector(".sample-ui-status")?.textContent).not.toBe("");
    ui.destroy();
  });

  it("미디어 툴바: 아이콘 버튼 6개 + 재생/일시정지 토글", () => {
    const host = mount();
    const ui = new SampleUI({ host, kind: "toolbar" });
    const buttons = host.querySelectorAll(".sample-ui-icon-btn");
    expect(buttons).toHaveLength(6);
    const play = host.querySelector('[data-btn="play"]') as HTMLButtonElement;
    const first = play.getAttribute("aria-label");
    play.click();
    expect(play.getAttribute("aria-label")).not.toBe(first);
    play.click();
    expect(play.getAttribute("aria-label")).toBe(first);
    ui.destroy();
  });

  it.each(["keypad", "login", "toolbar"] as const)(
    "%s: adapted 모드에서 sizing 결과가 CSS 변수로 반영된다",
    (kind) => {
      const host = mount();
      const ui = new SampleUI({ host, kind, initialMode: "adapted" });
      ui.applySizing(bigHand);
      const root = host.querySelector(".sample-ui") as HTMLElement;
      expect(parseFloat(root.style.getPropertyValue("--hit-size"))).toBeCloseTo(bigHand!.wStar, 1);
      expect(parseFloat(root.style.getPropertyValue("--gap"))).toBeCloseTo(bigHand!.gap, 1);
      expect(parseFloat(root.style.getPropertyValue("--hit-size"))).toBeGreaterThan(BASE_HIT_SIZE_PX);
      // base 로 토글하면 기본 배치로 되돌아간다.
      ui.setMode("base");
      expect(root.style.getPropertyValue("--hit-size")).toBe(`${BASE_HIT_SIZE_PX}px`);
      ui.destroy();
    },
  );
});
