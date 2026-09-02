/** S3 — 결과 (핵심 "우와"). screen-design S3 · brief-3A §3. */
import { el } from "../dom";
import { t, formatNumber, formatDate } from "../../i18n";
import { analyzeSession } from "../../core/analyze";
import type { Profile } from "../../core/types";
import { getProfile } from "../../storage/profiles";
import { createTopBar } from "../components/top-bar";
import { FittsChart } from "../../render/fitts-chart";
import { CountUpNumber } from "../components/count-up-number";
import { createStatTile } from "../components/stat-tile";
import { createDisclosure } from "../components/disclosure";
import { explainResult } from "../../ai/rules";
import type { MountContext } from "../screen";

interface Derived {
  fit: { a: number; b: number; r2: number };
  throughput: number;
  errorRate: number;
  consistencySD: number;
  weSource: Profile["weSource"];
  points: Array<{ id: number; mt: number }>;
  confident: boolean;
  hasChart: boolean;
}

function derive(profile: Profile): Derived {
  const a = analyzeSession(profile.conditions);
  if (a.status === "ok") {
    return {
      fit: a.fitts,
      throughput: a.throughput,
      errorRate: a.errorRate,
      consistencySD: a.consistencySD,
      weSource: a.weSource,
      points: a.points,
      confident: a.confident,
      hasChart: true,
    };
  }
  // 마이그레이션된 오래된 프로파일 등 — 저장된 요약 수치로.
  return {
    fit: profile.fitts,
    throughput: profile.throughput,
    errorRate: profile.errorRate,
    consistencySD: profile.consistencySD,
    weSource: profile.weSource,
    points: [],
    confident: profile.fitts.r2 >= 0.7 && profile.fitts.b > 0,
    hasChart: false,
  };
}

export function renderResults(ctx: MountContext): void {
  const wrap = el("section", { class: "screen screen-results" });
  wrap.append(createTopBar({ back: "/", go: ctx.go, rerender: ctx.rerender }));

  const profile = getProfile(ctx.params.id);
  if (!profile) {
    wrap.append(el("h1", { tabindex: "-1" }, t("result.notFound")));
    const back = el("button", { type: "button", class: "btn-primary" }, t("home.start"));
    back.addEventListener("click", () => ctx.go("/setup"));
    wrap.append(back);
    ctx.host.append(wrap);
    (wrap.querySelector("h1") as HTMLElement).focus();
    return;
  }

  const d = derive(profile);
  const reduced = ctx.reducedMotion();

  const heading = el("div", { class: "results-head" });
  heading.append(
    el("h1", { tabindex: "-1" }, t("result.title")),
    el("span", { class: "results-date small muted" }, formatDate(profile.createdAt)),
  );
  wrap.append(heading);

  // --- 차트 ---
  if (d.hasChart) {
    const chart = new FittsChart({
      points: d.points,
      fit: d.fit,
      animated: !reduced,
      reducedMotion: reduced,
    });
    ctx.addCleanup(() => chart.destroy());
    wrap.append(chart.element);
  } else {
    wrap.append(
      el("p", { class: "numeric muted" }, t("result.regression", {
        a: formatNumber(d.fit.a * 1000, { maximumFractionDigits: 0 }),
        b: formatNumber(d.fit.b * 1000, { maximumFractionDigits: 0 }),
      })),
    );
  }

  // --- 처리율 (카운트업) ---
  const tpTile = el("div", { class: "throughput-tile" });
  tpTile.append(el("span", { class: "throughput-label muted" }, t("result.throughput")));
  const countUp = new CountUpNumber({ value: d.throughput, reducedMotion: reduced });
  ctx.addCleanup(() => countUp.destroy());
  const tpValue = el("span", { class: "throughput-value" });
  tpValue.append(countUp.element, el("span", { class: "throughput-unit muted" }, ` ${t("result.throughputUnit")}`));
  tpTile.append(tpValue);
  tpTile.append(el("p", { class: "throughput-caption small muted" }, t("result.throughputCaption")));
  wrap.append(tpTile);

  // --- StatTile ×3 ---
  const unstableBadge = d.weSource === "nominal-fallback" ? t("result.unstable") : undefined;
  const tiles = el("div", { class: "stat-tiles" });
  tiles.append(
    createStatTile({
      label: t("result.accuracy"),
      value: `${formatNumber((1 - d.errorRate) * 100, { maximumFractionDigits: 0 })}%`,
    }),
    createStatTile({
      label: t("result.consistency"),
      value: `±${formatNumber(d.consistencySD * 1000, { maximumFractionDigits: 0 })} ${t("unit.ms")}`,
      badge: unstableBadge,
    }),
    createStatTile({
      label: t("result.hand"),
      value: profile.hand === "right" ? t("result.handRight") : t("result.handLeft"),
    }),
  );
  wrap.append(tiles);

  // --- 규칙 기반 해설 (Disclosure) ---
  const claims = explainResult({
    fit: d.fit,
    errorRate: d.errorRate,
    weSource: d.weSource,
    confident: d.confident,
  });
  const explainBody = el(
    "div",
    { class: "explain-body" },
    ...claims.map((c) => el("p", {}, t(c.key, c.params))),
  );
  wrap.append(createDisclosure({ summary: t("result.explainToggle"), content: explainBody }));

  // --- WithinSubjectPanel 예약 슬롯 (3B) ---
  wrap.append(
    el(
      "div",
      { class: "reserved-slot small muted", "data-reserved": "within-subject-panel" },
      t("result.comparisonReserved"),
    ),
  );

  // --- 고지 ---
  wrap.append(el("p", { class: "small muted disclaimer" }, t("result.disclaimer")));

  // --- 하단 액션 ---
  const actions = el("div", { class: "results-actions" });
  const adapt = el(
    "button",
    { type: "button", class: "btn-ghost", disabled: true },
    `${t("result.adaptSoon")} · ${t("setup.comingSoon")}`,
  );
  const saveCard = el("button", { type: "button", class: "btn-primary" }, t("result.saveCard"));
  saveCard.addEventListener("click", () => ctx.go(`/card/${profile.id}`));
  const again = el("button", { type: "button", class: "btn-ghost" }, t("result.remeasure"));
  again.addEventListener("click", () => ctx.go("/setup"));
  actions.append(adapt, saveCard, again);
  wrap.append(actions);

  ctx.host.append(wrap);
  (wrap.querySelector("h1") as HTMLElement).focus();
}
