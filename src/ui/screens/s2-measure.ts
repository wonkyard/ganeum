/** S2 — 측정 중 (챔버). screen-design S2 · brief-3A P0-1·4·7·9. */
import { el } from "../dom";
import { t } from "../../i18n";
import { analyzeSession } from "../../core/analyze";
import { designConditions, generateTargetLayout, type ConditionSpec } from "../../core/task";
import { newProfileId } from "../../core/ids";
import { CURRENT_SCHEMA, type Condition, type PointerKind, type Profile, type Tap } from "../../core/types";
import { TargetField, type RawTap } from "../../render/target-field";
import { AppModal } from "../components/app-modal";
import { sessionStore } from "../session-store";
import { saveProfile } from "../../storage/profiles";
import { APP_VERSION } from "../../version";
import type { MountContext } from "../screen";

export interface MeasureHandle {
  /** 자동화용: 현재 타깃을 표시 좌표로 누른다. */
  tapCurrentTarget(): void;
  /** 자동화용: 현재 타깃 중심의 뷰포트 좌표(표시 박스 기준). */
  currentTargetPoint(): { x: number; y: number } | null;
}

function detectPointerType(): PointerKind {
  if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
    if (window.matchMedia("(pointer: coarse)").matches) return "touch";
  }
  return "mouse";
}

export function renderMeasure(ctx: MountContext): MeasureHandle {
  const { mode, hand } = sessionStore.get();
  const total = 3; // quick (정밀 측정은 3B)
  let pointerType = detectPointerType();

  const section = el("section", { class: "screen chamber" });
  const bar = el("div", { class: "chamber-bar" });
  const progress = el("p", { class: "numeric", role: "status" });
  const dots = el("div", { class: "progress-dots", "aria-hidden": "true" });
  const abort = el("button", { type: "button", class: "chamber-abort" }, `✕ ${t("measure.abort")}`);
  bar.append(progress, dots, abort);

  const srStatus = el("p", { class: "sr-only", role: "status", "aria-live": "polite" });
  const canvas = el("canvas", { class: "target-canvas" }) as HTMLCanvasElement;
  const hint = el("p", { class: "small chamber-hint" });

  section.append(bar, srStatus, canvas, hint);
  section.append(el("p", { class: "sr-only" }, t("measure.pointerRequired")));
  ctx.host.append(section);

  canvas.addEventListener(
    "pointerdown",
    (e) => {
      if (e.pointerType === "touch" || e.pointerType === "pen" || e.pointerType === "mouse") {
        pointerType = e.pointerType;
      }
    },
    { once: true },
  );

  const collected: Condition[] = [];
  let activeField: TargetField | null = null;
  let specs: ConditionSpec[] | null = null;
  let done = false;

  const specsFor = (size: number): ConditionSpec[] => {
    if (!specs) specs = designConditions(mode, size * 0.8, pointerType);
    return specs;
  };

  const renderProgress = (index: number): void => {
    progress.textContent = t("measure.conditionProgress", { current: index + 1, total });
    srStatus.textContent = t("measure.srStatus", { current: index + 1, total });
    dots.replaceChildren(
      ...Array.from({ length: total }, (_, i) =>
        el("span", { class: i <= index ? "dot dot-on" : "dot" }),
      ),
    );
    // 가장 어려운(첫) 조건 안내.
    hint.textContent = index === 0 ? t("measure.hardestCondition") : "";
  };

  const runCondition = (index: number): void => {
    if (index >= total) {
      finish();
      return;
    }
    renderProgress(index);
    activeField?.destroy();

    let displayedA = 0;
    activeField = new TargetField({
      canvas,
      reducedMotion: ctx.reducedMotion(),
      buildLayout: (size) => {
        const spec = specsFor(size)[index];
        displayedA = Math.min(spec.A, size - spec.W - 8);
        return generateTargetLayout({
          center: { x: size / 2, y: size / 2 },
          amplitude: displayedA,
          width: spec.W,
          count: 11,
        });
      },
      onComplete: (raw) => {
        const s = specsFor(0)[index];
        collected.push(toCondition(s, raw, displayedA));
        activeField?.destroy();
        activeField = null;
        runCondition(index + 1);
      },
    });
  };

  const finish = (): void => {
    if (done) return;
    done = true;
    const analysis = analyzeSession(collected);
    if (analysis.status !== "ok") {
      renderInsufficient();
      return;
    }
    const id = newProfileId();
    const profile: Profile = {
      schema: CURRENT_SCHEMA,
      id,
      sessionId: id,
      appVersion: APP_VERSION,
      createdAt: new Date().toISOString(),
      pointerType,
      hand,
      mode,
      calibrated: false,
      viewport: {
        w: typeof window !== "undefined" ? window.innerWidth : 0,
        h: typeof window !== "undefined" ? window.innerHeight : 0,
        dpr: (typeof window !== "undefined" && window.devicePixelRatio) || 1,
        pxPerMm: null,
      },
      conditions: collected,
      fitts: analysis.fitts,
      throughput: analysis.throughput,
      we: analysis.we,
      weSource: analysis.weSource,
      errorRate: analysis.errorRate,
      consistencySD: analysis.consistencySD,
      asymmetry: null,
    };
    saveProfile(profile);
    ctx.go(`/results/${id}`);
  };

  const renderInsufficient = (): void => {
    ctx.host.replaceChildren();
    const s = el("section", { class: "screen screen-recover" });
    s.append(
      el("h1", { tabindex: "-1" }, t("error.title")),
      el("p", {}, t("result.insufficient")),
    );
    const again = el("button", { type: "button", class: "btn-primary" }, t("error.retry"));
    again.addEventListener("click", () => ctx.go("/setup"));
    s.append(again);
    ctx.host.append(s);
    (s.querySelector("h1") as HTMLElement).focus();
  };

  abort.addEventListener("click", () => {
    new AppModal({
      title: t("measure.abortConfirm"),
      actions: [
        { label: t("measure.abortNo"), onSelect: () => {}, variant: "ghost" },
        { label: t("measure.abortYes"), onSelect: () => ctx.go("/"), variant: "danger" },
      ],
    });
  });

  ctx.addCleanup(() => {
    done = true;
    activeField?.destroy();
    activeField = null;
  });

  runCondition(0);

  return {
    tapCurrentTarget: () => activeField?.tapCurrentTarget("mouse"),
    currentTargetPoint: () => activeField?.currentTargetClientPoint ?? null,
  };
}

/** RawTap(렌더 좌표) → Tap(저장 스키마) + 조건 메타 (brief-3A P0-3). */
function toCondition(spec: ConditionSpec, raw: RawTap[], displayedA: number): Condition {
  const taps: Tap[] = raw.map((r) => ({
    mt: r.mt,
    dx: r.dx,
    dy: r.dy,
    devAxis: r.devAxis,
    devOrtho: r.devOrtho,
    error: r.error,
  }));

  // Ae = 연속 착지점 간 실제 거리의 평균. raw 는 타깃당 1개, 방문 순서대로.
  let sum = 0;
  let n = 0;
  for (let i = 1; i < raw.length; i++) {
    sum += Math.hypot(raw[i].x - raw[i - 1].x, raw[i].y - raw[i - 1].y);
    n += 1;
  }
  const Ae = n > 0 ? sum / n : displayedA;

  return { A: spec.A, displayedA, Ae, W: spec.W, ID: spec.ID, taps };
}
