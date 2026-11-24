"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type ThemeMode = "system" | "light" | "dark";

interface ThemeContextValue {
  mode: ThemeMode;
  resolvedTheme: "light" | "dark";
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: "system",
  resolvedTheme: "dark",
  setMode: () => {},
});

function resolveSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const apply = (nextMode: ThemeMode) => {
      const resolved = nextMode === "system" ? resolveSystemTheme() : nextMode;
      setResolvedTheme(resolved);
      document.documentElement.setAttribute("data-theme", resolved);
    };

    let initial: ThemeMode = "system";
    try {
      const saved = localStorage.getItem("lp_theme") as ThemeMode | null;
      if (saved === "system" || saved === "light" || saved === "dark") {
        initial = saved;
      }
    } catch {
      // ignore
    }
    setModeState(initial);
    apply(initial);

    const media = window.matchMedia("(prefers-color-scheme: light)");
    const listener = () => {
      try {
        const current = (localStorage.getItem("lp_theme") as ThemeMode | null) || "system";
        if (current === "system") apply("system");
      } catch {
        apply("system");
      }
    };
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  const setMode = (nextMode: ThemeMode) => {
    setModeState(nextMode);
    const resolved = nextMode === "system" ? resolveSystemTheme() : nextMode;
    setResolvedTheme(resolved);
    try {
      localStorage.setItem("lp_theme", nextMode);
      document.documentElement.setAttribute("data-theme", resolved);
    } catch {
      // ignore
    }
  };

  return (
    <ThemeContext.Provider value={{ mode, resolvedTheme, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
