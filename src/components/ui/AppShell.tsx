"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { IconSearch } from "@tabler/icons-react";
import BrandMark from "@/components/BrandMark";
import LangSwitcher from "@/components/LangSwitcher";
import { ThemeModeToggle } from "@/components/themes/theme-mode-toggle";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Kbd } from "@/components/ui/kbd";

export interface ShellNavItem {
  key: string;
  label: string;
  mobileLabel?: string;
  icon: ReactNode;
  badge?: string | number;
  disabled?: boolean;
}

export interface ShellNavGroup {
  label: string;
  items: ShellNavItem[];
}

interface AppShellProps {
  navItems?: ShellNavItem[];
  navGroups?: ShellNavGroup[];
  activeKey: string;
  onSelect: (key: string) => void;
  breadcrumbRoot: string;
  breadcrumbCurrent: string;
  navGroupLabel?: string;
  brandSubtitle?: string;
  opsMode?: boolean;
  sidebarTopSlot?: ReactNode;
  sidebarFooter?: ReactNode;
  headerActions?: ReactNode;
  onOpenCommand?: () => void;
  commandLabel?: string;
  children: ReactNode;
}

/**
 * LaunchPulse V8 光学磨砂悬浮应用外壳
 * - 左侧悬浮高透光亚克力导航舱 + Motion 物理弹簧激活滑块（layoutId）
 * - 顶部悬浮毛玻璃指令舱（⌘K 搜索槽 + 语言切换 + 圆弧过渡深浅色）
 */
export default function AppShell({
  navItems = [],
  navGroups,
  activeKey,
  onSelect,
  breadcrumbRoot,
  breadcrumbCurrent,
  navGroupLabel = "工作台",
  brandSubtitle = "Growth Console",
  opsMode = false,
  sidebarTopSlot,
  sidebarFooter,
  headerActions,
  onOpenCommand,
  commandLabel = "快速搜索...",
  children,
}: AppShellProps) {
  const groups: ShellNavGroup[] =
    navGroups && navGroups.length > 0 ? navGroups : [{ label: navGroupLabel, items: navItems }];
  const pillLayoutId = opsMode ? "lp-ops-active-pill" : "lp-console-active-pill";

  return (
    <SidebarProvider defaultOpen={true}>
      <Sidebar collapsible="icon" variant="inset">
        <SidebarHeader className="gap-3 p-3 pb-1.5">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" render={<Link href="/" />} className="hover:bg-transparent">
                <div
                  className={`flex aspect-square size-8 items-center justify-center rounded-[10px] ${
                    opsMode
                      ? "bg-amber-600 text-white shadow-sm dark:bg-amber-500 dark:text-slate-950"
                      : "lp-btn-bevel"
                  }`}
                >
                  <BrandMark className="size-4" tone="light" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold tracking-tight flex items-center gap-1.5 text-[15px]">
                    LaunchPulse
                    {opsMode ? (
                      <Badge variant="warning" className="h-4.5 px-1.5 text-[10px] font-semibold">
                        OPS
                      </Badge>
                    ) : (
                      <span className="rounded-full bg-accent-cobalt/12 px-2 py-0.5 text-[10.5px] font-semibold text-accent-cobalt">
                        PRO
                      </span>
                    )}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">{brandSubtitle}</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>

          {sidebarTopSlot && <div className="px-0.5 group-data-[collapsible=icon]:hidden">{sidebarTopSlot}</div>}
        </SidebarHeader>

        <SidebarContent className="gap-1 px-1.5">
          {groups.map((grp) => (
            <SidebarGroup key={grp.label} className="py-1.5 px-1.5">
              <SidebarGroupLabel className="text-xs font-medium text-muted-foreground/85 px-2.5">
                {grp.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-1">
                  {grp.items.map((item) => {
                    const active = item.key === activeKey;
                    return (
                      <SidebarMenuItem key={item.key} className="relative">
                        {active && (
                          <motion.div
                            layoutId={pillLayoutId}
                            transition={{ type: "spring", stiffness: 430, damping: 34 }}
                            className="lp-frost-pill pointer-events-none absolute inset-0 rounded-[11px]"
                          />
                        )}
                        <SidebarMenuButton
                          isActive={active}
                          disabled={item.disabled}
                          tooltip={item.label}
                          onClick={() => !item.disabled && onSelect(item.key)}
                          className="relative z-10 h-9.5 rounded-[11px] px-2.5 text-[14px] cursor-pointer font-normal data-[active=true]:bg-transparent data-[active=true]:font-medium data-[active=true]:text-foreground hover:bg-slate-400/[0.08]"
                        >
                          {item.icon}
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                        {item.badge !== undefined && item.badge !== "" && (
                          <SidebarMenuBadge className="z-10 tabular-nums text-xs text-muted-foreground top-2 right-2">
                            {item.badge}
                          </SidebarMenuBadge>
                        )}
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>

        {sidebarFooter && (
          <SidebarFooter className="border-t border-sidebar-border/70 p-3 pt-2.5">{sidebarFooter}</SidebarFooter>
        )}
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="min-w-0 overflow-x-hidden">
        <header className="lp-frosted-topbar sticky top-3 z-20 mx-3 md:mx-0 flex h-14 shrink-0 items-center justify-between gap-3 rounded-2xl px-4">
          <div className="flex min-w-0 items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-1 data-vertical:h-4 data-vertical:self-center" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden sm:block">
                  <span className="text-muted-foreground text-[13.5px]">{breadcrumbRoot}</span>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden sm:block opacity-50" />
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-medium text-[14px] truncate max-w-[160px] sm:max-w-none">
                    {breadcrumbCurrent}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          {onOpenCommand && (
            <button
              type="button"
              aria-label={commandLabel}
              onClick={onOpenCommand}
              className="lp-frost-well hidden lg:flex h-9 w-[340px] items-center justify-between rounded-[11px] px-3 text-[13px] text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
            >
              <span className="inline-flex items-center gap-2 truncate">
                <IconSearch className="size-3.5 shrink-0 opacity-70" />
                <span className="truncate">{commandLabel}</span>
              </span>
              <Kbd className="lp-frost-pill border-none">⌘ K</Kbd>
            </button>
          )}

          <div className="flex shrink-0 items-center gap-2">
            {onOpenCommand && (
              <button
                type="button"
                aria-label={commandLabel}
                onClick={onOpenCommand}
                className="lp-frost-pill flex lg:hidden size-8 items-center justify-center rounded-[9px] text-muted-foreground"
              >
                <IconSearch className="size-4" />
              </button>
            )}
            <LangSwitcher />
            <ThemeModeToggle />
            {headerActions}
          </div>
        </header>

        <div className="flex flex-1 flex-col min-w-0 pt-2">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
