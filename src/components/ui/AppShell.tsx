"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { IconSearch } from "@tabler/icons-react";
import BrandMark from "@/components/BrandMark";
import LangSwitcher from "@/components/LangSwitcher";
import { ThemeSelector } from "@/components/themes/theme-selector";
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
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";

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
  navGroupLabel?: string;
  sidebarTopSlot?: ReactNode;
  sidebarFooter?: ReactNode;
  headerActions?: ReactNode;
  onOpenCommand?: () => void;
  commandLabel?: string;
  children: ReactNode;
}

/**
 * 基于 Kiranism/next-shadcn-dashboard-starter (MIT) 原装 SidebarProvider 重构的应用外壳
 * - 支持图标轨折叠（⌘B）、移动端原装 Sheet 抽屉、10 套 shadcn 主题实时切换与视图过渡动画
 */
export default function AppShell({
  navItems,
  activeKey,
  onSelect,
  breadcrumbRoot,
  breadcrumbCurrent,
  navGroupLabel = "核心工作台",
  sidebarTopSlot,
  sidebarFooter,
  headerActions,
  onOpenCommand,
  commandLabel = "快速搜索...",
  children,
}: AppShellProps) {
  return (
    <SidebarProvider defaultOpen={true}>
      <Sidebar collapsible="icon" variant="inset">
        <SidebarHeader className="gap-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" render={<Link href="/" />}>
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <BrandMark className="size-4" tone="light" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">LaunchPulse</span>
                  <span className="truncate text-xs text-muted-foreground">Growth Command</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>

          {sidebarTopSlot && <div className="px-1 group-data-[collapsible=icon]:hidden">{sidebarTopSlot}</div>}
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>{navGroupLabel}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => {
                  const active = item.key === activeKey;
                  return (
                    <SidebarMenuItem key={item.key}>
                      <SidebarMenuButton
                        isActive={active}
                        tooltip={item.label}
                        onClick={() => onSelect(item.key)}
                        className="cursor-pointer"
                      >
                        {item.icon}
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                      {item.badge !== undefined && item.badge !== "" && (
                        <SidebarMenuBadge className="tabular-nums">{item.badge}</SidebarMenuBadge>
                      )}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        {sidebarFooter && <SidebarFooter>{sidebarFooter}</SidebarFooter>}
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="min-w-0">
        {/* Kiranism 原装标准顶栏：SidebarTrigger + Breadcrumb + Search + ThemeMode + ThemeSelector */}
        <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b px-4">
          <div className="flex min-w-0 items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-1 data-vertical:h-4 data-vertical:self-center" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden sm:block">
                  <span className="text-muted-foreground">{breadcrumbRoot}</span>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden sm:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-medium truncate max-w-[160px] sm:max-w-none">
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
                onClick={onOpenCommand}
                className="h-8 gap-2 text-muted-foreground font-normal px-2.5"
              >
                <IconSearch className="size-3.5" />
                <span className="hidden md:inline text-xs">{commandLabel}</span>
                <Kbd className="hidden md:inline-flex">⌘K</Kbd>
              </Button>
            )}
            <LangSwitcher />
            <ThemeModeToggle />
            <div className="hidden xl:block">
              <ThemeSelector />
            </div>
            {headerActions}
          </div>
        </header>

        <div className="flex flex-1 flex-col min-w-0">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
