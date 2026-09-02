/**
 * 스키마 마이그레이션 (스펙 §7).
 *
 * 10주간 저장 포맷이 반복해서 바뀔 것을 전제로, 저장된 프로파일을 읽을 때
 * 항상 이 함수를 통과시킨다. 버전이 없거나(초기 릴리스 이전 데이터) 낮으면
 * 단계별 업그레이드하고, 미래 버전이면 건드리지 않고 예외를 던진다(호출부에서
 * "이 데이터는 더 새 버전에서 만들어졌습니다" 안내).
 */
import { CURRENT_SCHEMA, type Profile } from "./types";
import { newProfileId } from "./ids";

type AnyRecord = Record<string, unknown>;

export class FutureSchemaError extends Error {
  constructor(public readonly found: number) {
    super(`저장된 스키마 버전 ${found} 은 이 앱(${CURRENT_SCHEMA})보다 새롭습니다`);
    this.name = "FutureSchemaError";
  }
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
    throughput: typeof raw.throughput === "number" ? raw.throughput : 0,
    errorRate: typeof raw.errorRate === "number" ? raw.errorRate : 0,
    consistencySD: typeof raw.consistencySD === "number" ? raw.consistencySD : 0,
    asymmetry: typeof raw.asymmetry === "number" ? raw.asymmetry : null,
  }),
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
