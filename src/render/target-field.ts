/**
 * S2 측정 과제 (챔버) — Canvas 2D.
 *
 * 원형 배열 타깃을 그리고, 다음 타깃만 강조·맥동시킨다. Pointer Events 로 히트/미스를
 * 판정하고, criss-cross 순서로 진행한다. 커서 궤적은 `getCoalescedEvents` 로 옅게 남긴다.
 *
 * core 는 순수 함수만 두고, DOM/Canvas 접촉은 전부 이 render 레이어에 격리한다.
 *
 * ## 좌표계 단일 소스 (주 1–2 반려 수정)
 * 캔버스가 그리기·히트판정에 쓰는 좌표계와 화면에 실제로 표시되는 CSS 박스는 **항상
 * 같아야** 한다. 그래서 크기의 단일 소스는 이 클래스다: 컨테이너의 실제 CSS 박스를
 * 재서 정사각(`min(가용폭, 가용높이)`)으로 자신을 맞추고, 그 한 값(`size`, CSS px)으로
 * 레이아웃 생성·그리기·히트판정을 모두 한다. `app.ts` 는 별도 크기를 미리 잡지 않는다.
 * DPR 은 백버퍼 픽셀에만 반영한다(`canvas.width = size · dpr`, `setTransform(dpr…)`).
 */
import type { Point, TargetLayout } from "../core/task";

export interface RawTap {
  /**
   * 직전 타깃의 첫 press → 이번 타깃의 첫 press 경과(초). press→press (brief-3A P0-4).
   * 첫 탭은 분석 단계에서 워밍업으로 버린다.
   */
  mt: number;
  /** 타깃 중심 기준 착지 오차(CSS px). */
  dx: number;
  dy: number;
  /** 접근 축(직전 타깃 → 이번 타깃)에 투영한 1차원 오차(CSS px). brief-3A P0-1. */
  devAxis: number;
  /** 접근 축에 직교하는(접선) 오차(CSS px). */
  devOrtho: number;
  /** 착지 지점의 절대 좌표(레이아웃/CSS px). Ae 계산용 (brief-3A P0-3). */
  x: number;
  y: number;
  error: boolean;
  pointerType: string;
  targetIndex: number;
}

export interface TargetFieldOptions {
  canvas: HTMLCanvasElement;
  /**
   * 정사각 크기(CSS px)를 받아 이번 조건의 타깃 레이아웃을 만든다. 크기의 단일
   * 소스는 `TargetField` 이므로 레이아웃도 이 콜백을 통해 그 크기에서 파생한다.
   * 리사이즈/방향전환 시 진행 인덱스(`seqPos`)를 유지한 채 새 크기로 다시 호출된다.
   */
  buildLayout: (size: number) => TargetLayout;
  reducedMotion?: boolean;
  onTap?: (tap: RawTap) => void;
  onComplete: (taps: RawTap[]) => void;
  /** 시간 소스 주입(테스트용). 기본 performance.now. */
  now?: () => number;
}

const TRAIL_MAX = 48;
/** 캔버스 아래로 남길 여백(px) — 세로 가용 공간 계산용. */
const VERTICAL_GUTTER = 16;

export class TargetField {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly buildLayout: (size: number) => TargetLayout;
  private readonly reducedMotion: boolean;
  private readonly now: () => number;
  private readonly onTap?: (tap: RawTap) => void;
  private readonly onComplete: (taps: RawTap[]) => void;

  /** 좌표계의 단일 소스: 현재 정사각 변 길이(CSS px). */
  private size = 0;
  private layout: TargetLayout | null = null;
  private seqPos = 0;
  private taps: RawTap[] = [];
  /** 직전에 맞힌 타깃의 중심 — 접근 축(축투영)의 원점. */
  private prevTargetPos: Point | null = null;
  /** 현재 타깃이 이미 타이밍 기준 press 를 받았는지 (재시도 구분용). */
  private pressedCurrent = false;
  private lastEventTime: number;
  private trail: Point[] = [];
  private rafId = 0;
  private startTime: number;
  private finished = false;
  private initialized = false;
  private destroyed = false;
  private resizeObserver: ResizeObserver | null = null;

