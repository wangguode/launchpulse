"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CornerDownLeft, Search, X } from "lucide-react";

export interface CommandItem {
  id: string;
  group: string;
  label: string;
  hint?: string;
  keywords?: string;
  shortcut?: string;
  icon?: React.ReactNode;
  onSelect: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  items: CommandItem[];
  placeholder?: string;
  emptyText?: string;
}

/**
 * LaunchPulse V5 全局 ⌘K / Ctrl+K 精密命令面板（Linear / Raycast 键盘工效）
 */
export default function CommandPalette({
  open,
  onClose,
  items,
  placeholder = "输入命令、页面或目录名（如 SourceForge / 扫帖 / 切换主题）...",
  emptyText = "未找到匹配项",
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.slice(0, 14);
    return items
      .filter((it) => {
        const hay = `${it.label} ${it.hint || ""} ${it.group} ${it.keywords || ""}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 14);
  }, [items, query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => (filtered.length ? (prev + 1) % filtered.length : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => (filtered.length ? (prev - 1 + filtered.length) % filtered.length : 0));
      } else if (e.key === "Enter" && filtered[activeIndex]) {
        e.preventDefault();
        filtered[activeIndex].onSelect();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, filtered, activeIndex, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4 bg-black/45 backdrop-blur-[2px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="全局命令面板"
    >
      <div
        className="w-full max-w-[560px] rounded-[12px] bg-[var(--bg-sheet)] border border-[var(--border-strong)] overflow-hidden"
        style={{ boxShadow: "var(--overlay-shadow)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 px-3.5 h-12 border-b border-[var(--border-hairline)]">
          <Search className="w-4 h-4 text-[var(--ink-muted)] shrink-0" strokeWidth={1.7} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-[13.5px] text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] outline-none focus-visible:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭命令面板"
            className="p-1 rounded text-[var(--ink-muted)] hover:text-[var(--ink-primary)] cursor-pointer"
          >
            <X className="w-4 h-4" strokeWidth={1.7} />
          </button>
        </div>

        <div className="max-h-[360px] overflow-y-auto py-1.5">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-[13px] text-[var(--ink-muted)]">{emptyText}</div>
          ) : (
            filtered.map((item, idx) => {
              const active = idx === activeIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => {
                    item.onSelect();
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-left lp-ease cursor-pointer ${
                    active
                      ? "bg-[var(--bg-active-tint)] text-[var(--ink-primary)]"
                      : "text-[var(--ink-secondary)] hover:bg-[var(--bg-hover)]"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {item.icon && <span className="text-[var(--ink-muted)] shrink-0">{item.icon}</span>}
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-[var(--ink-primary)] truncate">{item.label}</p>
                      {item.hint && (
                        <p className="text-[11.5px] text-[var(--ink-muted)] truncate">{item.hint}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-[var(--ink-muted)]">{item.group}</span>
                    {item.shortcut ? (
                      <kbd className="lp-kbd">{item.shortcut}</kbd>
                    ) : active ? (
                      <CornerDownLeft className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                    ) : null}
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="h-8 px-3.5 border-t border-[var(--border-hairline)] bg-[var(--bg-surface)] flex items-center justify-between text-[11px] text-[var(--ink-muted)]">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <kbd className="lp-kbd">↑</kbd>
              <kbd className="lp-kbd">↓</kbd> 选择
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="lp-kbd">↵</kbd> 执行
            </span>
          </div>
          <span className="inline-flex items-center gap-1">
            <kbd className="lp-kbd">Esc</kbd> 关闭
          </span>
        </div>
      </div>
    </div>
  );
}
