// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { createRouter } from "./router";

afterEach(() => {
  window.location.hash = "";
});

describe("createRouter", () => {
  it("정적 경로와 파라미터 경로를 매칭", () => {
    const home = vi.fn();
    const results = vi.fn();
    const fallback = vi.fn();
    const router = createRouter(fallback);
    router.add("/", home).add("/results/:id", results);
    router.start();

    expect(home).toHaveBeenCalledTimes(1); // 초기 해시 없음 → "/"

    router.go("/results/abc123");
    expect(results).toHaveBeenCalledWith({ path: "/results/abc123", params: { id: "abc123" } });

    router.stop();
  });

  it("매칭 없으면 fallback", () => {
    const fallback = vi.fn();
    const router = createRouter(fallback);
    router.add("/", vi.fn());
    router.start();
    router.go("/nope/where");
    expect(fallback).toHaveBeenLastCalledWith({ path: "/nope/where", params: {} });
    router.stop();
  });

  it("hashchange 이벤트에 반응", () => {
    const measure = vi.fn();
    const router = createRouter(vi.fn());
    router.add("/measure", measure);
    router.start();
    window.location.hash = "#/measure";
    window.dispatchEvent(new Event("hashchange"));
    expect(measure).toHaveBeenCalled();
    router.stop();
  });
});
