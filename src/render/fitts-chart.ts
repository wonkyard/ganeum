/**
 * `FittsChart` — S3 산점도 + 회귀선 자가 드로잉 (SVG, 런타임 의존성 0).
 *
 * screen-design S3 / brief-3A §6:
 * - x축 = ID `0 … max(5, ceil(maxID))`, 5틱
 * - y축 = 이동시간(ms) `0 … 1.15 × maxMT`, 5틱
 * - 점 날아듦 400ms → 회귀선 800ms (stroke-dasharray 애니메이션)
 * - reduced-motion 이면 전부 즉시 표시 (정보는 유지)
 */
import { svgEl, el } from "../ui/dom";
import { t, formatNumber } from "../i18n";

export interface FittsChartPoint {
  /** 난이도 ID (bits). */
  id: number;
  /** 평균 이동시간 (초) — 엔진 단위. 표시 직전 ×1000 (brief-3A P0-6). */
  mt: number;
}

export interface FittsChartOptions {
  points: FittsChartPoint[];
  /** `MT = a + b·ID` 최소제곱 적합. a, b 는 초 / 초·bit⁻¹. */
  fit: { a: number; b: number; r2: number };
  animated?: boolean;
  reducedMotion?: boolean;
  /** 미니 카드용 축약 모드 (라벨·캡션 생략). */
  compact?: boolean;
}

const VB_W = 360;
const VB_H = 240;
const M = { left: 46, right: 14, top: 14, bottom: 30 };
const POINT_FLY_MS = 400;
const LINE_DRAW_MS = 800;

export class FittsChart {
  readonly element: HTMLElement;
  private timers: number[] = [];

  constructor(opts: FittsChartOptions) {
    const reduced = opts.reducedMotion ?? false;
    const animated = (opts.animated ?? true) && !reduced;
    const compact = opts.compact ?? false;

    const mtsMs = opts.points.map((p) => p.mt * 1000);
    const maxId = opts.points.reduce((m, p) => Math.max(m, p.id), 0);
    const maxMt = mtsMs.reduce((m, v) => Math.max(m, v), 0);
    const xMax = Math.max(5, Math.ceil(maxId));
    const yMax = maxMt > 0 ? 1.15 * maxMt : 1;

    const plotW = VB_W - M.left - M.right;
    const plotH = VB_H - M.top - M.bottom;
    const px = (id: number): number => M.left + (id / xMax) * plotW;
    const py = (ms: number): number => M.top + plotH - (ms / yMax) * plotH;

    const svg = svgEl("svg", {
      viewBox: `0 0 ${VB_W} ${VB_H}`,
      class: "fitts-chart-svg",
      role: "img",
      "aria-label": t("result.regression", {
        a: formatNumber(opts.fit.a * 1000, { maximumFractionDigits: 0 }),
        b: formatNumber(opts.fit.b * 1000, { maximumFractionDigits: 0 }),
      }),
    });

    // --- 축 + 눈금 (5틱) ---
    const axisGroup = svgEl("g", { class: "fitts-axis" });
    for (let i = 0; i < 5; i++) {
      const f = i / 4;
      const yVal = yMax * f;
      const y = py(yVal);
      axisGroup.append(
        svgEl("line", { x1: M.left, y1: y, x2: VB_W - M.right, y2: y, class: "fitts-grid" }),
      );
      if (!compact) {
        const label = svgEl("text", { x: M.left - 6, y: y + 3, class: "fitts-tick fitts-tick-y" });
        label.textContent = formatNumber(yVal, { maximumFractionDigits: 0 });
        axisGroup.append(label);
      }
      const xVal = xMax * f;
      const x = px(xVal);
      if (!compact) {
        const xl = svgEl("text", { x, y: VB_H - M.bottom + 16, class: "fitts-tick fitts-tick-x" });
        xl.textContent = formatNumber(xVal, { maximumFractionDigits: 1 });
        axisGroup.append(xl);
      }
    }
    svg.append(axisGroup);

    if (!compact) {
      const xAxisLabel = svgEl("text", {
        x: M.left + plotW / 2,
        y: VB_H - 2,
        class: "fitts-axis-label",
      });
      xAxisLabel.textContent = t("result.chartXAxis");
      const yAxisLabel = svgEl("text", {
        x: 12,
        y: M.top + plotH / 2,
        class: "fitts-axis-label",
        transform: `rotate(-90 12 ${M.top + plotH / 2})`,
      });
      yAxisLabel.textContent = t("result.chartYAxis");
      svg.append(xAxisLabel, yAxisLabel);
    }

    // --- 회귀선 (자가 드로잉) ---
    const y0 = (opts.fit.a + opts.fit.b * 0) * 1000;
    const y1 = (opts.fit.a + opts.fit.b * xMax) * 1000;
    const line = svgEl("path", {
      d: `M ${px(0)} ${py(clamp(y0, 0, yMax))} L ${px(xMax)} ${py(clamp(y1, 0, yMax))}`,
      class: "fitts-line",
      pathLength: 1,
    });
    if (animated) {
      line.setAttribute("style", "stroke-dasharray:1;stroke-dashoffset:1;");
      this.timers.push(
        window.setTimeout(() => {
          line.setAttribute(
            "style",
            `stroke-dasharray:1;stroke-dashoffset:0;transition:stroke-dashoffset ${LINE_DRAW_MS}ms ease`,
          );
        }, POINT_FLY_MS),
      );
    }
    svg.append(line);

    // --- 산점도 ---
    opts.points.forEach((p, i) => {
      const dot = svgEl("circle", {
        cx: px(p.id),
        cy: py(p.mt * 1000),
        r: animated ? 0 : 5,
        class: "fitts-dot",
      });
      if (animated) {
        this.timers.push(
          window.setTimeout(
            () => {
              dot.setAttribute("r", "5");
              dot.setAttribute("style", `transition:r 220ms ease`);
            },
            (i / Math.max(1, opts.points.length)) * POINT_FLY_MS,
          ),
        );
      }
      svg.append(dot);
    });

    const parts: Array<Node> = [svg];
    if (!compact) {
      parts.push(
        el(
          "p",
          { class: "fitts-caption numeric" },
          `${t("result.regression", {
            a: formatNumber(opts.fit.a * 1000, { maximumFractionDigits: 0 }),
            b: formatNumber(opts.fit.b * 1000, { maximumFractionDigits: 0 }),
          })}  ·  ${t("result.rSquared", {
            value: formatNumber(opts.fit.r2, { maximumFractionDigits: 2 }),
          })}  ·  n=${opts.points.length}`,
        ),
        el("p", { class: "fitts-caption muted small" }, t("result.fitCaption", { n: opts.points.length })),
      );
    }

    this.element = el("figure", { class: "fitts-chart" }, ...parts);
  }

  destroy(): void {
    for (const id of this.timers) window.clearTimeout(id);
    this.timers = [];
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
