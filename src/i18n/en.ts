/**
 * English strings. 키는 `ko` 에서 파생하므로 파리티가 항상 보장된다(brief-3A §4 i18n).
 * 값은 `overrides` 에 채운다 — 비어 있으면 런타임이 ko 로 폴백한다(주 7–8 번역 작업).
 */
import { ko, type MessageKey } from "./ko";

const overrides: Partial<Record<MessageKey, string>> = {
  // 아직 번역 안 됨. 채우는 대로 en 렌더가 활성화된다.
};

export const en: Record<MessageKey, string> = Object.fromEntries(
  (Object.keys(ko) as MessageKey[]).map((key) => [key, overrides[key] ?? ""]),
) as Record<MessageKey, string>;
