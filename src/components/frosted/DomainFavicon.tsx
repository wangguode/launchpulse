"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface BrandPreset {
  short: string;
  bg: string;
}

const BRAND_PRESETS: Array<{ match: RegExp; short: string; bg: string }> = [
  { match: /producthunt|product hunt/i, short: "P", bg: "#DA552F" },
  { match: /ycombinator|hacker news|\bhn\b/i, short: "Y", bg: "#FF6600" },
  { match: /\bg2\b|g2\.com/i, short: "G2", bg: "#FF492C" },
  { match: /sourceforge/i, short: "SF", bg: "#0284C7" },
  { match: /reddit/i, short: "R", bg: "#FF4500" },
  { match: /github/i, short: "GH", bg: "#24292F" },
  { match: /dev\.to|devto/i, short: "DV", bg: "#1E293B" },
  { match: /capterra/i, short: "CP", bg: "#0284C7" },
  { match: /alternativeto/i, short: "AT", bg: "#0D9488" },
  { match: /betalist/i, short: "BL", bg: "#2563EB" },
  { match: /indiehackers|indie hackers/i, short: "IH", bg: "#1D4ED8" },
  { match: /trustpilot/i, short: "TP", bg: "#059669" },
  { match: /slashdot/i, short: "/.", bg: "#0F766E" },
  { match: /theresanaiforthat|taaft/i, short: "AI", bg: "#7C3AED" },
  { match: /futurepedia/i, short: "FP", bg: "#4F46E5" },
  { match: /crunchbase/i, short: "CB", bg: "#1D4ED8" },
  { match: /f6s/i, short: "F6", bg: "#DC2626" },
  { match: /saashub/i, short: "SH", bg: "#2563EB" },
  { match: /uneed/i, short: "UN", bg: "#EA580C" },
  { match: /microlaunch/i, short: "ML", bg: "#4F46E5" },
];

const FALLBACK_PALETTE = [
  "#2563EB",
  "#0284C7",
  "#0D9488",
  "#059669",
  "#4F46E5",
  "#D97706",
  "#E11D48",
  "#334155",
];

function resolveBrandPreset(name: string, url?: string): BrandPreset {
  const hay = `${name} ${url || ""}`;
  for (const item of BRAND_PRESETS) {
    if (item.match.test(hay)) return { short: item.short, bg: item.bg };
  }
  const clean = name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, "").trim();
  const short = clean.slice(0, 2).toUpperCase() || "LP";
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return { short, bg: FALLBACK_PALETTE[hash % FALLBACK_PALETTE.length] };
}

function extractDomain(url?: string): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/**
 * 真实站点 Favicon + 零闪烁高质感品牌色首字母徽标降级引擎
 */
export default function DomainFavicon({
  name,
  url,
  size = "md",
  className,
}: {
  name: string;
  url?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const preset = resolveBrandPreset(name, url);
  const domain = extractDomain(url);
  const isKnownPreset = BRAND_PRESETS.some((p) => p.match.test(`${name} ${url || ""}`));

  const sizeCls =
    size === "sm"
      ? "size-5 rounded-[5px] text-[10px]"
      : size === "lg"
        ? "size-7 rounded-lg text-xs"
        : "size-[22px] rounded-[6px] text-[10.5px]";

  if (!isKnownPreset && domain && !imgFailed) {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center overflow-hidden bg-white/90 dark:bg-white/10 ring-1 ring-black/8 dark:ring-white/12",
          sizeCls,
          className
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://icons.duckduckgo.com/ip3/${domain}.ico`}
          alt=""
          loading="lazy"
          onError={() => setImgFailed(true)}
          className="size-3.5 object-contain"
        />
      </span>
    );
  }

  return (
    <span
      style={{
        backgroundColor: preset.bg,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.34)",
      }}
      className={cn(
        "inline-grid shrink-0 place-items-center font-semibold tracking-tight text-white select-none",
        sizeCls,
        className
      )}
    >
      {preset.short}
    </span>
  );
}
