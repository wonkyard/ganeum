/** S1 — 측정 준비 + 3-2-1 카운트다운 (screen-design S1 · brief-3A §3). */
import { el } from "../dom";
import { t } from "../../i18n";
import { createTopBar } from "../components/top-bar";
import { Countdown } from "../components/countdown";
import { sessionStore } from "../session-store";
import { loadCalibration, loadPrefs, savePrefs } from "../../storage/profiles";
import type { Hand } from "../../core/types";
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

  // --- 측정 종류 카드 (3A 는 빠른 측정만) ---
  const quickCard = modeCard("quick", t("setup.quickTitle"), t("setup.quickDetail"), false);
  const preciseCard = modeCard(
    "precise",
    t("setup.preciseTitle"),
    t("setup.preciseDetail"),
    true,
  );
  const cards = el("div", { class: "setup-cards", role: "group", "aria-label": t("setup.title") });
  cards.append(quickCard, preciseCard);
  wrap.append(cards);

  quickCard.setAttribute("aria-pressed", "true");
  quickCard.classList.add("is-selected");
  // 정밀 측정은 비활성 ("준비 중").
  preciseCard.setAttribute("aria-disabled", "true");
  preciseCard.append(el("span", { class: "card-soon" }, t("setup.comingSoon")));

  // 카드 ←/→ 키보드 (3A 는 quick 만 유효하므로 포커스 이동만).
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
    sessionStore.set({ mode: "quick" });
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
      e.preventDefault();
      begin();
    }
  };
  window.addEventListener("keydown", onKey);
  ctx.addCleanup(() => window.removeEventListener("keydown", onKey));

  quickCard.focus();
}

function modeCard(mode: string, title: string, detail: string, disabled: boolean): HTMLElement {
  return el(
    "button",
    {
      type: "button",
      class: "setup-card",
      "data-mode": mode,
      disabled: disabled || undefined,
    },
    el("span", { class: "card-title" }, title),
    el("span", { class: "card-detail small muted" }, detail),
  );
}
