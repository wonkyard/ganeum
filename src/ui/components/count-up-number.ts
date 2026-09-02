/**
 * `CountUpNumber` — S3 처리율 롤업 (brief-3A §6: 900ms).
 * reduced-motion 이면 롤업 대신 페이드 인 (screen-design S3).
 */
import { el } from "../dom";
import { formatNumber } from "../../i18n";

export interface CountUpNumberOptions {
  /** 최종 값. */
  value: number;
  /** 애니메이션 길이(ms). 기본 900. */
  durationMs?: number;
  /** 소수 자릿수. 기본 2. */
  fractionDigits?: number;
  reducedMotion?: boolean;
  /** rAF 주입(테스트용). */
  raf?: (fn: (t: number) => void) => number;
  now?: () => number;
}

export class CountUpNumber {
  readonly element: HTMLElement;
  private readonly opts: Required<Omit<CountUpNumberOptions, "raf" | "now">>;
  private readonly raf: (fn: (t: number) => void) => number;
  private readonly now: () => number;
  private startedAt = 0;
  private destroyed = false;

  constructor(options: CountUpNumberOptions) {
    this.opts = {
      value: options.value,
      durationMs: options.durationMs ?? 900,
      fractionDigits: options.fractionDigits ?? 2,
      reducedMotion: options.reducedMotion ?? false,
    };
    this.raf =
      options.raf ??
      ((fn) => (typeof requestAnimationFrame === "function" ? requestAnimationFrame(fn) : 0));
    this.now = options.now ?? (() => (typeof performance !== "undefined" ? performance.now() : Date.now()));

    this.element = el("span", { class: "count-up numeric" });

    if (this.opts.reducedMotion || this.opts.durationMs <= 0) {
      this.element.textContent = this.render(this.opts.value);
      this.element.classList.add("fade-in");
      return;
    }
    this.element.textContent = this.render(0);
    this.startedAt = this.now();
    this.raf(this.step);
  }

  private render(v: number): string {
    return formatNumber(v, {
      minimumFractionDigits: this.opts.fractionDigits,
      maximumFractionDigits: this.opts.fractionDigits,
    });
  }

  private step = (): void => {
    if (this.destroyed) return;
    const elapsed = this.now() - this.startedAt;
    const p = Math.min(1, elapsed / this.opts.durationMs);
    // ease-out cubic.
    const eased = 1 - Math.pow(1 - p, 3);
    this.element.textContent = this.render(this.opts.value * eased);
    if (p < 1) this.raf(this.step);
    else this.element.textContent = this.render(this.opts.value);
  };

  destroy(): void {
    this.destroyed = true;
  }
}
