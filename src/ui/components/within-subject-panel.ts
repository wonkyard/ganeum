/**
 * `WithinSubjectPanel` — S3 결과 화면의 피험자 내(within-subject) 비교 패널
 * (screen-design S3 ⑤ · spec §5 · brief-3B-b §3 · 5-6-b §2·§3).
 *
 * 하는 것:
 * - 사용자 본인 회귀선 위에 **문헌 프리셋 회귀선**을 점선으로 겹쳐 그리고
 *   `[나] [20대] [손떨림] [고령]` 토글 칩으로 켜고 끈다. 프리셋 출처 링크는 상시 노출.
 * - 정밀 양손 세션이면 **왼손 / 오른손 · 비대칭 N%** 한 줄 (5-6-b §2).
 * - 같은 손·모드 과거 세션이 있으면 **직전 세션 회귀선 토글 칩** + "지난 측정 대비
 *   ±X bits/초" 한 줄 + (3회+) 처리율 추이 스파크라인 (5-6-b §3).
 *
 * 하지 않는 것: 인구 백분위, "상위 N%" 류 단정 (spec §5 — 신뢰할 데이터셋 없음).
 *
 * 차트는 소유하지 않는다 — `s3-results` 가 만든 `FittsChart` 를 받아 `setOverlay` 로
 * 토글만 한다. 오버레이 회귀선 자체는 그 차트가 그린다 (자가 드로잉, 차트 라이브러리 없음).
 */
import { el, svgEl } from "../dom";
import { t, formatNumber, formatDate } from "../../i18n";
import { ADAPT_PRESETS, type AdaptPreset } from "../../adapt/presets";
import { CITATIONS, CITATION_URLS, type CitationKey } from "../../adapt/citations";
import type { FittsChart, FittsChartOverlay } from "../../render/fitts-chart";

/** 좌우손 비교 데이터 (정밀 양손 세션에서만). 처리율은 bits/s. */
export interface HandComparison {
  right: number;
  left: number;
  /** (R − L) / mean. 한 손만 유효하면 null. */
  asymmetry: number | null;
}

/** 처리율 추이 한 점. */
export interface TrendPoint {
  /** ISO 날짜 문자열. */
  date: string;
  throughput: number;
  /** 신뢰도 낮음(`nominal-fallback` 또는 회귀 게이트 미통과) — 스파크라인에서 회색. */
  lowConfidence: boolean;
}

/** 시점 비교 데이터 (같은 손·모드 과거 세션이 있을 때만). */
export interface HistoryComparison {
  previous: {
    throughput: number;
    fit: { a: number; b: number; r2: number };
    date: string;
    lowConfidence: boolean;
  };
  /** 현재 − 직전 (bits/s). */
  deltaThroughput: number;
  /** 3점 이상이면 스파크라인용 날짜순 시계열 (현재 포함). 미만이면 undefined. */
  trend?: TrendPoint[];
}

export interface WithinSubjectPanelOptions {
  /** s3-results 가 만든 차트. 이 패널이 오버레이를 토글한다. */
  chart: FittsChart;
  /**
   * 이 측정으로 비교하기엔 부정확할 수 있는가
   * (`weSource="nominal-fallback"` 또는 3A 신뢰도 게이트 미통과).
   */
  imprecise: boolean;
  /** 정밀 양손 세션이면 좌우 처리율 + 비대칭. */
  handComparison?: HandComparison;
  /** 같은 손·모드 과거 세션이 있으면 시점 비교. */
  history?: HistoryComparison;
}

/** 프리셋 id → 짧은 칩 라벨 i18n 키 (전체 라벨은 `adapt.preset.*`). */
const CHIP_LABEL_KEY: Record<AdaptPreset["id"], Parameters<typeof t>[0]> = {
  young: "result.compareChipYoung",
  elderly: "result.compareChipElderly",
  tremor: "result.compareChipTremor",
};

/** s3-results 가 `FittsChart` 에 넘길 오버레이 정의 — 프리셋 3종, 기본 숨김. */
export function presetOverlays(): FittsChartOverlay[] {
  return ADAPT_PRESETS.map((p) => ({ id: p.id, a: p.a, b: p.b, visible: false }));
}

