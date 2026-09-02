// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppModal } from "./app-modal";

afterEach(() => {
  document.body.replaceChildren();
});

describe("AppModal 계약 (brief-3A §5)", () => {
  it("role=dialog + aria-modal + 제목 연결", () => {
    new AppModal({ title: "그만둘까요?", actions: [{ label: "아니오", onSelect: () => {} }] });
    const dialog = document.querySelector('[role="dialog"]')!;
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    const labelledby = dialog.getAttribute("aria-labelledby")!;
    expect(document.getElementById(labelledby)?.textContent).toBe("그만둘까요?");
  });

  it("액션 클릭 → onSelect 호출 후 닫힘", () => {
    const onSelect = vi.fn();
    new AppModal({ title: "확인", actions: [{ label: "예", onSelect }] });
    document.querySelector<HTMLButtonElement>(".modal-actions button")!.click();
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it("Escape 로 닫히고 여는 요소로 포커스 복귀", () => {
    const opener = document.createElement("button");
    document.body.append(opener);
    opener.focus();
    expect(document.activeElement).toBe(opener);

    new AppModal({ title: "확인", actions: [{ label: "예", onSelect: () => {} }] });
    const dialog = document.querySelector('[role="dialog"]')!;
    dialog.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it("Tab 포커스 트랩 — 마지막에서 Tab 하면 첫 요소로", () => {
    new AppModal({
      title: "확인",
      actions: [
        { label: "A", onSelect: () => {} },
        { label: "B", onSelect: () => {} },
      ],
    });
    const buttons = document.querySelectorAll<HTMLButtonElement>(".modal-actions button");
    const last = buttons[buttons.length - 1];
    last.focus();
    document
      .querySelector('[role="dialog"]')!
      .dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
    expect(document.activeElement).toBe(buttons[0]);
  });
});
