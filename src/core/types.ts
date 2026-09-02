/**
 * `src/core/` 전역에서 쓰는 타입. 프레임워크 무관 — DOM 타입을 참조하지 않는다.
 * 저장 포맷(Profile)은 스펙 §7 을 따르며 스키마 버전이 붙는다.
 */

export type SchemaVersion = 1;
export const CURRENT_SCHEMA: SchemaVersion = 1;

export type PointerKind = "mouse" | "touch" | "pen";
export type Hand = "right" | "left";
export type MeasureMode = "quick" | "precise";

/** 한 번의 탭 기록. dx/dy 는 타깃 중심 기준 착지 오차(px). */
export interface Tap {
  /** 이동시간(초): 이전 타깃을 뗀 순간 → 이번 타깃을 누른 순간. */
  mt: number;
  dx: number;
  dy: number;
  /** 타깃 밖에 떨어졌으면 true. */
  error: boolean;
}

/** (진폭 A, 너비 W) 한 쌍 = 한 조건. A, W 는 px. */
export interface Condition {
  A: number;
  W: number;
  /** ID = log2(A / W + 1) — 생성 시 채워 두지만 core/fitts 로 재계산 가능. */
  ID: number;
  taps: Tap[];
}

export interface FittsFit {
  /** 절편 a (초). */
  a: number;
  /** 기울기 b (초/bit). */
  b: number;
  /** 결정계수. */
  r2: number;
}

export interface Profile {
  schema: SchemaVersion;
  id: string;
  createdAt: string;
  pointerType: PointerKind;
  hand: Hand;
  mode: MeasureMode;
  calibrated: boolean;
  viewport: { w: number; h: number; dpr: number; pxPerMm: number | null };
  conditions: Condition[];
  fitts: FittsFit;
  /** 유효 처리율 (bits/s). */
  throughput: number;
  errorRate: number;
  consistencySD: number;
  asymmetry: number | null;
}
