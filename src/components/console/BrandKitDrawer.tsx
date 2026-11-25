"use client";

import { useEffect, useState } from "react";
import { Check, Copy, X } from "lucide-react";
import Button from "@/components/ui/Button";
import { computeBrandKitProgress, type BrandKitRecord } from "@/lib/console-ledger";

interface BrandKitDrawerProps {
  open: boolean;
  onClose: () => void;
  campaignId: number;
  productName: string;
  targetUrl: string;
  initialTagline?: string;
  initialCompetitors?: string;
  brandKit: BrandKitRecord | null;
  isZh: boolean;
  isSample: boolean;
  onSaved: (updatedKit?: BrandKitRecord) => Promise<void> | void;
}

/**
 * 侧滑精密品牌资料抽屉（取代 V4 的 2015 年风格长表单页面）
 * 按「基础身份 / 卖点与简介 / 视觉物料」清晰分层，实时字数计数与缺失项定位
 */
export default function BrandKitDrawer({
  open,
  onClose,
  campaignId,
  productName,
  targetUrl,
  initialTagline = "",
  initialCompetitors = "",
  brandKit,
  isZh,
  isSample,
  onSaved,
}: BrandKitDrawerProps) {
  const [logoUrl, setLogoUrl] = useState("");
  const [screenshotsText, setScreenshotsText] = useState("");
  const [shortTagline, setShortTagline] = useState("");
  const [mediumPitch, setMediumPitch] = useState("");
  const [longDescription, setLongDescription] = useState("");
  const [pricingModel, setPricingModel] = useState("freemium");
  const [categoriesText, setCategoriesText] = useState("");
  const [competitorsText, setCompetitorsText] = useState("");
  const [founderName, setFounderName] = useState("");
  const [founderX, setFounderX] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [copiedPack, setCopiedPack] = useState(false);

  useEffect(() => {
    setLogoUrl(brandKit?.logo_url || "");
    setScreenshotsText((brandKit?.screenshots || []).join("\n"));
    setShortTagline(brandKit?.short_tagline || initialTagline || "");
    setMediumPitch(brandKit?.medium_pitch || "");
    setLongDescription(brandKit?.long_description || "");
    setPricingModel(brandKit?.pricing_model || "freemium");
    setCategoriesText(
      (brandKit?.categories && brandKit.categories.length > 0
        ? brandKit.categories
        : ["SaaS", "Developer Tools"]
      ).join(", ")
    );
    setCompetitorsText(
      (brandKit?.competitors && brandKit.competitors.length > 0
        ? brandKit.competitors.join(", ")
        : initialCompetitors) || ""
    );
    setFounderName(brandKit?.founder_name || "");
    setFounderX(brandKit?.founder_x || "");
    setFeedback("");
  }, [brandKit, campaignId, initialTagline, initialCompetitors, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const screenshots = screenshotsText.split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 5);
  const categories = categoriesText.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 6);
  const competitors = competitorsText.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 6);

  const liveDraft: BrandKitRecord = {
    campaign_id: campaignId,
    logo_url: logoUrl.trim(),
    screenshots,
    short_tagline: shortTagline.trim(),
    medium_pitch: mediumPitch.trim(),
    long_description: longDescription.trim(),
    pricing_model: pricingModel,
    categories,
    competitors,
    founder_name: founderName.trim(),
    founder_x: founderX.trim(),
  };

  const progress = computeBrandKitProgress(liveDraft);
  const missingList = isZh ? progress.missingItemsZh : progress.missingItemsEn;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSample) {
      await onSaved({ ...liveDraft, completeness_score: progress.score });
      setFeedback(isZh ? "体验模式已同步至当前界面（登录后永久写入数据库）" : "Updated live preview (sign in to persist)");
      return;
    }
    if (!campaignId) return;
    setSaving(true);
    setFeedback("");
    try {
      const res = await fetch("/api/dashboard/brand-kit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          logoUrl: logoUrl.trim(),
          screenshots,
          shortTagline: shortTagline.trim(),
          mediumPitch: mediumPitch.trim(),
          longDescription: longDescription.trim(),
          pricingModel,
          categories,
          competitors,
          founderName: founderName.trim(),
          founderX: founderX.trim(),
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setFeedback(data.error || (isZh ? "保存失败" : "Save failed"));
      } else {
        setFeedback(isZh ? "品牌资料已保存，100 目录分发队列已同步" : "Brand Kit saved and synced across 100 directories");
        await onSaved();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCopySubmissionPack = async () => {
    const pack = [
      `Product: ${productName}`,
      `URL: ${targetUrl}`,
      `Tagline (60ch): ${shortTagline}`,
      `Short Pitch (240ch): ${mediumPitch}`,
      `Full Description: ${longDescription}`,
      `Pricing: ${pricingModel}`,
      `Categories: ${categories.join(", ")}`,
      `Alternatives to: ${competitors.join(", ")}`,
      `Logo: ${logoUrl}`,
      `Screenshots: ${screenshots.join(" | ")}`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(pack);
      setCopiedPack(true);
      setTimeout(() => setCopiedPack(false), 1800);
    } catch {
      // ignore
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[2px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={isZh ? "品牌资料精编抽屉" : "Brand Kit Drawer"}
    >
      <div
        className="w-full max-w-[520px] h-full bg-[var(--bg-sheet)] border-l border-[var(--border-hairline)] flex flex-col"
        style={{ boxShadow: "var(--overlay-shadow)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 顶部标题与完成度进度条 */}
        <div className="px-5 py-4 border-b border-[var(--border-hairline)] space-y-3 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-[16px] font-semibold text-[var(--ink-primary)]">
                {isZh ? "品牌提交资料" : "Brand Kit"}
              </h2>
              <p className="text-[12px] text-[var(--ink-muted)] mt-0.5">
                {isZh
                  ? "一次填好，自动复用于 100+ 海外目录提交与原生回复草稿"
                  : "Fill once — automatically reused across 100+ directories and reply drafts"}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="关闭"
              className="p-1.5 rounded-[6px] text-[var(--ink-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--ink-primary)] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[12px] tabular-nums">
              <span className="font-medium text-[var(--ink-primary)]">
                {isZh ? `物料完整度 ${progress.score}%` : `${progress.score}% Complete`}
              </span>
              <span className="text-[var(--ink-muted)]">
                {missingList.length > 0
                  ? isZh
                    ? `还差：${missingList.slice(0, 2).join("、")}`
                    : `Missing: ${missingList.slice(0, 2).join(", ")}`
                  : isZh
                    ? "已达到 100% 满配标准"
                    : "Ready for 100% automated distribution"}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-[var(--bg-hover)] overflow-hidden">
              <div
                className="h-full bg-[var(--accent-primary)] transition-all duration-200"
                style={{ width: `${progress.score}%` }}
              />
            </div>
          </div>
        </div>

        {/* 精简 3 组可滚动表单 */}
        <form onSubmit={handleSave} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {/* 分组 1：卖点与简介 */}
            <div className="space-y-3.5">
              <h3 className="text-[12.5px] font-semibold text-[var(--ink-primary)]">
                {isZh ? "核心卖点与三档简介" : "Tagline & Descriptions"}
              </h3>

              <label className="block space-y-1">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-[var(--ink-secondary)] font-medium">
                    {isZh ? "一句话定位（英文，建议 ≤ 60 字符）" : "One-line Tagline (≤ 60 chars)"}
                  </span>
                  <span className="font-mono text-[11px] text-[var(--ink-muted)] tabular-nums">
                    {shortTagline.length}/60
                  </span>
                </div>
                <input
                  value={shortTagline}
                  onChange={(e) => setShortTagline(e.target.value)}
                  placeholder="Automated SSL & domain expiry alerts built for lean SaaS teams"
                  className="w-full h-9 px-3 rounded-[7px] border border-[var(--border-strong)] bg-[var(--bg-surface)] text-[13px] text-[var(--ink-primary)] outline-none focus:border-[var(--accent-primary)]"
                />
              </label>

              <label className="block space-y-1">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-[var(--ink-secondary)] font-medium">
                    {isZh ? "标准目录简介（建议 120–240 字符）" : "Standard Pitch (120–240 chars)"}
                  </span>
                  <span className="font-mono text-[11px] text-[var(--ink-muted)] tabular-nums">
                    {mediumPitch.length}/240
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={mediumPitch}
                  onChange={(e) => setMediumPitch(e.target.value)}
                  className="w-full px-3 py-2 rounded-[7px] border border-[var(--border-strong)] bg-[var(--bg-surface)] text-[13px] leading-relaxed text-[var(--ink-primary)] outline-none focus:border-[var(--accent-primary)]"
                />
              </label>

              <label className="block space-y-1">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-[var(--ink-secondary)] font-medium">
                    {isZh ? "深度场景介绍（用于高权重评测站）" : "Full Description"}
                  </span>
                  <span className="font-mono text-[11px] text-[var(--ink-muted)] tabular-nums">
                    {longDescription.length}
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={longDescription}
                  onChange={(e) => setLongDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-[7px] border border-[var(--border-strong)] bg-[var(--bg-surface)] text-[13px] leading-relaxed text-[var(--ink-primary)] outline-none focus:border-[var(--accent-primary)]"
                />
              </label>
            </div>

            {/* 分组 2：视觉物料 */}
            <div className="space-y-3.5 pt-4 border-t border-[var(--border-hairline)]">
              <h3 className="text-[12.5px] font-semibold text-[var(--ink-primary)]">
                {isZh ? "视觉物料（标志与产品主图）" : "Visual Assets"}
              </h3>

              <label className="block space-y-1">
                <span className="text-[12px] text-[var(--ink-secondary)] font-medium">
                  {isZh ? "产品标志 URL（SVG / PNG）" : "Logo URL"}
                </span>
                <input
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://your-saas.com/logo.png"
                  className="w-full h-9 px-3 rounded-[7px] border border-[var(--border-strong)] bg-[var(--bg-surface)] text-[13px] font-mono text-[var(--ink-primary)] outline-none focus:border-[var(--accent-primary)]"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-[12px] text-[var(--ink-secondary)] font-medium">
                  {isZh ? "产品主图截图链接（每行 1 条，建议 1280×720）" : "Hero Screenshot URLs (one per line)"}
                </span>
                <textarea
                  rows={2}
                  value={screenshotsText}
                  onChange={(e) => setScreenshotsText(e.target.value)}
                  placeholder="https://your-saas.com/og-dashboard.png"
                  className="w-full px-3 py-2 rounded-[7px] border border-[var(--border-strong)] bg-[var(--bg-surface)] text-[12.5px] font-mono text-[var(--ink-primary)] outline-none focus:border-[var(--accent-primary)]"
                />
              </label>
            </div>

            {/* 分组 3：分类、竞品与创始人 */}
            <div className="space-y-3.5 pt-4 border-t border-[var(--border-hairline)]">
              <h3 className="text-[12.5px] font-semibold text-[var(--ink-primary)]">
                {isZh ? "分类定位与署名" : "Category & Attribution"}
              </h3>

              <div className="grid sm:grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="text-[12px] text-[var(--ink-secondary)] font-medium">
                    {isZh ? "收费模式" : "Pricing Model"}
                  </span>
                  <select
                    value={pricingModel}
                    onChange={(e) => setPricingModel(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-[7px] border border-[var(--border-strong)] bg-[var(--bg-surface)] text-[13px] text-[var(--ink-primary)] outline-none"
                  >
                    <option value="freemium">{isZh ? "免费增值 (Freemium)" : "Freemium"}</option>
                    <option value="free">{isZh ? "完全免费 / 开源" : "Free / Open Source"}</option>
                    <option value="paid">{isZh ? "订阅 / 买断付费" : "Paid"}</option>
                  </select>
                </label>

                <label className="block space-y-1">
                  <span className="text-[12px] text-[var(--ink-secondary)] font-medium">
                    {isZh ? "所属分类（逗号分隔）" : "Categories"}
                  </span>
                  <input
                    value={categoriesText}
                    onChange={(e) => setCategoriesText(e.target.value)}
                    className="w-full h-9 px-3 rounded-[7px] border border-[var(--border-strong)] bg-[var(--bg-surface)] text-[13px] text-[var(--ink-primary)] outline-none"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-[12px] text-[var(--ink-secondary)] font-medium">
                    {isZh ? "主要竞品（用于替代搜索）" : "Competitors"}
                  </span>
                  <input
                    value={competitorsText}
                    onChange={(e) => setCompetitorsText(e.target.value)}
                    className="w-full h-9 px-3 rounded-[7px] border border-[var(--border-strong)] bg-[var(--bg-surface)] text-[13px] text-[var(--ink-primary)] outline-none"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-[12px] text-[var(--ink-secondary)] font-medium">
                    {isZh ? "创始人姓名 / X 账号" : "Founder & X Handle"}
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      value={founderName}
                      onChange={(e) => setFounderName(e.target.value)}
                      placeholder="Alex Chen"
                      className="h-9 px-2.5 rounded-[7px] border border-[var(--border-strong)] bg-[var(--bg-surface)] text-[12.5px] text-[var(--ink-primary)] outline-none"
                    />
                    <input
                      value={founderX}
                      onChange={(e) => setFounderX(e.target.value)}
                      placeholder="@handle"
                      className="h-9 px-2.5 rounded-[7px] border border-[var(--border-strong)] bg-[var(--bg-surface)] text-[12.5px] font-mono text-[var(--ink-primary)] outline-none"
                    />
                  </div>
                </label>
              </div>
            </div>

            {feedback && (
              <div className="px-3 py-2 rounded-[7px] bg-[var(--status-live-soft)] text-[var(--status-live)] text-[12.5px] font-medium">
                {feedback}
              </div>
            )}
          </div>

          {/* 吸底操作栏 */}
          <div className="px-5 py-3.5 border-t border-[var(--border-hairline)] bg-[var(--bg-surface)] flex items-center justify-between gap-2 shrink-0">
            <Button type="button" variant="secondary" size="sm" onClick={handleCopySubmissionPack}>
              {copiedPack ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedPack ? (isZh ? "已复制整套物料" : "Copied Pack") : isZh ? "复制提交文本包" : "Copy Pack"}
            </Button>
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                {isZh ? "取消" : "Close"}
              </Button>
              <Button type="submit" variant="primary" size="sm" loading={saving}>
                {isZh ? "保存资料" : "Save Brand Kit"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
