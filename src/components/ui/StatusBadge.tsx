"use client";

import type { Locale } from "@/lib/i18n";

type StatusKind = "live" | "submitted" | "queued" | "active" | "canceled" | "refunded" | "new" | "replied" | "won";

export default function StatusBadge({
  status,
  locale = "en",
}: {
  status: StatusKind | string;
  locale?: Locale;
}) {
  const s = status.toLowerCase();
  const isZh = locale === "zh";
  const isJa = locale === "ja";

  const dotColor =
    s === "live" || s === "active" || s === "won"
      ? "var(--apple-green-dot)"
      : s === "submitted" || s === "replied"
      ? "var(--apple-orange-dot)"
      : s === "canceled" || s === "refunded"
      ? "var(--apple-red-dot)"
      : "var(--apple-ink-tertiary)";

  const labelsZh: Record<string, string> = {
    live: "已收录",
    submitted: "已提交",
    queued: "排队中",
    active: "生效中",
    canceled: "已取消",
    refunded: "已退款",
    new: "待联系",
    replied: "已回复",
    won: "已成交",
  };
  const labelsJa: Record<string, string> = {
    live: "掲載済み",
    submitted: "申請済み",
    queued: "待機中",
    active: "有効",
    canceled: "解約済み",
    refunded: "返金済み",
    new: "未対応",
    replied: "返信済み",
    won: "獲得済み",
  };
  const labelsEn: Record<string, string> = {
    live: "Live",
    submitted: "Submitted",
    queued: "Queued",
    active: "Active",
    canceled: "Canceled",
    refunded: "Refunded",
    new: "New",
    replied: "Replied",
    won: "Won",
  };

  const text = (isZh ? labelsZh : isJa ? labelsJa : labelsEn)[s] || status;

  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-[var(--apple-ink-secondary)] whitespace-nowrap">
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: dotColor }}
      />
      <span>{text}</span>
    </span>
  );
}
