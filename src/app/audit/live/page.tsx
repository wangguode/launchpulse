"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import WarRoomClient from "@/components/WarRoomClient";
import { useI18n } from "@/components/I18nProvider";
import type { StartupAuditReport } from "@/types/audit";

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
      <main className="min-h-screen bg-[var(--apple-bg)] text-[var(--apple-ink-secondary)] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-5 h-5 text-[var(--apple-blue)] animate-spin" />
        <p className="text-[13px]">{t.liveAudit.loadingText}</p>
      </main>
    );
  }

  if (errorKey || !report) {
    return (
      <main className="min-h-screen bg-[var(--apple-bg)] text-[var(--apple-ink)] flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-[17px] font-semibold">
          {errorKey ? t.liveAudit[errorKey] : t.liveAudit.notFound}
        </p>
        <Link href="/" className="px-5 py-2.5 rounded-full lp-btn-primary font-medium text-[13px]">
          {t.common.runFreeScan} →
        </Link>
      </main>
    );
  }

  return <WarRoomClient report={report} />;
}
