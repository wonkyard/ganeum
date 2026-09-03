/** 측정 준비(S1) → 측정(S2) 사이에서만 유지되는 얕은 세션 선택값. 영속하지 않는다. */
import { createStore } from "./store";
import type { Hand, MeasureMode } from "../core/types";

export interface SessionSelection {
  mode: MeasureMode;
  hand: Hand;
  /** 정밀 측정에서 "양손 비교"를 선택했는지 (5-6-b). quick 에서는 무시된다. */
  bothHands: boolean;
}

export const sessionStore = createStore<SessionSelection>({
  mode: "quick",
  hand: "right",
  bothHands: false,
});
