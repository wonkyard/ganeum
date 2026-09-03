/** SC — 화면 물리 보정 (선택). screen-design SC · brief-3B-a §1 · 스펙 §3. */
import { el } from "../dom";
import { t } from "../../i18n";
import { createTopBar } from "../components/top-bar";
import { CardCalibrator } from "../components/card-calibrator";
import { loadCalibration, saveCalibration, savePrefs } from "../../storage/profiles";
import type { MountContext } from "../screen";

export function renderCalibrate(ctx: MountContext): void {
  const wrap = el("section", { class: "screen screen-calibrate" });
  wrap.append(createTopBar({ back: "/", go: ctx.go, rerender: ctx.rerender }));
  wrap.append(el("h1", { tabindex: "-1" }, t("calibrate.title")));
  wrap.append(el("p", { class: "muted" }, t("calibrate.intro")));

  const existing = loadCalibration();
  const calibrator = new CardCalibrator({
    host: wrap,
    initialPxPerMm: existing?.pxPerMm,
  });
  ctx.addCleanup(() => calibrator.destroy());

  const actions = el("div", { class: "calibrate-actions" });
  const save = el("button", { type: "button", class: "btn-primary" }, t("calibrate.save"));
  const skip = el("button", { type: "button", class: "btn-ghost" }, t("calibrate.skip"));

  const finishPrompt = (): void => {
    // 어느 쪽 버튼이든 "권유는 이미 봤다" 로 표시 → 첫 측정 직전 재권유 없음.
    savePrefs({ calibrationPrompted: true });
  };

  save.addEventListener("click", () => {
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    saveCalibration(calibrator.value, dpr);
    finishPrompt();
    ctx.go("/");
  });
  skip.addEventListener("click", () => {
    finishPrompt();
    ctx.go("/");
  });

  actions.append(save, skip);
  wrap.append(actions);

  ctx.host.append(wrap);
  (wrap.querySelector("h1") as HTMLElement).focus();
}
