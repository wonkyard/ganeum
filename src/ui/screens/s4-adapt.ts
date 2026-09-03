/** S4 — 적응 (화면을 당신에게 맞추기). screen-design S4 · spec §6 · brief-3B-b §2. */
import { el } from "../dom";
import { t, formatNumber } from "../../i18n";
import { analyzeSession } from "../../core/analyze";
import type { Profile } from "../../core/types";
import { getProfile, exportProfileJSON, loadCalibration } from "../../storage/profiles";
import { createTopBar } from "../components/top-bar";
import { createDisclosure } from "../components/disclosure";
import { MorphSlider } from "../components/morph-slider";
import {
  SampleUI,
  SAMPLE_KINDS,
  BASE_HIT_SIZE_PX,
  BASE_GAP_PX,
  BASE_PAD_PX,
  type SampleKind,
} from "../components/sample-ui";
import {
  buildMorphAxis,
  initialMorphT,
  morphAt,
  type MorphMeInput,
} from "../../adapt/morph";
import { sizing, WELFORD_ENTROPY_FACTOR, type SizingResult } from "../../adapt/sizing";
import { ADAPT_MODEL_DOC_URL } from "../../adapt/citations";
import type { MountContext } from "../screen";

/** 키패드 컨트롤의 전형적 이동 거리 A_c (CSS px) — 예측 이동시간 산정용. */
const KEYPAD_TYPICAL_AMPLITUDE_PX = 160;

/** 세션 분석에서 "나" 입력을 뽑는다. 마이그레이션된 프로파일은 저장 요약으로 폴백. */
function deriveMe(profile: Profile): MorphMeInput | null {
  const a = analyzeSession(profile.conditions);
  if (a.status === "ok") {
    return { a: a.fitts.a, b: a.fitts.b, we: a.we, weSource: a.weSource, confident: a.confident };
  }
  if (profile.we > 0) {
    return {
      a: profile.fitts.a,
      b: profile.fitts.b,
      we: profile.we,
      weSource: profile.weSource,
      confident: profile.fitts.r2 >= 0.7 && profile.fitts.b > 0,
    };
  }
  return null;
}

function viewportMinSide(): number {
  if (typeof window === "undefined") return 0;
  return Math.min(window.innerWidth || 0, window.innerHeight || 0);
}

