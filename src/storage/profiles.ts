/**
 * 영속성 계층 (brief-3A Phase 1 · 스펙 §7).
 *
 * `localStorage` 에 프로파일 배열과 사용자 설정을 담는다. 규칙:
 * - 모든 read/write 는 `try/catch`. 실패해도 **세션 메모리로 계속 동작**하고
 *   눈에 보이는 배지를 띄운다(`isStorageDegraded()`).
 * - 쿼터 초과 시: 가장 오래된 프로파일 삭제 후 1회 재시도 → 그래도 실패면 메모리.
 * - 로드할 때 항상 `migrateProfile()` 을 통과시킨다(스키마 v1 → v2 …).
 * - 서버 전송 일절 없음. export 만 있고 import 는 3A 범위 밖.
 */
import { migrateProfile } from "../core/migrate";
import type { Profile } from "../core/types";

const KEY_PREFIX = "ganeum.";
const K_PROFILES = "ganeum.profiles";
const K_LAST = "ganeum.lastProfileId";
const K_PREFS = "ganeum.prefs";

/** 프로파일 배열 상한 (brief-3A §6). 초과 시 가장 오래된 것부터 삭제. */
export const MAX_PROFILES = 20;

export type ThemeChoice = "system" | "light" | "dark";
export type LocaleChoice = "ko" | "en";

/** `ganeum.prefs` 의 고정 형태 (brief-3A Phase 1). */
export interface Prefs {
  theme: ThemeChoice;
  locale: LocaleChoice;
  sound: boolean;
  /** OS reduced-motion 설정을 사용자가 덮어썼는지. null = OS 설정 따름. */
  reducedMotionOverride: boolean | null;
}

export const DEFAULT_PREFS: Prefs = {
  theme: "system",
  locale: "ko",
  sound: true,
  reducedMotionOverride: null,
};

export interface StorageResult {
  ok: boolean;
  /** localStorage 를 못 써서 세션 메모리로만 동작 중. */
  degraded: boolean;
}

/** import 대비 안정 계약 (스펙 §7 / docs/profile-format.md). */
export interface ProfileExport {
  format: "ganeum-profile";
  version: 1;
  profile: Profile;
}

// --- 저장소 접근 (localStorage 없으면 메모리 폴백) --------------------------

const memory = new Map<string, string>();
let degraded = false;

/** localStorage 를 못 쓰거나 쿼터로 밀려나 메모리로만 동작 중인가. UI 배지용. */
export function isStorageDegraded(): boolean {
  return degraded;
}

function ls(): Storage | null {
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null;
  }
}

function getItem(key: string): string | null {
  const store = ls();
  if (store) {
    try {
      const v = store.getItem(key);
      if (v !== null) return v;
    } catch {
      /* 메모리로 폴백 */
    }
  }
  return memory.get(key) ?? null;
}

/** 단일 키 write. 실패(쿼터/차단)면 false + degraded. */
function setItem(key: string, value: string): boolean {
  memory.set(key, value);
  const store = ls();
  if (!store) {
    degraded = true;
    return false;
  }
  try {
    store.setItem(key, value);
    return true;
  } catch {
    degraded = true;
    return false;
  }
}

// --- 프로파일 -------------------------------------------------------------

function byId(a: Profile, b: Profile): number {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** 저장된 프로파일 전체 — 마이그레이션 통과, 손상 항목은 조용히 스킵, 생성순 정렬. */
export function loadProfiles(): Profile[] {
  const raw = getItem(K_PROFILES);
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const out: Profile[] = [];
  for (const item of parsed) {
    try {
      out.push(migrateProfile(item));
    } catch {
      /* 손상됐거나 미래 스키마 — 건너뛴다 */
    }
  }
  return out.sort(byId);
}

export function getProfile(id: string): Profile | null {
  return loadProfiles().find((p) => p.id === id) ?? null;
}

export function getLastProfileId(): string | null {
  return getItem(K_LAST);
}

function writeProfileList(list: Profile[]): boolean {
  const payload = JSON.stringify(list);
  memory.set(K_PROFILES, payload);
  const store = ls();
  if (!store) {
    degraded = true;
    return false;
  }
  try {
    store.setItem(K_PROFILES, payload);
    return true;
  } catch {
    return false; // 쿼터 추정 — 호출부가 트리밍 후 재시도
  }
}

/**
 * 프로파일 저장. 같은 id 는 덮어쓴다. 상한 초과분과 (쿼터 시) 가장 오래된 것을 버린다.
 * 어느 경우에도 세션 메모리에는 남으므로 앱은 계속 동작한다.
 */
export function saveProfile(profile: Profile): StorageResult {
  let list = loadProfiles().filter((p) => p.id !== profile.id);
  list.push(profile);
  list.sort(byId);
  if (list.length > MAX_PROFILES) list = list.slice(list.length - MAX_PROFILES);

  if (writeProfileList(list)) {
    setItem(K_LAST, profile.id);
    return { ok: true, degraded };
  }

  // 쿼터 초과 추정: 가장 오래된 것 삭제 후 1회 재시도.
  if (list.length > 1) {
    const trimmed = list.slice(1);
    if (writeProfileList(trimmed)) {
      setItem(K_LAST, profile.id);
      return { ok: true, degraded };
    }
  }

  degraded = true;
  memory.set(K_LAST, profile.id);
  return { ok: false, degraded: true };
}

/** "내 데이터 전부 삭제" — 모든 `ganeum.*` 키 제거 (localStorage + 메모리). */
export function deleteAllData(): void {
  memory.clear();
  degraded = false;
  const store = ls();
  if (!store) return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < store.length; i++) {
      const k = store.key(i);
      if (k && k.startsWith(KEY_PREFIX)) keys.push(k);
    }
    for (const k of keys) store.removeItem(k);
  } catch {
    /* ignore */
  }
}

// --- 설정 ---------------------------------------------------------------

export function loadPrefs(): Prefs {
  const raw = getItem(K_PREFS);
  if (!raw) return { ...DEFAULT_PREFS };
  try {
    const obj = JSON.parse(raw) as Partial<Prefs>;
    return {
      theme:
        obj.theme === "light" || obj.theme === "dark" || obj.theme === "system"
          ? obj.theme
          : DEFAULT_PREFS.theme,
      locale: obj.locale === "en" || obj.locale === "ko" ? obj.locale : DEFAULT_PREFS.locale,
      sound: typeof obj.sound === "boolean" ? obj.sound : DEFAULT_PREFS.sound,
      reducedMotionOverride:
        obj.reducedMotionOverride === true || obj.reducedMotionOverride === false
          ? obj.reducedMotionOverride
          : null,
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function savePrefs(patch: Partial<Prefs>): Prefs {
  const next: Prefs = { ...loadPrefs(), ...patch };
  setItem(K_PREFS, JSON.stringify(next));
  return next;
}

// --- 내보내기 ----------------------------------------------------------

export function toProfileExport(profile: Profile): ProfileExport {
  return { format: "ganeum-profile", version: 1, profile };
}

export function exportProfileJSON(profile: Profile): string {
  return JSON.stringify(toProfileExport(profile), null, 2);
}

/** 테스트 전용: 메모리 폴백 상태 리셋. */
export function __resetStorageForTests(): void {
  memory.clear();
  degraded = false;
}
