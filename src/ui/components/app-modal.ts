/**
 * `AppModal` — 인앱 모달. 브라우저 `alert/confirm/dialog` 절대 금지 (screen-design 컴포넌트 인벤토리).
 *
 * 계약 (brief-3A §5):
 * - 포커스 트랩 (Tab / Shift+Tab 이 모달 안에서 순환)
 * - Escape 로 닫기
 * - `aria-modal="true"` + `role="dialog"` + 제목 연결
 * - 닫을 때 열기 전 포커스 요소로 복귀
 */
import { el, FOCUSABLE } from "../dom";

export interface ModalAction {
  label: string;
  onSelect: () => void;
  variant?: "primary" | "ghost" | "danger";
}

export interface AppModalOptions {
  title: string;
  /** 본문 — 문자열이면 <p> 로 감싼다. 생략 가능. */
  body?: string | HTMLElement;
  actions: ModalAction[];
  /** Escape / 배경 클릭 / 닫기 시 호출. */
  onClose?: () => void;
}

export class AppModal {
  private readonly overlay: HTMLElement;
  private readonly dialog: HTMLElement;
  private readonly opener: Element | null;
  private readonly onClose?: () => void;
  private closed = false;

  constructor(opts: AppModalOptions) {
    this.opener = typeof document !== "undefined" ? document.activeElement : null;
    this.onClose = opts.onClose;

    const titleId = `modal-title-${Math.random().toString(36).slice(2, 8)}`;
    const body =
      typeof opts.body === "string"
        ? el("p", { class: "modal-body" }, opts.body)
        : (opts.body ?? null);

    const actions = el(
      "div",
      { class: "modal-actions" },
      ...opts.actions.map((a) => {
        const btn = el(
          "button",
          { type: "button", class: `btn-${a.variant ?? "ghost"}` },
          a.label,
        );
        btn.addEventListener("click", () => {
          a.onSelect();
          this.close();
        });
        return btn;
      }),
    );

    this.dialog = el(
      "div",
      { class: "modal-dialog", role: "dialog", "aria-modal": "true", "aria-labelledby": titleId },
      el("h2", { class: "modal-title", id: titleId }, opts.title),
      body,
      actions,
    );
    this.overlay = el("div", { class: "modal-overlay" }, this.dialog);

    this.overlay.addEventListener("mousedown", (e) => {
      if (e.target === this.overlay) this.close();
    });
    this.dialog.addEventListener("keydown", this.onKeydown);

    document.body.append(this.overlay);
    // 첫 포커스 가능한 요소로.
    const first = this.dialog.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? this.dialog).focus();
  }

  private onKeydown = (e: KeyboardEvent): void => {
    if (e.key === "Escape") {
      e.preventDefault();
      this.close();
      return;
    }
    if (e.key !== "Tab") return;
    const focusable = Array.from(this.dialog.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.dialog.removeEventListener("keydown", this.onKeydown);
    this.overlay.remove();
    if (this.opener instanceof HTMLElement) this.opener.focus();
    this.onClose?.();
  }
}
