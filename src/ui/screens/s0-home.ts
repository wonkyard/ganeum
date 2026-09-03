/** S0 — 홈 / 랜딩 (screen-design S0 · brief-3A §3). */
import { el } from "../dom";
import { t, formatNumber } from "../../i18n";
import { createTopBar } from "../components/top-bar";
import {
  loadProfiles,
  getLastProfileId,
  isStorageDegraded,
  loadCalibration,
  isCalibrationStale,
} from "../../storage/profiles";
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
  const whatIs = el("a", { href: "#/about", class: "home-link" }, t("home.whatIs"));
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

  // 화면 보정 상태 줄 (brief-3B-a §3). 클릭 → SC.
  wrap.append(calibrationStatusLine());

  wrap.append(
    el("hr", {}),
    el("p", { class: "muted small home-footer" }, t("home.footer")),
  );

  ctx.host.append(wrap);
  start.focus();
}

/**
 * 홈의 보정 상태 줄. 미보정 / 보정됨(px/mm 표시) / dpr 불일치(모니터 변경) 세 상태.
 * 항상 `#/calibrate` 로 가는 링크다 — [측정 시작] 은 보정과 무관하게 활성.
 */
function calibrationStatusLine(): HTMLElement {
  const cal = loadCalibration();
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

  let mark = "◔";
  let label = t("home.calibrationOff");
  if (cal && isCalibrationStale(cal, dpr)) {
    mark = "⚠";
    label = t("home.calibrationStale");
  } else if (cal) {
    mark = "●";
    label = t("home.calibrationOn", {
      pxPerMm: formatNumber(cal.pxPerMm, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    });
  }

  return el(
    "a",
    { href: "#/calibrate", class: "home-link calib-status small" },
    `${mark} ${label}`,
  );
}
