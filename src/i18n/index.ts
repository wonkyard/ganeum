/**
 * 최소 i18n 런타임. `t(key, params)` 로 문자열을 얻는다. 값이 비면 ko 로 폴백한다.
 * 숫자·날짜는 `formatNumber` / `formatDate` 로 locale-aware 하게 (하드코딩 금지).
 */
import { ko, type MessageKey } from "./ko";
import { en } from "./en";

export type Locale = "ko" | "en";
const CATALOGS: Record<Locale, Record<MessageKey, string>> = { ko, en };
const BCP47: Record<Locale, string> = { ko: "ko-KR", en: "en-US" };

let current: Locale = "ko";
const listeners = new Set<(locale: Locale) => void>();

export function setLocale(locale: Locale): void {
  if (locale === current) return;
  current = locale;
  if (typeof document !== "undefined") document.documentElement.lang = BCP47[locale];
  for (const fn of listeners) fn(locale);
}

export function getLocale(): Locale {
  return current;
}

/** locale 변경 구독. 반환값 호출로 해제. */
export function onLocaleChange(fn: (locale: Locale) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function t(key: MessageKey, params?: Record<string, string | number>): string {
  const raw = CATALOGS[current][key] || ko[key];
  if (!params) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, name: string) =>
    name in params ? String(params[name]) : `{${name}}`,
  );
}

export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  try {
    return new Intl.NumberFormat(BCP47[current], options).format(value);
  } catch {
    return String(value);
  }
}

export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === "string" ? new Date(date) : date;
  try {
    return new Intl.DateTimeFormat(
      BCP47[current],
      options ?? { year: "numeric", month: "long", day: "numeric" },
    ).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

export type { MessageKey };
