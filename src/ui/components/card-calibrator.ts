/**
 * `CardCalibrator` — 화면 물리 보정 위젯 (screen-design SC · brief-3B-a §1).
 *
 * 신용/교통카드(ISO/IEC 7810 ID-1, 85.60 × 53.98mm)를 화면에 대고, 고정비 사각형의
 * 가로 폭을 카드에 맞추게 해서 **CSS px per mm** 를 산출한다.
 *
 * 옵션 객체 + `destroy()` 패턴 (레포 관례 — `Countdown` 등과 동일).
 */
import { el } from "../dom";
import { t, formatNumber } from "../../i18n";
import { DEFAULT_PX_PER_MM } from "../../adapt/presets";

/** ISO/IEC 7810 ID-1 카드 물리 치수 (mm). */
export const CARD_WIDTH_MM = 85.6;
export const CARD_HEIGHT_MM = 53.98;
const MM_PER_INCH = 25.4;

/** 슬라이더가 훑는 px/mm 범위 (≈ 51–203 CSS dpi). 흔한 디스플레이를 넉넉히 덮는다. */
const MIN_PX_PER_MM = 2;
const MAX_PX_PER_MM = 8;
const STEP_PX_PER_MM = 0.01;

export interface CardCalibratorOptions {
  host: HTMLElement;
  /** 초기 px/mm. 기본 = 저장된 보정값이 없을 때의 문서화된 기본값. */
  initialPxPerMm?: number;
  /**
   * 대각 인치 추정에 쓰는 화면 크기(CSS px). 기본 = `screen.width/height`.
   * 테스트/비표준 환경을 위해 주입 가능.
   */
  screenPx?: { w: number; h: number };
  /** 값이 바뀔 때마다 (슬라이더·직접입력·화살표키). */
  onChange?: (pxPerMm: number) => void;
}

export class CardCalibrator {
  private pxPerMm: number;
  private readonly screenPx: { w: number; h: number };
  private readonly onChange?: (pxPerMm: number) => void;

  private readonly card: HTMLElement;
  private readonly slider: HTMLInputElement;
  private readonly numberField: HTMLInputElement;
  private readonly readout: HTMLElement;
  private readonly root: HTMLElement;

  constructor(opts: CardCalibratorOptions) {
    this.onChange = opts.onChange;
    this.screenPx = opts.screenPx ?? this.detectScreenPx();
    this.pxPerMm = clampPxPerMm(opts.initialPxPerMm ?? DEFAULT_PX_PER_MM);

    this.card = el("div", {
      class: "card-calibrator-card",
      "aria-hidden": "true",
      style: `aspect-ratio: ${CARD_WIDTH_MM} / ${CARD_HEIGHT_MM}`,
    });

    this.slider = el("input", {
      type: "range",
      class: "card-calibrator-slider",
      min: MIN_PX_PER_MM,
      max: MAX_PX_PER_MM,
      step: STEP_PX_PER_MM,
      value: this.pxPerMm,
      "aria-label": t("calibrate.slider"),
    }) as HTMLInputElement;

    const fieldId = `calib-num-${Math.random().toString(36).slice(2, 8)}`;
    this.numberField = el("input", {
      type: "number",
      id: fieldId,
      class: "card-calibrator-number",
      min: MIN_PX_PER_MM,
      max: MAX_PX_PER_MM,
      step: STEP_PX_PER_MM,
      value: round2(this.pxPerMm),
      inputmode: "decimal",
    }) as HTMLInputElement;

    this.readout = el("p", { class: "card-calibrator-readout numeric", role: "status", "aria-live": "polite" });

    this.slider.addEventListener("input", () => this.set(Number(this.slider.value), "slider"));
    this.numberField.addEventListener("input", () => {
      const v = Number(this.numberField.value);
      if (Number.isFinite(v)) this.set(v, "number");
    });

    this.root = el(
      "div",
      { class: "card-calibrator" },
      this.card,
      this.slider,
      el(
        "label",
        { class: "card-calibrator-field", for: fieldId },
        el("span", {}, t("calibrate.manualLabel")),
        this.numberField,
      ),
      this.readout,
    );
    opts.host.append(this.root);

    this.render();
  }

  /** 현재 산출된 CSS px per mm. */
  get value(): number {
    return this.pxPerMm;
  }

  private detectScreenPx(): { w: number; h: number } {
    if (typeof window !== "undefined" && window.screen) {
      const w = window.screen.width || window.innerWidth || 0;
      const h = window.screen.height || window.innerHeight || 0;
      if (w > 0 && h > 0) return { w, h };
    }
    return { w: 0, h: 0 };
  }

  private set(next: number, from: "slider" | "number"): void {
    const clamped = clampPxPerMm(next);
    this.pxPerMm = clamped;
    // 값을 바꾼 입력은 원칙적으로 건드리지 않는다 (커서 튐 방지). 나머지만 동기화하되,
    // 범위를 벗어나 클램프된 경우엔 그 입력도 되돌려 표시한다.
    if (from !== "slider") this.slider.value = String(clamped);
    if (from !== "number" || clamped !== next) this.numberField.value = String(round2(clamped));
    this.render();
    this.onChange?.(clamped);
  }

  private render(): void {
    const widthPx = this.pxPerMm * CARD_WIDTH_MM;
    this.card.style.width = `${widthPx}px`;

    const diagInch = this.estimateDiagonalInch();
    this.readout.textContent = t("calibrate.readout", {
      pxPerMm: formatNumber(this.pxPerMm, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      diagInch:
        diagInch > 0
          ? formatNumber(diagInch, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
          : "—",
    });
  }

  /** diagInch = hypot(w_px, h_px) / (pxPerMm × 25.4). 화면 크기를 모르면 0. */
  private estimateDiagonalInch(): number {
    const { w, h } = this.screenPx;
    if (w <= 0 || h <= 0 || this.pxPerMm <= 0) return 0;
    return Math.hypot(w, h) / (this.pxPerMm * MM_PER_INCH);
  }

  destroy(): void {
    this.root.remove();
  }
}

function clampPxPerMm(v: number): number {
  if (!Number.isFinite(v)) return DEFAULT_PX_PER_MM;
  return Math.min(MAX_PX_PER_MM, Math.max(MIN_PX_PER_MM, v));
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
