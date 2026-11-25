"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { DICTIONARIES, type Dictionary, type Locale } from "@/lib/i18n";

interface I18nContextValue {
  locale: Locale;
  setLocale: (loc: Locale) => void;
  t: Dictionary;
}

// V5 默认面向中国出海开发者母语中文优先，支持一键切换纯正海外英文
const I18nContext = createContext<I18nContextValue>({
  locale: "zh",
  setLocale: () => {},
  t: DICTIONARIES.zh,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("zh");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("lp_locale") as Locale | null;
      if (saved === "en" || saved === "zh" || saved === "ja") {
        setLocaleState(saved);
        document.documentElement.lang = saved;
      } else {
        document.documentElement.lang = "zh";
      }
    } catch {
      // ignore
    }
  }, []);

  const setLocale = (loc: Locale) => {
    setLocaleState(loc);
    try {
      localStorage.setItem("lp_locale", loc);
      document.documentElement.lang = loc;
    } catch {
      // ignore
    }
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, t: DICTIONARIES[locale] }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
