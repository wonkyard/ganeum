/**
 * `FittsWidget` — S6 교육 페이지 1번 섹션의 인터랙티브 Fitts 위젯
 * (screen-design S6 · brief-5-6-a §1).
 *
 * 자체 구현 SVG 한 장 (런타임 의존성 0 — `docs/adr/0001`). 타깃을 드래그하면
 * 수평 성분은 이동 거리 A, 수직 성분은 타깃 크기 W 를 바꾸고, `MT = a + b·log2(A/W+1)`
 * 예측값이 실시간으로 갱신된다. 드래그를 못 쓰는 경우를 위해 **키보드 대체 경로**로
 * 슬라이더 2개(거리·크기)를 함께 둔다 — 둘은 같은 상태를 공유한다.
 *
 * `prefers-reduced-motion` 이면 타깃 이동의 트랜지션만 끄고, 값 갱신은 그대로 한다.
 *
 * 옵션 객체 + `destroy()` 패턴 (레포 관례 — `SampleUI` / `CardCalibrator` 등과 동일).
 */
import { el, svgEl } from "../dom";
import { t, formatNumber } from "../../i18n";
import { indexOfDifficulty, predictMovementTime } from "../../core/fitts";

/**
 * 위젯이 예측에 쓰는 대표적인 마우스 포인팅 계수. S4 인구 프리셋과 달리 이건
 * **교육용 예시값**이라 i18n·citations 가 아니라 여기 이름 있는 상수로 둔다.
 * b ≈ 150 ms/bit 는 마우스 IP ≈ 5–7 bits/s 대역의 중간쯤 (MacKenzie 1992).
 */
export const FITTS_A_MS = 50;
export const FITTS_B_MS = 150;

/** SVG 좌표계 (= 상태의 px 값과 1:1). */
const VB_W = 300;
const VB_H = 160;
const ORIGIN_X = 18;
const CENTER_Y = VB_H / 2;

/** 드래그·슬라이더 공통 정의역 (CSS px). */
export const AMPLITUDE_RANGE = { min: 40, max: 250 } as const;
export const WIDTH_RANGE = { min: 16, max: 96 } as const;

export interface FittsWidgetState {
  amplitudePx: number;
  widthPx: number;
  /** 난이도 지수 (bits). */
  id: number;
  /** 예측 이동시간 (ms). */
  mtMs: number;
}

export interface FittsWidgetOptions {
  host: HTMLElement;
  reducedMotion?: boolean;
  /** 시작 이동 거리 (CSS px). 기본 160. */
  initialAmplitudePx?: number;
  /** 시작 타깃 크기 (CSS px). 기본 48. */
  initialWidthPx?: number;
  /** 상태가 바뀔 때마다 호출. */
  onChange?: (state: FittsWidgetState) => void;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, Number.isFinite(v) ? v : lo));
}

/** 현재 A·W 에서 난이도·예측 이동시간을 낸다 (순수 — 단위 테스트가 이 함수를 덮는다). */
export function predictFitts(amplitudePx: number, widthPx: number): { id: number; mtMs: number } {
  const id = indexOfDifficulty(amplitudePx, widthPx);
  return { id, mtMs: predictMovementTime({ a: FITTS_A_MS, b: FITTS_B_MS }, id) };
}

export class FittsWidget {
  private readonly root: HTMLElement;
  private readonly svg: SVGElement;
  private readonly targetCircle: SVGElement;
  private readonly resizeHandle: SVGElement;
  private readonly connector: SVGElement;
  private readonly distInput: HTMLInputElement;
  private readonly sizeInput: HTMLInputElement;
  private readonly readout: HTMLElement;
  private readonly reduced: boolean;
  private readonly onChange?: (state: FittsWidgetState) => void;

  private amplitude: number;
  private width: number;
  private dragStart: { x: number; y: number; a: number; w: number } | null = null;

