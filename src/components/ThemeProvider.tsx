"use client";

import { ThemeProvider as NextThemesProvider, useTheme as useNextTheme } from "next-themes";
import { ActiveThemeProvider } from "@/components/themes/active-theme";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

export type ThemeMode = "light" | "dark" | "system";

/**
 * LaunchPulse V8 光学磨砂双模主题引擎：
 * - 默认 Pearl Frost（冰晶浅色五层磨砂画布），一键切换 Obsidian Vibrancy（黑曜石流光磨砂）
 * - 移除开源模板痕迹的多配色杂音，统一使用 launchpulse 光学令牌
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      <ActiveThemeProvider initialTheme="launchpulse">
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
