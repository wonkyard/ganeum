/**
 * `ResultCard` — S5 결과 카드. Canvas 1080×1350 세로 → PNG 다운로드 (screen-design S5).
 *
 * - `await document.fonts.ready` 후 렌더 (자가 호스팅 폰트 정책, brief-3A J9).
 * - iOS Safari 는 `<a download>` 가 무시되므로 인라인 `<img>` + "길게 눌러 저장" 힌트.
 * - "참고용 · 진단 아님" 을 카드에 새긴다 (brief-3A S3/S5).
 */
import { el } from "../ui/dom";
import { t, formatNumber, formatDate } from "../i18n";
import type { Hand, PointerKind } from "../core/types";

export interface ResultCardData {
  /** 유효 처리율 (bits/s). */
  throughput: number;
  /** `MT = a + b·ID`, a/b 초 단위. */
  fit: { a: number; b: number; r2: number };
  /** 조건별 (ID, 평균 MT[초]). */
  points: Array<{ id: number; mt: number }>;
  errorRate: number;
  /** 조건 내 MT SD 평균 (초). */
  consistencySD: number;
  hand: Hand;
  pointerType: PointerKind;
  createdAt: string;
  /** We 를 실측 못 함 → "측정 불안정". */
  unstable: boolean;
}

const W = 1080;
const H = 1350;

export class ResultCard {
  readonly element: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly data: ResultCardData;
  private readonly hint: HTMLElement;

  constructor(data: ResultCardData) {
    this.data = data;
    this.canvas = document.createElement("canvas");
    this.canvas.width = W;
    this.canvas.height = H;
    this.canvas.className = "result-card-canvas";
    this.canvas.setAttribute("role", "img");
    this.canvas.setAttribute(
      "aria-label",
      `${t("card.throughputLabel")} ${formatNumber(data.throughput, { maximumFractionDigits: 2 })} ${t("unit.bitsPerSecond")}`,
    );

    this.hint = el("p", { class: "small muted", hidden: true }, t("card.longPressHint"));

    const download = el(
      "button",
      { type: "button", class: "btn-primary" },
      t("card.download"),
    );
    download.addEventListener("click", () => void this.download());

    this.element = el(
      "div",
      { class: "result-card" },
      el("div", { class: "result-card-frame" }, this.canvas),
      download,
      this.hint,
    );

    void this.render();
  }

  private async render(): Promise<void> {
    try {
      if (typeof document !== "undefined" && document.fonts?.ready) {
        await document.fonts.ready;
      }
    } catch {
      /* 폰트가 준비 안 돼도 시스템 폰트로 렌더 */
    }
    const ctx = this.canvas.getContext("2d");
    if (!ctx) return;
    this.paint(ctx);
  }

