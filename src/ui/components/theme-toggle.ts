/**
 * `ThemeToggle` — 전역 상단바. system → light → dark 순환. `ganeum.prefs` 에 저장.
 */
import { el } from "../dom";
import { t } from "../../i18n";
import { applyTheme, type ThemeChoice } from "../../a11y/theme";
import { loadPrefs, savePrefs } from "../../storage/profiles";

const ORDER: ThemeChoice[] = ["system", "light", "dark"];
const LABEL: Record<ThemeChoice, "theme.system" | "theme.light" | "theme.dark"> = {
  system: "theme.system",
  light: "theme.light",
  dark: "theme.dark",
};
const GLYPH: Record<ThemeChoice, string> = { system: "◐", light: "○", dark: "●" };

export function createThemeToggle(onChange?: () => void): HTMLElement {
  const button = el("button", { type: "button", class: "bar-toggle", "aria-live": "polite" });

  const sync = (): void => {
    const choice = loadPrefs().theme;
    button.textContent = `${GLYPH[choice]} ${t(LABEL[choice])}`;
    button.setAttribute("aria-label", `${t("theme.toggle")}: ${t(LABEL[choice])}`);
  };

  button.addEventListener("click", () => {
    const choice = loadPrefs().theme;
    const next = ORDER[(ORDER.indexOf(choice) + 1) % ORDER.length];
    savePrefs({ theme: next });
    applyTheme(next);
    sync();
    onChange?.();
  });

  sync();
  return button;
}
