/** S5 — 결과 카드 / 공유. screen-design S5 · brief-3A §3. */
import { el } from "../dom";
import { t } from "../../i18n";
import { analyzeSession } from "../../core/analyze";
import { getProfile, exportProfileJSON } from "../../storage/profiles";
import { createTopBar } from "../components/top-bar";
import { ResultCard } from "../../render/result-card";
import type { MountContext } from "../screen";

export function renderCard(ctx: MountContext): void {
  const wrap = el("section", { class: "screen screen-card" });
  wrap.append(createTopBar({ back: `/results/${ctx.params.id}`, go: ctx.go, rerender: ctx.rerender }));
  wrap.append(el("h1", { tabindex: "-1" }, t("card.title")));

  const profile = getProfile(ctx.params.id);
  if (!profile) {
    wrap.append(el("p", {}, t("result.notFound")));
    ctx.host.append(wrap);
    (wrap.querySelector("h1") as HTMLElement).focus();
    return;
  }

  const analysis = analyzeSession(profile.conditions);
  const points = analysis.status === "ok" ? analysis.points : [];

  const card = new ResultCard({
    throughput: profile.throughput,
    fit: profile.fitts,
    points,
    errorRate: profile.errorRate,
    consistencySD: profile.consistencySD,
    hand: profile.hand,
    pointerType: profile.pointerType,
    createdAt: profile.createdAt,
    unstable: profile.weSource === "nominal-fallback",
  });
  wrap.append(card.element);

  // 프로파일 JSON 내보내기 (P1 형태).
  const exportBtn = el("button", { type: "button", class: "btn-ghost" }, t("card.exportJson"));
  exportBtn.addEventListener("click", () => {
    const blob = new Blob([exportProfileJSON(profile)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = el("a", { href: url, download: `ganeum-profile-${profile.id}.json` });
    document.body.append(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  wrap.append(exportBtn);

  ctx.host.append(wrap);
  (wrap.querySelector("h1") as HTMLElement).focus();
}
