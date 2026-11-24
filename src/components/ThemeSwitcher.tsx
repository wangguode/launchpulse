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
      className="inline-flex items-center rounded-lg border border-white/15 bg-black/40 p-0.5"
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
            className={`p-1.5 rounded-md transition cursor-pointer ${
              active
                ? "bg-emerald-500 text-slate-950"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {item.icon}
          </button>
        );
      })}
    </div>
  );
}
