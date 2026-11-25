"use client";

import { Icons } from "@/components/icons";
import { useTheme } from "next-themes";
import * as React from "react";
import { useI18n } from "@/components/I18nProvider";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Kbd } from "@/components/ui/kbd";
import { startThemeTransition } from "@/lib/theme-transition";

export function ThemeModeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const { locale } = useI18n();
  const isZh = locale === "zh";

  const handleThemeToggle = React.useCallback(
    (e?: React.MouseEvent) => {
      const newMode = resolvedTheme === "dark" ? "light" : "dark";
      startThemeTransition(() => setTheme(newMode), e);
    },
    [resolvedTheme, setTheme]
  );

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "d" || !e.shiftKey || !(e.metaKey || e.ctrlKey)) return;
      const target = e.target as HTMLElement | null;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable
      ) {
        return;
      }
      e.preventDefault();
      handleThemeToggle();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleThemeToggle]);

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="group/toggle h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={handleThemeToggle}
            aria-label={isZh ? "切换浅色/暗黑模式" : "Toggle light or dark mode"}
          />
        }
      >
        <Icons.brightness />
        <span className="sr-only">{isZh ? "切换浅色/暗黑模式" : "Toggle dark mode"}</span>
      </TooltipTrigger>
      <TooltipContent className="flex items-center gap-1.5">
        <span>{isZh ? "切换外观" : "Toggle theme"}</span>
        <Kbd>⌘⇧D</Kbd>
      </TooltipContent>
    </Tooltip>
  );
}
