/**
 * English strings — 주 1–2 에서는 키 스캐폴드만. 값은 주 7–8(en.ts 채우기)에서 번역한다.
 * 지금은 키 정합성 테스트(ko 와 동일 키 집합)만 지킨다. 빈 값이면 런타임은 ko 로 폴백한다.
 */
import type { MessageKey } from "./ko";

export const en: Record<MessageKey, string> = {
  "app.title": "",
  "app.tagline": "",
  "app.skipToContent": "",

  "home.subcopy": "",
  "home.start": "",
  "home.whatIs": "",
  "home.pastResults": "",
  "home.footer": "",

  "measure.conditionProgress": "",
  "measure.instruction": "",
  "measure.next": "",
  "measure.abortConfirm": "",
  "measure.abortYes": "",
  "measure.abortNo": "",
  "measure.pointerRequired": "",

  "result.title": "",
  "result.throughput": "",
  "result.throughputUnit": "",
  "result.regression": "",
  "result.rSquared": "",
  "result.accuracy": "",
  "result.consistency": "",
  "result.hand": "",
  "result.disclaimer": "",
  "result.remeasure": "",

  "theme.toggle": "",
  "lang.toggle": "",

  "unit.ms": "",
  "unit.bitsPerSecond": "",
};
