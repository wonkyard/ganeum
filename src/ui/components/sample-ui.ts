/**
 * `SampleUI` — S4 적응 화면의 "실제로 눌리는" 목업 (screen-design S4 · brief-3B-b §2).
 *
 * 3B-b 범위는 **키패드 1개만** (로그인 폼·미디어 툴바는 주 5–6). 숫자 버튼을 누르면
 * 입력 표시가 갱신된다. 적응은 **CSS 변수만** 바꿔 일어난다 —
 * `--hit-size` / `--gap` / `--pad` 를 `sizing()` 결과에서 설정하고 250ms 트랜지션.
 * `prefers-reduced-motion` 이면 트랜지션을 0 으로(즉시 재배치).
 *
 * 옵션 객체 + `destroy()` 패턴 (레포 관례 — `CardCalibrator` 등과 동일).
 */
import { el } from "../dom";
import { t } from "../../i18n";
import type { SizingResult } from "../../adapt/sizing";

/** 적응 전 기본 배치 (CSS px). 플랫폼 최소 터치 타깃 기준. */
export const BASE_HIT_SIZE_PX = 44;
export const BASE_GAP_PX = 8;
export const BASE_PAD_PX = 12;

/** 트랜지션 길이 (screen-design S4). reduced-motion 이면 0. */
export const ADAPT_TRANSITION_MS = 250;

export type SampleMode = "base" | "adapted";

export interface SampleUIOptions {
  host: HTMLElement;
  reducedMotion?: boolean;
  /** 시작 모드. 기본 "adapted" (슬라이더가 바로 키패드를 움직이도록). */
  initialMode?: SampleMode;
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "back"] as const;

export class SampleUI {
  private readonly root: HTMLElement;
  private readonly keypad: HTMLElement;
  private readonly display: HTMLElement;
  private readonly reduced: boolean;
  private mode: SampleMode;
  private lastSizing: SizingResult | null = null;
  private entry = "";

  constructor(opts: SampleUIOptions) {
    this.reduced = opts.reducedMotion ?? false;
    this.mode = opts.initialMode ?? "adapted";

    this.display = el("output", { class: "sample-ui-display numeric", "aria-live": "polite" });

    this.keypad = el("div", { class: "sample-ui-keypad", role: "group", "aria-label": t("adapt.keypadLabel") });
    for (const k of KEYS) {
      const btn = el(
        "button",
        {
          type: "button",
          class: "sample-ui-key",
          "data-key": k,
          "aria-label": k === "clear" ? t("adapt.keypadClear") : k === "back" ? t("adapt.keypadBack") : k,
        },
        k === "clear" ? "⌫⌫" : k === "back" ? "⌫" : k,
      );
      btn.addEventListener("click", () => this.press(k));
      this.keypad.append(btn);
    }

    this.root = el(
      "div",
      { class: "sample-ui" },
      el("div", { class: "sample-ui-phone" }, this.display, this.keypad),
    );
    opts.host.append(this.root);

    this.root.style.setProperty("--adapt-transition", `${this.reduced ? 0 : ADAPT_TRANSITION_MS}ms`);
    this.applyVars();
  }

  private press(k: (typeof KEYS)[number]): void {
    if (k === "clear") this.entry = "";
    else if (k === "back") this.entry = this.entry.slice(0, -1);
    else if (this.entry.length < 12) this.entry += k;
    this.display.textContent = this.entry;
  }

  /** 현재 모드 기준 CSS 변수를 적용한다. */
  private applyVars(): void {
    const s = this.lastSizing;
    const adapted = this.mode === "adapted" && s != null;
    const hit = adapted ? s!.wStar : BASE_HIT_SIZE_PX;
    const gap = adapted ? s!.gap : BASE_GAP_PX;
    const pad = adapted ? Math.max(BASE_PAD_PX, s!.gap) : BASE_PAD_PX;
    this.root.style.setProperty("--hit-size", `${round(hit)}px`);
    this.root.style.setProperty("--gap", `${round(gap)}px`);
    this.root.style.setProperty("--pad", `${round(pad)}px`);
  }

  /** `sizing()` 결과를 반영한다. null 이면 기본 배치로 폴백 (퇴화 세션). */
  applySizing(result: SizingResult | null): void {
    this.lastSizing = result;
    this.applyVars();
  }

  /** "원래대로 ↔ 나에게 맞춤" 토글. */
  setMode(mode: SampleMode): void {
    this.mode = mode;
    this.applyVars();
  }

  getMode(): SampleMode {
    return this.mode;
  }

  destroy(): void {
    this.root.remove();
  }
}

function round(v: number): number {
  return Math.round(v * 10) / 10;
}
