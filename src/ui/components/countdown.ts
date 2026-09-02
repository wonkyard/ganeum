/**
 * `Countdown` — S1 → S2 사이 3-2-1 (brief-3A §6: 디짓당 700ms).
 *
 * reduced-motion 정책(brief-3A §4): 모션을 제거하되 정보는 유지한다 — 숫자는 그대로
 * 바뀌고(디짓당 700ms 유지, 스케일 애니메이션만 생략), `aria-live` 로 읽어준다.
 */
import { el } from "../dom";
import { t } from "../../i18n";

export interface CountdownOptions {
  host: HTMLElement;
  from?: number;
  /** 디짓당 지속시간(ms). 기본 700 (brief-3A §6). */
  digitMs?: number;
  reducedMotion?: boolean;
  onDone: () => void;
  /** 타이머 주입(테스트용). 기본 setTimeout. */
  setTimer?: (fn: () => void, ms: number) => number;
  clearTimer?: (id: number) => void;
}

export class Countdown {
  private readonly digitMs: number;
  private readonly reducedMotion: boolean;
  private readonly onDone: () => void;
  private readonly setTimer: (fn: () => void, ms: number) => number;
  private readonly clearTimer: (id: number) => void;
  private readonly numberEl: HTMLElement;
  private n: number;
  private timer = 0;
  private destroyed = false;

  constructor(opts: CountdownOptions) {
    this.digitMs = opts.digitMs ?? 700;
    this.reducedMotion = opts.reducedMotion ?? false;
    this.onDone = opts.onDone;
    this.setTimer = opts.setTimer ?? ((fn, ms) => window.setTimeout(fn, ms));
    this.clearTimer = opts.clearTimer ?? ((id) => window.clearTimeout(id));
    this.n = opts.from ?? 3;

    this.numberEl = el("div", {
      class: "countdown-number",
      "aria-live": "assertive",
      role: "status",
    });
    const wrap = el("div", { class: "countdown", "data-reduced": this.reducedMotion }, this.numberEl);
    opts.host.append(wrap);
    this.tick();
  }

  private tick = (): void => {
    if (this.destroyed) return;
    if (this.n <= 0) {
      this.numberEl.textContent = t("countdown.go");
      this.timer = this.setTimer(() => {
        if (!this.destroyed) this.onDone();
      }, this.digitMs);
      return;
    }
    this.numberEl.textContent = String(this.n);
    this.numberEl.setAttribute("aria-label", t("countdown.announce", { n: this.n }));
    // 스케일 애니메이션 재시작 (reduced-motion 이면 CSS 가 무효화).
    this.numberEl.classList.remove("is-in");
    void this.numberEl.offsetWidth;
    this.numberEl.classList.add("is-in");
    this.n -= 1;
    this.timer = this.setTimer(this.tick, this.digitMs);
  };

  destroy(): void {
    this.destroyed = true;
    if (this.timer) this.clearTimer(this.timer);
  }
}