  constructor(opts: FittsWidgetOptions) {
    this.reduced = opts.reducedMotion ?? false;
    this.onChange = opts.onChange;
    this.amplitude = clamp(opts.initialAmplitudePx ?? 160, AMPLITUDE_RANGE.min, AMPLITUDE_RANGE.max);
    this.width = clamp(opts.initialWidthPx ?? 48, WIDTH_RANGE.min, WIDTH_RANGE.max);

    this.svg = svgEl("svg", {
      viewBox: `0 0 ${VB_W} ${VB_H}`,
      class: "fitts-widget-svg",
      role: "img",
      "aria-label": t("about.fittsWidgetAlt"),
    });

    // 시작점(손가락/커서 출발) — 고정.
    const origin = svgEl("circle", { cx: ORIGIN_X, cy: CENTER_Y, r: 5, class: "fitts-widget-origin" });
    this.connector = svgEl("line", {
      x1: ORIGIN_X,
      y1: CENTER_Y,
      x2: ORIGIN_X,
      y2: CENTER_Y,
      class: "fitts-widget-connector",
    });
    this.targetCircle = svgEl("circle", {
      cx: ORIGIN_X,
      cy: CENTER_Y,
      r: 1,
      class: "fitts-widget-target",
      tabindex: "0",
      role: "slider",
      "aria-label": t("about.fittsTargetHandle"),
    });
    // 타깃 오른쪽 가장자리의 크기 조절 손잡이 (드래그 보조).
    this.resizeHandle = svgEl("circle", { cx: 0, cy: CENTER_Y, r: 4, class: "fitts-widget-resize" });

    this.svg.append(this.connector, origin, this.targetCircle, this.resizeHandle);

    // --- 키보드 대체 경로: 슬라이더 2개 ---
    this.distInput = el("input", {
      type: "range",
      class: "fitts-widget-range",
      min: AMPLITUDE_RANGE.min,
      max: AMPLITUDE_RANGE.max,
      step: 2,
      value: Math.round(this.amplitude),
      "aria-label": t("about.fittsDistance"),
    }) as HTMLInputElement;
    this.sizeInput = el("input", {
      type: "range",
      class: "fitts-widget-range",
      min: WIDTH_RANGE.min,
      max: WIDTH_RANGE.max,
      step: 2,
      value: Math.round(this.width),
      "aria-label": t("about.fittsSize"),
    }) as HTMLInputElement;

    this.distInput.addEventListener("input", () => {
      this.amplitude = clamp(Number(this.distInput.value), AMPLITUDE_RANGE.min, AMPLITUDE_RANGE.max);
      this.render();
    });
    this.sizeInput.addEventListener("input", () => {
      this.width = clamp(Number(this.sizeInput.value), WIDTH_RANGE.min, WIDTH_RANGE.max);
      this.render();
    });

    const controls = el(
      "div",
      { class: "fitts-widget-controls" },
      el("label", { class: "fitts-widget-label small" }, el("span", {}, t("about.fittsDistance")), this.distInput),
      el("label", { class: "fitts-widget-label small" }, el("span", {}, t("about.fittsSize")), this.sizeInput),
    );

    this.readout = el("p", { class: "fitts-widget-readout numeric", "aria-live": "polite" });
    const formula = el("p", { class: "fitts-widget-formula numeric small muted" }, "MT = a + b·log2(A / W + 1)");

    this.root = el("div", { class: "fitts-widget" }, this.svg, controls, formula, this.readout);
    if (this.reduced) this.root.setAttribute("data-reduced-motion", "");
    opts.host.append(this.root);

    // 포인터 드래그 (타깃 본체: 수평 = 거리, 수직 = 크기).
    this.targetCircle.addEventListener("pointerdown", this.onPointerDown);
    this.targetCircle.addEventListener("pointermove", this.onPointerMove);
    this.targetCircle.addEventListener("pointerup", this.onPointerUp);
    this.targetCircle.addEventListener("pointercancel", this.onPointerUp);
    // 타깃에 포커스가 있을 때 화살표키로도 조절 (role="slider" 계약).
    this.targetCircle.addEventListener("keydown", this.onKeyDown);

    this.render();
  }

