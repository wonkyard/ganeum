/**
 * `LangToggle` — 전역 상단바. ko ↔ en. `ganeum.prefs` 에 저장.
 */
import { el } from "../dom";
import { getLocale, setLocale, t, type Locale } from "../../i18n";
import { savePrefs } from "../../storage/profiles";

const NEXT: Record<Locale, Locale> = { ko: "en", en: "ko" };

export function createLangToggle(onChange?: () => void): HTMLElement {
  const button = el("button", { type: "button", class: "bar-toggle" });

  const sync = (): void => {
    const locale = getLocale();
    button.textContent = locale.toUpperCase();
    button.setAttribute("aria-label", `${t("lang.toggle")}: ${locale.toUpperCase()}`);
  };

  button.addEventListener("click", () => {
    const next = NEXT[getLocale()];
    setLocale(next);
    savePrefs({ locale: next });
    sync();
    onChange?.();
  });

  sync();
  return button;
}
