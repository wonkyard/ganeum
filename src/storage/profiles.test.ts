// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_PREFS,
  MAX_PROFILES,
  __resetStorageForTests,
  clearCalibration,
  deleteAllData,
  exportProfileJSON,
  isCalibrationStale,
  isStorageDegraded,
  loadCalibration,
  loadPrefs,
  loadProfiles,
  saveCalibration,
  saveProfile,
  savePrefs,
} from "./profiles";
import type { Profile } from "../core/types";

function makeProfile(id: string): Profile {
  return {
    schema: 2,
    id,
    sessionId: id,
    appVersion: "0.0.0-test",
    createdAt: "2026-03-03T00:00:00.000Z",
    pointerType: "mouse",
    hand: "right",
    mode: "quick",
    calibrated: false,
    viewport: { w: 800, h: 600, dpr: 1, pxPerMm: null },
    conditions: [],
    fitts: { a: 0.2, b: 0.1, r2: 0.95 },
    throughput: 4.2,
    we: 30,
    weSource: "measured",
    errorRate: 0.05,
    consistencySD: 0.02,
    asymmetry: null,
  };
}

beforeEach(() => {
  localStorage.clear();
  __resetStorageForTests();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("profiles 저장/로드", () => {
  it("저장 후 로드 라운드트립", () => {
    const r = saveProfile(makeProfile("a1"));
    expect(r).toEqual({ ok: true, degraded: false });
    const list = loadProfiles();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe("a1");
  });

  it("같은 id 는 덮어쓴다", () => {
    saveProfile(makeProfile("a1"));
    const updated = { ...makeProfile("a1"), throughput: 9.9 };
    saveProfile(updated);
    const list = loadProfiles();
    expect(list).toHaveLength(1);
    expect(list[0].throughput).toBe(9.9);
  });

  it("MAX_PROFILES 를 넘으면 가장 오래된 것부터 버린다", () => {
    for (let i = 0; i < MAX_PROFILES + 5; i++) {
      saveProfile(makeProfile(`p${String(i).padStart(3, "0")}`));
    }
    const list = loadProfiles();
    expect(list).toHaveLength(MAX_PROFILES);
    expect(list[0].id).toBe("p005"); // p000..p004 밀려남
  });

  it("로드 시 v1 데이터를 v2 로 마이그레이션", () => {
    const v1 = {
      schema: 1,
      id: "old1",
      createdAt: "2026-01-01T00:00:00.000Z",
      pointerType: "mouse",
      hand: "left",
      mode: "quick",
      calibrated: false,
      viewport: { w: 0, h: 0, dpr: 1, pxPerMm: null },
      conditions: [],
      fitts: { a: 0, b: 0, r2: 0 },
      throughput: 0,
      errorRate: 0,
      consistencySD: 0,
      asymmetry: null,
    };
    localStorage.setItem("ganeum.profiles", JSON.stringify([v1]));
    const list = loadProfiles();
    expect(list).toHaveLength(1);
    expect(list[0].schema).toBe(2);
    expect(list[0].weSource).toBe("nominal-fallback");
    expect(list[0].sessionId).toBe("old1");
  });

  it("손상된 JSON 은 빈 배열", () => {
    localStorage.setItem("ganeum.profiles", "{not json");
    expect(loadProfiles()).toEqual([]);
  });
});

describe("쿼터 처리", () => {
  it("쿼터 초과 시 가장 오래된 것 삭제 후 재시도", () => {
    for (let i = 0; i < 3; i++) saveProfile(makeProfile(`q${i}`));

    let throwOnce = true;
    const realSet = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
      this: Storage,
      key: string,
      value: string,
    ) {
      if (key === "ganeum.profiles" && throwOnce) {
        throwOnce = false;
        const err = new Error("quota");
        err.name = "QuotaExceededError";
        throw err;
      }
      return realSet.call(this, key, value);
    });

    const r = saveProfile(makeProfile("q9"));
    expect(r.ok).toBe(true);
    const list = loadProfiles();
    expect(list.some((p) => p.id === "q9")).toBe(true);
    expect(list.some((p) => p.id === "q0")).toBe(false); // 가장 오래된 것 밀려남
  });

  it("계속 실패하면 degraded=true 지만 앱은 메모리로 동작", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      const err = new Error("quota");
      err.name = "QuotaExceededError";
      throw err;
    });
    const r = saveProfile(makeProfile("m1"));
    expect(r.ok).toBe(false);
    expect(r.degraded).toBe(true);
    expect(isStorageDegraded()).toBe(true);
    // 메모리 폴백으로 여전히 읽힌다.
    expect(loadProfiles().some((p) => p.id === "m1")).toBe(true);
  });
});

