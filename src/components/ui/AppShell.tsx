"use client";

import type { ReactNode } from "react";
import Link from "next/link";
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
import { Button } from "@/components/ui/button";
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
 * LaunchPulse 统一应用外壳
 * - 支持多分组侧边栏导航（navGroups），消除导航饥饿感
 * - 支持 opsMode 内部履约视觉隔离（独立色标与品牌副标题）
 * - 支持图标轨折叠（⌘B）、移动端原装 Sheet 抽屉与全局命令面板（⌘K）
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

  return (
    <SidebarProvider defaultOpen={true}>
      <Sidebar collapsible="icon" variant="inset">
        <SidebarHeader className="gap-2.5 pb-1">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" render={<Link href="/" />}>
                <div
                  className={`flex aspect-square size-8 items-center justify-center rounded-lg shadow-xs ${
                    opsMode
                      ? "bg-amber-600 text-white dark:bg-amber-500 dark:text-slate-950"
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  <BrandMark className="size-4" tone="light" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold tracking-tight flex items-center gap-1.5">
                    LaunchPulse
                    {opsMode && (
                      <Badge variant="warning" className="h-4 px-1.5 text-[10px] font-semibold">
                        OPS
                      </Badge>
                    )}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">{brandSubtitle}</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>

          {sidebarTopSlot && <div className="px-1 group-data-[collapsible=icon]:hidden">{sidebarTopSlot}</div>}
        </SidebarHeader>

        <SidebarContent className="gap-1">
          {groups.map((grp) => (
            <SidebarGroup key={grp.label} className="py-1.5">
              <SidebarGroupLabel className="text-[11px] font-medium tracking-wide text-muted-foreground/85">
                {grp.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {grp.items.map((item) => {
                    const active = item.key === activeKey;
                    return (
                      <SidebarMenuItem key={item.key}>
                        <SidebarMenuButton
                          isActive={active}
                          disabled={item.disabled}
                          tooltip={item.label}
                          onClick={() => !item.disabled && onSelect(item.key)}
                          className="cursor-pointer font-medium data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground"
                        >
                          {item.icon}
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                        {item.badge !== undefined && item.badge !== "" && (
                          <SidebarMenuBadge className="tabular-nums text-[11px] text-muted-foreground">
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

        {sidebarFooter && <SidebarFooter className="border-t border-sidebar-border/70 pt-2">{sidebarFooter}</SidebarFooter>}
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="min-w-0 overflow-x-hidden">
        {opsMode && (
          <div className="h-1 w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 shrink-0" />
        )}
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between gap-2 border-b bg-card/85 backdrop-blur-md px-4">
          <div className="flex min-w-0 items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-1 data-vertical:h-4 data-vertical:self-center" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden sm:block">
                  <span className="text-muted-foreground text-xs font-medium">{breadcrumbRoot}</span>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden sm:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-semibold text-sm truncate max-w-[160px] sm:max-w-none">
                    {breadcrumbCurrent}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {onOpenCommand && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-label={commandLabel}
                onClick={onOpenCommand}
                className="h-8 gap-2 text-muted-foreground font-normal px-2.5 bg-background/70"
              >
                <IconSearch className="size-3.5" />
                <span className="hidden md:inline text-xs">{commandLabel}</span>
                <Kbd className="hidden md:inline-flex">⌘K</Kbd>
              </Button>
            )}
            <LangSwitcher />
            <ThemeModeToggle />
            {headerActions}
          </div>
        </header>

        <div className="flex flex-1 flex-col min-w-0">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
