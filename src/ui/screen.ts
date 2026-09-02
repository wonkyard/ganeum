/** 화면(스크린) 계약. `app.ts` 가 라우트마다 하나를 마운트한다. */

export interface MountContext {
  /** 화면을 그릴 컨테이너 (매 마운트마다 비워진다). */
  host: HTMLElement;
  /** 라우트 파라미터 (`/results/:id` → `{ id }`). */
  params: Record<string, string>;
  /** 해시 라우터 이동. */
  go(path: string): void;
  /** 언마운트 시 실행할 정리 콜백 등록 (컴포넌트 `destroy()`, 타이머 등). */
  addCleanup(fn: () => void): void;
  /** 현재 유효한 reduced-motion 상태 (OS 설정 + prefs 오버라이드). */
  reducedMotion(): boolean;
  /** 현재 라우트를 다시 마운트 (테마/언어 전환 후). */
  rerender(): void;
}

export type ScreenRenderer = (ctx: MountContext) => void;
