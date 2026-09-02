// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { motionDuration, onReducedMotionChange, prefersReducedMotion } from "./reduced-motion";
import { applyTheme, loadThemeChoice, resolvedTheme } from "./theme";

afterEach(() => {
  vi.unstubAllGlobals();
  document.documentElement.removeAttribute("data-theme");
  try {
    localStorage.clear();
  } catch {
    /* ignore */
  }
});

function stubMatchMedia(matches: Record<string, boolean>): void {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: matches[query] ?? false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

describe("reduced-motion", () => {
  it("matchMedia 없으면 축약 안 함으로 폴백", () => {
    vi.stubGlobal("matchMedia", undefined);
    expect(prefersReducedMotion()).toBe(false);
    expect(motionDuration(300)).toBe(300);
  });

  it("reduce 선호 시 motionDuration 은 0", () => {
    stubMatchMedia({ "(prefers-reduced-motion: reduce)": true });
    expect(prefersReducedMotion()).toBe(true);
    expect(motionDuration(300)).toBe(0);
  });

  it("onReducedMotionChange 는 즉시 1회 현재값을 알림", () => {
    stubMatchMedia({ "(prefers-reduced-motion: reduce)": true });
    const seen: boolean[] = [];
    const off = onReducedMotionChange((r) => seen.push(r));
    expect(seen).toEqual([true]);
    off();
  });
});

describe("theme", () => {
  it("명시 선택은 data-theme 로 반영되고 저장됨", () => {
    applyTheme("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(loadThemeChoice()).toBe("dark");
  });

  it("system 선택은 data-theme 를 제거", () => {
    applyTheme("dark");
    applyTheme("system");
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
    expect(loadThemeChoice()).toBe("system");
  });

  it("resolvedTheme 은 명시 선택을 그대로, system 은 OS 값 조회", () => {
    expect(resolvedTheme("light")).toBe("light");
    stubMatchMedia({ "(prefers-color-scheme: dark)": true });
    expect(resolvedTheme("system")).toBe("dark");
  });
});
