// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { Countdown } from "./countdown";

afterEach(() => {
  document.body.replaceChildren();
});

/** 주입된 타이머를 즉시 실행하는 큐 — 3-2-1-시작! 시퀀스를 동기적으로 돌린다. */
function immediateTimers() {
  const pending: Array<() => void> = [];
  return {
    setTimer: (fn: () => void) => {
      pending.push(fn);
      return pending.length;
    },
    clearTimer: () => {},
    flush(steps: number) {
      for (let i = 0; i < steps && pending.length; i++) pending.shift()!();
    },
  };
}

describe("Countdown", () => {
  it("3 → 2 → 1 → 시작! → onDone (디짓당 1틱)", () => {
    const host = document.createElement("div");
    document.body.append(host);
    const timers = immediateTimers();
    const onDone = vi.fn();
    new Countdown({ host, from: 3, onDone, setTimer: timers.setTimer, clearTimer: timers.clearTimer });

    const numberEl = host.querySelector(".countdown-number")!;
    expect(numberEl.textContent).toBe("3");
    timers.flush(1);
    expect(numberEl.textContent).toBe("2");
    timers.flush(1);
    expect(numberEl.textContent).toBe("1");
    timers.flush(1);
    expect(numberEl.textContent).toBe("시작!");
    expect(onDone).not.toHaveBeenCalled();
    timers.flush(1);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("destroy 후에는 onDone 이 불리지 않는다", () => {
    const host = document.createElement("div");
    document.body.append(host);
    const timers = immediateTimers();
    const onDone = vi.fn();
    const cd = new Countdown({
      host,
      from: 1,
      onDone,
      setTimer: timers.setTimer,
      clearTimer: timers.clearTimer,
    });
    timers.flush(1); // "시작!"
    cd.destroy();
    timers.flush(1); // onDone 예약분
    expect(onDone).not.toHaveBeenCalled();
  });

  it("aria-live 로 숫자를 읽어준다 (reduced-motion 정보 유지)", () => {
    const host = document.createElement("div");
    document.body.append(host);
    const timers = immediateTimers();
    new Countdown({
      host,
      from: 3,
      reducedMotion: true,
      onDone: () => {},
      setTimer: timers.setTimer,
      clearTimer: timers.clearTimer,
    });
    const numberEl = host.querySelector(".countdown-number")!;
    expect(numberEl.getAttribute("aria-live")).toBe("assertive");
    expect(numberEl.getAttribute("aria-label")).toContain("3");
  });
});
