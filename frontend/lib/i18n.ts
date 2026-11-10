import { EN } from "./locales/en";

/**
 * Translation of the web app. The Vietnamese text is its own key: `tr("Lưu thay đổi")` returns the text as is in
 * Vietnamese and looks it up in the English dictionary (lib/locales/en.ts) in English. Text with values uses
 * `{0}`, `{1}`: `tr("Đã chọn {0} mục", count)`. A text without an entry is shown in Vietnamese.
 *
 * `tr` works anywhere (components, helpers, module-level getters) because the current language lives in this
 * module; the provider (i18n-provider.tsx) re-renders the app when the language changes.
 */
export type Lang = "vi" | "en";

export const LANGS: { code: Lang; label: string; name: string }[] = [
  { code: "vi", label: "VI", name: "Tiếng Việt" },
  { code: "en", label: "EN", name: "English" }
];

let current: Lang = "vi";

export const getLang = (): Lang => current;

export function setCurrentLang(lang: Lang): void {
  current = lang;
}

export function tr(text: string, ...args: unknown[]): string {
  const translated = current === "en" ? (EN[text] ?? text) : text;
  if (args.length === 0) return translated;
  return translated.replace(/\{(\d+)\}/g, (_, index: string) => String(args[Number(index)] ?? ""));
}

/** Locale of dates and numbers (toLocaleString, Intl) for the current language. */
export const locale = (): string => (current === "en" ? "en-US" : "vi-VN");
