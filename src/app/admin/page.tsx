"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Lock, RefreshCw, ShieldCheck } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import LangSwitcher from "@/components/LangSwitcher";
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

export default function AdminConsolePage() {
  const { locale } = useI18n();
  const v2 = V2_DICTIONARIES[locale];

  const [adminKey, setAdminKey] = useState("");
  const [savedKey, setSavedKey] = useState("");
  const [data, setData] = useState<AdminPayload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"overview" | "directories" | "orders">("overview");

  // Directory update form
  const [customerEmail, setCustomerEmail] = useState("");
  const [dirId, setDirId] = useState(DISTRIBUTION_DIRECTORIES[0].id);
  const [dirStatus, setDirStatus] = useState<"queued" | "submitted" | "live">("live");
  const [liveUrl, setLiveUrl] = useState("");
  const [saveMsg, setSaveMsg] = useState("");

  const fetchAdminData = useCallback(async (key: string) => {
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
  }, [customerEmail]);

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

  return (
    <div className="min-h-screen bg-[#07090d] text-slate-100 obsidian-grid">
      <header className="border-b border-white/10 bg-[#07090d]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="font-[family-name:var(--font-display)] font-bold text-white">
              LaunchPulse
            </Link>
            <span className="text-slate-600">/</span>
            <span className="text-xs font-[family-name:var(--font-mono)] text-amber-300">
              {v2.admin.badge}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <LangSwitcher />
            {savedKey && (
              <>
                <button
                  onClick={() => fetchAdminData(savedKey)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/15 text-xs text-slate-200 hover:text-white cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                  {v2.admin.refreshBtn}
                </button>
                <button
                  onClick={() => {
                    sessionStorage.removeItem("lp_admin_key");
                    setSavedKey("");
                    setData(null);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-red-500/15 border border-red-500/30 text-xs text-red-300 cursor-pointer"
                >
                  {v2.admin.logoutBtn}
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        {!data ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetchAdminData(adminKey.trim());
            }}
            className="max-w-md mx-auto rounded-2xl border border-white/10 bg-[#0c1018] p-8 space-y-5 shadow-2xl"
          >
            <div className="flex items-center gap-2 text-amber-300 text-xs font-[family-name:var(--font-mono)]">
              <Lock className="w-4 h-4" /> {v2.admin.badge}
            </div>
            <h1 className="text-xl font-bold text-white">{v2.admin.title}</h1>
            <input
              type="password"
              required
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              placeholder={v2.admin.keyPlaceholder}
              className="w-full rounded-xl border border-white/15 bg-black/50 px-4 py-3 text-sm font-[family-name:var(--font-mono)] text-white"
            />
            {error && <p className="text-xs text-red-300">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm cursor-pointer"
            >
              {v2.admin.loginBtn}
            </button>
          </form>
        ) : (
          <div className="space-y-8">
            {/* 6 大全局业务 KPI */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 tabular-nums">
              {[
                { label: v2.admin.kpiUsers, val: data.kpis.totalUsers },
                { label: v2.admin.kpiCampaigns, val: data.kpis.totalCampaigns },
                { label: v2.admin.kpiRevenue, val: `$${data.kpis.totalRevenueUsd}` },
                { label: v2.admin.kpiMrr, val: `$${data.kpis.activeMrrUsd}` },
                { label: v2.admin.kpiClicks, val: data.kpis.totalClicks },
                { label: v2.admin.kpiCvr, val: `${data.kpis.overallCvr}%` },
              ].map((k) => (
                <div key={k.label} className="rounded-xl border border-white/10 bg-[#0c1018] p-4">
                  <p className="text-[11px] text-slate-400">{k.label}</p>
                  <p className="text-2xl font-bold text-white mt-1">{k.val}</p>
                </div>
              ))}
            </div>

            {/* 切换标签 */}
            <div className="flex flex-wrap gap-2">
              {(["overview", "directories", "orders"] as const).map((tKey) => (
                <button
                  key={tKey}
                  onClick={() => setTab(tKey)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition ${
                    tab === tKey
                      ? "bg-emerald-500 text-slate-950 font-bold"
                      : "bg-white/5 text-slate-300 hover:bg-white/10"
                  }`}
                >
                  {tKey === "overview"
                    ? v2.admin.tabOverview
                    : tKey === "directories"
                    ? v2.admin.tabDirectories
                    : v2.admin.tabOrders}
                </button>
              ))}
            </div>

            {tab === "overview" && (
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="rounded-2xl border border-white/10 bg-[#0c1018] p-5 space-y-3">
                  <h2 className="text-base font-bold text-white">{v2.admin.campaignsTableTitle}</h2>
                  {data.campaigns.length === 0 ? (
                    <p className="text-xs text-slate-500">{v2.admin.noData}</p>
                  ) : (
                    <div className="space-y-2">
                      {data.campaigns.map((c) => (
                        <div
                          key={c.id}
                          className="rounded-lg border border-white/10 bg-black/40 p-3 text-xs flex justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <p className="font-semibold text-white truncate">{c.product_name}</p>
                            <p className="text-slate-400 truncate">{c.user_email}</p>
                          </div>
                          <a
                            href={c.target_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-400 hover:underline shrink-0"
                          >
                            {c.slug}
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#0c1018] p-5 space-y-3">
                  <h2 className="text-base font-bold text-white">{v2.admin.usersTableTitle}</h2>
                  {data.users.length === 0 ? (
                    <p className="text-xs text-slate-500">{v2.admin.noData}</p>
                  ) : (
                    <div className="space-y-2">
                      {data.users.map((u) => (
                        <div
                          key={u.id}
                          className="rounded-lg border border-white/10 bg-black/40 p-3 text-xs flex justify-between gap-2"
                        >
                          <span>
                            <strong className="text-white">{u.name}</strong> · {u.email}
                          </span>
                          <span className="text-slate-500 font-[family-name:var(--font-mono)]">
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
              <form
                onSubmit={handleSaveDirectory}
                className="rounded-2xl border border-emerald-500/30 bg-[#0c1018] p-6 space-y-4 max-w-2xl"
              >
                <div className="flex items-center gap-2 text-emerald-300 text-sm font-bold">
                  <ShieldCheck className="w-4 h-4" /> {v2.admin.dirUpdateTitle}
                </div>
                <p className="text-xs text-slate-400">{v2.admin.dirUpdateDesc}</p>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-300">{v2.admin.selectCustomer}</label>
                    <input
                      type="email"
                      required
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="customer@startup.com"
                      className="w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-slate-300">{v2.admin.selectDir}</label>
                    <select
                      value={dirId}
                      onChange={(e) => setDirId(e.target.value)}
                      className="w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-xs text-white"
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
                    <label className="text-xs text-slate-300">{v2.admin.selectStatus}</label>
                    <select
                      value={dirStatus}
                      onChange={(e) => setDirStatus(e.target.value as "queued" | "submitted" | "live")}
                      className="w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-xs text-white"
                    >
                      <option value="queued">queued</option>
                      <option value="submitted">submitted</option>
                      <option value="live">live</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-xs text-slate-300">Live Backlink URL</label>
                    <input
                      type="url"
                      value={liveUrl}
                      onChange={(e) => setLiveUrl(e.target.value)}
                      placeholder={v2.admin.liveUrlPlaceholder}
                      className="w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-xs font-[family-name:var(--font-mono)] text-white"
                    />
                  </div>
                </div>

                {saveMsg && <p className="text-xs text-emerald-300">{saveMsg}</p>}
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs cursor-pointer"
                >
                  {v2.admin.saveDirBtn}
                </button>
              </form>
            )}

            {tab === "orders" && (
              <div className="rounded-2xl border border-white/10 bg-[#0c1018] p-5 space-y-3">
                <h2 className="text-base font-bold text-white">{v2.admin.ordersTableTitle}</h2>
                {data.orders.length === 0 ? (
                  <p className="text-xs text-slate-500">{v2.admin.noData}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs tabular-nums">
                      <thead className="text-slate-400 border-b border-white/10">
                        <tr>
                          <th className="py-2">Email</th>
                          <th className="py-2">Plan</th>
                          <th className="py-2">Amount</th>
                          <th className="py-2">Status</th>
                          <th className="py-2">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {data.orders.map((o) => (
                          <tr key={o.order_id}>
                            <td className="py-2.5 text-white">{o.customer_email}</td>
                            <td className="py-2.5 uppercase text-emerald-300">{o.plan}</td>
                            <td className="py-2.5">${o.amount_usd}</td>
                            <td className="py-2.5">{o.status}</td>
                            <td className="py-2.5 text-slate-400">{o.created_at.slice(0, 10)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
