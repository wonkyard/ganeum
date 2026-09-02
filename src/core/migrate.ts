/**
 * 스키마 마이그레이션 (스펙 §7 + brief-3A P0-8).
 *
 * 10주간 저장 포맷이 반복해서 바뀔 것을 전제로, 저장된 프로파일을 읽을 때
 * 항상 이 함수를 통과시킨다. 버전이 없거나(초기 릴리스 이전 데이터) 낮으면
 * 단계별 업그레이드하고, 미래 버전이면 건드리지 않고 예외를 던진다(호출부에서
 * "이 데이터는 더 새 버전에서 만들어졌습니다" 안내).
 *
 * 저장 계층(`src/storage/profiles.ts`)이 로드할 때마다 실제로 이 함수를 호출한다.
 */
import { CURRENT_SCHEMA, type Profile } from "./types";
import { newProfileId } from "./ids";
import { pooledEffectiveWidth } from "./throughput";

type AnyRecord = Record<string, unknown>;

export class FutureSchemaError extends Error {
  constructor(public readonly found: number) {
    super(`저장된 스키마 버전 ${found} 은 이 앱(${CURRENT_SCHEMA})보다 새롭습니다`);
    this.name = "FutureSchemaError";
  }
}

function num(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

/**
 * v1 taps 에서 We 를 재계산 시도. v1 은 `devAxis` 가 없으므로 `dx` 를 근사로 쓴다
 * (brief-3A P0-1 이전의 저장값은 어차피 축/직교가 섞여 있었다). 표본이 부족하면
 * `nominal-fallback`.
 */
function recomputeWe(conditions: unknown): { we: number; weSource: "measured" | "nominal-fallback" } {
  if (!Array.isArray(conditions)) return { we: 0, weSource: "nominal-fallback" };
  const byCondition: number[][] = [];
  for (const c of conditions) {
    const taps = (c as AnyRecord)?.taps;
    if (!Array.isArray(taps)) continue;
    // 첫 탭(워밍업) 제외.
    byCondition.push(
      taps.slice(1).map((t) => num((t as AnyRecord).devAxis, num((t as AnyRecord).dx, 0))),
    );
  }
  const pooled = pooledEffectiveWidth(byCondition);
  return { we: pooled.we, weSource: pooled.source };
}

/** v1 조건/탭에 v2 필드(`devAxis`, `devOrtho`, `displayedA`, `Ae`)를 채운다. */
function upgradeConditions(conditions: unknown): AnyRecord[] {
  if (!Array.isArray(conditions)) return [];
  return conditions.map((c) => {
    const cond = { ...(c as AnyRecord) };
    const A = num(cond.A, 0);
    if (typeof cond.displayedA !== "number") cond.displayedA = A;
    if (typeof cond.Ae !== "number") cond.Ae = A;
    const taps = Array.isArray(cond.taps) ? cond.taps : [];
    cond.taps = taps.map((t) => {
      const tap = { ...(t as AnyRecord) };
      const dx = num(tap.dx, 0);
      const dy = num(tap.dy, 0);
      if (typeof tap.devAxis !== "number") tap.devAxis = dx;
      if (typeof tap.devOrtho !== "number") tap.devOrtho = dy;
      return tap;
    });
    return cond;
  });
}

/** 단계별 업그레이더. key = 시작 버전, 값 = 그 버전 → 다음 버전 변환. */
const STEPS: Record<number, (raw: AnyRecord) => AnyRecord> = {
  // v0(버전 필드 없음) → v1: 필드 기본값 채우기.
  0: (raw) => ({
    ...raw,
    schema: 1,
    id: typeof raw.id === "string" ? raw.id : newProfileId(),
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : new Date(0).toISOString(),
    pointerType: raw.pointerType ?? "mouse",
    hand: raw.hand ?? "right",
    mode: raw.mode ?? "quick",
    calibrated: Boolean(raw.calibrated),
    viewport: raw.viewport ?? { w: 0, h: 0, dpr: 1, pxPerMm: null },
    conditions: Array.isArray(raw.conditions) ? raw.conditions : [],
    fitts: raw.fitts ?? { a: 0, b: 0, r2: 0 },
    throughput: num(raw.throughput, 0),
    errorRate: num(raw.errorRate, 0),
    consistencySD: num(raw.consistencySD, 0),
    asymmetry: typeof raw.asymmetry === "number" ? raw.asymmetry : null,
  }),
  // v1 → v2 (brief-3A P0-8): 축투영 오차 · We · 세션/버전 필드.
  1: (raw) => {
    const { we, weSource } = recomputeWe(raw.conditions);
    return {
      ...raw,
      schema: 2,
      sessionId: typeof raw.sessionId === "string" ? raw.sessionId : String(raw.id ?? newProfileId()),
      appVersion: typeof raw.appVersion === "string" ? raw.appVersion : "unknown",
      conditions: upgradeConditions(raw.conditions),
      we: typeof raw.we === "number" ? raw.we : we,
      weSource:
        raw.weSource === "measured" || raw.weSource === "nominal-fallback" ? raw.weSource : weSource,
    };
  },
};

export function migrateProfile(input: unknown): Profile {
  if (input === null || typeof input !== "object") {
    throw new TypeError("프로파일은 객체여야 합니다");
  }
  let raw = { ...(input as AnyRecord) };
  let version = typeof raw.schema === "number" ? raw.schema : 0;

  if (version > CURRENT_SCHEMA) throw new FutureSchemaError(version);

  while (version < CURRENT_SCHEMA) {
    const step = STEPS[version];
    if (!step) throw new Error(`스키마 ${version} → ${version + 1} 마이그레이션이 없습니다`);
    raw = step(raw);
    version = typeof raw.schema === "number" ? raw.schema : version + 1;
  }

  return raw as unknown as Profile;
}

export function needsMigration(input: unknown): boolean {
  if (input === null || typeof input !== "object") return false;
  const v = (input as AnyRecord).schema;
  return typeof v !== "number" || v < CURRENT_SCHEMA;
}
