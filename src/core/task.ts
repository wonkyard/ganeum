/**
 * ISO 9241-411 다방향(원형) 태핑 과제의 기하 + 조건 설계.
 *
 * - 원주 위 N개(기본 11, 홀수) 타깃.
 * - 순서는 지름을 가로지르는 criss-cross: 인덱스 k 번째로 방문하는 타깃은
 *     (k · (N+1)/2) mod N        (N 이 홀수라 모든 타깃을 정확히 한 번 방문)
 * - 첫 탭(0→1)은 워밍업으로 버린다 — 이 규칙은 분석 단계에서 적용.
 */
import { indexOfDifficulty } from "./fitts";
import { conditionId } from "./ids";
import type { MeasureMode, PointerKind } from "./types";

export interface Point {
  x: number;
  y: number;
}

export interface TargetLayout {
  /** 화면에 그릴 순서(원주 인덱스). length === count. */
  order: number[];
  /** 원주 인덱스 → 좌표. */
  positions: Point[];
  center: Point;
  /** 원 배열의 반지름 = 진폭 A 의 절반. */
  radius: number;
  /** 타깃 지름 W (px). */
  width: number;
  count: number;
}

export interface LayoutOptions {
  center: Point;
  /** 진폭 A = 마주 보는 두 타깃 사이 거리 = 원 지름. */
  amplitude: number;
  width: number;
  count?: number;
  /** 첫 타깃의 각도(라디안). 기본 -90° = 12시 방향. */
  startAngle?: number;
}

export function crissCrossOrder(count: number): number[] {
  if (count < 3 || count % 2 === 0) {
    throw new RangeError("타깃 개수는 3 이상의 홀수여야 합니다");
  }
  const step = (count + 1) / 2;
  const order: number[] = [];
  for (let k = 0; k < count; k++) {
    order.push((k * step) % count);
  }
  return order;
}

export function generateTargetLayout(opts: LayoutOptions): TargetLayout {
  const count = opts.count ?? 11;
  const startAngle = opts.startAngle ?? -Math.PI / 2;
  const radius = opts.amplitude / 2;

  const positions: Point[] = [];
  for (let i = 0; i < count; i++) {
    const angle = startAngle + (i * 2 * Math.PI) / count;
    positions.push({
      x: opts.center.x + radius * Math.cos(angle),
      y: opts.center.y + radius * Math.sin(angle),
    });
  }

  return {
    order: crissCrossOrder(count),
    positions,
    center: { ...opts.center },
    radius,
    width: opts.width,
    count,
  };
}

export interface ConditionSpec {
  id: string;
  A: number;
  W: number;
  ID: number;
}

/** WCAG 2.5.8 최소 히트 크기 (CSS px). touch 조건의 너비 바닥값 (brief-3A §6). */
export const TOUCH_MIN_HIT_PX = 24;
/** mouse 조건의 너비 바닥값 (계기 정밀도용, 손가락 아님). */
const MOUSE_MIN_HIT_PX = 6;

/**
 * 조건 설계 (스펙 §4.3 + brief-3A P0-7 포인터 타입 분기).
 * `reference` = 배치 계산의 기준 길이(보정값이 있으면 mm 기준 px, 없으면 정사각 변 × 0.8).
 *
 * - quick(mouse): 3쌍, ID ≈ 5 / 3.5 / 2.5.
 * - quick(touch): W 바닥값 ≥ 24 CSS px. 상단 ID 는 낮아도 수용(손가락으로 2mm 타깃은
 *   못 맞힘 → 재시도 폭주 → 조건 안 끝남). 가장 어려운 조건은 UI 에서 "일부러 어렵습니다".
 * - precise: A ∈ {0.3, 0.5, 0.7}·R  ×  W ∈ {1, 2, 4}·Wmin  → 9 조건 (3B).
 */
export function designConditions(
  mode: MeasureMode,
  reference: number,
  pointerType: PointerKind = "mouse",
): ConditionSpec[] {
  let specs: Array<{ A: number; W: number }>;

  if (mode === "quick" && pointerType === "touch") {
    specs = [
      { A: 0.82 * reference, W: Math.max(TOUCH_MIN_HIT_PX, 0.05 * reference) },
      { A: 0.52 * reference, W: Math.max(TOUCH_MIN_HIT_PX + 4, 0.09 * reference) },
      { A: 0.3 * reference, W: Math.max(TOUCH_MIN_HIT_PX + 16, 0.16 * reference) },
    ];
  } else if (mode === "quick") {
    specs = [
      { A: 0.8 * reference, W: Math.max(MOUSE_MIN_HIT_PX, 0.026 * reference) },
      { A: 0.5 * reference, W: Math.max(MOUSE_MIN_HIT_PX, 0.0485 * reference) },
      { A: 0.3 * reference, W: Math.max(MOUSE_MIN_HIT_PX, 0.064 * reference) },
    ];
  } else {
    const minHit = pointerType === "touch" ? TOUCH_MIN_HIT_PX : 12;
    specs = crossProduct([0.3, 0.5, 0.7], [1, 2, 4]).map(([af, wf]) => ({
      A: af * reference,
      W: Math.max(minHit, wf * minHit),
    }));
  }

  return specs.map(({ A, W }) => ({
    id: conditionId(A, W),
    A,
    W,
    ID: indexOfDifficulty(A, W),
  }));
}

function crossProduct<A, B>(as: A[], bs: B[]): Array<[A, B]> {
  const out: Array<[A, B]> = [];
  for (const a of as) for (const b of bs) out.push([a, b]);
  return out;
}
