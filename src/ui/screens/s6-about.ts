/** S6 — "가늠이란?" 교육 페이지 (screen-design S6 · brief-5-6-a §1). */
import { el, svgEl } from "../dom";
import { t, type MessageKey } from "../../i18n";
import { createTopBar } from "../components/top-bar";
import { FittsWidget } from "../components/fitts-widget";
import { CITATIONS, CITATION_URLS, type CitationKey } from "../../adapt/citations";
import { routeAnchor } from "../router";
import type { MountContext } from "../screen";

/** 스크롤 문서의 섹션 정의. `id` 는 S3/S4 딥링크 앵커(`#/about#adapt-model`)와 목차가 공유한다. */
const SECTIONS: Array<{ id: string; titleKey: MessageKey }> = [
  { id: "fitts", titleKey: "about.s1Title" },
  { id: "iso", titleKey: "about.s2Title" },
  { id: "adapt-model", titleKey: "about.s3Title" },
  { id: "calibration", titleKey: "about.s4Title" },
  { id: "how", titleKey: "about.s5Title" },
  { id: "limits", titleKey: "about.s6Title" },
  { id: "citations", titleKey: "about.s7Title" },
];

/** S6 교육 페이지에서 인용하는 문헌 (표시 순서). */
const CITED: CitationKey[] = [
  "mackenzie1992",
  "iso9241411",
  "wcagTargetSize",
  "hertzum2010",
  "keatesTrewin2005",
  "soukoreffMackenzie2004",
];

function paras(...keys: MessageKey[]): HTMLElement[] {
  return keys.map((k) => el("p", {}, t(k)));
}

/** 섹션 껍데기 — `<section>` 랜드마크 + 포커스 가능한 제목. */
function section(id: string, titleKey: MessageKey, ...body: Array<Node | string>): HTMLElement {
  return el(
    "section",
    { id, class: "about-section", "aria-labelledby": `${id}-h` },
    el("h2", { id: `${id}-h`, tabindex: "-1" }, t(titleKey)),
    ...body,
  );
}

/**
 * 섹션 2 축소 삽화 — `src/render/target-field.ts` 의 실제 배치(원형 배열 + criss-cross
 * 순서)를 정적으로 보여준다. 8타깃, 순서 라인 포함.
 */
function ringIllustration(): SVGElement {
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 78;
  const n = 8;
  // criss-cross: 매 스텝 원의 지름 반대편으로 건너뛴다 (ISO 9241-411 표준 순서).
  const crissCross = [0, 4, 1, 5, 2, 6, 3, 7];
  const pos = (i: number): { x: number; y: number } => {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
    return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
  };

  const svg = svgEl("svg", {
    viewBox: `0 0 ${size} ${size}`,
    class: "about-ring-svg",
    role: "img",
    "aria-label": t("about.ringAlt"),
  });

  // 진행 순서 라인.
  const pts = crissCross.map(pos);
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  svg.append(svgEl("path", { d, class: "about-ring-path" }));

  crissCross.forEach((targetIndex, step) => {
    const p = pos(targetIndex);
    svg.append(svgEl("circle", { cx: p.x, cy: p.y, r: 14, class: "about-ring-target" }));
    const label = svgEl("text", { x: p.x, y: p.y + 4, class: "about-ring-num" });
    label.textContent = String(step + 1);
    svg.append(label);
  });
  return svg;
}

export function renderAbout(ctx: MountContext): void {
  const wrap = el("section", { class: "screen screen-about" });
  wrap.append(createTopBar({ back: "/", go: ctx.go, rerender: ctx.rerender }));

  wrap.append(
    el("h1", { tabindex: "-1" }, t("about.title")),
    el("p", { class: "about-lead" }, t("about.lead")),
  );

  // 목차 (화면 내 앵커 이동 — 스크롤 문서라 라우팅 없이 스크롤만).
  const toc = el("nav", { class: "about-toc", "aria-label": t("about.tocLabel") });
  const tocList = el("ol", { class: "about-toc-list" });
  for (const s of SECTIONS) {
    const link = el("a", { href: `#/about#${s.id}`, class: "about-toc-link" }, t(s.titleKey));
    link.addEventListener("click", (e) => {
      e.preventDefault();
      scrollToSection(wrap, s.id);
    });
    tocList.append(el("li", {}, link));
  }
  toc.append(tocList);
  wrap.append(toc);

  const doc = el("div", { class: "about-doc" });
  wrap.append(doc);

  // --- 1. Fitts의 법칙 (+ 인터랙티브 위젯) ---
  const s1 = section("fitts", "about.s1Title", ...paras("about.s1p1", "about.s1p2"));
  const widgetHost = el("div", { class: "about-widget-host" });
  s1.append(widgetHost);
  const widget = new FittsWidget({ host: widgetHost, reducedMotion: ctx.reducedMotion() });
  ctx.addCleanup(() => widget.destroy());
  s1.append(el("p", { class: "small muted" }, t("about.s1p3")));
  doc.append(s1);

  // --- 2. ISO 9241-411 태핑 과제 ---
  doc.append(
    section(
      "iso",
      "about.s2Title",
      ...paras("about.s2p1", "about.s2p2"),
      el("figure", { class: "about-ring" }, ringIllustration(), el("figcaption", { class: "small muted" }, t("about.s2caption"))),
    ),
  );

  // --- 3. 왜 '평균'은 실패하나 + 적응 모델 근거 ---
  doc.append(
    section("adapt-model", "about.s3Title", ...paras("about.s3p1", "about.s3p2", "about.s3p3", "about.s3p4")),
  );

  // --- 4. 화면 보정은 왜 하나 ---
  doc.append(section("calibration", "about.s4Title", ...paras("about.s4p1", "about.s4p2")));

  // --- 5. AI도 서버도 없이 어떻게? ---
  doc.append(section("how", "about.s5Title", ...paras("about.s5p1", "about.s5p2")));

  // --- 6. 한계 ---
  doc.append(
    section(
      "limits",
      "about.s6Title",
      ...paras("about.s6p1", "about.s6p2", "about.s6p3"),
      el("p", { class: "about-not-diagnosis" }, t("about.s6notDiagnosis")),
    ),
  );

  // --- 7. 인용 ---
  const cites = el("ul", { class: "about-citations" });
  for (const key of CITED) {
    cites.append(
      el(
        "li",
        {},
        el(
          "a",
          { href: CITATION_URLS[key], target: "_blank", rel: "noopener noreferrer" },
          CITATIONS[key],
        ),
      ),
    );
  }
  doc.append(section("citations", "about.s7Title", el("p", {}, t("about.s7intro")), cites));

  ctx.host.append(wrap);

  // 딥링크(`#/about#adapt-model`)로 들어왔으면 해당 섹션으로. 아니면 제목에 포커스.
  const anchor = routeAnchor();
  if (anchor && SECTIONS.some((s) => s.id === anchor)) {
    scrollToSection(wrap, anchor);
  } else {
    (wrap.querySelector("h1") as HTMLElement).focus();
  }
}

/** 섹션으로 스크롤하고 그 제목에 포커스를 옮긴다 (스크린리더가 위치를 알도록). */
function scrollToSection(root: HTMLElement, id: string): void {
  const heading = root.querySelector<HTMLElement>(`[id="${id}-h"]`);
  const target = root.querySelector<HTMLElement>(`[id="${id}"]`);
  (target ?? heading)?.scrollIntoView();
  heading?.focus();
}
