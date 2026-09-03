/** S1 — 측정 준비 + 3-2-1 카운트다운 (screen-design S1 · brief-3A §3 · 5-6-b: 정밀/양손). */
import { el } from "../dom";
import { t } from "../../i18n";
import { createTopBar } from "../components/top-bar";
import { Countdown } from "../components/countdown";
import { sessionStore } from "../session-store";
import { loadCalibration, loadPrefs, savePrefs } from "../../storage/profiles";
import type { Hand, MeasureMode } from "../../core/types";
import type { MountContext } from "../screen";

export function renderSetup(ctx: MountContext): void {
  const wrap = el("section", { class: "screen screen-setup" });
  wrap.append(createTopBar({ back: "/", go: ctx.go, rerender: ctx.rerender }));
  wrap.append(el("h1", {}, t("setup.title")));

  // 첫 측정 직전 1회 "화면 보정할래요?" 권유 (brief-3B-a §1). 스킵 가능, 재권유 없음.
  if (!loadPrefs().calibrationPrompted && !loadCalibration()) {
    const prompt = el("div", { class: "calibrate-prompt small", role: "note" });
    const yes = el("button", { type: "button", class: "btn-ghost" }, t("setup.calibratePromptYes"));
    const no = el("button", { type: "button", class: "btn-ghost" }, t("setup.calibratePromptNo"));
    yes.addEventListener("click", () => {
      savePrefs({ calibrationPrompted: true });
      ctx.go("/calibrate");
    });
    no.addEventListener("click", () => {
      savePrefs({ calibrationPrompted: true });
      prompt.remove();
    });
    prompt.append(
      el("span", {}, t("setup.calibratePrompt")),
      el("span", { class: "calibrate-prompt-actions" }, yes, no),
    );
    wrap.append(prompt);
  }

  // --- 측정 종류 카드 (택1) ---
  const quickCard = modeCard("quick", t("setup.quickTitle"), t("setup.quickDetail"));
  const preciseCard = modeCard("precise", t("setup.preciseTitle"), t("setup.preciseDetail"));
  const cards = el("div", { class: "setup-cards", role: "group", "aria-label": t("setup.title") });
  cards.append(quickCard, preciseCard);
  wrap.append(cards);

  // --- 양손 비교 옵션 (정밀 모드에서만 노출) ---
  const bothHandsInput = el("input", {
    type: "checkbox",
    id: "both-hands",
  }) as HTMLInputElement;
  const bothHandsRow = el(
    "div",
    { class: "both-hands-row small", hidden: true },
    el("label", { for: "both-hands", class: "both-hands-option" }, bothHandsInput, t("setup.bothHands")),
    el("p", { class: "muted both-hands-hint" }, t("setup.bothHandsHint")),
  );
  wrap.append(bothHandsRow);

  let selectedMode: MeasureMode = "quick";
  const selectCard = (mode: MeasureMode): void => {
    selectedMode = mode;
    for (const [m, card] of [
      ["quick", quickCard],
      ["precise", preciseCard],
    ] as const) {
      const on = m === mode;
      card.classList.toggle("is-selected", on);
      card.setAttribute("aria-pressed", String(on));
    }
    bothHandsRow.hidden = mode !== "precise";
  };
  quickCard.addEventListener("click", () => selectCard("quick"));
  preciseCard.addEventListener("click", () => selectCard("precise"));
  selectCard("quick");

  // 카드 ←/→ 키보드: 포커스 이동 (선택은 Enter/클릭).
  cards.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      (e.key === "ArrowRight" ? preciseCard : quickCard).focus();
    }
  });

  // --- 쓰는 손 ---
  const fieldset = el("fieldset", { class: "hand-fieldset" });
  fieldset.append(el("legend", {}, t("setup.handLegend")));
  const currentHand = sessionStore.get().hand;
  for (const hand of ["right", "left"] as Hand[]) {
    const id = `hand-${hand}`;
    const input = el("input", {
      type: "radio",
      name: "hand",
      id,
      value: hand,
      checked: hand === currentHand,
    }) as HTMLInputElement;
    input.addEventListener("change", () => sessionStore.set({ hand }));
    fieldset.append(
      el(
        "label",
        { for: id, class: "hand-option" },
        input,
        hand === "right" ? t("setup.handRight") : t("setup.handLeft"),
      ),
    );
  }
  wrap.append(fieldset);

  // --- 안내 박스 ---
  wrap.append(
    el(
      "div",
      { class: "howto-box" },
      el("strong", {}, t("setup.howtoTitle")),
      el("p", {}, t("setup.howtoBody")),
    ),
  );

  // --- 시작 ---
  const start = el(
    "button",
    { class: "btn-primary setup-start", type: "button" },
    `${t("setup.start")} (${t("setup.startHint")})`,
  );
  wrap.append(start);
  ctx.host.append(wrap);

  let started = false;
  const begin = (): void => {
    if (started) return;
    started = true;
    sessionStore.set({
      mode: selectedMode,
      bothHands: selectedMode === "precise" && bothHandsInput.checked,
    });
    runCountdown();
  };

  const runCountdown = (): void => {
    ctx.host.replaceChildren();
    const overlay = el("div", { class: "screen countdown-screen" });
    ctx.host.append(overlay);
    const cd = new Countdown({
      host: overlay,
      reducedMotion: ctx.reducedMotion(),
      onDone: () => ctx.go("/measure"),
    });
    ctx.addCleanup(() => cd.destroy());
  };

  start.addEventListener("click", begin);
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === " " || e.code === "Space") {
      // 카드에 포커스가 있으면 스페이스는 카드 선택용 — 측정 시작이 아니다.
      if (document.activeElement === quickCard || document.activeElement === preciseCard) return;
      e.preventDefault();
      begin();
    }
  };
  window.addEventListener("keydown", onKey);
  ctx.addCleanup(() => window.removeEventListener("keydown", onKey));

  quickCard.focus();
}

function modeCard(mode: string, title: string, detail: string): HTMLElement {
  return el(
    "button",
    {
      type: "button",
      class: "setup-card",
      "data-mode": mode,
      "aria-pressed": "false",
    },
    el("span", { class: "card-title" }, title),
    el("span", { class: "card-detail small muted" }, detail),
  );
}