export function renderAdapt(ctx: MountContext): void {
  const wrap = el("section", { class: "screen screen-adapt" });
  wrap.append(createTopBar({ back: `/results/${ctx.params.id}`, go: ctx.go, rerender: ctx.rerender }));

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

  wrap.append(el("h1", { tabindex: "-1" }, t("adapt.title")));

  const cal = loadCalibration();
  const calPxPerMm = cal?.pxPerMm ?? null;
  const me = deriveMe(profile);
  const axis = buildMorphAxis({ me, calibrationPxPerMm: calPxPerMm });
  const reduced = ctx.reducedMotion();

  if (axis.meDisabled) {
    wrap.append(el("p", { class: "adapt-me-disabled small", role: "status" }, t("adapt.meDisabledNote")));
  }

  // --- 샘플 목업(탭 3종) + 슬라이더 ---
  const stage = el("div", { class: "adapt-stage" });
  wrap.append(stage);

  const sampleCol = el("div", { class: "adapt-sample-col" });
  stage.append(sampleCol);

  // 샘플 탭: [키패드][로그인 폼][미디어 툴바] (screen-design S4).
  const tablist = el("div", { class: "adapt-sample-tabs", role: "tablist", "aria-label": t("adapt.sampleTabsLabel") });
  const tabButtons = new Map<SampleKind, HTMLButtonElement>();
  const sampleHost = el("div", { class: "adapt-sample-host" });

  let currentKind: SampleKind = "keypad";
  let lastSizing: SizingResult | null = null;
  let sample = new SampleUI({ host: sampleHost, reducedMotion: reduced, initialMode: "adapted", kind: currentKind });
  ctx.addCleanup(() => sample.destroy());

  const syncTabs = (): void => {
    for (const [kind, btn] of tabButtons) {
      btn.setAttribute("aria-selected", String(kind === currentKind));
      btn.tabIndex = kind === currentKind ? 0 : -1;
    }
  };

  const switchKind = (kind: SampleKind): void => {
    if (kind === currentKind) return;
    const mode = sample.getMode();
    sample.destroy();
    currentKind = kind;
    sample = new SampleUI({ host: sampleHost, reducedMotion: reduced, initialMode: mode, kind });
    sample.applySizing(lastSizing);
    syncTabs();
    syncFelt();
  };

  for (const kind of SAMPLE_KINDS) {
    const btn = el(
      "button",
      { type: "button", class: "adapt-sample-tab", role: "tab", "data-kind": kind },
      t(`adapt.sampleTab.${kind}` as Parameters<typeof t>[0]),
    ) as HTMLButtonElement;
    btn.addEventListener("click", () => switchKind(kind));
    tabButtons.set(kind, btn);
    tablist.append(btn);
  }

  sampleCol.append(tablist, sampleHost);
  syncTabs();

  const controls = el("div", { class: "adapt-controls" });
  stage.append(controls);

  const sliderHost = el("div", { class: "adapt-slider-host" });
  controls.append(sliderHost);

  // 변경 수치 실시간 표시.
  const readout = el("div", { class: "adapt-readout" });
  controls.append(readout);

  // "왜?" 디스클로저 — 2D 정직성 수치는 갱신된다.
  const why2d = el("p", { class: "adapt-why-2d small" });
  const whyBody = el(
    "div",
    { class: "adapt-why" },
    el("p", { class: "small" }, t("adapt.whyFormula")),
    why2d,
    el(
      "p",
      { class: "small" },
      el("a", { href: "#/about#adapt-model", class: "about-deep-link" }, t("adapt.whyAboutLink")),
    ),
    el(
      "p",
      { class: "small" },
      el(
        "a",
        { href: ADAPT_MODEL_DOC_URL, target: "_blank", rel: "noopener noreferrer" },
        t("adapt.whyDocLink"),
      ),
    ),
  );
  controls.append(createDisclosure({ summary: t("adapt.whyToggle"), content: whyBody }));

  // "원래대로 ↔ 나에게 맞춤" 토글 (체감 비교, 숫자 주장 없음).
  const felt = el("div", { class: "adapt-felt", role: "group", "aria-label": t("adapt.feltLegend") });
  const feltBase = el("button", { type: "button", class: "adapt-felt-btn", "aria-pressed": "false" }, t("adapt.feltBase"));
  const feltAdapted = el("button", { type: "button", class: "adapt-felt-btn", "aria-pressed": "true" }, t("adapt.feltAdapted"));
  // 함수 선언(호이스팅) — 위쪽 `switchKind` 가 탭 전환 후 이걸 부른다.
  function syncFelt(): void {
    feltBase.setAttribute("aria-pressed", String(sample.getMode() === "base"));
    feltAdapted.setAttribute("aria-pressed", String(sample.getMode() === "adapted"));
  }
  feltBase.addEventListener("click", () => {
    sample.setMode("base");
    syncFelt();
  });
  feltAdapted.addEventListener("click", () => {
    sample.setMode("adapted");
    syncFelt();
  });
  felt.append(feltBase, feltAdapted);
  controls.append(felt, el("p", { class: "adapt-felt-hint small muted" }, t("adapt.feltHint")));

  // --- 실시간 갱신 ---
  const fmt0 = (n: number): string => formatNumber(n, { maximumFractionDigits: 0 });
  const fmt1 = (n: number): string => formatNumber(n, { maximumFractionDigits: 1 });

  const renderReadout = (s: SizingResult | null): void => {
    readout.replaceChildren();
    if (!s) {
      readout.append(el("p", { class: "small muted" }, t("adapt.meDisabledNote")));
      return;
    }
    const rows: Array<[string, number, number]> = [
      [t("adapt.rowHit"), BASE_HIT_SIZE_PX, s.wStar],
      [t("adapt.rowGap"), BASE_GAP_PX, s.gap],
      [t("adapt.rowPad"), BASE_PAD_PX, Math.max(BASE_PAD_PX, s.gap)],
    ];
    for (const [label, from, to] of rows) {
      let value: string;
      if (calPxPerMm) {
        value = t("adapt.rowValuePx", { from: fmt0(from), to: fmt0(to) });
        value += ` · ${t("adapt.rowValueMm", { from: fmt1(from / calPxPerMm), to: fmt1(to / calPxPerMm) })}`;
      } else {
        value = t("adapt.rowValueRel", { from: fmt1(1), to: fmt1(to / from) });
      }
      readout.append(
        el("p", { class: "adapt-row small" }, el("span", { class: "adapt-row-label muted" }, label), el("span", { class: "numeric" }, value)),
      );
    }
    if (!calPxPerMm) {
      readout.append(el("p", { class: "adapt-badge small" }, t("adapt.uncalibratedBadge")));
    }
    if (s.floored) readout.append(el("p", { class: "small muted" }, t("adapt.flooredNote")));
    if (s.clamped) readout.append(el("p", { class: "small muted" }, t("adapt.clampedNote")));
  };

  const update = (tValue: number): void => {
    const mp = morphAt(axis, tValue);
    const s = sizing(
      { a: mp.a, b: mp.b, we: mp.we, acPx: KEYPAD_TYPICAL_AMPLITUDE_PX, viewportMinSide: viewportMinSide() },
      calPxPerMm,
    );
    lastSizing = s;
    sample.applySizing(s);
    renderReadout(s);
    if (s) {
      const sigma = mp.we / WELFORD_ENTROPY_FACTOR;
      const err2d = Math.exp(-Math.pow(s.wStar / 2, 2) / (2 * sigma * sigma));
      why2d.textContent = t("adapt.why2d", { pct: fmt0(err2d * 100) });
    } else {
      why2d.textContent = "";
    }
  };

  const startT = initialMorphT(axis);
  const slider = new MorphSlider({ host: sliderHost, axis, initialT: startT, onChange: update });
  ctx.addCleanup(() => slider.destroy());
  update(startT);

  // --- 하단 액션 ---
  const actions = el("div", { class: "adapt-actions" });
  const saveProfile = el("button", { type: "button", class: "btn-ghost" }, t("adapt.saveProfile"));
  saveProfile.addEventListener("click", () => {
    const blob = new Blob([exportProfileJSON(profile)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = el("a", { href: url, download: `ganeum-profile-${profile.id}.json` });
    document.body.append(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  const card = el("button", { type: "button", class: "btn-primary" }, t("adapt.resultCard"));
  card.addEventListener("click", () => ctx.go(`/card/${profile.id}`));
  actions.append(saveProfile, card);
  wrap.append(actions);

  ctx.host.append(wrap);
  (wrap.querySelector("h1") as HTMLElement).focus();
}
