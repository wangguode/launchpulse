"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  IconActivity,
  IconCheck,
  IconCopy,
  IconCreditCard,
  IconExternalLink,
  IconGlobe,
  IconLock,
  IconLogout,
  IconRefresh,
  IconSearch,
  IconShieldCheck,
} from "@tabler/icons-react";
import { useI18n } from "@/components/I18nProvider";
import BrandMark from "@/components/BrandMark";
import LangSwitcher from "@/components/LangSwitcher";
import { ThemeModeToggle } from "@/components/themes/theme-mode-toggle";
import AppShell, { type ShellNavItem } from "@/components/ui/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DISTRIBUTION_DIRECTORIES, type DirectoryChannel } from "@/data/directories";

interface AdminPayload {
  syncedAt: string;
  kpis: {
    totalUsers: number;
    totalCampaigns: number;
    totalOrders: number;
    totalRevenueUsd: number;
    activeMrrUsd: number;
    totalClicks: number;
    totalConversions: number;
    overallCvr: number;
  };
  users: Array<{ id: number; email: string; name: string; role: string; created_at: string }>;
  campaigns: Array<{
    id: number;
    user_email: string;
    slug: string;
    product_name: string;
    target_url: string;
    tagline?: string;
    updated_at: string;
  }>;
  orders: Array<{
    order_id: string;
    customer_email: string;
    plan: string;
    amount_usd: number;
    status: string;
    created_at: string;
  }>;
  directories: Array<{
    customer_email: string;
    directory_id: string;
    directory_name: string;
    status: "queued" | "submitted" | "live";
    live_backlink_url: string;
    updated_at: string;
  }>;
  brandKits?: Array<{
    campaign_id: number;
    user_email: string;
    logo_url: string;
    screenshots_json: string;
    short_tagline: string;
    medium_pitch: string;
    long_description: string;
    pricing_model: string;
    categories_json: string;
    competitors_json: string;
    founder_name: string;
    founder_x: string;
    completeness_score: number;
  }>;
  directoryHealth?: Array<{
    customer_email: string;
    directory_id: string;
    moderation_state: "approved" | "skipped" | "priority";
    scheduled_wave: number;
    proof_screenshot_url: string;
    last_http_status: number;
    is_dofollow_verified: number;
    last_checked_at: string;
  }>;
}

type AdminTab = "overview" | "directories" | "orders";

/**
 * 官方 shadcn/ui 运营履约台（/admin）
 */
