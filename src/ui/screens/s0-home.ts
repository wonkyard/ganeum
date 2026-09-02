/** S0 — 홈 / 랜딩 (screen-design S0 · brief-3A §3). */
import { el } from "../dom";
import { t, formatNumber } from "../../i18n";
import { createTopBar } from "../components/top-bar";
import { loadProfiles, getLastProfileId, isStorageDegraded } from "../../storage/profiles";
import type { MountContext } from "../screen";

export function renderHome(ctx: MountContext): void {
  const profiles = loadProfiles();
  const wrap = el("section", { class: "screen screen-home" });

  wrap.append(createTopBar({ go: ctx.go, rerender: ctx.rerender }));

  if (isStorageDegraded()) {
    wrap.append(el("p", { class: "badge-degraded small", role: "status" }, t("storage.degraded")));
  }

  wrap.append(
    el("h1", { class: "home-title" }, t("app.tagline")),
    el("p", { class: "numeric muted" }, t("home.subcopy")),
  );

  const start = el("button", { class: "btn-primary home-start", type: "button" }, t("home.start"));
  start.addEventListener("click", () => ctx.go("/setup"));
  wrap.append(start);

  const links = el("nav", { class: "home-links" });
  const whatIs = el("a", { href: "#/", class: "home-link", "aria-disabled": "true" }, t("home.whatIs"));
  whatIs.addEventListener("click", (e) => e.preventDefault()); // S6 는 주 5–6
  links.append(whatIs);

  if (profiles.length > 0) {
    const last = getLastProfileId() ?? profiles[profiles.length - 1].id;
    const past = el(
      "a",
      { href: `#/results/${last}`, class: "home-link" },
      t("home.pastResults", { count: formatNumber(profiles.length) }),
    );
    links.append(el("span", { "aria-hidden": "true" }, " · "), past);
  }
  wrap.append(links);

  // 3A: 화면 보정은 항상 "안 됨" (SC 는 3B). 정보만.
  wrap.append(el("p", { class: "calib-status small muted" }, `◔ ${t("home.calibrationOff")}`));

  wrap.append(
    el("hr", {}),
    el("p", { class: "muted small home-footer" }, t("home.footer")),
  );

  ctx.host.append(wrap);
  start.focus();
}
