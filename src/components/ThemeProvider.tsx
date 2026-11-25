"use client";

import { ThemeProvider as NextThemesProvider, useTheme as useNextTheme } from "next-themes";
import { ActiveThemeProvider } from "@/components/themes/active-theme";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

export type ThemeMode = "light" | "dark" | "system";

/**
 * 集成 Kiranism/next-shadcn-dashboard-starter 原装主题系统：
 * - next-themes 管理浅色 / 深色（.dark class）
 * - ActiveThemeProvider 管理 10 套官方 shadcn 配色主题（默认 Vercel）
 * - 全局挂载 TooltipProvider 与 Sonner 通知系统
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      <ActiveThemeProvider initialTheme="vercel">
        <TooltipProvider delay={150}>
          {children}
          <Toaster position="bottom-right" richColors />
        </TooltipProvider>
      </ActiveThemeProvider>
    </NextThemesProvider>
  );
}

export function useTheme() {
  const { theme, resolvedTheme, setTheme } = useNextTheme();
  const mode = (theme as ThemeMode) || "light";
  const resolved: "light" | "dark" = resolvedTheme === "dark" ? "dark" : "light";
  return {
    mode,
    resolvedTheme: resolved,
    setMode: (next: ThemeMode) => setTheme(next),
    toggleTheme: () => setTheme(resolved === "dark" ? "light" : "dark"),
  };
}
