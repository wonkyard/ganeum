/**
 * `StatTile` — S3 보조 지표 타일 (정확도 / 일관성 / 손).
 * `weSource === "nominal-fallback"` 이면 "측정 불안정" 배지 (brief-3A S3). 미보정 배지는 3B.
 */
import { el } from "../dom";

export interface StatTileOptions {
  label: string;
  value: string;
  /** 배지 텍스트 (예: "측정 불안정"). 없으면 배지 없음. */
  badge?: string;
}

export function createStatTile(opts: StatTileOptions): HTMLElement {
  return el(
    "div",
    { class: "stat-tile" },
    el("span", { class: "stat-tile-label" }, opts.label),
    el("span", { class: "stat-tile-value numeric" }, opts.value),
    opts.badge ? el("span", { class: "stat-tile-badge" }, opts.badge) : null,
  );
}