describe("deleteAllData", () => {
  it("모든 ganeum.* 키를 지운다", () => {
    saveProfile(makeProfile("a1"));
    savePrefs({ theme: "dark" });
    localStorage.setItem("ganeum.prefs.theme", "dark");
    localStorage.setItem("other.key", "keep");
    deleteAllData();
    expect(loadProfiles()).toEqual([]);
    expect(localStorage.getItem("ganeum.prefs")).toBeNull();
    expect(localStorage.getItem("ganeum.prefs.theme")).toBeNull();
    expect(localStorage.getItem("other.key")).toBe("keep");
  });
});

describe("prefs", () => {
  it("기본값", () => {
    expect(loadPrefs()).toEqual(DEFAULT_PREFS);
  });
  it("patch 병합 + 잘못된 값 무시", () => {
    savePrefs({ theme: "dark", locale: "en" });
    expect(loadPrefs()).toMatchObject({ theme: "dark", locale: "en", sound: true });
    localStorage.setItem("ganeum.prefs", JSON.stringify({ theme: "purple", locale: "fr" }));
    expect(loadPrefs().theme).toBe("system");
    expect(loadPrefs().locale).toBe("ko");
  });
});

describe("화면 보정 (calibration)", () => {
  it("저장 후 로드 라운드트립 + ts 자동 기록", () => {
    const before = Date.now();
    const r = saveCalibration(3.8, 2);
    expect(r.ok).toBe(true);
    const cal = loadCalibration();
    expect(cal).not.toBeNull();
    expect(cal?.pxPerMm).toBe(3.8);
    expect(cal?.dpr).toBe(2);
    expect(cal?.ts).toBeGreaterThanOrEqual(before);
  });

  it("보정값이 없으면 null, 손상되면 null", () => {
    expect(loadCalibration()).toBeNull();
    localStorage.setItem("ganeum.calibration", "{broken");
    expect(loadCalibration()).toBeNull();
    localStorage.setItem("ganeum.calibration", JSON.stringify({ pxPerMm: -1, dpr: 1, ts: 0 }));
    expect(loadCalibration()).toBeNull();
  });

  it("clearCalibration 은 보정값만 지운다", () => {
    saveCalibration(4, 1);
    savePrefs({ theme: "dark" });
    clearCalibration();
    expect(loadCalibration()).toBeNull();
    expect(loadPrefs().theme).toBe("dark");
  });

  it("isCalibrationStale — 상대오차 5% 초과면 true (줌 오차는 무시)", () => {
    expect(isCalibrationStale({ pxPerMm: 4, dpr: 2, ts: 0 }, 2)).toBe(false);
    expect(isCalibrationStale({ pxPerMm: 4, dpr: 2, ts: 0 }, 2.05)).toBe(false); // 2.5%
    expect(isCalibrationStale({ pxPerMm: 4, dpr: 2, ts: 0 }, 1)).toBe(true); // 50%
    expect(isCalibrationStale({ pxPerMm: 4, dpr: 0, ts: 0 }, 2)).toBe(false); // dpr 미상
  });

  it("deleteAllData 는 보정값도 지운다", () => {
    saveCalibration(3.8, 1);
    deleteAllData();
    expect(loadCalibration()).toBeNull();
  });

  it("calibrationPrompted 기본 false, patch 로 true 저장", () => {
    expect(loadPrefs().calibrationPrompted).toBe(false);
    savePrefs({ calibrationPrompted: true });
    expect(loadPrefs().calibrationPrompted).toBe(true);
  });
});

describe("export", () => {
  it("안정 계약 형태 { format, version, profile }", () => {
    const json = exportProfileJSON(makeProfile("x1"));
    const parsed = JSON.parse(json);
    expect(parsed.format).toBe("ganeum-profile");
    expect(parsed.version).toBe(1);
    expect(parsed.profile.id).toBe("x1");
  });
});
