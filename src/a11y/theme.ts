/**
 * 테마 토큰 적용. 기본은 OS 설정(`prefers-color-scheme`)을 따르고,
 * 사용자가 명시적으로 고르면 `<html data-theme>` 로 덮어쓰고 localStorage 에 저장한다.
 */

export type ThemeChoice = "light" | "dark" | "system";
const STORAGE_KEY = "ganeum.prefs.theme";

function safeStorage(): Storage | null {
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null;
  }
}

export function loadThemeChoice(): ThemeChoice {
  const raw = safeStorage()?.getItem(STORAGE_KEY);
  return raw === "light" || raw === "dark" ? raw : "system";
}

export function applyTheme(choice: ThemeChoice): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (choice === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", choice);

  try {
    if (choice === "system") safeStorage()?.removeItem(STORAGE_KEY);
    else safeStorage()?.setItem(STORAGE_KEY, choice);
  } catch {
    /* 저장 실패해도 화면은 이미 반영됨 */
  }
}

/** 현재 실제 적용 중인 테마(system 이면 OS 값 조회). */
export function resolvedTheme(choice: ThemeChoice = loadThemeChoice()): "light" | "dark" {
  if (choice !== "system") return choice;
  if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return "light";
}
