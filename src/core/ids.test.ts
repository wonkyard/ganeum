import { afterEach, describe, expect, it, vi } from "vitest";
import { conditionId, newProfileId } from "./ids";

afterEach(() => vi.unstubAllGlobals());

describe("newProfileId", () => {
  it("1000개 생성해도 충돌 없음", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 1000; i++) seen.add(newProfileId());
    expect(seen.size).toBe(1000);
  });

  it("나중에 만든 ID 가 사전순으로 더 큼 (시간순 정렬 가능)", () => {
    const early = newProfileId(1_000_000_000_000);
    const late = newProfileId(2_000_000_000_000);
    expect(late > early).toBe(true);
  });

  it("`<base36>-<hex>` 형태", () => {
    expect(newProfileId()).toMatch(/^[0-9a-z]+-[0-9a-f]{8}$/);
  });

  it("crypto 가 없는 런타임에서도 Math.random 폴백으로 동작", () => {
    vi.stubGlobal("crypto", undefined);
    const id = newProfileId();
    expect(id).toMatch(/^[0-9a-z]+-[0-9a-f]{8}$/);
  });
});

describe("conditionId", () => {
  it("같은 (A,W) 는 반올림 후 같은 ID", () => {
    expect(conditionId(300.2, 40.1)).toBe(conditionId(300.4, 39.8));
    expect(conditionId(300, 40)).toBe("c-300x40");
  });
});
