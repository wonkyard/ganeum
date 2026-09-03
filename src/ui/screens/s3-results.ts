/** S3 — 결과 (핵심 "우와"). screen-design S3 · brief-3A §3. */
import { el } from "../dom";
import { t, formatNumber, formatDate } from "../../i18n";
import { analyzeSession } from "../../core/analyze";
import { computeAsymmetry } from "../../core/asymmetry";
import type { Profile } from "../../core/types";
import { getProfile, loadProfiles } from "../../storage/profiles";
import { createTopBar } from "../components/top-bar";
import { FittsChart, type FittsChartOverlay } from "../../render/fitts-chart";
import { CountUpNumber } from "../components/count-up-number";
import { createStatTile } from "../components/stat-tile";
import { createDisclosure } from "../components/disclosure";
import {
  createWithinSubjectPanel,
  presetOverlays,
  type HandComparison,
  type HistoryComparison,
} from "../components/within-subject-panel";
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

function isLowConfidence(p: Profile): boolean {
  return p.weSource === "nominal-fallback" || !(p.fitts.r2 >= 0.7) || !(p.fitts.b > 0);
}

/**
 * 정밀 양손 세션이면 좌우 처리율 + 비대칭을 구한다. `sessionId` 로 형제 프로파일을
 * 찾고, 저장된 `asymmetry` 가 있으면 그대로 쓰되 없으면 두 처리율로 계산한다.
 */
function deriveHandComparison(profile: Profile, all: Profile[]): HandComparison | undefined {
  if (profile.mode !== "precise") return undefined;
  const sibling = all.find(
    (p) => p.sessionId === profile.sessionId && p.id !== profile.id && p.hand !== profile.hand,
  );
  if (!sibling) return undefined;
  const rightP = profile.hand === "right" ? profile : sibling;
  const leftP = profile.hand === "left" ? profile : sibling;
  const asymmetry =
    profile.asymmetry ??
    computeAsymmetry({ throughput: rightP.throughput }, { throughput: leftP.throughput });
  return { right: rightP.throughput, left: leftP.throughput, asymmetry };
}

/**
 * 같은 손 + 같은 모드의 과거 세션이 있으면 시점 비교를 구한다. "직전 세션" 은 이번
 * 측정보다 먼저 만들어진 다른 세션 중 가장 최근 것. 3점 이상(현재 포함)이면 추이
 * 시계열을 함께 돌려준다.
 */
function deriveHistory(
  profile: Profile,
  currentTp: number,
  all: Profile[],
): HistoryComparison | undefined {
  const prior = all
    .filter(
      (p) =>
        p.id !== profile.id &&
        p.sessionId !== profile.sessionId &&
        p.hand === profile.hand &&
        p.mode === profile.mode &&
        p.createdAt < profile.createdAt,
    )
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
  if (prior.length === 0) return undefined;

  const previous = prior[prior.length - 1];
  const series = [...prior, profile].map((p) => ({
    date: p.createdAt,
    throughput: p === profile ? currentTp : p.throughput,
    lowConfidence: isLowConfidence(p),
  }));

  return {
    previous: {
      throughput: previous.throughput,
      fit: previous.fitts,
      date: previous.createdAt,
      lowConfidence: isLowConfidence(previous),
    },
    deltaThroughput: currentTp - previous.throughput,
    trend: series.length >= 3 ? series : undefined,
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

  const allProfiles = loadProfiles();
  const handComparison = deriveHandComparison(profile, allProfiles);
  const history = deriveHistory(profile, d.throughput, allProfiles);

  const heading = el("div", { class: "results-head" });
  heading.append(
    el("h1", { tabindex: "-1" }, t("result.title")),
    el("span", { class: "results-date small muted" }, formatDate(profile.createdAt)),
  );
  wrap.append(heading);

  // --- 차트 ---
  const overlays: FittsChartOverlay[] = presetOverlays();
  if (history) {
    overlays.push({
      id: "prev",
      a: history.previous.fit.a,
      b: history.previous.fit.b,
      visible: false,
    });
  }

  let chart: FittsChart | null = null;
  if (d.hasChart) {
    chart = new FittsChart({
      points: d.points,
      fit: d.fit,
      animated: !reduced,
      reducedMotion: reduced,
      overlays,
    });
    ctx.addCleanup(() => chart?.destroy());
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
    el(
      "p",
      { class: "small" },
      el("a", { href: "#/about#fitts", class: "about-deep-link" }, t("result.explainMore")),
    ),
  );
  wrap.append(createDisclosure({ summary: t("result.explainToggle"), content: explainBody }));

  // --- 피험자 내 비교 패널 (brief-3B-b §3 · 5-6-b §2·§3) ---
  if (chart) {
    wrap.append(
      createWithinSubjectPanel({
        chart,
        imprecise: d.weSource === "nominal-fallback" || !d.confident,
        handComparison,
        history,
      }),
    );
  }

  // --- 고지 ---
  wrap.append(el("p", { class: "small muted disclaimer" }, t("result.disclaimer")));

  // --- 하단 액션 ---
  const actions = el("div", { class: "results-actions" });
  const adapt = el("button", { type: "button", class: "btn-ghost" }, t("result.adaptSoon"));
  adapt.addEventListener("click", () => ctx.go(`/adapt/${profile.id}`));
  const saveCard = el("button", { type: "button", class: "btn-primary" }, t("result.saveCard"));
  saveCard.addEventListener("click", () => ctx.go(`/card/${profile.id}`));
  const again = el("button", { type: "button", class: "btn-ghost" }, t("result.remeasure"));
  again.addEventListener("click", () => ctx.go("/setup"));
  actions.append(adapt, saveCard, again);
  wrap.append(actions);

  ctx.host.append(wrap);
  (wrap.querySelector("h1") as HTMLElement).focus();
}