  private paint(ctx: CanvasRenderingContext2D): void {
    const d = this.data;
    const styles = typeof getComputedStyle === "function" ? getComputedStyle(document.documentElement) : null;
    const bg = styles?.getPropertyValue("--bg-layer").trim() || "#ffffff";
    const ink = styles?.getPropertyValue("--text").trim() || "#1b1d21";
    const muted = styles?.getPropertyValue("--text-muted").trim() || "#5c5f66";
    const accent = styles?.getPropertyValue("--accent").trim() || "#0e7c86";
    const bodyFont =
      styles?.getPropertyValue("--font-body").trim() || "system-ui, sans-serif";
    const monoFont = styles?.getPropertyValue("--font-mono").trim() || "ui-monospace, monospace";

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = accent;
    ctx.font = `600 44px ${bodyFont}`;
    ctx.textBaseline = "top";
    ctx.fillText(`● ${t("app.title")}`, 80, 80);

    // 처리율 (대형 숫자).
    ctx.fillStyle = muted;
    ctx.font = `28px ${bodyFont}`;
    ctx.fillText(t("card.throughputLabel"), 80, 200);
    ctx.fillStyle = ink;
    ctx.font = `700 132px ${monoFont}`;
    ctx.fillText(formatNumber(d.throughput, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 80, 236);
    ctx.font = `32px ${bodyFont}`;
    ctx.fillStyle = muted;
    ctx.fillText(t("unit.bitsPerSecond"), 80, 392);

    // 미니 회귀선.
    this.paintMiniChart(ctx, 80, 470, W - 160, 360, { ink, muted, accent, monoFont });

    // 수식.
    ctx.fillStyle = ink;
    ctx.font = `30px ${monoFont}`;
    const a = formatNumber(d.fit.a * 1000, { maximumFractionDigits: 0 });
    const b = formatNumber(d.fit.b * 1000, { maximumFractionDigits: 0 });
    ctx.fillText(t("result.regression", { a, b }), 80, 880);

    // 보조 수치.
    ctx.font = `30px ${bodyFont}`;
    ctx.fillStyle = muted;
    const acc = formatNumber((1 - d.errorRate) * 100, { maximumFractionDigits: 0 });
    const cons = formatNumber(d.consistencySD * 1000, { maximumFractionDigits: 0 });
    const handLabel = d.hand === "right" ? t("result.handRight") : t("result.handLeft");
    ctx.fillText(
      `${t("card.accuracyLabel")} ${acc}%   ·   ${t("card.consistencyLabel")} ±${cons}${t("unit.ms")}`,
      80,
      950,
    );
    ctx.fillText(
      `${formatDate(d.createdAt)}   ·   ${d.pointerType}   ·   ${handLabel}${d.unstable ? "   ·   " + t("result.unstable") : ""}`,
      80,
      1000,
    );

    // 푸터 + 고지.
    ctx.fillStyle = ink;
    ctx.font = `600 30px ${bodyFont}`;
    ctx.fillText(t("card.footer"), 80, H - 140);
    ctx.fillStyle = muted;
    ctx.font = `26px ${bodyFont}`;
    ctx.fillText(t("card.disclaimer"), 80, H - 96);
  }

  private paintMiniChart(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    c: { ink: string; muted: string; accent: string; monoFont: string },
  ): void {
    const d = this.data;
    const mtsMs = d.points.map((p) => p.mt * 1000);
    const maxId = d.points.reduce((m, p) => Math.max(m, p.id), 0);
    const maxMt = mtsMs.reduce((m, v) => Math.max(m, v), 0);
    const xMax = Math.max(5, Math.ceil(maxId));
    const yMax = maxMt > 0 ? 1.15 * maxMt : 1;
    const px = (id: number): number => x + (id / xMax) * w;
    const py = (ms: number): number => y + h - (ms / yMax) * h;

    ctx.strokeStyle = c.muted;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x + w, y + h);
    ctx.stroke();

    ctx.strokeStyle = c.accent;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(px(0), py(Math.min(yMax, Math.max(0, d.fit.a * 1000))));
    ctx.lineTo(px(xMax), py(Math.min(yMax, Math.max(0, (d.fit.a + d.fit.b * xMax) * 1000))));
    ctx.stroke();

    ctx.fillStyle = c.ink;
    for (const p of d.points) {
      ctx.beginPath();
      ctx.arc(px(p.id), py(p.mt * 1000), 7, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private canDownload(): boolean {
    if (typeof navigator === "undefined") return true;
    const ua = navigator.userAgent || "";
    const iOS = /iP(hone|ad|od)/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    return !iOS;
  }

  async download(): Promise<void> {
    await this.render();
    const filename = `ganeum-card-${this.data.createdAt.slice(0, 10)}.png`;
    const blob = await new Promise<Blob | null>((resolve) =>
      this.canvas.toBlob((b) => resolve(b), "image/png"),
    );
    if (!blob) return;

    if (!this.canDownload()) {
      // iOS: 캔버스를 인라인 이미지로 두고 길게 눌러 저장하도록 안내.
      this.hint.hidden = false;
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = el("a", { href: url, download: filename });
    document.body.append(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
