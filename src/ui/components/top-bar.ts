/** 전역 상단바 — (선택) 뒤로 + 제목 + ThemeToggle + LangToggle. */
import { el } from "../dom";
import { t } from "../../i18n";
import { createThemeToggle } from "./theme-toggle";
import { createLangToggle } from "./lang-toggle";

export interface TopBarOptions {
  /** 뒤로 버튼이 갈 경로. 없으면 뒤로 버튼을 숨긴다. */
  back?: string;
  go(path: string): void;
  rerender(): void;
}

export function createTopBar(opts: TopBarOptions): HTMLElement {
  const left = el("div", { class: "top-bar-left" });
  if (opts.back) {
    const back = el("button", { type: "button", class: "bar-toggle" }, `← ${t("app.back")}`);
    back.addEventListener("click", () => opts.go(opts.back as string));
    left.append(back);
  }
  left.append(el("span", { class: "top-bar-title" }, t("app.title")));

  return el(
    "header",
    { class: "top-bar" },
    left,
    el(
      "div",
      { class: "top-bar-right" },
      createThemeToggle(opts.rerender),
      createLangToggle(opts.rerender),
    ),
  );
}