export function createWithinSubjectPanel(opts: WithinSubjectPanelOptions): HTMLElement {
  const panel = el("section", {
    class: "within-subject-panel",
    "aria-label": t("result.comparisonTitle"),
    "data-reserved": "within-subject-panel",
  });
  panel.append(el("h2", { class: "wsp-title small" }, t("result.comparisonTitle")));

  if (opts.imprecise) {
    panel.append(
      el("p", { class: "wsp-warn small", role: "status" }, t("result.comparePrecisionWarn")),
    );
  }

  // --- 토글 칩 ---
  const chips = el("div", {
    class: "wsp-chips",
    role: "group",
    "aria-label": t("result.comparisonTitle"),
  });

  const makeChip = (id: string, label: string, pressed: boolean): HTMLButtonElement => {
    const chip = el(
      "button",
      { type: "button", class: "wsp-chip", "aria-pressed": String(pressed) },
      label,
    ) as HTMLButtonElement;
    opts.chart.setOverlay(id, pressed);
    chip.addEventListener("click", () => {
      const next = chip.getAttribute("aria-pressed") !== "true";
      chip.setAttribute("aria-pressed", String(next));
      opts.chart.setOverlay(id, next);
    });
    return chip;
  };

  chips.append(makeChip("me", t("result.compareChipMe"), true));
  for (const p of ADAPT_PRESETS) {
    chips.append(makeChip(p.id, t(CHIP_LABEL_KEY[p.id]), false));
  }
  if (opts.history) {
    chips.append(
      makeChip(
        "prev",
        t("result.historyOverlayChip", {
          date: formatDate(opts.history.previous.date, { month: "short", day: "numeric" }),
        }),
        false,
      ),
    );
  }
  panel.append(chips);

  // --- 좌우손 비교 (5-6-b §2) ---
  if (opts.handComparison) {
    panel.append(renderHandComparison(opts.handComparison));
  }

  // --- 시점 비교 (5-6-b §3) ---
  if (opts.history) {
    panel.append(...renderHistory(opts.history));
  }

  panel.append(
    el(
      "p",
      { class: "wsp-band-note small muted" },
      `${t("result.compareRefLabel")} · ${t("result.compareBandNote")}`,
    ),
  );

  // --- 출처 링크 (상시) ---
  const citeList = el("ul", { class: "wsp-citations small muted" });
  const seen = new Set<CitationKey>();
  for (const p of ADAPT_PRESETS) {
    if (seen.has(p.citationKey)) continue;
    seen.add(p.citationKey);
    citeList.append(
      el(
        "li",
        {},
        el(
          "a",
          { href: CITATION_URLS[p.citationKey], target: "_blank", rel: "noopener noreferrer" },
          CITATIONS[p.citationKey],
        ),
      ),
    );
  }
  panel.append(citeList);

  return panel;
}

function renderHandComparison(hc: HandComparison): HTMLElement {
  const value = t("result.handCompareValue", {
    left: formatNumber(hc.left, { maximumFractionDigits: 1 }),
    right: formatNumber(hc.right, { maximumFractionDigits: 1 }),
  });
  const asym =
    hc.asymmetry == null
      ? t("result.asymmetryNone")
      : t("result.asymmetryInline", {
          pct: formatNumber(Math.abs(hc.asymmetry) * 100, { maximumFractionDigits: 0 }),
        });
  return el(
    "div",
    { class: "wsp-hand-compare", role: "group", "aria-label": t("result.handCompareLabel") },
    el("span", { class: "wsp-hc-label small muted" }, t("result.handCompareLabel")),
    el("p", { class: "wsp-hc-value numeric" }, `${value} · ${asym}`),
  );
}

function renderHistory(h: HistoryComparison): HTMLElement[] {
  const out: HTMLElement[] = [];
  const abs = formatNumber(Math.abs(h.deltaThroughput), { maximumFractionDigits: 1 });
  const key =
    Math.abs(h.deltaThroughput) < 0.05
      ? "result.historyDeltaFlat"
      : h.deltaThroughput > 0
        ? "result.historyDeltaUp"
        : "result.historyDeltaDown";
  out.push(el("p", { class: "wsp-history-delta small", role: "status" }, t(key, { delta: abs })));

  if (h.previous.lowConfidence) {
    out.push(
      el("p", { class: "wsp-history-lowconf small muted" }, t("result.historyPrevLowConfidence")),
    );
  }

  if (h.trend && h.trend.length >= 3) {
    out.push(renderSparkline(h.trend));
    if (h.trend.some((p) => p.lowConfidence)) {
      out.push(
        el("p", { class: "wsp-history-lowconf small muted" }, t("result.historyLowConfidence")),
      );
    }
  }
  return out;
}

/** 처리율 추이 스파크라인 — 자체 SVG, 런타임 의존성 0. */
function renderSparkline(points: TrendPoint[]): HTMLElement {
  const W = 240;
  const H = 48;
  const pad = 5;
  const tps = points.map((p) => p.throughput);
  const min = Math.min(...tps);
  const max = Math.max(...tps);
  const span = max - min || 1;
  const n = points.length;
  const x = (i: number): number => pad + (i / (n - 1)) * (W - 2 * pad);
  const y = (v: number): number => H - pad - ((v - min) / span) * (H - 2 * pad);

  const d = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p.throughput).toFixed(1)}`)
    .join(" ");

  const svg = svgEl("svg", {
    viewBox: `0 0 ${W} ${H}`,
    class: "wsp-sparkline",
    role: "img",
    "aria-label": t("result.historySparklineAlt", {
      from: formatNumber(tps[0], { maximumFractionDigits: 1 }),
      to: formatNumber(tps[n - 1], { maximumFractionDigits: 1 }),
      count: String(n),
    }),
  });
  svg.append(svgEl("path", { d, class: "wsp-sparkline-path", fill: "none" }));
  points.forEach((p, i) => {
    svg.append(
      svgEl("circle", {
        cx: x(i).toFixed(1),
        cy: y(p.throughput).toFixed(1),
        r: 2.6,
        class: p.lowConfidence ? "wsp-sparkline-dot is-lowconf" : "wsp-sparkline-dot",
      }),
    );
  });

  return el(
    "figure",
    { class: "wsp-sparkline-fig" },
    el("figcaption", { class: "small muted" }, t("result.historyTrendLabel", { count: String(n) })),
    svg,
  );
}
