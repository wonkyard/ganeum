/**
 * S2 측정 과제 (챔버) — Canvas 2D.
 *
 * 원형 배열 타깃을 그리고, 다음 타깃만 강조·맥동시킨다. Pointer Events 로 히트/미스를
 * 판정하고, criss-cross 순서로 진행한다. 커서 궤적은 `getCoalescedEvents` 로 옅게 남긴다.
 *
 * core 는 순수 함수만 두고, DOM/Canvas 접촉은 전부 이 render 레이어에 격리한다.
 */
import type { Point, TargetLayout } from "../core/task";

export interface RawTap {
  /** 직전 pointerdown 이후 경과(초). 첫 탭은 분석 단계에서 워밍업으로 버린다. */
  mt: number;
  /** 타깃 중심 기준 착지 오차(CSS px). */
  dx: number;
  dy: number;
  error: boolean;
  pointerType: string;
  targetIndex: number;
}

export interface TargetFieldOptions {
  canvas: HTMLCanvasElement;
  layout: TargetLayout;
  reducedMotion?: boolean;
  onTap?: (tap: RawTap) => void;
  onComplete: (taps: RawTap[]) => void;
  /** 시간 소스 주입(테스트용). 기본 performance.now. */
  now?: () => number;
}

const TRAIL_MAX = 48;

export class TargetField {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly layout: TargetLayout;
  private readonly reducedMotion: boolean;
  private readonly now: () => number;
  private readonly onTap?: (tap: RawTap) => void;
  private readonly onComplete: (taps: RawTap[]) => void;

  private seqPos = 0;
  private taps: RawTap[] = [];
  private lastEventTime: number;
  private trail: Point[] = [];
  private rafId = 0;
  private startTime: number;
  private finished = false;

  constructor(opts: TargetFieldOptions) {
    const ctx = opts.canvas.getContext("2d");
    if (!ctx) throw new Error("2D 캔버스 컨텍스트를 만들 수 없습니다");
    this.canvas = opts.canvas;
    this.ctx = ctx;
    this.layout = opts.layout;
    this.reducedMotion = opts.reducedMotion ?? false;
    this.now = opts.now ?? (() => performance.now());
    this.onTap = opts.onTap;
    this.onComplete = opts.onComplete;
    this.startTime = this.now();
    this.lastEventTime = this.startTime;

    this.canvas.style.touchAction = "none";
    this.canvas.addEventListener("pointerdown", this.handlePointerDown);
    this.canvas.addEventListener("pointermove", this.handlePointerMove);
    this.canvas.addEventListener("contextmenu", this.preventDefault);
    this.resize();
    this.loop();
  }

  /** 현재(다음에 눌러야 할) 타깃의 원주 인덱스. */
  get currentTargetIndex(): number {
    return this.layout.order[this.seqPos] ?? -1;
  }

  private get currentTarget(): Point | null {
    const idx = this.currentTargetIndex;
    return idx < 0 ? null : this.layout.positions[idx];
  }

  /** DPR 을 반영해 백버퍼 크기를 맞춘다. 레이아웃 좌표는 CSS px 기준. */
  resize(): void {
    const dpr = (typeof window !== "undefined" && window.devicePixelRatio) || 1;
    const rect = this.canvas.getBoundingClientRect();
    const cssW = rect.width || this.canvas.clientWidth || this.canvas.width;
    const cssH = rect.height || this.canvas.clientHeight || this.canvas.height;
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  destroy(): void {
    this.canvas.removeEventListener("pointerdown", this.handlePointerDown);
    this.canvas.removeEventListener("pointermove", this.handlePointerMove);
    this.canvas.removeEventListener("contextmenu", this.preventDefault);
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }

  /** 테스트/자동화용: 현재 타깃 중심을 정확히 눌렀다고 가정하고 한 탭 진행. */
  tapCurrentTarget(pointerType = "mouse"): void {
    const target = this.currentTarget;
    if (!target) return;
    this.registerTap(target.x, target.y, pointerType);
  }

  private preventDefault = (event: Event): void => event.preventDefault();

  private toLocal(event: PointerEvent): Point {
    const rect = this.canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  private handlePointerMove = (event: PointerEvent): void => {
    if (this.finished) return;
    const events =
      typeof event.getCoalescedEvents === "function" ? event.getCoalescedEvents() : [event];
    for (const e of events.length ? events : [event]) {
      this.trail.push(this.toLocal(e));
    }
    if (this.trail.length > TRAIL_MAX) this.trail.splice(0, this.trail.length - TRAIL_MAX);
  };

  private handlePointerDown = (event: PointerEvent): void => {
    if (this.finished) return;
    if (event.button !== 0 && event.pointerType === "mouse") return; // 우클릭 등 무시
    event.preventDefault();
    const { x, y } = this.toLocal(event);
    this.registerTap(x, y, event.pointerType || "mouse");
  };

  private registerTap(x: number, y: number, pointerType: string): void {
    const target = this.currentTarget;
    if (!target || this.finished) return;

    const t = this.now();
    const dx = x - target.x;
    const dy = y - target.y;
    const dist = Math.hypot(dx, dy);
    const hit = dist <= this.layout.width / 2;

    const tap: RawTap = {
      mt: (t - this.lastEventTime) / 1000,
      dx,
      dy,
      error: !hit,
      pointerType,
      targetIndex: this.currentTargetIndex,
    };
    this.lastEventTime = t;
    this.taps.push(tap);
    this.onTap?.(tap);

    if (hit) {
      this.trail = [];
      this.seqPos += 1;
      if (this.seqPos >= this.layout.order.length) {
        this.finished = true;
        if (this.rafId) cancelAnimationFrame(this.rafId);
        this.onComplete(this.taps);
      }
    }
  }

  private loop = (): void => {
    this.draw();
    if (!this.finished) this.rafId = requestAnimationFrame(this.loop);
  };

  private draw(): void {
    const { ctx, layout } = this;
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width || this.canvas.clientWidth || this.canvas.width;
    const h = rect.height || this.canvas.clientHeight || this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    // 궤적 트레일 (옅게, 최근일수록 진하게).
    if (this.trail.length > 1) {
      for (let i = 1; i < this.trail.length; i++) {
        const a = this.trail[i - 1];
        const b = this.trail[i];
        ctx.strokeStyle = `rgba(120, 200, 205, ${(i / this.trail.length) * 0.5})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }

    const currentIdx = this.currentTargetIndex;
    const pulse =
      this.reducedMotion || currentIdx < 0
        ? 1
        : 0.85 + 0.15 * Math.sin((this.now() - this.startTime) / 159); // ~1Hz

    for (let i = 0; i < layout.positions.length; i++) {
      const p = layout.positions[i];
      const isCurrent = i === currentIdx;
      const r = (layout.width / 2) * (isCurrent ? pulse : 1);
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      if (isCurrent) {
        ctx.fillStyle = "#4fd1c5";
        ctx.fill();
      } else {
        ctx.strokeStyle = "rgba(237, 236, 232, 0.35)";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  }
}
