"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type ThemeMode = "light" | "dark" | "system";

interface ThemeContextValue {
  mode: ThemeMode;
  resolvedTheme: "light" | "dark";
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: "light",
  resolvedTheme: "light",
  setMode: () => {},
  toggleTheme: () => {},
});

function resolveSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("light");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const apply = (nextMode: ThemeMode) => {
      const resolved = nextMode === "system" ? resolveSystemTheme() : nextMode;
      setResolvedTheme(resolved);
      document.documentElement.setAttribute("data-theme", resolved);
    };

    let initial: ThemeMode = "light";
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

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => {
      try {
        const current = (localStorage.getItem("lp_theme") as ThemeMode | null) || "light";
        if (current === "system") apply("system");
      } catch {
        // ignore
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

  const toggleTheme = () => {
    setMode(resolvedTheme === "dark" ? "light" : "dark");
  };

  return (
    <ThemeContext.Provider value={{ mode, resolvedTheme, setMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
