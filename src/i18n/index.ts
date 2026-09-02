/** 최소 i18n 런타임. `t(key, params)` 로 문자열을 얻는다. 값이 비면 ko 로 폴백. */
import { ko, type MessageKey } from "./ko";
import { en } from "./en";

export type Locale = "ko" | "en";
const CATALOGS: Record<Locale, Record<MessageKey, string>> = { ko, en };

let current: Locale = "ko";

export function setLocale(locale: Locale): void {
  current = locale;
}

export function getLocale(): Locale {
  return current;
}

export function t(key: MessageKey, params?: Record<string, string | number>): string {
  const raw = CATALOGS[current][key] || ko[key];
  if (!params) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, name: string) =>
    name in params ? String(params[name]) : `{${name}}`,
  );
}

export type { MessageKey };
