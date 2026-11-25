"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  Check,
  Copy,
  CreditCard,
  Globe,
  Lock,
  LogOut,
  RefreshCw,
  Terminal,
  Users,
} from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import BrandMark from "@/components/BrandMark";
import LangSwitcher from "@/components/LangSwitcher";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import AppShell, { type ShellNavItem } from "@/components/ui/AppShell";
import Button from "@/components/ui/Button";
import MetricStrip from "@/components/ui/MetricStrip";
import StatusBadge from "@/components/ui/StatusBadge";
import DirectoryTable, { type LiveDirState } from "@/components/console/DirectoryTable";
import type { DirectoryChannel } from "@/data/directories";
import { V2_DICTIONARIES } from "@/lib/v2-i18n";

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
  outreach?: Array<{
    slug: string;
    recipient_email: string;
    page_views: number;
    max_video_seconds: number;
    buyer_clicks: number;
    last_event_at: string;
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
 * V3 生产级运营管理后台（/admin）：
 * 1. 使用服务端 HttpOnly Admin Cookie 鉴权（前端零明文密钥存储）；
 * 2. 与 /dashboard 共享 100% 同源 AppShell / MetricStrip / DirectoryTable 原语；
 * 3. 支持外联热力表（outreach_logs）监控 + 客户级 50 目录表格行内快速履约。
 */
export default function AdminConsolePage() {
  const { locale } = useI18n();
  const v2 = V2_DICTIONARIES[locale];
  const isZh = locale === "zh";

  const [adminKey, setAdminKey] = useState("");
  const [data, setData] = useState<AdminPayload | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<AdminTab>("overview");
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [copiedKit, setCopiedKit] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState("");

  const fetchAdminData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/dashboard");
      if (res.status === 401) {
        setData(null);
        return false;
      }
      if (res.ok) {
        const json = (await res.json()) as AdminPayload;
        setData(json);
        setSelectedEmail((prev) => {
          if (prev) return prev;
          return json.campaigns[0]?.user_email || json.users[0]?.email || "";
        });
        return true;
      }
      return false;
    } catch {
      setError("Network error loading admin console.");
      return false;
    } finally {
      setLoading(false);
      setCheckingAuth(false);
    }
  }, []);

  useEffect(() => {
    fetchAdminData();
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
      setError("Network error.");
      setLoading(false);
    }
  };

  const handleAdminLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    setData(null);
  };

  const selectedDirMap = useMemo(() => {
    const map: Record<string, LiveDirState> = {};
    if (!data || !selectedEmail) return map;
    const em = selectedEmail.toLowerCase();
    for (const h of data.directoryHealth || []) {
      if (h.customer_email.toLowerCase() === em) {
        map[h.directory_id] = {
          status: "queued",
          moderationState: h.moderation_state,
          scheduledWave: h.scheduled_wave,
          proofScreenshotUrl: h.proof_screenshot_url,
          lastHttpStatus: h.last_http_status,
          isDofollowVerified: Boolean(h.is_dofollow_verified),
          lastCheckedAt: h.last_checked_at,
        };
      }
    }
    for (const row of data.directories) {
      if (row.customer_email.toLowerCase() === em) {
        map[row.directory_id] = {
          ...(map[row.directory_id] || {}),
          status: row.status,
          liveBacklinkUrl: row.live_backlink_url,
          updatedAt: row.updated_at,
        };
      }
    }
    return map;
  }, [data, selectedEmail]);

  const selectedBrandKit = useMemo(() => {
    if (!data || !selectedEmail) return null;
    return (data.brandKits || []).find((b) => b.user_email.toLowerCase() === selectedEmail.toLowerCase()) || null;
  }, [data, selectedEmail]);

  const handleInlineSave = async (
    dir: DirectoryChannel,
    status: "queued" | "submitted" | "live",
    liveBacklinkUrl: string,
    proofScreenshotUrl?: string,
    scheduledWave?: number
  ) => {
    if (!selectedEmail.trim()) return;
    const camp = data?.campaigns.find((c) => c.user_email === selectedEmail);
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
        status,
        liveBacklinkUrl,
        proofScreenshotUrl: proofScreenshotUrl || "",
        scheduledWave: scheduledWave || dir.wave,
      }),
    });
    if (res.ok) {
      await fetchAdminData();
    }
  };

  const handleTriggerVerify = async () => {
    setVerifying(true);
    setVerifyMsg("");
    try {
      const res = await fetch("/api/admin/verify-backlinks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerEmail: selectedEmail.trim() }),
      });
      const json = (await res.json()) as { checked?: number; verifiedLive?: number; dofollowCount?: number };
      if (res.ok) {
        setVerifyMsg(
          isZh
            ? `✓ HTTP 外链验活完成：检测 ${json.checked || 0} 条，存活 ${json.verifiedLive || 0} 条（dofollow ${json.dofollowCount || 0} 条）。`
            : `✓ Verified ${json.checked || 0} URLs: ${json.verifiedLive || 0} HTTP 200 live (${json.dofollowCount || 0} dofollow).`
        );
        await fetchAdminData();
      }
    } finally {
      setVerifying(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[var(--apple-bg)] flex items-center justify-center text-[13px] text-[var(--apple-ink-secondary)]">
        Loading...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[var(--apple-bg)] text-[var(--apple-ink)] flex flex-col">
        <header className="sticky top-0 z-30 apple-glass border-b border-[var(--apple-border)]">
          <div className="max-w-[1080px] mx-auto px-4 sm:px-6 h-12 flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2 font-semibold text-[15px] tracking-tight text-[var(--apple-ink)]"
            >
              <BrandMark className="w-5 h-5" />
              <span>LaunchPulse</span>
            </Link>
            <div className="flex items-center gap-2">
              <div className="hidden sm:block">
                <ThemeSwitcher />
              </div>
              <LangSwitcher />
            </div>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 py-14">
          <form
            onSubmit={handleAdminLogin}
            className="w-full max-w-[400px] rounded-[24px] border border-[var(--apple-border)] bg-[var(--apple-surface)] p-8 shadow-[var(--apple-shadow)] space-y-5"
          >
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-[var(--apple-bg-alt)] border border-[var(--apple-border)]">
                <Lock className="w-4 h-4 text-[var(--apple-ink)]" />
              </div>
              <h1 className="apple-display text-2xl font-semibold text-[var(--apple-ink)]">
                {v2.admin.title}
              </h1>
              <p className="text-[12px] text-[var(--apple-ink-secondary)]">{v2.admin.badge}</p>
            </div>
            <input
              type="password"
              required
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              placeholder={v2.admin.keyPlaceholder}
              className="w-full rounded-[10px] border border-[var(--apple-border-strong)] bg-[var(--apple-bg)] px-3.5 py-2.5 text-[16px] sm:text-[14px] font-mono text-[var(--apple-ink)] focus:border-[var(--apple-blue)] focus:outline-none"
            />
            {error && <p className="text-[12px] text-[var(--apple-red)]">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full" size="md">
              {v2.admin.loginBtn}
            </Button>
          </form>
        </main>
      </div>
    );
  }

  const navItems: ShellNavItem[] = [
    {
      key: "overview",
      label: isZh ? "总览与外联热力" : "Overview & Outreach",
      icon: <Users className="w-4 h-4" />,
      badge: data.kpis.totalUsers,
    },
    {
      key: "directories",
      label: v2.admin.tabDirectories,
      icon: <Globe className="w-4 h-4" />,
      badge: data.campaigns.length,
    },
    {
      key: "orders",
      label: v2.admin.tabOrders,
      icon: <CreditCard className="w-4 h-4" />,
      badge: data.kpis.totalOrders,
    },
  ];

  const currentNav = navItems.find((n) => n.key === tab) || navItems[0];
  const assistCmd = `node scripts/auto-distribute.mjs ${selectedEmail || "<customer-email>"} --limit 10`;
  const allEmails = Array.from(
    new Set([
      ...data.campaigns.map((c) => c.user_email),
      ...data.users.map((u) => u.email),
      ...data.orders.map((o) => o.customer_email),
    ])
  ).filter(Boolean);

  return (
    <AppShell
      scopeBadge="Admin"
      navItems={navItems}
      activeKey={tab}
      onSelect={(k) => setTab(k as AdminTab)}
      title={currentNav.label}
      subtitle={`${data.syncedAt.slice(11, 19)} UTC`}
      headerActions={
        <Button size="sm" onClick={() => fetchAdminData()} disabled={loading}>
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">{v2.admin.refreshBtn}</span>
        </Button>
      }
      sidebarFooter={
        <div className="flex items-center justify-between px-1">
          <Link href="/dashboard" className="text-[12px] text-[var(--apple-blue)] hover:underline">
            ← {v2.nav.dashboard}
          </Link>
          <button
            onClick={handleAdminLogout}
            title={v2.admin.logoutBtn}
            className="p-1.5 rounded-md text-[var(--apple-ink-tertiary)] hover:text-[var(--apple-red)] hover:bg-[var(--apple-hover)] transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      }
    >
      <MetricStrip
        columnsClass="grid-cols-2 md:grid-cols-3 lg:grid-cols-6"
        items={[
          { label: v2.admin.kpiUsers, value: String(data.kpis.totalUsers) },
          { label: v2.admin.kpiCampaigns, value: String(data.kpis.totalCampaigns) },
          { label: v2.admin.kpiRevenue, value: `$${data.kpis.totalRevenueUsd}` },
          { label: v2.admin.kpiMrr, value: `$${data.kpis.activeMrrUsd}` },
          { label: v2.admin.kpiClicks, value: String(data.kpis.totalClicks) },
          { label: v2.admin.kpiCvr, value: `${data.kpis.overallCvr}%`, accent: true },
        ]}
      />

      {tab === "overview" && (
        <div className="space-y-6">
          {/* 外联战情页行为热力监控表（outreach_logs） */}
          <div className="rounded-[18px] border border-[var(--apple-border)] bg-[var(--apple-surface)] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[var(--apple-border)] flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-[14px] font-semibold text-[var(--apple-ink)]">
                <Activity className="w-4 h-4 text-[var(--apple-blue)]" />
                {isZh ? "外联战情页实时热力监控 (outreach_logs)" : "Outreach War-Room Heatmap"}
              </span>
              <span className="text-[12px] text-[var(--apple-ink-tertiary)] tabular-nums">
                {(data.outreach || []).length} targets
              </span>
            </div>
            {(data.outreach || []).length === 0 ? (
              <p className="p-5 text-[13px] text-[var(--apple-ink-tertiary)]">{v2.admin.noData}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[13px] tabular-nums">
                  <thead className="border-b border-[var(--apple-border)] text-[11px] text-[var(--apple-ink-tertiary)]">
                    <tr>
                      <th className="py-2.5 px-5 font-medium">Slug</th>
                      <th className="py-2.5 px-4 font-medium text-right">
                        {isZh ? "打开次数" : "Views"}
                      </th>
                      <th className="py-2.5 px-4 font-medium text-right">
                        {isZh ? "视频观看" : "Video (s)"}
                      </th>
                      <th className="py-2.5 px-4 font-medium text-right">
                        {isZh ? "线索点击" : "Clicks"}
                      </th>
                      <th className="py-2.5 px-5 font-medium text-right">
                        {isZh ? "最近活跃" : "Last Active"}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--apple-border)]">
                    {(data.outreach || []).map((row) => (
                      <tr key={row.slug} className="hover:bg-[var(--apple-hover)]">
                        <td className="py-3 px-5 font-medium">
                          <Link
                            href={`/audit/${row.slug}`}
                            className="text-[var(--apple-blue)] hover:underline"
                          >
                            {row.slug}
                          </Link>
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-[var(--apple-ink)]">
                          {row.page_views}
                        </td>
                        <td className="py-3 px-4 text-right text-[var(--apple-ink-secondary)]">
                          {row.max_video_seconds}s
                        </td>
                        <td className="py-3 px-4 text-right text-[var(--apple-ink-secondary)]">
                          {row.buyer_clicks}
                        </td>
                        <td className="py-3 px-5 text-right text-[var(--apple-ink-tertiary)]">
                          {(row.last_event_at || "—").slice(0, 16).replace("T", " ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="grid lg:grid-cols-2 gap-5">
            <div className="rounded-[18px] border border-[var(--apple-border)] bg-[var(--apple-surface)] overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[var(--apple-border)] text-[14px] font-semibold text-[var(--apple-ink)]">
                {v2.admin.campaignsTableTitle}
              </div>
              {data.campaigns.length === 0 ? (
                <p className="p-5 text-[13px] text-[var(--apple-ink-tertiary)]">
                  {v2.admin.noData}
                </p>
              ) : (
                <div className="divide-y divide-[var(--apple-border)]">
                  {data.campaigns.map((c) => (
                    <div
                      key={c.id}
                      className="px-5 py-3.5 text-[13px] flex items-center justify-between gap-3 hover:bg-[var(--apple-hover)]"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-[var(--apple-ink)] truncate">
                          {c.product_name}
                        </p>
                        <p className="text-[12px] text-[var(--apple-ink-secondary)] truncate">
                          {c.user_email}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedEmail(c.user_email);
                          setTab("directories");
                        }}
                        className="text-[12px] text-[var(--apple-blue)] hover:underline shrink-0 cursor-pointer"
                      >
                        {isZh ? "展开 50 目录履约 ›" : "Fulfill 50 Dirs ›"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-[18px] border border-[var(--apple-border)] bg-[var(--apple-surface)] overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[var(--apple-border)] text-[14px] font-semibold text-[var(--apple-ink)]">
                {v2.admin.usersTableTitle}
              </div>
              {data.users.length === 0 ? (
                <p className="p-5 text-[13px] text-[var(--apple-ink-tertiary)]">
                  {v2.admin.noData}
                </p>
              ) : (
                <div className="divide-y divide-[var(--apple-border)]">
                  {data.users.map((u) => (
                    <div
                      key={u.id}
                      className="px-5 py-3.5 text-[13px] flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-[var(--apple-ink)] truncate">{u.name}</p>
                        <p className="text-[12px] text-[var(--apple-ink-secondary)] truncate">
                          {u.email}
                        </p>
                      </div>
                      <span className="text-[12px] text-[var(--apple-ink-tertiary)] tabular-nums shrink-0">
                        {u.created_at.slice(0, 10)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === "directories" && (
        <div className="space-y-5">
          {/* 客户选择 + Playwright 预填命令条 */}
          <div className="rounded-[18px] border border-[var(--apple-border)] bg-[var(--apple-surface)] p-5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
              <div className="space-y-1 flex-1 max-w-md">
                <label className="text-[12px] font-medium text-[var(--apple-ink-secondary)]">
                  {isZh ? "选择或输入待履约客户邮箱" : "Select Customer Email"}
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    list="lp-customer-emails"
                    value={selectedEmail}
                    onChange={(e) => setSelectedEmail(e.target.value)}
                    placeholder="founder@startup.com"
                    className="flex-1 rounded-[10px] border border-[var(--apple-border-strong)] bg-[var(--apple-bg)] px-3.5 py-2 text-[16px] sm:text-[13px] text-[var(--apple-ink)]"
                  />
                  <datalist id="lp-customer-emails">
                    {allEmails.map((em) => (
                      <option key={em} value={em} />
                    ))}
                  </datalist>
                </div>
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(assistCmd).catch(() => {});
                  setCopiedCmd(true);
                  setTimeout(() => setCopiedCmd(false), 1800);
                }}
              >
                {copiedCmd ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <Terminal className="w-3.5 h-3.5" />
                {isZh ? "复制 Playwright 预填命令" : "Copy Playwright Command"}
              </Button>
            </div>

            <pre className="text-[12px] font-mono text-[var(--apple-ink-secondary)] bg-[var(--apple-bg-alt)] border border-[var(--apple-border)] rounded-xl p-3 overflow-x-auto">
              {assistCmd}
            </pre>

            {selectedBrandKit && (
              <div className="rounded-[14px] border border-[var(--apple-border)] bg-[var(--apple-bg)] p-4 space-y-2 text-[12px]">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-[var(--apple-ink)]">
                    {isZh ? "客户 Brand Launch Kit 物料包" : "Customer Brand Launch Kit"} ({selectedBrandKit.completeness_score}%)
                  </span>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      const txt = [
                        `Tagline: ${selectedBrandKit.short_tagline}`,
                        `Pitch: ${selectedBrandKit.medium_pitch}`,
                        `Pricing: ${selectedBrandKit.pricing_model}`,
                        `Categories: ${selectedBrandKit.categories_json}`,
                        `Logo: ${selectedBrandKit.logo_url}`,
                        `Screenshots: ${selectedBrandKit.screenshots_json}`,
                        selectedBrandKit.long_description,
                      ].join("\n");
                      navigator.clipboard.writeText(txt).catch(() => {});
                      setCopiedKit(true);
                      setTimeout(() => setCopiedKit(false), 1600);
                    }}
                  >
                    {copiedKit ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedKit ? (isZh ? "已复制物料" : "Copied Kit") : isZh ? "一键复制提交物料" : "Copy Brand Kit"}
                  </Button>
                </div>
                <p className="text-[var(--apple-ink-secondary)]">
                  <strong className="text-[var(--apple-ink)]">Tagline:</strong> {selectedBrandKit.short_tagline || "—"}
                </p>
                <p className="text-[var(--apple-ink-secondary)] line-clamp-2">
                  <strong className="text-[var(--apple-ink)]">Pitch:</strong> {selectedBrandKit.medium_pitch || "—"}
                </p>
              </div>
            )}

            {verifyMsg && (
              <div className="rounded-[10px] bg-[var(--apple-green-soft)] text-[var(--apple-green)] px-3.5 py-2 text-[12px] font-medium">
                {verifyMsg}
              </div>
            )}
          </div>

          {/* 100 目录行内快速编辑数据表（支持截图回执 + 一键 HTTP 验活） */}
          <DirectoryTable
            liveMap={selectedDirMap}
            locale={locale}
            editable
            onSaveRow={handleInlineSave}
            onTriggerVerify={handleTriggerVerify}
            verifyingBacklinks={verifying}
          />
        </div>
      )}

      {tab === "orders" && (
        <div className="rounded-[18px] border border-[var(--apple-border)] bg-[var(--apple-surface)] overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[var(--apple-border)] text-[14px] font-semibold text-[var(--apple-ink)]">
            {v2.admin.ordersTableTitle}
          </div>
          {data.orders.length === 0 ? (
            <p className="p-5 text-[13px] text-[var(--apple-ink-tertiary)]">{v2.admin.noData}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px] tabular-nums">
                <thead className="border-b border-[var(--apple-border)] text-[11px] text-[var(--apple-ink-tertiary)]">
                  <tr>
                    <th className="py-2.5 px-5 font-medium">
                      {isZh ? "客户邮箱" : "Customer"}
                    </th>
                    <th className="py-2.5 px-5 font-medium">{isZh ? "套餐" : "Plan"}</th>
                    <th className="py-2.5 px-5 font-medium text-right">
                      {isZh ? "实付金额" : "Amount"}
                    </th>
                    <th className="py-2.5 px-5 font-medium">{isZh ? "状态" : "Status"}</th>
                    <th className="py-2.5 px-5 font-medium text-right">
                      {isZh ? "日期" : "Date"}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--apple-border)]">
                  {data.orders.map((o) => (
                    <tr key={o.order_id} className="hover:bg-[var(--apple-hover)]">
                      <td className="py-3 px-5 font-medium text-[var(--apple-ink)]">
                        {o.customer_email}
                      </td>
                      <td className="py-3 px-5 uppercase text-[var(--apple-blue)]">{o.plan}</td>
                      <td className="py-3 px-5 text-right">${o.amount_usd}</td>
                      <td className="py-3 px-5">
                        <StatusBadge status={o.status} locale={locale} />
                      </td>
                      <td className="py-3 px-5 text-right text-[var(--apple-ink-tertiary)]">
                        {o.created_at.slice(0, 10)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}
