"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
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
import { V2_DICTIONARIES } from "@/lib/v2-i18n";
import { DISTRIBUTION_DIRECTORIES } from "@/data/directories";

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
    directory_name: string;
    status: string;
    live_backlink_url: string;
    updated_at: string;
  }>;
}

type AdminTab = "overview" | "directories" | "orders";

export default function AdminConsolePage() {
  const { locale } = useI18n();
  const v2 = V2_DICTIONARIES[locale];
  const isZh = locale === "zh";

  const [adminKey, setAdminKey] = useState("");
  const [savedKey, setSavedKey] = useState("");
  const [data, setData] = useState<AdminPayload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<AdminTab>("overview");
  const [copiedCmd, setCopiedCmd] = useState(false);

  const [customerEmail, setCustomerEmail] = useState("");
  const [dirId, setDirId] = useState(DISTRIBUTION_DIRECTORIES[0].id);
  const [dirStatus, setDirStatus] = useState<"queued" | "submitted" | "live">("live");
  const [liveUrl, setLiveUrl] = useState("");
  const [saveMsg, setSaveMsg] = useState("");

  const fetchAdminData = useCallback(
    async (key: string) => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/admin/dashboard", {
          headers: { "x-admin-key": key },
        });
        if (!res.ok) {
          setError("Unauthorized: invalid ADMIN_API_KEY.");
          setSavedKey("");
          sessionStorage.removeItem("lp_admin_key");
          return;
        }
        const json = (await res.json()) as AdminPayload;
        setData(json);
        setSavedKey(key);
        sessionStorage.setItem("lp_admin_key", key);
        if (json.users.length > 0 && !customerEmail) {
          setCustomerEmail(json.users[0].email);
        }
      } catch {
        setError("Network error loading admin console.");
      } finally {
        setLoading(false);
      }
    },
    [customerEmail]
  );

  useEffect(() => {
    const existing = sessionStorage.getItem("lp_admin_key");
    if (existing) {
      setAdminKey(existing);
      fetchAdminData(existing);
    }
  }, [fetchAdminData]);

  const handleSaveDirectory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!savedKey || !customerEmail.trim()) return;
    setSaveMsg("");
    const meta = DISTRIBUTION_DIRECTORIES.find((d) => d.id === dirId) || DISTRIBUTION_DIRECTORIES[0];
    const res = await fetch("/api/admin/directory-update", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": savedKey,
      },
      body: JSON.stringify({
        customerEmail: customerEmail.trim(),
        directoryId: meta.id,
        directoryName: meta.name,
        directoryUrl: meta.url,
        dr: meta.dr,
        category: meta.category,
        status: dirStatus,
        liveBacklinkUrl: liveUrl.trim(),
      }),
    });
    if (res.ok) {
      setSaveMsg(v2.admin.savedMsg);
      setLiveUrl("");
      fetchAdminData(savedKey);
    }
  };

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
              <ThemeSwitcher />
              <LangSwitcher />
            </div>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 py-14">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetchAdminData(adminKey.trim());
            }}
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
              className="w-full rounded-xl border border-[var(--apple-border-strong)] bg-[var(--apple-bg)] px-3.5 py-2.5 text-[16px] sm:text-[14px] font-mono text-[var(--apple-ink)] focus:border-[var(--apple-blue)] focus:outline-none"
            />
            {error && <p className="text-[12px] text-[var(--apple-red)]">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-full bg-[var(--apple-blue)] hover:bg-[var(--apple-blue-hover)] text-white font-medium text-[14px] cursor-pointer transition"
            >
              {v2.admin.loginBtn}
            </button>
          </form>
        </main>
      </div>
    );
  }

  const navItems: Array<{ key: AdminTab; label: string; icon: React.ReactNode }> = [
    { key: "overview", label: v2.admin.tabOverview, icon: <Users className="w-4 h-4" /> },
    { key: "directories", label: v2.admin.tabDirectories, icon: <Globe className="w-4 h-4" /> },
    { key: "orders", label: v2.admin.tabOrders, icon: <CreditCard className="w-4 h-4" /> },
  ];

  const currentNav = navItems.find((n) => n.key === tab) || navItems[0];
  const assistCmd = `node scripts/auto-distribute.mjs ${customerEmail || "<customer-email>"} --limit 10`;

  return (
    <div className="min-h-screen bg-[var(--apple-bg)] text-[var(--apple-ink)] flex flex-col lg:flex-row">
      {/* 与 /dashboard 像素级一致的 Apple macOS 左侧导航栏 */}
      <aside className="lg:w-60 border-b lg:border-b-0 lg:border-r border-[var(--apple-border)] bg-[var(--apple-bg-alt)] flex flex-col justify-between shrink-0">
        <div className="p-4 space-y-5">
          <div className="flex items-center justify-between px-2 pt-1">
            <Link
              href="/"
              className="flex items-center gap-2 font-semibold text-[15px] tracking-tight text-[var(--apple-ink)]"
            >
              <BrandMark className="w-5 h-5" />
              <span>LaunchPulse</span>
            </Link>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--apple-ink-tertiary)]">
              Admin
            </span>
          </div>

          <nav className="grid grid-cols-3 lg:grid-cols-1 gap-1">
            {navItems.map((item) => {
              const active = tab === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setTab(item.key)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition cursor-pointer text-left ${
                    active
                      ? "bg-[var(--apple-active)] text-[var(--apple-ink)] font-semibold"
                      : "text-[var(--apple-ink-secondary)] hover:bg-[var(--apple-hover)] hover:text-[var(--apple-ink)]"
                  }`}
                >
                  <span className={active ? "text-[var(--apple-blue)]" : "opacity-75"}>
                    {item.icon}
                  </span>
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-[var(--apple-border)] flex items-center justify-between px-3">
          <Link href="/dashboard" className="text-[12px] text-[var(--apple-blue)] hover:underline">
            ← {v2.nav.dashboard}
          </Link>
          <button
            onClick={() => {
              sessionStorage.removeItem("lp_admin_key");
              setSavedKey("");
              setData(null);
            }}
            title={v2.admin.logoutBtn}
            className="p-1.5 rounded-md text-[var(--apple-ink-tertiary)] hover:text-[var(--apple-red)] hover:bg-[var(--apple-hover)] transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* 右侧工作画布 */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 h-14 apple-glass border-b border-[var(--apple-border)] px-5 sm:px-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <h1 className="text-[15px] font-semibold text-[var(--apple-ink)] truncate">
              {currentNav.label}
            </h1>
            <span className="hidden sm:inline-block text-[12px] text-[var(--apple-ink-tertiary)]">
              · {data.syncedAt.slice(11, 19)} UTC
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <ThemeSwitcher />
            <LangSwitcher />
            <button
              onClick={() => fetchAdminData(savedKey)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[var(--apple-blue)] hover:bg-[var(--apple-blue-hover)] text-white text-[12px] font-medium cursor-pointer transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">{v2.admin.refreshBtn}</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-5 sm:p-8 max-w-[1100px] w-full mx-auto space-y-6">
          {/* 6 列联排 KPI 指标带 */}
          <div className="rounded-[18px] border border-[var(--apple-border)] bg-[var(--apple-surface)] grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-y lg:divide-y-0 lg:divide-x divide-[var(--apple-border)] tabular-nums">
            {[
              { label: v2.admin.kpiUsers, val: String(data.kpis.totalUsers) },
              { label: v2.admin.kpiCampaigns, val: String(data.kpis.totalCampaigns) },
              { label: v2.admin.kpiRevenue, val: `$${data.kpis.totalRevenueUsd}` },
              { label: v2.admin.kpiMrr, val: `$${data.kpis.activeMrrUsd}` },
              { label: v2.admin.kpiClicks, val: String(data.kpis.totalClicks) },
              { label: v2.admin.kpiCvr, val: `${data.kpis.overallCvr}%`, accent: true },
            ].map((k) => (
              <div key={k.label} className="p-4 space-y-1">
                <p className="text-[11px] text-[var(--apple-ink-secondary)]">{k.label}</p>
                <p
                  className={`apple-display text-2xl font-semibold ${
                    k.accent ? "text-[var(--apple-blue)]" : "text-[var(--apple-ink)]"
                  }`}
                >
                  {k.val}
                </p>
              </div>
            ))}
          </div>

          {tab === "overview" && (
            <div className="grid lg:grid-cols-2 gap-5">
              <div className="rounded-[18px] border border-[var(--apple-border)] bg-[var(--apple-surface)] overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[var(--apple-border)] text-[14px] font-semibold text-[var(--apple-ink)]">
                  {v2.admin.campaignsTableTitle}
                </div>
                {data.campaigns.length === 0 ? (
                  <p className="p-5 text-[13px] text-[var(--apple-ink-tertiary)]">{v2.admin.noData}</p>
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
                            setCustomerEmail(c.user_email);
                            setTab("directories");
                          }}
                          className="text-[12px] text-[var(--apple-blue)] hover:underline shrink-0 cursor-pointer"
                        >
                          {isZh ? "去投流回填 ›" : "Fulfill ›"}
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
                  <p className="p-5 text-[13px] text-[var(--apple-ink-tertiary)]">{v2.admin.noData}</p>
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
          )}

          {tab === "directories" && (
            <div className="space-y-5 max-w-2xl">
              <div className="rounded-[18px] border border-[var(--apple-border)] bg-[var(--apple-surface)] p-5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-[var(--apple-ink)]">
                    <Terminal className="w-4 h-4 text-[var(--apple-blue)]" />
                    {isZh ? "Playwright 内部半自动预填投流命令" : "Playwright Pre-Fill Assistant"}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(assistCmd).catch(() => {});
                      setCopiedCmd(true);
                      setTimeout(() => setCopiedCmd(false), 1800);
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-[var(--apple-border-strong)] hover:bg-[var(--apple-hover)] text-[12px] text-[var(--apple-ink)] cursor-pointer"
                  >
                    {copiedCmd ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedCmd ? "Copied" : "Copy"}
                  </button>
                </div>
                <pre className="text-[12px] font-mono text-[var(--apple-ink)] bg-[var(--apple-bg-alt)] border border-[var(--apple-border)] rounded-xl p-3 overflow-x-auto">
                  {assistCmd}
                </pre>
              </div>

              <form
                onSubmit={handleSaveDirectory}
                className="rounded-[18px] border border-[var(--apple-border)] bg-[var(--apple-surface)] p-6 space-y-4"
              >
                <div>
                  <h2 className="text-[15px] font-semibold text-[var(--apple-ink)]">
                    {v2.admin.dirUpdateTitle}
                  </h2>
                  <p className="text-[13px] text-[var(--apple-ink-secondary)] mt-1">
                    {v2.admin.dirUpdateDesc}
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[12px] font-medium text-[var(--apple-ink-secondary)]">
                      {v2.admin.selectCustomer}
                    </label>
                    <input
                      type="email"
                      required
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="customer@startup.com"
                      className="w-full rounded-xl border border-[var(--apple-border-strong)] bg-[var(--apple-bg)] px-3.5 py-2 text-[14px] text-[var(--apple-ink)] focus:border-[var(--apple-blue)] focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[12px] font-medium text-[var(--apple-ink-secondary)]">
                      {v2.admin.selectDir}
                    </label>
                    <select
                      value={dirId}
                      onChange={(e) => setDirId(e.target.value)}
                      className="w-full rounded-xl border border-[var(--apple-border-strong)] bg-[var(--apple-bg)] px-3.5 py-2 text-[14px] text-[var(--apple-ink)] focus:border-[var(--apple-blue)] focus:outline-none"
                    >
                      {DISTRIBUTION_DIRECTORIES.map((d) => (
                        <option key={d.id} value={d.id}>
                          [DR {d.dr}] {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[12px] font-medium text-[var(--apple-ink-secondary)]">
                      {v2.admin.selectStatus}
                    </label>
                    <select
                      value={dirStatus}
                      onChange={(e) =>
                        setDirStatus(e.target.value as "queued" | "submitted" | "live")
                      }
                      className="w-full rounded-xl border border-[var(--apple-border-strong)] bg-[var(--apple-bg)] px-3.5 py-2 text-[14px] text-[var(--apple-ink)]"
                    >
                      <option value="queued">queued</option>
                      <option value="submitted">submitted</option>
                      <option value="live">live</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[12px] font-medium text-[var(--apple-ink-secondary)]">
                      Live Backlink URL
                    </label>
                    <input
                      type="url"
                      value={liveUrl}
                      onChange={(e) => setLiveUrl(e.target.value)}
                      placeholder={v2.admin.liveUrlPlaceholder}
                      className="w-full rounded-xl border border-[var(--apple-border-strong)] bg-[var(--apple-bg)] px-3.5 py-2 text-[14px] font-mono text-[var(--apple-ink)] focus:border-[var(--apple-blue)] focus:outline-none"
                    />
                  </div>
                </div>

                {saveMsg && <p className="text-[13px] text-[var(--apple-green)]">{saveMsg}</p>}
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-full bg-[var(--apple-blue)] hover:bg-[var(--apple-blue-hover)] text-white font-medium text-[14px] cursor-pointer transition"
                >
                  {v2.admin.saveDirBtn}
                </button>
              </form>
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
                        <th className="py-2.5 px-5 font-medium">Email</th>
                        <th className="py-2.5 px-5 font-medium">Plan</th>
                        <th className="py-2.5 px-5 font-medium text-right">Amount</th>
                        <th className="py-2.5 px-5 font-medium">Status</th>
                        <th className="py-2.5 px-5 font-medium text-right">Date</th>
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
                          <td className="py-3 px-5">{o.status}</td>
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
        </main>
      </div>
    </div>
  );
}