  constructor(opts: TargetFieldOptions) {
    const ctx = opts.canvas.getContext("2d");
    if (!ctx) throw new Error("2D 캔버스 컨텍스트를 만들 수 없습니다");
    this.canvas = opts.canvas;
    this.ctx = ctx;
    this.buildLayout = opts.buildLayout;
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

    // 요소가 DOM 에 붙고 CSS 가 적용된 뒤 크기를 잰다. ResizeObserver 가 있으면
    // 초기 콜백이 이 역할을 겸하고, 없으면 window.resize 로 대체한다.
    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(() => this.handleResize());
      this.resizeObserver.observe(this.canvas.parentElement ?? this.canvas);
    } else if (typeof window !== "undefined") {
      window.addEventListener("resize", this.handleResize);
    }
    this.tryInit();
  }

  /** 현재(다음에 눌러야 할) 타깃의 원주 인덱스. */
  get currentTargetIndex(): number {
    return this.layout?.order[this.seqPos] ?? -1;
  }

  private get currentTarget(): Point | null {
    const idx = this.currentTargetIndex;
    if (idx < 0 || !this.layout) return null;
    return this.layout.positions[idx] ?? null;
  }

  /**
   * 현재 타깃 중심의 화면(뷰포트) 좌표. 표시 박스 기준이라, 좌표계가 어긋나면
   * 이 지점을 눌러도 히트판정을 통과하지 못한다 — 자동화 회귀 테스트가 이용한다.
   */
  get currentTargetClientPoint(): Point | null {
    const target = this.currentTarget;
    if (!target) return null;
    const rect = this.canvas.getBoundingClientRect();
    // 표시 박스(rect.width) 대 좌표계(size) 비율. 정상 상태면 1 이고, 좌표계가
    // 어긋나면(예: CSS 가 표시 폭만 줄이면) 1 이 아니라서 이 지점 클릭이 빗나간다.
    // 레이아웃 정보가 없는 환경(rect 0)에서는 1:1 로 둔다.
    const scale = this.size > 0 && rect.width > 0 ? rect.width / this.size : 1;
    return { x: rect.left + target.x * scale, y: rect.top + target.y * scale };
  }

  destroy(): void {
    this.destroyed = true;
    this.canvas.removeEventListener("pointerdown", this.handlePointerDown);
    this.canvas.removeEventListener("pointermove", this.handlePointerMove);
    this.canvas.removeEventListener("contextmenu", this.preventDefault);
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    if (typeof window !== "undefined") {
      window.removeEventListener("resize", this.handleResize);
    }
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }

  /**
   * 테스트/자동화용: 현재 타깃을 표시 좌표로 누른다. 좌표계가 어긋나면 미스가 나
   * 진행이 멈추므로, 좌표계 회귀를 이 훅만으로도 잡을 수 있다.
   */
  tapCurrentTarget(pointerType = "mouse"): void {
    const point = this.currentTargetClientPoint;
    if (!point) return;
    if (typeof PointerEvent === "function") {
      // 실제 pointerdown 을 발생시켜 toLocal()/히트판정을 그대로 태운다.
      this.canvas.dispatchEvent(
        new PointerEvent("pointerdown", {
          clientX: point.x,
          clientY: point.y,
          button: 0,
          pointerType,
          bubbles: true,
          cancelable: true,
        }),
      );
      return;
    }
    // PointerEvent 미구현 환경(jsdom): 표시 좌표를 직접 히트판정에 넘긴다.
    const rect = this.canvas.getBoundingClientRect();
    this.registerTap(point.x - rect.left, point.y - rect.top, pointerType);
  }

  private preventDefault = (event: Event): void => event.preventDefault();

  /** 컨테이너의 실제 CSS 박스에서 정사각 변 길이를 잰다. rect 가 0 이면 0 을 돌려준다. */
  private measureSquare(): number {
    let availW = 0;
    const parent = this.canvas.parentElement;
    if (parent) {
      const cs = getComputedStyle(parent);
      const padX = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
      availW = parent.clientWidth - padX;
    }
    if (availW <= 0) availW = this.canvas.clientWidth;

    // brief-3A P0-9: 안드로이드 주소창이 접히면 innerHeight 가 튄다. visualViewport
    // 를 우선 쓰고(없으면 innerHeight 폴백), 조건 진행 중에는 재적합하지 않는다.
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    const vh = vv?.height ?? (typeof window !== "undefined" ? window.innerHeight : 0);
    const top = this.canvas.getBoundingClientRect().top;
    let availH = vh - top - VERTICAL_GUTTER;
    if (!Number.isFinite(availH) || availH <= 0) availH = availW;

    let size = Math.min(availW, availH);
    if (!Number.isFinite(size) || size <= 0) {
      // 마지막 방어: 뷰포트 최소변(레이아웃 정보가 없는 헤드리스/테스트 환경).
      const vw = typeof window !== "undefined" ? window.innerWidth : 0;
      size = Math.min(vw || 0, vh || 0) || 320;
    }
    return Math.floor(size);
  }

  /** 크기가 잡히면 초기화하고 루프를 시작한다. 아직 0 이면 다음 프레임에 재시도. */
  private tryInit = (): void => {
    if (this.initialized || this.destroyed) return;
    const size = this.measureSquare();
    if (size <= 0) {
      if (typeof requestAnimationFrame === "function") requestAnimationFrame(this.tryInit);
      return;
    }
    this.applySize(size);
    this.initialized = true;
    this.startTime = this.now();
    this.lastEventTime = this.startTime;
    this.loop();
  };

  /** 정사각 크기를 캔버스(표시 + 백버퍼)와 레이아웃에 함께 반영한다. */
  private applySize(size: number): void {
    this.size = size;
    this.canvas.style.width = `${size}px`;
    this.canvas.style.height = `${size}px`;
    const dpr = (typeof window !== "undefined" && window.devicePixelRatio) || 1;
    this.canvas.width = Math.round(size * dpr);
    this.canvas.height = Math.round(size * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // 레이아웃 좌표 = 표시 좌표. 진행 인덱스(seqPos)는 그대로 두고 새 크기로 재생성.
    this.layout = this.buildLayout(size);
  }

  private handleResize = (): void => {
    if (this.destroyed) return;
    if (!this.initialized) {
      this.tryInit();
      return;
    }
    // brief-3A P0-9: 한 조건이 진행되는 동안 정사각 크기를 고정한다. 조건 사이의
    // 재적합은 app.ts 가 조건마다 새 TargetField 를 만들며 자연히 처리한다. 진행 중
    // 리사이즈에 레이아웃을 재생성하면 손가락 밑에서 타깃이 움직인다(안드로이드 URL바).
  };

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
    if (!target || !this.layout || this.finished) return;

    const t = this.now();
    const dx = x - target.x;
    const dy = y - target.y;
    const dist = Math.hypot(dx, dy);
    const hit = dist <= this.layout.width / 2;

    // brief-3A P0-4: 타깃당 첫 press 만 엔드포인트(MT·devAxis·오류)로 기록한다.
    // 재시도 press 는 진행에만 쓰이고 지표를 오염시키지 않는다.
    if (!this.pressedCurrent) {
      this.pressedCurrent = true;
      const mt = (t - this.lastEventTime) / 1000;
      this.lastEventTime = t;

      // brief-3A P0-1: 착지 오차를 접근 축(직전 타깃 → 이번 타깃)에 투영.
      let devAxis = dx;
      let devOrtho = dy;
      const prev = this.prevTargetPos;
      if (prev) {
        const ux = target.x - prev.x;
        const uy = target.y - prev.y;
        const mag = Math.hypot(ux, uy);
        if (mag > 0) {
          const nx = ux / mag;
          const ny = uy / mag;
          devAxis = dx * nx + dy * ny;
          devOrtho = -dx * ny + dy * nx;
        }
      }

      const tap: RawTap = {
        mt,
        dx,
        dy,
        devAxis,
        devOrtho,
        x,
        y,
        error: !hit,
        pointerType,
        targetIndex: this.currentTargetIndex,
      };
      this.taps.push(tap);
      this.onTap?.(tap);
    }

    if (hit) {
      this.trail = [];
      this.prevTargetPos = { x: target.x, y: target.y };
      this.pressedCurrent = false;
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
    if (!this.finished && typeof requestAnimationFrame === "function") {
      this.rafId = requestAnimationFrame(this.loop);
    }
  };

  private draw(): void {
    const { ctx, layout, size } = this;
    if (!layout) return;

    ctx.clearRect(0, 0, size, size);

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
