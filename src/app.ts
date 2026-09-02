/**
 * 주 1–2 앱 셸: 홈 → 측정(S2) → 결과(수치만).
 * S1/S3 의 완성 디자인, 보정, 적응, 카드는 주 3–4 이후이며 여기서는 다루지 않는다.
 */
import { analyzeSession, type SessionAnalysis } from "./core/analyze";
import { designConditions } from "./core/task";
import { generateTargetLayout } from "./core/task";
import type { Condition, Hand, MeasureMode, Tap } from "./core/types";
import { TargetField, type RawTap } from "./render/target-field";
import { createRouter } from "./ui/router";
import { createStore } from "./ui/store";
import { prefersReducedMotion } from "./a11y/reduced-motion";
import { t } from "./i18n";

interface AppState {
  mode: MeasureMode;
  hand: Hand;
  analysis: SessionAnalysis | null;
}

export interface AppHandle {
  /** 자동화/스모크 테스트용 훅. 현재 타깃을 살짝 흔든 좌표로 누른다. */
  tapCurrentTarget(): void;
  getState(): AppState;
}

export function createApp(root: HTMLElement): AppHandle {
  const store = createStore<AppState>({ mode: "quick", hand: "right", analysis: null });
  const router = createRouter(() => router.go("/"));

  let activeField: TargetField | null = null;

  const clear = (): void => {
    activeField?.destroy();
    activeField = null;
    root.replaceChildren();
  };

  function renderHome(): void {
    clear();
    const wrap = el("section", { class: "screen screen-home" });
    wrap.append(
      el("h1", {}, t("app.tagline")),
      el("p", { class: "numeric muted" }, t("home.subcopy")),
    );
    const start = el("button", { class: "btn-primary", type: "button" }, t("home.start"));
    start.addEventListener("click", () => router.go("/measure"));
    wrap.append(start);
    wrap.append(el("p", { class: "muted small" }, t("home.footer")));
    root.append(wrap);
    start.focus();
  }

  function renderMeasure(): void {
    clear();
    const { mode } = store.get();
    const section = el("section", { class: "screen chamber", "aria-label": "측정 중" });
    const status = el("p", { class: "numeric", role: "status" });
    const canvas = el("canvas", { class: "target-canvas" }) as HTMLCanvasElement;
    section.append(status, canvas);
    section.append(el("p", { class: "small" }, t("measure.pointerRequired")));
    root.append(section);

    // 캔버스를 뷰포트에 맞춘다.
    const size = Math.min(window.innerWidth || 800, (window.innerHeight || 600) * 0.9);
    canvas.width = size;
    canvas.height = size;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    const reference = size * 0.8;
    const specs = designConditions(mode, reference);
    const collected: Condition[] = [];
    const reduced = prefersReducedMotion();

    const runCondition = (index: number): void => {
      if (index >= specs.length) {
        finish();
        return;
      }
      const spec = specs[index];
      status.textContent = t("measure.conditionProgress", {
        current: index + 1,
        total: specs.length,
      });
      const layout = generateTargetLayout({
        center: { x: size / 2, y: size / 2 },
        amplitude: Math.min(spec.A, size - spec.W - 8),
        width: spec.W,
        count: 11,
      });
      activeField?.destroy();
      activeField = new TargetField({
        canvas,
        layout,
        reducedMotion: reduced,
        onComplete: (raw) => {
          collected.push(toCondition(spec, raw));
          activeField?.destroy();
          activeField = null;
          runCondition(index + 1);
        },
      });
    };

    const finish = (): void => {
      const analysis = analyzeSession(collected);
      store.set({ analysis });
      router.go("/results");
    };

    runCondition(0);
  }

  function renderResults(): void {
    clear();
    const { analysis, hand } = store.get();
    const section = el("section", { class: "screen screen-results" });
    if (!analysis) {
      section.append(el("p", {}, "측정 데이터가 없습니다."));
      const back = el("button", { type: "button", class: "btn-primary" }, t("home.start"));
      back.addEventListener("click", () => router.go("/measure"));
      section.append(back);
      root.append(section);
      return;
    }

    const { fitts, throughput, errorRate, consistencySD } = analysis;
    section.append(
      el("h1", {}, t("result.title")),
      metric(t("result.throughput"), `${throughput.toFixed(2)} ${t("result.throughputUnit")}`),
      metric(
        "회귀",
        t("result.regression", { a: fitts.a.toFixed(3), b: fitts.b.toFixed(3) }) +
          "  ·  " +
          t("result.rSquared", { value: fitts.r2.toFixed(3) }),
      ),
      metric(t("result.accuracy"), `${((1 - errorRate) * 100).toFixed(0)}%`),
      metric(t("result.consistency"), `±${(consistencySD * 1000).toFixed(0)} ${t("unit.ms")}`),
      metric(t("result.hand"), hand === "right" ? "오른손" : "왼손"),
      el("p", { class: "small muted" }, t("result.disclaimer")),
    );
    const again = el("button", { type: "button", class: "btn-primary" }, t("result.remeasure"));
    again.addEventListener("click", () => router.go("/measure"));
    section.append(again);
    root.append(section);
    section.querySelector("h1")?.setAttribute("tabindex", "-1");
    (section.querySelector("h1") as HTMLElement | null)?.focus();
  }

  router
    .add("/", renderHome)
    .add("/measure", renderMeasure)
    .add("/results", renderResults)
    .start();

  return {
    tapCurrentTarget() {
      if (!activeField) return;
      activeField.tapCurrentTarget("mouse");
    },
    getState: () => store.get(),
  };
}

/** RawTap(렌더 좌표) → Tap(저장 스키마). */
function toCondition(spec: { A: number; W: number; ID: number }, raw: RawTap[]): Condition {
  const taps: Tap[] = raw.map((r) => ({ mt: r.mt, dx: r.dx, dy: r.dy, error: r.error }));
  return { A: spec.A, W: spec.W, ID: spec.ID, taps };
}

type Attrs = Record<string, string>;
function el(tag: string, attrs: Attrs = {}, text?: string): HTMLElement {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (text !== undefined) node.textContent = text;
  return node;
}

function metric(label: string, value: string): HTMLElement {
  const row = el("div", { class: "metric" });
  row.append(el("span", { class: "metric-label" }, label));
  row.append(el("span", { class: "metric-value numeric" }, value));
  return row;
}
