import { describe, expect, it, vi } from "vitest";
import { createStore } from "./store";

describe("createStore", () => {
  it("patch 객체와 함수 업데이터 모두 지원, 불변 갱신", () => {
    const store = createStore({ count: 0, name: "a" });
    const first = store.get();
    store.set({ count: 1 });
    expect(store.get().count).toBe(1);
    expect(store.get()).not.toBe(first);
    store.set((s) => ({ count: s.count + 1 }));
    expect(store.get()).toEqual({ count: 2, name: "a" });
  });

  it("구독자에게 즉시 + 갱신마다 알림", () => {
    const store = createStore({ n: 0 });
    const seen: number[] = [];
    const unsub = store.subscribe((s) => seen.push(s.n));
    store.set({ n: 1 });
    store.set({ n: 2 });
    unsub();
    store.set({ n: 3 });
    expect(seen).toEqual([0, 1, 2]);
  });

  it("emitNow=false 면 첫 알림 생략", () => {
    const store = createStore({ n: 0 });
    const listener = vi.fn();
    store.subscribe(listener, false);
    expect(listener).not.toHaveBeenCalled();
    store.set({ n: 1 });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