  /** SVG 좌표계로 환산한 배율 (rect 가 0 인 환경에서는 1:1). */
  private scale(): { sx: number; sy: number; left: number; top: number } {
    const rect = this.svg.getBoundingClientRect();
    return {
      sx: rect.width > 0 ? VB_W / rect.width : 1,
      sy: rect.height > 0 ? VB_H / rect.height : 1,
      left: rect.left,
      top: rect.top,
    };
  }

  private onPointerDown = (event: PointerEvent): void => {
    event.preventDefault();
    (event.target as Element).setPointerCapture?.(event.pointerId);
    this.dragStart = { x: event.clientX, y: event.clientY, a: this.amplitude, w: this.width };
  };

  private onPointerMove = (event: PointerEvent): void => {
    if (!this.dragStart) return;
    const { sx, sy } = this.scale();
    const dx = (event.clientX - this.dragStart.x) * sx;
    const dy = (event.clientY - this.dragStart.y) * sy;
    // 위로 끌면 타깃이 커진다. 반지름 변화라 지름 기준 ×2.
    this.amplitude = clamp(this.dragStart.a + dx, AMPLITUDE_RANGE.min, AMPLITUDE_RANGE.max);
    this.width = clamp(this.dragStart.w - dy * 2, WIDTH_RANGE.min, WIDTH_RANGE.max);
    this.render();
  };

  private onPointerUp = (event: PointerEvent): void => {
    this.dragStart = null;
    (event.target as Element).releasePointerCapture?.(event.pointerId);
  };

  private onKeyDown = (event: KeyboardEvent): void => {
    const stepA = 6;
    const stepW = 4;
    let handled = true;
    switch (event.key) {
      case "ArrowRight":
        this.amplitude = clamp(this.amplitude + stepA, AMPLITUDE_RANGE.min, AMPLITUDE_RANGE.max);
        break;
      case "ArrowLeft":
        this.amplitude = clamp(this.amplitude - stepA, AMPLITUDE_RANGE.min, AMPLITUDE_RANGE.max);
        break;
      case "ArrowUp":
        this.width = clamp(this.width + stepW, WIDTH_RANGE.min, WIDTH_RANGE.max);
        break;
      case "ArrowDown":
        this.width = clamp(this.width - stepW, WIDTH_RANGE.min, WIDTH_RANGE.max);
        break;
      default:
        handled = false;
    }
    if (handled) {
      event.preventDefault();
      this.render();
    }
  };

  /** 현재 상태 (테스트/호출부). */
  getState(): FittsWidgetState {
    const { id, mtMs } = predictFitts(this.amplitude, this.width);
    return { amplitudePx: this.amplitude, widthPx: this.width, id, mtMs };
  }

  private render(): void {
    const state = this.getState();
    const cx = ORIGIN_X + this.amplitude;
    const r = this.width / 2;

    this.targetCircle.setAttribute("cx", String(cx));
    this.targetCircle.setAttribute("r", String(r));
    this.targetCircle.setAttribute("aria-valuetext", t("about.fittsReadout", readoutParams(state)));
    this.resizeHandle.setAttribute("cx", String(cx + r));
    this.connector.setAttribute("x2", String(cx));

    // 슬라이더가 드래그·키보드 조작과 어긋나지 않게 동기화.
    this.distInput.value = String(Math.round(this.amplitude));
    this.sizeInput.value = String(Math.round(this.width));

    this.readout.textContent = t("about.fittsReadout", readoutParams(state));
    this.onChange?.(state);
  }

  destroy(): void {
    this.targetCircle.removeEventListener("pointerdown", this.onPointerDown);
    this.targetCircle.removeEventListener("pointermove", this.onPointerMove);
    this.targetCircle.removeEventListener("pointerup", this.onPointerUp);
    this.targetCircle.removeEventListener("pointercancel", this.onPointerUp);
    this.targetCircle.removeEventListener("keydown", this.onKeyDown);
    this.root.remove();
  }
}

function readoutParams(state: FittsWidgetState): Record<string, string> {
  return {
    a: formatNumber(state.amplitudePx, { maximumFractionDigits: 0 }),
    w: formatNumber(state.widthPx, { maximumFractionDigits: 0 }),
    id: formatNumber(state.id, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    mt: formatNumber(state.mtMs, { maximumFractionDigits: 0 }),
  };
}
