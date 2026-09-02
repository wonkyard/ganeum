/**
 * `Disclosure` — 접근성 준수 아코디언 ("▸ 이게 무슨 뜻이죠?"). screen-design S3/S4/S6.
 * 네이티브 `<details>` 를 쓰지 않는 이유: reduced-motion·스타일·`aria-controls` 를
 * 명시적으로 제어하고 키보드 동작을 한 곳에서 보장하기 위해.
 */
import { el } from "../dom";

export interface DisclosureOptions {
  summary: string;
  /** 펼쳤을 때 내용. */
  content: HTMLElement;
  /** 처음부터 펼침. 기본 false. */
  open?: boolean;
}

export function createDisclosure(opts: DisclosureOptions): HTMLElement {
  const id = `disc-${Math.random().toString(36).slice(2, 8)}`;
  let open = opts.open ?? false;

  const marker = el("span", { class: "disclosure-marker", "aria-hidden": "true" }, "▸");
  const button = el(
    "button",
    {
      type: "button",
      class: "disclosure-summary",
      "aria-expanded": open,
      "aria-controls": id,
    },
    marker,
    el("span", {}, opts.summary),
  );
  const panel = el("div", { class: "disclosure-panel", id, hidden: !open }, opts.content);

  const sync = (): void => {
    button.setAttribute("aria-expanded", String(open));
    panel.toggleAttribute("hidden", !open);
    marker.textContent = open ? "▾" : "▸";
  };
  button.addEventListener("click", () => {
    open = !open;
    sync();
  });
  sync();

  return el("div", { class: "disclosure" }, button, panel);
}
