// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateTargetLayout } from "../core/task";
import { TargetField } from "./target-field";

/** jsdom 은 캔버스 2D 컨텍스트를 구현하지 않으므로 no-op 스텁을 끼운다. */
const stubCtx = new Proxy(
  {},
  { get: () => () => undefined, set: () => true },
) as unknown as CanvasRenderingContext2D;

let origGetContext: typeof HTMLCanvasElement.prototype.getContext;

beforeEach(() => {
  origGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = vi.fn(() => stubCtx) as never;
  vi.stubGlobal("requestAnimationFrame", () => 0);
  vi.stubGlobal("cancelAnimationFrame", () => undefined);
});

afterEach(() => {
  HTMLCanvasElement.prototype.getContext = origGetContext;
  vi.unstubAllGlobals();
});

/**
 * 레이아웃은 필드가 잰 정사각 크기(`size`)에서 파생한다. jsdom 은 레이아웃 정보가
 * 없어 `size` 가 뷰포트 최소변으로 폴백되지만, 중심을 `size/2` 로 두는 한 진행
 * 로직 테스트에는 영향이 없다.
 */
function makeField(onComplete: (taps: unknown[]) => void, now: () => number) {
  const canvas = document.createElement("canvas");
  return new TargetField({
    canvas,
    buildLayout: (size) =>
      generateTargetLayout({
        center: { x: size / 2, y: size / 2 },
        amplitude: 300,
        width: 40,
        count: 5,
      }),
    reducedMotion: true,
    now,
    onComplete,
  });
}

