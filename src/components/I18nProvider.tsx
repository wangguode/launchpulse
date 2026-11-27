"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { DICTIONARIES, type Dictionary, type Locale } from "@/lib/i18n";

interface I18nContextValue {
  locale: Locale;
  setLocale: (loc: Locale) => void;
  t: Dictionary;
}

// SSR / 搜索引擎与海外买家默认英文优先，客户端首次挂载按浏览器系统语言智能自适应（zh -> 简体中文，ja -> 日语，其余 -> 英文）
const I18nContext = createContext<I18nContextValue>({
  locale: "en",
  setLocale: () => {},
  t: DICTIONARIES.en,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("lp_locale") as Locale | null;
      if (saved === "en" || saved === "zh") {
        setLocaleState(saved);
        document.documentElement.lang = saved;
        return;
      }
      const navLang = (navigator.language || "").toLowerCase();
      const detected: Locale = navLang.startsWith("zh") ? "zh" : "en";
      setLocaleState(detected);
      document.documentElement.lang = detected;
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
