/**
 * `SampleUI` — S4 적응 화면의 "실제로 눌리는" 목업 (screen-design S4 · brief-3B-b §2 · brief-5-6-a §2).
 *
 * 세 종류: 숫자 키패드 / 로그인 폼 / 미디어 툴바. 종류는 `kind` 로 분기하고 공통
 * 렌더 헬퍼(폰 프레임·CSS 변수 구동)를 재사용한다. 적응은 **CSS 변수만** 바꿔
 * 일어난다 — `--hit-size` / `--gap` / `--pad` 를 `sizing()` 결과에서 설정하고
 * 250ms 트랜지션. `prefers-reduced-motion` 이면 트랜지션을 0 으로(즉시 재배치).
 *
 * 옵션 객체 + `destroy()` 패턴 (레포 관례 — `CardCalibrator` 등과 동일).
 */
import { el } from "../dom";
import { t, type MessageKey } from "../../i18n";
import type { SizingResult } from "../../adapt/sizing";

/** 적응 전 기본 배치 (CSS px). 플랫폼 최소 터치 타깃 기준. */
export const BASE_HIT_SIZE_PX = 44;
export const BASE_GAP_PX = 8;
export const BASE_PAD_PX = 12;

/** 트랜지션 길이 (screen-design S4). reduced-motion 이면 0. */
export const ADAPT_TRANSITION_MS = 250;

export type SampleMode = "base" | "adapted";
export type SampleKind = "keypad" | "login" | "toolbar";

export const SAMPLE_KINDS: readonly SampleKind[] = ["keypad", "login", "toolbar"];

export interface SampleUIOptions {
  host: HTMLElement;
  reducedMotion?: boolean;
  /** 시작 모드. 기본 "adapted" (슬라이더가 바로 샘플을 움직이도록). */
  initialMode?: SampleMode;
  /** 어떤 목업을 그릴지. 기본 "keypad". */
  kind?: SampleKind;
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "back"] as const;

/** 미디어 툴바 버튼 (아이콘 문자는 장식, 라벨은 i18n). */
const TOOLBAR_BUTTONS: Array<{ id: string; glyph: string; labelKey: MessageKey }> = [
  { id: "prev", glyph: "⏮", labelKey: "adapt.toolbarPrev" },
  { id: "play", glyph: "⏵", labelKey: "adapt.toolbarPlay" },
  { id: "next", glyph: "⏭", labelKey: "adapt.toolbarNext" },
  { id: "volume", glyph: "🔉", labelKey: "adapt.toolbarVolume" },
  { id: "mute", glyph: "🔇", labelKey: "adapt.toolbarMute" },
  { id: "fullscreen", glyph: "⛶", labelKey: "adapt.toolbarFullscreen" },
];

export class SampleUI {
  private readonly root: HTMLElement;
  private readonly kind: SampleKind;
  private readonly reduced: boolean;
  private mode: SampleMode;
  private lastSizing: SizingResult | null = null;

  /** 키패드 상태 (kind==="keypad" 일 때만). */
  private display: HTMLElement | null = null;
  private entry = "";
  /** 툴바 상태. */
  private status: HTMLElement | null = null;
  private playing = false;

  constructor(opts: SampleUIOptions) {
    this.reduced = opts.reducedMotion ?? false;
    this.mode = opts.initialMode ?? "adapted";
    this.kind = opts.kind ?? "keypad";

    const body =
      this.kind === "login"
        ? this.buildLogin()
        : this.kind === "toolbar"
          ? this.buildToolbar()
          : this.buildKeypad();

    this.root = el(
      "div",
      { class: "sample-ui", "data-kind": this.kind },
      el("div", { class: "sample-ui-phone" }, ...body),
    );
    opts.host.append(this.root);

    this.root.style.setProperty("--adapt-transition", `${this.reduced ? 0 : ADAPT_TRANSITION_MS}ms`);
    this.applyVars();
  }

  // --- 목업별 렌더 헬퍼 ---

  private buildKeypad(): HTMLElement[] {
    this.display = el("output", { class: "sample-ui-display numeric", "aria-live": "polite" });
    const keypad = el("div", {
      class: "sample-ui-keypad",
      role: "group",
      "aria-label": t("adapt.keypadLabel"),
    });
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
      btn.addEventListener("click", () => this.pressKey(k));
      keypad.append(btn);
    }
    return [this.display, keypad];
  }

  private buildLogin(): HTMLElement[] {
    const form = el("form", {
      class: "sample-ui-login",
      "aria-label": t("adapt.loginLabel"),
      novalidate: true,
    });
    const email = el("input", {
      type: "email",
      class: "sample-ui-field",
      placeholder: t("adapt.loginEmail"),
      "aria-label": t("adapt.loginEmail"),
      autocomplete: "off",
    });
    const password = el("input", {
      type: "password",
      class: "sample-ui-field",
      placeholder: t("adapt.loginPassword"),
      "aria-label": t("adapt.loginPassword"),
      autocomplete: "off",
    });
    const submit = el("button", { type: "submit", class: "sample-ui-submit" }, t("adapt.loginSubmit"));
    this.status = el("p", { class: "sample-ui-status small muted", "aria-live": "polite" });
    const forgot = el(
      "a",
      { href: "#/adapt", class: "sample-ui-link" },
      t("adapt.loginForgot"),
    );
    forgot.addEventListener("click", (e) => {
      e.preventDefault();
      if (this.status) this.status.textContent = t("adapt.loginForgotAck");
    });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (this.status) this.status.textContent = t("adapt.loginSubmitAck");
    });
    form.append(email, password, submit, forgot, this.status);
    return [form];
  }

  private buildToolbar(): HTMLElement[] {
    const bar = el("div", {
      class: "sample-ui-toolbar",
      role: "toolbar",
      "aria-label": t("adapt.toolbarLabel"),
    });
    for (const b of TOOLBAR_BUTTONS) {
      const btn = el(
        "button",
        { type: "button", class: "sample-ui-icon-btn", "data-btn": b.id, "aria-label": t(b.labelKey) },
        el("span", { "aria-hidden": "true" }, b.glyph),
      );
      btn.addEventListener("click", () => this.pressToolbar(b.id, btn));
      bar.append(btn);
    }
    this.status = el("p", { class: "sample-ui-status small muted", "aria-live": "polite" });
    return [bar, this.status];
  }

  // --- 상호작용 ---

  private pressKey(k: (typeof KEYS)[number]): void {
    if (k === "clear") this.entry = "";
    else if (k === "back") this.entry = this.entry.slice(0, -1);
    else if (this.entry.length < 12) this.entry += k;
    if (this.display) this.display.textContent = this.entry;
  }

  private pressToolbar(id: string, btn: HTMLElement): void {
    let labelKey: MessageKey = TOOLBAR_BUTTONS.find((b) => b.id === id)?.labelKey ?? "adapt.toolbarPlay";
    if (id === "play") {
      this.playing = !this.playing;
      labelKey = this.playing ? "adapt.toolbarPause" : "adapt.toolbarPlay";
      btn.setAttribute("aria-label", t(labelKey));
      const glyph = btn.querySelector("span");
      if (glyph) glyph.textContent = this.playing ? "⏸" : "⏵";
    }
    if (this.status) this.status.textContent = t("adapt.toolbarAck", { action: t(labelKey) });
  }

  // --- 적응 (CSS 변수만) ---

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

  getKind(): SampleKind {
    return this.kind;
  }

  destroy(): void {
    this.root.remove();
  }
}

function round(v: number): number {
  return Math.round(v * 10) / 10;
}
