/**
 * `WithinSubjectPanel` — S3 결과 화면의 피험자 내(within-subject) 비교 패널
 * (screen-design S3 ⑤ · spec §5 · brief-3B-b §3).
 *
 * 하는 것: 사용자 본인 회귀선 위에 **문헌 프리셋 회귀선**을 점선으로 겹쳐 그리고,
 * `[나] [20대] [손떨림] [고령]` 토글 칩으로 켜고 끈다. 프리셋 출처 링크는 상시 노출.
 *
 * 하지 않는 것: 인구 백분위, "상위 N%" 류 단정 (spec §5 — 신뢰할 데이터셋 없음).
 * 좌우손 비교·시점 추이는 이 슬롯 밖 (정밀 측정·히스토리 필요 — 주 5–6).
 *
 * 차트는 소유하지 않는다 — `s3-results` 가 만든 `FittsChart` 를 받아 `setOverlay` 로
 * 토글만 한다. 오버레이 회귀선 자체는 그 차트가 그린다 (자가 드로잉, 차트 라이브러리 없음).
 */
import { el } from "../dom";
import { t } from "../../i18n";
import { ADAPT_PRESETS, type AdaptPreset } from "../../adapt/presets";
import { CITATIONS, CITATION_URLS, type CitationKey } from "../../adapt/citations";
import type { FittsChart, FittsChartOverlay } from "../../render/fitts-chart";

export interface WithinSubjectPanelOptions {
  /** s3-results 가 만든 차트. 이 패널이 오버레이를 토글한다. */
  chart: FittsChart;
  /**
   * 이 측정으로 비교하기엔 부정확할 수 있는가
   * (`weSource="nominal-fallback"` 또는 3A 신뢰도 게이트 미통과).
   */
  imprecise: boolean;
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
  const chips = el("div", { class: "wsp-chips", role: "group", "aria-label": t("result.comparisonTitle") });

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
  panel.append(chips);

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
