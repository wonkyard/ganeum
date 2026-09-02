/**
 * `src/core/` 전역에서 쓰는 타입. 프레임워크 무관 — DOM 타입을 참조하지 않는다.
 * 저장 포맷(Profile)은 스펙 §7 + brief-3A §7 을 따르며 스키마 버전이 붙는다.
 */

export type SchemaVersion = 1 | 2;
export const CURRENT_SCHEMA: SchemaVersion = 2;

export type PointerKind = "mouse" | "touch" | "pen";
export type Hand = "right" | "left";
export type MeasureMode = "quick" | "precise";

/** 유효 너비(We)의 출처 — 착지 산포로 실측했는지, 명목 너비로 폴백했는지. */
export type WeSource = "measured" | "nominal-fallback";

/**
 * 한 타깃의 엔드포인트 1개 (brief-3A P0-4: 타깃당 첫 탭만 기록).
 *
 * - `dx`/`dy` — 타깃 중심 기준 착지 오차(px). 카드 시각화·디버그용으로 계속 저장.
 * - `devAxis`/`devOrtho` — 접근 축(직전 타깃 → 이번 타깃)에 투영한 1차원 오차(px).
 *   유효 너비 계산은 `devAxis` 를 쓴다 (brief-3A P0-1). 첫 타깃(직전 타깃 없음)은
 *   워밍업이라 분석에서 제외되므로 `devAxis = dx, devOrtho = dy` 로 둔다.
 */
export interface Tap {
  /** 이동시간(초): 직전 타깃의 첫 press → 이번 타깃의 첫 press (press→press). */
  mt: number;
  dx: number;
  dy: number;
  devAxis: number;
  devOrtho: number;
  /** 이 타깃의 **첫 탭**이 타깃 밖에 떨어졌으면 true. */
  error: boolean;
}

/** (진폭 A, 너비 W) 한 쌍 = 한 조건. 길이는 전부 CSS px. */
export interface Condition {
  /** 명목 진폭(조건 설계값). */
  A: number;
  /** 화면에 실제로 그려진 진폭 (뷰포트 클램프 후). brief-3A P0-3. */
  displayedA: number;
  /** 측정된 실제 이동 거리 평균 (연속 착지점 간 거리). brief-3A P0-3. */
  Ae: number;
  /** 타깃 너비 W (px). */
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
  /** 이 측정이 속한 세션 ID. 3B 양손 대비를 위해 지금부터 채운다(brief-3A P0-8). */
  sessionId: string;
  /** 이 프로파일을 만든 앱 버전 (package.json). */
  appVersion: string;
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
  /** 유효 너비 We (CSS px). brief-3A P0-2. */
  we: number;
  /** We 의 출처. `"nominal-fallback"` 이면 S3 는 "측정 불안정" 표기. */
  weSource: WeSource;
  errorRate: number;
  consistencySD: number;
  asymmetry: number | null;
}
