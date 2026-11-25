"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import BrandMark from "@/components/BrandMark";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import LangSwitcher from "@/components/LangSwitcher";

export interface ShellNavItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  badge?: string | number;
}

interface AppShellProps {
  scopeBadge?: string;
  navItems: ShellNavItem[];
  activeKey: string;
  onSelect: (key: string) => void;
  title: string;
  subtitle?: string;
  headerActions?: React.ReactNode;
  sidebarFooter?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * 生产级统一 macOS / Apple HIG 控制台外框（/dashboard 与 /admin 100% 共用）
 */
export default function AppShell({
  scopeBadge,
  navItems,
  activeKey,
  onSelect,
  title,
  subtitle,
  headerActions,
  sidebarFooter,
  children,
}: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const renderNav = (closeOnPick = false) => (
    <nav className="space-y-1">
      {navItems.map((item) => {
        const active = item.key === activeKey;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => {
              onSelect(item.key);
              if (closeOnPick) setMobileOpen(false);
            }}
            className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-[10px] text-[13px] transition cursor-pointer text-left min-h-[38px] ${
              active
                ? "bg-[var(--apple-active)] text-[var(--apple-ink)] font-semibold"
                : "text-[var(--apple-ink-secondary)] hover:bg-[var(--apple-hover)] hover:text-[var(--apple-ink)]"
            }`}
          >
            <span className="flex items-center gap-2.5 min-w-0">
              <span className={active ? "text-[var(--apple-blue)]" : "opacity-75"}>
                {item.icon}
              </span>
              <span className="truncate">{item.label}</span>
            </span>
            {item.badge !== undefined && (
              <span className="text-[11px] font-medium text-[var(--apple-ink-tertiary)] tabular-nums">
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-[var(--apple-bg)] text-[var(--apple-ink)] flex flex-col lg:flex-row">
      {/* 桌面端左侧 240px macOS 边栏 */}
      <aside className="hidden lg:flex lg:w-60 border-r border-[var(--apple-border)] bg-[var(--apple-bg-alt)] flex-col justify-between shrink-0 sticky top-0 h-screen">
        <div className="p-4 space-y-5 overflow-y-auto">
          <div className="flex items-center justify-between px-2 pt-1">
            <Link
              href="/"
              className="flex items-center gap-2 font-semibold text-[15px] tracking-tight text-[var(--apple-ink)]"
            >
              <BrandMark className="w-5 h-5" />
              <span>LaunchPulse</span>
            </Link>
            {scopeBadge && (
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--apple-ink-tertiary)]">
                {scopeBadge}
              </span>
            )}
          </div>
          {renderNav(false)}
        </div>

        {sidebarFooter && (
          <div className="p-4 border-t border-[var(--apple-border)]">{sidebarFooter}</div>
        )}
      </aside>

      {/* 移动端抽屉菜单 */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-10 w-64 max-w-[82vw] bg-[var(--apple-bg-alt)] border-r border-[var(--apple-border)] h-full flex flex-col justify-between p-4">
            <div className="space-y-5">
              <div className="flex items-center justify-between px-2">
                <Link
                  href="/"
                  className="flex items-center gap-2 font-semibold text-[15px] text-[var(--apple-ink)]"
                >
                  <BrandMark className="w-5 h-5" />
                  <span>LaunchPulse</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="p-1.5 rounded-lg text-[var(--apple-ink-secondary)] hover:bg-[var(--apple-hover)]"
                  aria-label="Close menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {renderNav(true)}
            </div>
            <div className="pt-4 border-t border-[var(--apple-border)] space-y-3">
              <div className="flex items-center justify-between">
                <ThemeSwitcher />
                <LangSwitcher />
              </div>
              {sidebarFooter}
            </div>
          </div>
        </div>
      )}

      {/* 右侧工作画布 */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 h-14 apple-glass border-b border-[var(--apple-border)] px-4 sm:px-7 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 -ml-1 rounded-lg text-[var(--apple-ink)] hover:bg-[var(--apple-hover)]"
              aria-label="Open menu"
            >
              <Menu className="w-4 h-4" />
            </button>
            <h1 className="text-[15px] font-semibold text-[var(--apple-ink)] truncate">{title}</h1>
            {subtitle && (
              <span className="hidden sm:inline-block text-[12px] text-[var(--apple-ink-tertiary)] truncate">
                / {subtitle}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:flex items-center gap-2">
              <ThemeSwitcher />
              <LangSwitcher />
            </div>
            {headerActions}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-7 max-w-[1120px] w-full mx-auto space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
}