export default function AdminConsolePage() {
  const { locale } = useI18n();
  const isZh = locale === "zh";

  const [adminKey, setAdminKey] = useState("");
  const [data, setData] = useState<AdminPayload | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<AdminTab>("overview");
  const [selectedEmail, setSelectedEmail] = useState("");
  const [dirSearch, setDirSearch] = useState("");
  const [savingDirId, setSavingDirId] = useState<string | null>(null);
  const [urlDrafts, setUrlDrafts] = useState<Record<string, string>>({});
  const [verifying, setVerifying] = useState(false);
  const [copiedKit, setCopiedKit] = useState(false);

  const fetchAdminData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/dashboard");
      if (res.status === 401) {
        setData(null);
        return;
      }
      if (res.ok) {
        const json = (await res.json()) as AdminPayload;
        setData(json);
        setSelectedEmail((prev) => prev || json.campaigns[0]?.user_email || json.users[0]?.email || "");
      }
    } finally {
      setLoading(false);
      setCheckingAuth(false);
    }
  }, []);

  useEffect(() => {
    void fetchAdminData();
  }, [fetchAdminData]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: adminKey.trim() }),
      });
      if (!res.ok) {
        setError(isZh ? "管理员密钥错误，请核对后重试。" : "Invalid administrator key.");
        setLoading(false);
        return;
      }
      setAdminKey("");
      await fetchAdminData();
    } catch {
      setError(isZh ? "网络异常，请稍后重试。" : "Network error.");
      setLoading(false);
    }
  };

  const handleAdminLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    setData(null);
  };

  const selectedBrandKit = useMemo(() => {
    if (!data || !selectedEmail) return null;
    return (data.brandKits || []).find((b) => b.user_email.toLowerCase() === selectedEmail.toLowerCase()) || null;
  }, [data, selectedEmail]);

  const selectedDirState = useMemo(() => {
    const map = new Map<
      string,
      { status: "queued" | "submitted" | "live"; liveUrl: string; httpStatus: number; mod: string }
    >();
    if (!data || !selectedEmail) return map;
    const em = selectedEmail.toLowerCase();
    for (const h of data.directoryHealth || []) {
      if (h.customer_email.toLowerCase() === em) {
        map.set(h.directory_id, {
          status: "queued",
          liveUrl: "",
          httpStatus: h.last_http_status || 0,
          mod: h.moderation_state,
        });
      }
    }
    for (const d of data.directories) {
      if (d.customer_email.toLowerCase() === em) {
        const cur = map.get(d.directory_id);
        map.set(d.directory_id, {
          status: d.status,
          liveUrl: d.live_backlink_url || "",
          httpStatus: cur?.httpStatus || 0,
          mod: cur?.mod || "approved",
        });
      }
    }
    return map;
  }, [data, selectedEmail]);

  const handleSaveDirectory = async (dir: DirectoryChannel, nextStatus: "queued" | "submitted" | "live") => {
    if (!selectedEmail.trim()) return;
    setSavingDirId(dir.id);
    try {
      const camp = data?.campaigns.find((c) => c.user_email === selectedEmail);
      const cur = selectedDirState.get(dir.id);
      const liveBacklinkUrl = (urlDrafts[dir.id] ?? cur?.liveUrl ?? "").trim();
      const res = await fetch("/api/admin/directory-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerEmail: selectedEmail.trim(),
          slug: camp?.slug || "",
          directoryId: dir.id,
          directoryName: dir.name,
          directoryUrl: dir.url,
          dr: dir.dr,
          category: dir.category,
          status: nextStatus,
          liveBacklinkUrl,
          scheduledWave: dir.wave,
        }),
      });
      if (res.ok) {
        toast.success(isZh ? `${dir.name} 已更新为 ${nextStatus}` : `Updated ${dir.name}`);
        await fetchAdminData();
      }
    } finally {
      setSavingDirId(null);
    }
  };

  const handleTriggerVerify = async () => {
    setVerifying(true);
    try {
      const res = await fetch("/api/admin/verify-backlinks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerEmail: selectedEmail.trim() }),
      });
      const json = (await res.json()) as { checked?: number; verifiedLive?: number; dofollowCount?: number };
      if (res.ok) {
        toast.success(
          isZh
            ? `验活完成：检测 ${json.checked || 0} 条，存活 ${json.verifiedLive || 0} 条（传权重 ${json.dofollowCount || 0} 条）`
            : `Checked ${json.checked || 0}: ${json.verifiedLive || 0} live (${json.dofollowCount || 0} dofollow)`
        );
        await fetchAdminData();
      }
    } finally {
      setVerifying(false);
    }
  };

  const handleCopyBrandKit = async () => {
    if (!selectedBrandKit) return;
    const text = [
      `Email: ${selectedEmail}`,
      `Tagline: ${selectedBrandKit.short_tagline}`,
      `Pitch: ${selectedBrandKit.medium_pitch}`,
      `Long: ${selectedBrandKit.long_description}`,
      `Pricing: ${selectedBrandKit.pricing_model}`,
      `Logo: ${selectedBrandKit.logo_url}`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKit(true);
      toast.success(isZh ? "客户 Brand Kit 已复制" : "Brand Kit copied");
      setTimeout(() => setCopiedKit(false), 1600);
    } catch {
      // ignore
    }
  };

  const filteredDirs = useMemo(() => {
    const q = dirSearch.trim().toLowerCase();
    return DISTRIBUTION_DIRECTORIES.filter((d) => !q || `${d.name} ${d.url} dr${d.dr}`.toLowerCase().includes(q));
  }, [dirSearch]);

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-background text-muted-foreground flex items-center justify-center text-sm">
        {isZh ? "正在验证运营台会话..." : "Checking admin session..."}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <header className="h-14 border-b px-4 sm:px-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold text-sm tracking-tight">
            <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <BrandMark className="size-4" tone="light" />
            </div>
            <span>LaunchPulse</span>
          </Link>
          <div className="flex items-center gap-1.5">
            <LangSwitcher />
            <ThemeModeToggle />
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-sm">
            <CardHeader>
              <div className="flex size-9 items-center justify-center rounded-lg border bg-muted mb-2">
                <IconLock className="size-4 text-primary" />
              </div>
              <CardTitle>{isZh ? "运营履约台鉴权" : "Operations Console"}</CardTitle>
              <CardDescription>
                {isZh ? "输入管理员密钥，服务端签发 HttpOnly 安全会话。" : "Sign in with your administrator key."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="admin-key">{isZh ? "管理员密钥" : "Admin Key"}</Label>
                  <Input
                    id="admin-key"
                    type="password"
                    required
                    value={adminKey}
                    onChange={(e) => setAdminKey(e.target.value)}
                    placeholder="••••••••••••"
                    className="font-mono"
                  />
                </div>
                {error && <p className="text-xs text-destructive">{error}</p>}
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? (isZh ? "验证中..." : "Verifying...") : isZh ? "验证并进入履约台" : "Unlock Console"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const navItems: ShellNavItem[] = [
    { key: "overview", label: isZh ? "运营总览" : "Overview", icon: <IconActivity className="size-4" /> },
    {
      key: "directories",
      label: isZh ? "100 目录履约" : "Fulfillment",
      icon: <IconGlobe className="size-4" />,
      badge: DISTRIBUTION_DIRECTORIES.length,
    },
    {
      key: "orders",
      label: isZh ? "订单与客户" : "Orders & Users",
      icon: <IconCreditCard className="size-4" />,
      badge: data.orders.length,
    },
  ];

  const customerEmails = Array.from(
    new Set([...data.campaigns.map((c) => c.user_email), ...data.users.map((u) => u.email)])
  ).filter(Boolean);

  return (
    <AppShell
      navItems={navItems}
      activeKey={tab}
      onSelect={(k) => setTab(k as AdminTab)}
      breadcrumbRoot={isZh ? "运营履约台" : "Operations"}
      breadcrumbCurrent={navItems.find((n) => n.key === tab)?.label || ""}
      navGroupLabel={isZh ? "运营管理" : "Admin"}
      headerActions={
        <Button variant="outline" size="sm" className="h-8" disabled={loading} onClick={() => void fetchAdminData()}>
          <IconRefresh className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          {isZh ? "刷新" : "Sync"}
        </Button>
      }
      sidebarTopSlot={
        <Select value={selectedEmail || "__none__"} onValueChange={(v) => v && v !== "__none__" && setSelectedEmail(String(v))}>
          <SelectTrigger className="w-full h-8 bg-background text-xs font-medium" aria-label={isZh ? "选择履约客户" : "Select customer"}>
            <SelectValue>{selectedEmail || (isZh ? "暂无客户" : "No customers")}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {customerEmails.length === 0 ? (
              <SelectItem value="__none__">{isZh ? "暂无客户" : "No customers"}</SelectItem>
            ) : (
              customerEmails.map((em) => (
                <SelectItem key={em} value={em}>
                  {em}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      }
      sidebarFooter={
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleAdminLogout} className="cursor-pointer">
              <IconLogout className="size-4" />
              <span>{isZh ? "退出运营台" : "Log out"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      }
    >
      {tab === "overview" && (
        <div className="p-4 md:p-6 space-y-6 tabular-nums">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {isZh ? "平台实时运营与履约总览" : "Platform Operations Overview"}
              </h1>
              <p className="text-xs text-muted-foreground mt-1">
                {isZh ? `最近同步：${data.syncedAt}` : `Synced at ${data.syncedAt}`}
              </p>
            </div>
            <Button size="sm" disabled={verifying} onClick={handleTriggerVerify}>
              <IconShieldCheck className="size-4" />
              {verifying ? (isZh ? "验活中..." : "Checking...") : isZh ? "批量执行外链 HTTP 验活" : "Verify Live Backlinks"}
            </Button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: isZh ? "累计美元收款" : "Total Revenue", val: `$${data.kpis.totalRevenueUsd.toLocaleString()}` },
              { label: isZh ? "月度经常性收入" : "Active MRR", val: `$${data.kpis.activeMrrUsd.toLocaleString()}` },
              { label: isZh ? "活跃项目 / 注册用户" : "Projects / Users", val: `${data.kpis.totalCampaigns} / ${data.kpis.totalUsers}` },
              { label: isZh ? "全站累计点击 / 转化" : "Clicks / Conversions", val: `${data.kpis.totalClicks} / ${data.kpis.totalConversions}` },
            ].map((m, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <CardDescription>{m.label}</CardDescription>
                  <CardTitle className="text-2xl font-mono">{m.val}</CardTitle>
                </CardHeader>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{isZh ? "待履约客户项目队列" : "Customer Workspaces"}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isZh ? "产品名称" : "Product"}</TableHead>
                    <TableHead>{isZh ? "客户邮箱" : "Customer"}</TableHead>
                    <TableHead>{isZh ? "官网地址" : "URL"}</TableHead>
                    <TableHead className="text-right">{isZh ? "履约操作" : "Action"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.campaigns.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                        {isZh ? "暂无客户项目" : "No campaigns yet"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.campaigns.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.product_name}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{c.user_email}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{c.target_url}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => {
                              setSelectedEmail(c.user_email);
                              setTab("directories");
                            }}
                          >
                            {isZh ? "进入 100 目录履约" : "Fulfill Directories"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "directories" && (
        <div className="p-4 md:p-6 space-y-4 tabular-nums">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold tracking-tight">
                {isZh ? `客户外链履约：${selectedEmail || "未选择"}` : `Fulfillment: ${selectedEmail || "None"}`}
              </h1>
              {selectedBrandKit && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                  {selectedBrandKit.short_tagline || selectedBrandKit.medium_pitch}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {selectedBrandKit && (
                <Button variant="outline" size="sm" onClick={handleCopyBrandKit}>
                  {copiedKit ? <IconCheck className="size-3.5" /> : <IconCopy className="size-3.5" />}
                  {isZh ? "复制客户资料包" : "Copy Brand Kit"}
                </Button>
              )}
              <Button size="sm" disabled={verifying} onClick={handleTriggerVerify}>
                <IconShieldCheck className="size-3.5" />
                {isZh ? "一键 HTTP 验活" : "Verify HTTP"}
              </Button>
            </div>
          </div>

          <div className="relative max-w-xs">
            <IconSearch className="size-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
            <Input
              value={dirSearch}
              onChange={(e) => setDirSearch(e.target.value)}
              placeholder={isZh ? "过滤目录名称..." : "Filter directories..."}
              className="h-8 pl-8 text-xs"
            />
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isZh ? "目录平台" : "Directory"}</TableHead>
                    <TableHead>DR</TableHead>
                    <TableHead>{isZh ? "当前状态" : "Status"}</TableHead>
                    <TableHead>{isZh ? "已收录外链回填地址" : "Live Backlink URL"}</TableHead>
                    <TableHead className="text-right">{isZh ? "快速切换" : "Update"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDirs.map((dir) => {
                    const st = selectedDirState.get(dir.id);
                    const status = st?.status || "queued";
                    const draftUrl = urlDrafts[dir.id] ?? st?.liveUrl ?? "";
                    return (
                      <TableRow key={dir.id}>
                        <TableCell>
                          <a
                            href={dir.submitUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium hover:underline inline-flex items-center gap-1"
                          >
                            {dir.name}
                            <IconExternalLink className="size-3 opacity-60" />
                          </a>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{dir.dr}</TableCell>
                        <TableCell>
                          <Badge variant={status === "live" ? "default" : status === "submitted" ? "secondary" : "outline"}>
                            {status === "live"
                              ? isZh
                                ? "已验活"
                                : "Live"
                              : status === "submitted"
                                ? isZh
                                  ? "已提交"
                                  : "Submitted"
                                : isZh
                                  ? "待提交"
                                  : "Queued"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={draftUrl}
                            onChange={(e) => setUrlDrafts((prev) => ({ ...prev, [dir.id]: e.target.value }))}
                            placeholder="https://..."
                            className="h-7 font-mono text-xs min-w-[200px]"
                          />
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              disabled={savingDirId === dir.id}
                              onClick={() => void handleSaveDirectory(dir, "submitted")}
                            >
                              {isZh ? "标已提交" : "Sub"}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              disabled={savingDirId === dir.id}
                              onClick={() => void handleSaveDirectory(dir, "live")}
                            >
                              {isZh ? "标已收录" : "Live"}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "orders" && (
        <div className="p-4 md:p-6 space-y-4 tabular-nums">
          <h1 className="text-2xl font-bold tracking-tight">{isZh ? "付费订单与注册客户" : "Orders & Users"}</h1>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isZh ? "订单号" : "Order ID"}</TableHead>
                    <TableHead>{isZh ? "客户邮箱" : "Customer"}</TableHead>
                    <TableHead>{isZh ? "方案" : "Plan"}</TableHead>
                    <TableHead>{isZh ? "金额" : "Amount"}</TableHead>
                    <TableHead>{isZh ? "状态" : "Status"}</TableHead>
                    <TableHead>{isZh ? "时间" : "Date"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.orders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        {isZh ? "暂无已支付订单" : "No orders yet"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.orders.map((o) => (
                      <TableRow key={o.order_id}>
                        <TableCell className="font-mono text-xs">{o.order_id}</TableCell>
                        <TableCell className="font-mono text-xs">{o.customer_email}</TableCell>
                        <TableCell>{o.plan}</TableCell>
                        <TableCell className="font-mono font-semibold">${o.amount_usd}</TableCell>
                        <TableCell>
                          <Badge variant={o.status === "active" ? "default" : "secondary"}>{o.status}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{o.created_at}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </AppShell>
  );
}
