"use client";

import { createContext, Fragment, useCallback, useContext, useLayoutEffect, useMemo, useState, type ReactNode } from "react";
import { getLang, setCurrentLang, type Lang } from "./i18n";

const STORAGE_KEY = "lang";

interface I18nContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

const I18nContext = createContext<I18nContextValue>({ lang: "vi", setLang: () => {} });

export const useI18n = () => useContext(I18nContext);

function apply(lang: Lang) {
  setCurrentLang(lang);
  document.documentElement.lang = lang;
}

/**
 * Holds the chosen language. The page is first rendered in Vietnamese (the same as the server's HTML, so hydration
 * matches), then switched to the saved language before the first paint. A change re-mounts the tree below it so
 * every text is read again; the signed-in user (AuthProvider) lives above and is kept.
 */
export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("vi");

  useLayoutEffect(() => {
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      // storage blocked: stay with the default language
    }
    if ((saved === "en" || saved === "vi") && saved !== getLang()) {
      apply(saved);
      setLangState(saved);
    }
  }, []);

  const setLang = useCallback((next: Lang) => {
    apply(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // the choice then only lasts until the page is closed
    }
    setLangState(next);
  }, []);

  const value = useMemo(() => ({ lang, setLang }), [lang, setLang]);

  return (
    <I18nContext.Provider value={value}>
      <Fragment key={lang}>{children}</Fragment>
    </I18nContext.Provider>
  );
}
