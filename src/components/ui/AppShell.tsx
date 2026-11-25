"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import BrandMark from "@/components/BrandMark";
import LangSwitcher from "@/components/LangSwitcher";
import ThemeSwitcher from "@/components/ThemeSwitcher";

export interface ShellNavItem {
  key: string;
  label: string;
  mobileLabel?: string;
  icon: ReactNode;
  badge?: string | number;
}

interface AppShellProps {
  navItems: ShellNavItem[];
  activeKey: string;
  onSelect: (key: string) => void;
  breadcrumbRoot: string;
  breadcrumbCurrent: string;
  sidebarTopSlot?: ReactNode;
  sidebarFooter?: ReactNode;
  headerActions?: ReactNode;
  onOpenCommand?: () => void;
  commandLabel?: string;
  sheetPadding?: "default" | "none";
  children: ReactNode;
}

/**
 * LaunchPulse V5 Framed-Sheet / True-Dark Obsidian 精密应用外壳
 * ---------------------------------------------------------------
 * - 220px L 型外框边栏（--bg-frame）+ 48px 顶栏面包屑
 * - 8px 圆角内嵌工作纸（--bg-sheet + 1px --border-hairline，零投影）
 * - 移动端 (<1024px) 自动收敛为底部 56px 3-Tab 导航栏
 */
export default function AppShell({
  navItems,
  activeKey,
  onSelect,
  breadcrumbRoot,
  breadcrumbCurrent,
  sidebarTopSlot,
  sidebarFooter,
  headerActions,
  onOpenCommand,
  commandLabel = "快速跳转",
  sheetPadding = "default",
  children,
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-[var(--bg-frame)] text-[var(--ink-primary)] flex">
      {/* 桌面端 220px 左侧导航栏 */}
      <aside className="hidden lg:flex lg:flex-col w-[224px] shrink-0 bg-[var(--bg-frame)] select-none">
        {/* 顶部品牌区（与右侧 48px 顶栏严格齐平） */}
        <div className="h-12 px-4 flex items-center justify-between gap-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-semibold text-[14.5px] tracking-tight text-[var(--ink-primary)]"
          >
            <BrandMark className="w-5 h-5" />
            <span>LaunchPulse</span>
          </Link>
        </div>

        {/* 项目切换器 + ⌘K 命令面板入口 */}
        <div className="px-3 pt-1 pb-2 space-y-2">
          {sidebarTopSlot}
          {onOpenCommand && (
            <button
              type="button"
              onClick={onOpenCommand}
              className="w-full h-8 px-2.5 rounded-[7px] border border-[var(--border-hairline)] bg-[var(--bg-sheet)] hover:border-[var(--border-strong)] text-[12.5px] text-[var(--ink-muted)] flex items-center justify-between lp-ease cursor-pointer"
            >
              <span className="inline-flex items-center gap-2 truncate">
                <Search className="w-3.5 h-3.5 shrink-0" strokeWidth={1.7} />
                <span className="truncate">{commandLabel}</span>
              </span>
              <kbd className="lp-kbd">⌘K</kbd>
            </button>
          )}
        </div>

        {/* 3 大高频核心导航区 */}
        <nav className="flex-1 px-2.5 py-2 space-y-0.5 overflow-y-auto" aria-label="主导航">
          {navItems.map((item) => {
            const active = item.key === activeKey;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onSelect(item.key)}
                className={`w-full h-9 px-2.5 rounded-[7px] text-[13px] flex items-center justify-between gap-2 lp-ease cursor-pointer ${
                  active
                    ? "bg-[var(--bg-hover)] text-[var(--ink-primary)] font-semibold"
                    : "text-[var(--ink-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--ink-primary)] font-medium"
                }`}
              >
                <span className="inline-flex items-center gap-2.5 min-w-0">
                  <span className={active ? "text-[var(--ink-primary)]" : "text-[var(--ink-muted)]"}>
                    {item.icon}
                  </span>
                  <span className="truncate">{item.label}</span>
                </span>
                {item.badge !== undefined && item.badge !== "" && (
                  <span
                    className={`px-1.5 py-0.5 rounded-[5px] text-[11px] font-mono tabular-nums ${
                      active
                        ? "bg-[var(--bg-sheet)] text-[var(--ink-primary)] border border-[var(--border-hairline)]"
                        : "bg-[var(--bg-surface)] text-[var(--ink-muted)]"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* 静音底栏收纳区 */}
        {sidebarFooter && (
          <div className="px-3 py-3 border-t border-[var(--border-hairline)]">{sidebarFooter}</div>
        )}
      </aside>

      {/* 右侧主区域：48px 面包屑顶栏 + 内嵌 1px 工作纸 */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen pb-16 lg:pb-0">
        <header className="h-12 px-3 sm:px-5 lg:pl-2 lg:pr-4 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0 text-[13px]">
            <Link href="/" className="lg:hidden inline-flex items-center shrink-0">
              <BrandMark className="w-5 h-5" />
            </Link>
            <span className="hidden sm:inline text-[var(--ink-muted)] truncate max-w-[160px]">
              {breadcrumbRoot}
            </span>
            <span className="hidden sm:inline text-[var(--border-strong)]">/</span>
            <span className="font-medium text-[var(--ink-primary)] truncate">{breadcrumbCurrent}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onOpenCommand && (
              <button
                type="button"
                onClick={onOpenCommand}
                aria-label="打开命令面板"
                className="lg:hidden h-7 px-2 rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-sheet)] text-[var(--ink-muted)] inline-flex items-center gap-1 text-[11px] cursor-pointer"
              >
                <Search className="w-3.5 h-3.5" />
              </button>
            )}
            <LangSwitcher />
            <div className="sm:block lg:hidden hidden">
              <ThemeSwitcher />
            </div>
            {headerActions}
          </div>
        </header>

        {/* Framed Sheet 内嵌主画布：仅 1px hairline，零 shadow */}
        <main className="flex-1 min-w-0 px-2 sm:px-3 lg:pl-0 lg:pr-3 pb-3 flex flex-col">
          <div
            className={`flex-1 rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-sheet)] overflow-hidden flex flex-col ${
              sheetPadding === "default" ? "" : ""
            }`}
          >
            {children}
          </div>
        </main>
      </div>

      {/* 移动端 (<1024px) 底部 56px 精密 3-Tab 导航 */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 h-14 bg-[var(--bg-sheet)] border-t border-[var(--border-hairline)] grid"
        style={{ gridTemplateColumns: `repeat(${Math.max(1, navItems.length)}, minmax(0, 1fr))` }}
        aria-label="移动端主导航"
      >
        {navItems.map((item) => {
          const active = item.key === activeKey;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onSelect(item.key)}
              className={`flex flex-col items-center justify-center gap-0.5 text-[11px] lp-ease cursor-pointer ${
                active ? "text-[var(--accent-primary)] font-semibold" : "text-[var(--ink-muted)]"
              }`}
            >
              <span>{item.icon}</span>
              <span className="truncate max-w-[92px]">{item.mobileLabel || item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
