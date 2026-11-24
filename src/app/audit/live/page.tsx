"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import WarRoomClient from "@/components/WarRoomClient";
import { useI18n } from "@/components/I18nProvider";
import type { StartupAuditReport } from "@/types/audit";

/**
 * 动态战情页入口（/audit/live?s=<slug>）：
 * 直接从 Cloudflare D1 (/api/audit/:slug) 实时拉取报告渲染，新增目标 1 秒上线无需重新 build
 */
export default function DynamicLiveAuditPage() {
  const { t } = useI18n();
  const [report, setReport] = useState<StartupAuditReport | null>(null);
  const [errorKey, setErrorKey] = useState<"missingSlug" | "notFound" | "unableToLoad" | "">("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const slug = (params.get("s") || "").toLowerCase().replace(/[^a-z0-9-_]/g, "");
    if (!slug) {
      setErrorKey("missingSlug");
      setLoading(false);
      return;
    }

    fetch(`/api/audit/${encodeURIComponent(slug)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("notFound");
        return (await res.json()) as StartupAuditReport;
      })
      .then((data) => {
        setReport(data);
        setLoading(false);
      })
      .catch((err) => {
        setErrorKey(err.message === "notFound" ? "notFound" : "unableToLoad");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#07090d] text-slate-200 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
        <p className="text-xs font-[family-name:var(--font-mono)] text-slate-400">
          {t.liveAudit.loadingText}
        </p>
      </main>
    );
  }

  if (errorKey || !report) {
    return (
      <main className="min-h-screen bg-[#07090d] text-slate-200 flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-lg font-semibold text-white">
          {errorKey ? t.liveAudit[errorKey] : t.liveAudit.notFound}
        </p>
        <Link
          href="/"
          className="px-4 py-2 rounded-lg bg-emerald-500 text-slate-950 font-semibold text-xs"
        >
          {t.common.runFreeScan} →
        </Link>
      </main>
    );
  }

  return <WarRoomClient report={report} />;
}
