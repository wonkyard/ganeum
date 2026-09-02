/** 측정 준비(S1) → 측정(S2) 사이에서만 유지되는 얕은 세션 선택값. 영속하지 않는다. */
import { createStore } from "./store";
import type { Hand, MeasureMode } from "../core/types";

export const sessionStore = createStore<{ mode: MeasureMode; hand: Hand }>({
  mode: "quick",
  hand: "right",
});