describe("TargetField 진행 로직", () => {
  it("모든 타깃을 순서대로 누르면 onComplete 가 탭 목록과 함께 발화", () => {
    let clock = 0;
    const tick = () => (clock += 500); // 각 탭 사이 500ms
    const onComplete = vi.fn();
    const field = makeField(onComplete, () => clock);

    for (let i = 0; i < 5; i++) {
      tick();
      field.tapCurrentTarget();
    }

    expect(onComplete).toHaveBeenCalledTimes(1);
    const taps = onComplete.mock.calls[0][0] as Array<{ mt: number; error: boolean }>;
    expect(taps).toHaveLength(5);
    expect(taps.every((t) => !t.error)).toBe(true);
    // 두 번째 탭부터 mt ≈ 0.5s (첫 탭은 생성~첫 탭 사이 = 0.5s 도 됨)
    expect(taps[1].mt).toBeCloseTo(0.5, 6);
    field.destroy();
  });

  it("타깃 밖 탭은 error 로 기록되고 진행하지 않음", () => {
    let clock = 0;
    const onComplete = vi.fn();
    const canvas = document.createElement("canvas");
    const taps: Array<{ error: boolean }> = [];
    const field = new TargetField({
      canvas,
      buildLayout: (size) =>
        generateTargetLayout({
          center: { x: size / 2, y: size / 2 },
          amplitude: 300,
          width: 20,
          count: 5,
        }),
      reducedMotion: true,
      now: () => (clock += 100),
      onTap: (t) => taps.push(t),
      onComplete,
    });

    const firstIdx = field.currentTargetIndex;
    // 현재 타깃에서 멀리 떨어진 지점(0,0)을 누른 것으로 시뮬레이션.
    (field as unknown as { registerTap(x: number, y: number, p: string): void }).registerTap(
      0,
      0,
      "mouse",
    );

    expect(taps[0].error).toBe(true);
    expect(field.currentTargetIndex).toBe(firstIdx); // 진행 안 함
    expect(onComplete).not.toHaveBeenCalled();
    field.destroy();
  });

  it("P0-1 골든: 착지 오차를 접근 축(직전 타깃 → 이번 타깃)에 투영한다", () => {
    let clock = 0;
    const taps: Array<{ dx: number; dy: number; devAxis: number; devOrtho: number }> = [];
    const canvas = document.createElement("canvas");
    let size = 0;
    const field = new TargetField({
      canvas,
      buildLayout: (s) => {
        size = s;
        return generateTargetLayout({
          center: { x: s / 2, y: s / 2 },
          amplitude: s * 0.6,
          width: 40,
          count: 5,
        });
      },
      reducedMotion: true,
      now: () => (clock += 100),
      onTap: (t) => taps.push(t),
      onComplete: vi.fn(),
    });

    const layout = generateTargetLayout({
      center: { x: size / 2, y: size / 2 },
      amplitude: size * 0.6,
      width: 40,
      count: 5,
    });
    const reg = (field as unknown as { registerTap(x: number, y: number, p: string): void })
      .registerTap;
    const call = (x: number, y: number) => reg.call(field, x, y, "mouse");

    // 타깃 0 을 정확히 중심에서 맞힘 → prevTargetPos 설정, 진행.
    const p0 = layout.positions[layout.order[0]];
    call(p0.x, p0.y);
    // 타깃 1(= order[1]) 에 알려진 오프셋으로 착지.
    const p1 = layout.positions[layout.order[1]];
    const ox = 7;
    const oy = -3;
    call(p1.x + ox, p1.y + oy);

    const ux = p1.x - p0.x;
    const uy = p1.y - p0.y;
    const mag = Math.hypot(ux, uy);
    const nx = ux / mag;
    const ny = uy / mag;
    const last = taps[taps.length - 1];
    expect(last.dx).toBeCloseTo(ox, 9);
    expect(last.dy).toBeCloseTo(oy, 9);
    expect(last.devAxis).toBeCloseTo(ox * nx + oy * ny, 6);
    expect(last.devOrtho).toBeCloseTo(-ox * ny + oy * nx, 6);
    // 접근 축이 대각선이므로 원시 dx 와 축투영은 다르다.
    expect(Math.abs(last.devAxis - last.dx)).toBeGreaterThan(1e-6);
    field.destroy();
  });

  it("P0-4 골든: 미스 후 재시도해도 타깃당 엔드포인트 1개, mt 는 press→press", () => {
    let clock = 0;
    const taps: Array<{ mt: number; error: boolean }> = [];
    const canvas = document.createElement("canvas");
    let size = 0;
    const field = new TargetField({
      canvas,
      buildLayout: (s) => {
        size = s;
        return generateTargetLayout({
          center: { x: s / 2, y: s / 2 },
          amplitude: s * 0.6,
          width: 30,
          count: 5,
        });
      },
      reducedMotion: true,
      now: () => (clock += 100), // 각 이벤트 +100ms
      onTap: (t) => taps.push(t),
      onComplete: vi.fn(),
    });
    const layout = generateTargetLayout({
      center: { x: size / 2, y: size / 2 },
      amplitude: size * 0.6,
      width: 30,
      count: 5,
    });
    const reg = (field as unknown as { registerTap(x: number, y: number, p: string): void })
      .registerTap;
    const call = (x: number, y: number) => reg.call(field, x, y, "mouse");

    const p0 = layout.positions[layout.order[0]];
    const p1 = layout.positions[layout.order[1]];
    call(p0.x, p0.y); // 타깃 0 히트 (엔드포인트 1개)
    call(p1.x + 999, p1.y); // 타깃 1 첫 press = 미스 (엔드포인트 기록, error)
    call(p1.x + 998, p1.y); // 재시도 미스 — 기록 안 됨
    call(p1.x, p1.y); // 재시도 히트 — 기록 안 됨, 진행

    // 타깃 0, 타깃 1 각각 1개씩.
    expect(taps).toHaveLength(2);
    expect(taps[1].error).toBe(true); // 첫 press 가 미스였으므로
    // press→press: 타깃0 첫 press(clock 이벤트 1개 소비) → 타깃1 첫 press(다음 이벤트).
    expect(taps[1].mt).toBeCloseTo(0.1, 9);
    field.destroy();
  });

  it("레이아웃 좌표와 히트판정이 같은 좌표계 — 정확히 타깃 중심을 누르면 히트", () => {
    let clock = 0;
    const onComplete = vi.fn();
    const canvas = document.createElement("canvas");
    let currentSize = 0;
    const field = new TargetField({
      canvas,
      buildLayout: (size) => {
        currentSize = size;
        return generateTargetLayout({
          center: { x: size / 2, y: size / 2 },
          amplitude: size * 0.6,
          width: 24,
          count: 5,
        });
      },
      reducedMotion: true,
      now: () => (clock += 100),
      onComplete,
    });

    // 필드가 실제로 잰 좌표계(currentSize)에서 현재 타깃 중심을 계산해 그대로 누른다.
    const layout = generateTargetLayout({
      center: { x: currentSize / 2, y: currentSize / 2 },
      amplitude: currentSize * 0.6,
      width: 24,
      count: 5,
    });
    const target = layout.positions[field.currentTargetIndex];
    (field as unknown as { registerTap(x: number, y: number, p: string): void }).registerTap(
      target.x,
      target.y,
      "mouse",
    );

    expect(field.currentTargetIndex).not.toBe(layout.order[0]); // seqPos 가 진행됨
    field.destroy();
  });
});
