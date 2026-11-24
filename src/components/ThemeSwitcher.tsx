"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme, type ThemeMode } from "@/components/ThemeProvider";

export default function ThemeSwitcher() {
  const { mode, setMode } = useTheme();

  const items: Array<{ key: ThemeMode; label: string; icon: React.ReactNode }> = [
    { key: "light", label: "Light", icon: <Sun className="w-3.5 h-3.5" /> },
    { key: "system", label: "System", icon: <Monitor className="w-3.5 h-3.5" /> },
    { key: "dark", label: "Dark", icon: <Moon className="w-3.5 h-3.5" /> },
  ];

  return (
    <div
      className="inline-flex items-center rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] p-0.5"
      role="group"
      aria-label="Theme switcher"
    >
      {items.map((item) => {
        const active = mode === item.key;
        return (
          <button
            key={item.key}
            type="button"
            title={item.label}
            aria-label={item.label}
            onClick={() => setMode(item.key)}
            className={`p-1 rounded transition cursor-pointer ${
              active
                ? "bg-[var(--app-surface)] text-[var(--app-ink)] shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
                : "text-[var(--app-ink-muted)] hover:text-[var(--app-ink)]"
            }`}
          >
            {item.icon}
          </button>
        );
      })}
    </div>
  );
}
