/** S2 — 측정 중 (챔버). screen-design S2 · brief-3A P0-1·4·7·9 · 5-6-b: 정밀 9조건 + 양손. */
import { el } from "../dom";
import { t } from "../../i18n";
import { analyzeSession, type SessionOk } from "../../core/analyze";
import { designConditions, generateTargetLayout, type ConditionSpec } from "../../core/task";
import { computeAsymmetry } from "../../core/asymmetry";
import { newProfileId } from "../../core/ids";
import {
  CURRENT_SCHEMA,
  type Condition,
  type Hand,
  type PointerKind,
  type Profile,
  type Tap,
} from "../../core/types";
import { TargetField, type RawTap } from "../../render/target-field";
import { AppModal } from "../components/app-modal";
import { sessionStore } from "../session-store";
import { saveProfile, loadCalibration, loadProfiles } from "../../storage/profiles";
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

function handLabel(hand: Hand): string {
  return hand === "right" ? t("setup.handRight") : t("setup.handLeft");
}

const CONDITION_COUNT: Record<Profile["mode"], number> = { quick: 3, precise: 9 };

export function renderMeasure(ctx: MountContext): MeasureHandle {
  const { mode, hand, bothHands } = sessionStore.get();
  const conditionCount = CONDITION_COUNT[mode];
  const twoHand = mode === "precise" && bothHands;
  /** 양손 세션에서 두 프로파일을 묶는 공유 ID. 한 손이면 프로파일 자기 id 를 쓴다. */
  const sharedSessionId = newProfileId();
  const handSequence: Hand[] = twoHand
    ? hand === "right"
      ? (["right", "left"] as Hand[])
      : (["left", "right"] as Hand[])
    : [hand];

  let pointerType = detectPointerType();
  let activeField: TargetField | null = null;
  /** 조건 설계는 뷰포트 크기가 정해지는 첫 조건에서 한 번만 만든다. 손이 바뀌어도 동일. */
  let specs: ConditionSpec[] | null = null;
  let destroyed = false;
  let lastProfileId = "";
  const analysisByHand = new Map<Hand, SessionOk>();
  const savedProfileIds = new Map<Hand, string>();

  const specsFor = (size: number): ConditionSpec[] => {
    if (!specs) specs = designConditions(mode, size * 0.8, pointerType);
    return specs;
  };

  const runHand = (handIdx: number): void => {
    if (destroyed) return;
    const currentHand = handSequence[handIdx];
    ctx.host.replaceChildren();

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

    abort.addEventListener("click", () => {
      new AppModal({
        title: t("measure.abortConfirm"),
        actions: [
          { label: t("measure.abortNo"), onSelect: () => {}, variant: "ghost" },
          { label: t("measure.abortYes"), onSelect: () => ctx.go("/"), variant: "danger" },
        ],
      });
    });

    const collected: Condition[] = [];

    const renderProgress = (index: number): void => {
      progress.textContent = twoHand
        ? t("measure.conditionProgressHand", {
            hand: handLabel(currentHand),
            current: index + 1,
            total: conditionCount,
          })
        : t("measure.conditionProgress", { current: index + 1, total: conditionCount });
      srStatus.textContent = t("measure.srStatus", { current: index + 1, total: conditionCount });
      dots.replaceChildren(
        ...Array.from({ length: conditionCount }, (_, i) =>
          el("span", { class: i <= index ? "dot dot-on" : "dot" }),
        ),
      );
      // quick 은 가장 어려운 조건이 먼저다. precise 는 쉬운 것부터라 이 안내가 안 맞는다.
      hint.textContent = mode === "quick" && index === 0 ? t("measure.hardestCondition") : "";
    };

    const runCondition = (index: number): void => {
      if (destroyed) return;
      if (index >= conditionCount) {
        finishHand(handIdx, collected);
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

    runCondition(0);
  };

  const finishHand = (handIdx: number, collected: Condition[]): void => {
    if (destroyed) return;
    const currentHand = handSequence[handIdx];
    const analysis = analyzeSession(collected);
    if (analysis.status !== "ok") {
      renderInsufficient();
      return;
    }

    const id = newProfileId();
    lastProfileId = id;
    const calibration = loadCalibration();
    // 조건 기하는 여전히 뷰포트 CSS px 에서만 파생한다 — 보정은 표시/보고 전용
    // (brief-3A §8 C3).
    const profile: Profile = {
      schema: CURRENT_SCHEMA,
      id,
      sessionId: twoHand ? sharedSessionId : id,
      appVersion: APP_VERSION,
      createdAt: new Date().toISOString(),
      pointerType,
      hand: currentHand,
      mode,
      calibrated: calibration != null,
      viewport: {
        w: typeof window !== "undefined" ? window.innerWidth : 0,
        h: typeof window !== "undefined" ? window.innerHeight : 0,
        dpr: (typeof window !== "undefined" && window.devicePixelRatio) || 1,
        pxPerMm: calibration?.pxPerMm ?? null,
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
    analysisByHand.set(currentHand, analysis);
    savedProfileIds.set(currentHand, id);
    saveProfile(profile);

    if (handIdx + 1 < handSequence.length) {
      showInterstitial(handIdx + 1);
      return;
    }

    if (twoHand) finalizeTwoHand();
    ctx.go(`/results/${lastProfileId}`);
  };

  /**
   * 두 손 프로파일에 비대칭 지수를 채워 다시 저장한다. `sessionId` 는 이미 공유돼 있어
   * S3 가 형제 프로파일을 찾을 수 있다. 저장 순서는 측정 순서를 따라 `lastProfileId`
   * (마지막 손)가 `ganeum.lastProfileId` 로 남게 한다.
   */
  const finalizeTwoHand = (): void => {
    const asym = computeAsymmetry(
      analysisByHand.get("right") ?? null,
      analysisByHand.get("left") ?? null,
    );
    const stored = loadProfiles().filter((p) => p.sessionId === sharedSessionId);
    const bySeq = handSequence
      .map((h) => stored.find((p) => p.id === savedProfileIds.get(h)))
      .filter((p): p is Profile => p != null);
    for (const p of bySeq) {
      saveProfile({ ...p, asymmetry: asym });
    }
  };

  const showInterstitial = (nextHandIdx: number): void => {
    activeField?.destroy();
    activeField = null;
    ctx.host.replaceChildren();

    const nextHand = handSequence[nextHandIdx];
    const s = el("section", { class: "screen screen-interstitial" });
    const h1 = el("h1", { tabindex: "-1" }, t("measure.switchHandsTitle"));
    s.append(
      h1,
      el("p", { class: "sr-only", role: "status" }, t("measure.switchHandsSr")),
      el("p", { class: "interstitial-body" }, t("measure.switchHandsBody", { hand: handLabel(nextHand) })),
    );
    const cont = el("button", { type: "button", class: "btn-primary" }, t("measure.switchHandsContinue"));
    cont.addEventListener("click", () => runHand(nextHandIdx));
    s.append(cont);
    ctx.host.append(s);
    h1.focus();
  };

  const renderInsufficient = (): void => {
    ctx.host.replaceChildren();
    const s = el("section", { class: "screen screen-recover" });
    s.append(el("h1", { tabindex: "-1" }, t("error.title")), el("p", {}, t("result.insufficient")));
    const again = el("button", { type: "button", class: "btn-primary" }, t("error.retry"));
    again.addEventListener("click", () => ctx.go("/setup"));
    s.append(again);
    ctx.host.append(s);
    (s.querySelector("h1") as HTMLElement).focus();
  };

  ctx.addCleanup(() => {
    destroyed = true;
    activeField?.destroy();
    activeField = null;
  });

  runHand(0);

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
