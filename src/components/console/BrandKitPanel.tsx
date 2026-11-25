"use client";

import { useEffect, useState } from "react";
import { Check, Copy, ExternalLink, Globe, Image as ImageIcon, Layers, Sparkles } from "lucide-react";
import Button from "@/components/ui/Button";

export interface BrandKitData {
  campaign_id?: number;
  logo_url?: string;
  screenshots?: string[];
  short_tagline?: string;
  medium_pitch?: string;
  long_description?: string;
  pricing_model?: string;
  categories?: string[];
  competitors?: string[];
  founder_name?: string;
  founder_x?: string;
  completeness_score?: number;
}

interface BrandKitPanelProps {
  campaignId: number;
  productName: string;
  targetUrl: string;
  initialTagline?: string;
  initialCompetitors?: string;
  brandKit: BrandKitData | null;
  locale: "en" | "zh" | "ja";
  isSample?: boolean;
  onSaved: () => Promise<void> | void;
}

/**
 * V4 品牌提交资料库（Brand Launch Vault）
 * 一次录入 Logo / 截图 / 三档简介 / 竞品 / 创始人信息，右侧实时渲染目录站卡片预览，
 * 支持一键复制给运营或直接推送到 D1 供 100+ 目录分发复用。
 */
export default function BrandKitPanel({
  campaignId,
  productName,
  targetUrl,
  initialTagline = "",
  initialCompetitors = "",
  brandKit,
  locale,
  isSample = false,
  onSaved,
}: BrandKitPanelProps) {
  const isZh = locale === "zh";
  const [logoUrl, setLogoUrl] = useState("");
  const [screenshotsText, setScreenshotsText] = useState("");
  const [shortTagline, setShortTagline] = useState("");
  const [mediumPitch, setMediumPitch] = useState("");
  const [longDescription, setLongDescription] = useState("");
  const [pricingModel, setPricingModel] = useState("freemium");
  const [categoriesText, setCategoriesText] = useState("SaaS, AI Tools, Developer Tools");
  const [competitorsText, setCompetitorsText] = useState("");
  const [founderName, setFounderName] = useState("");
  const [founderX, setFounderX] = useState("");
  const [previewPlatform, setPreviewPlatform] = useState<"alternativeto" | "producthunt" | "taaft">("alternativeto");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
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
        : ["SaaS", "Developer Tools", "Productivity"]
      ).join(", ")
    );
    setCompetitorsText(
      (brandKit?.competitors && brandKit.competitors.length > 0
        ? brandKit.competitors.join(", ")
        : initialCompetitors) || ""
    );
    setFounderName(brandKit?.founder_name || "");
    setFounderX(brandKit?.founder_x || "");
  }, [brandKit, campaignId, initialTagline, initialCompetitors]);

  // 实时计算完整度评分（与后端同源算法）
  const liveScore = (() => {
    let s = 0;
    if (shortTagline.trim().length >= 10) s += 20;
    if (mediumPitch.trim().length >= 30) s += 20;
    if (longDescription.trim().length >= 60) s += 15;
    if (logoUrl.trim()) s += 15;
    if (screenshotsText.trim()) s += 10;
    if (categoriesText.trim()) s += 10;
    if (competitorsText.trim()) s += 5;
    if (founderName.trim() || founderX.trim()) s += 5;
    return s;
  })();

  const categories = categoriesText
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 6);
  const competitors = competitorsText
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 6);
  const screenshots = screenshotsText
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 5);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSample) {
      setMsg(isZh ? "示例预览模式：注册登录账号后即可持久化保存资料库。" : "Sample mode: sign in to persist your Brand Launch Kit.");
      return;
    }
    if (!campaignId) {
      setMsg(isZh ? "请先创建并保存一个推广项目。" : "Save a project first before storing Brand Kit assets.");
      return;
    }
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch("/api/dashboard/brand-kit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          logoUrl,
          screenshots,
          shortTagline,
          mediumPitch,
          longDescription,
          pricingModel,
          categories,
          competitors,
          founderName,
          founderX,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; completenessScore?: number };
      if (!res.ok) {
        setMsg(data.error || "Save failed");
      } else {
        setMsg(
          isZh
            ? `已保存至云端资料库（完整度 ${data.completenessScore ?? liveScore}%），100+ 目录专人提交将直接调用此物料。`
            : `Saved to Brand Launch Vault (${data.completenessScore ?? liveScore}% ready). Fulfillment team pulls directly from this kit.`
        );
        await onSaved();
      }
    } catch {
      setMsg("Network error.");
    } finally {
      setSaving(false);
    }
  };

  const handleCopyPack = async () => {
    const md = [
      `# ${productName} — Submission Brand Kit`,
      `- Website: ${targetUrl}`,
      `- Pricing: ${pricingModel}`,
      `- Tagline (60c): ${shortTagline}`,
      `- Pitch (260c): ${mediumPitch}`,
      `- Categories: ${categories.join(", ")}`,
      `- Competitors: ${competitors.join(", ")}`,
      `- Founder: ${founderName} ${founderX}`,
      logoUrl ? `- Logo: ${logoUrl}` : "",
      screenshots.length ? `- Screenshots:\n${screenshots.map((u) => `  - ${u}`).join("\n")}` : "",
      "",
      longDescription,
    ]
      .filter(Boolean)
      .join("\n");
    try {
      await navigator.clipboard.writeText(md);
      setCopiedPack(true);
      setTimeout(() => setCopiedPack(false), 1800);
    } catch {
      // ignore
    }
  };

  const domain = targetUrl.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] || "your-saas.com";

  return (
    <div className="space-y-5">
      {/* 顶部完整度进度条卡 */}
      <div className="rounded-[18px] border border-[var(--apple-border)] bg-[var(--apple-surface)] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[var(--apple-blue)]" />
            <h2 className="text-[16px] font-semibold text-[var(--apple-ink)]">
              {isZh ? "品牌提交资料库（Brand Launch Vault）" : "Brand Launch Vault"}
            </h2>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-semibold tabular-nums ${
                liveScore >= 80
                  ? "bg-[var(--apple-green-soft)] text-[var(--apple-green)]"
                  : "bg-[var(--apple-blue-soft)] text-[var(--apple-blue)]"
              }`}
            >
              {liveScore}% {isZh ? "完整度" : "Ready"}
            </span>
          </div>
          <p className="text-[13px] text-[var(--apple-ink-secondary)]">
            {isZh
              ? "只需填写一次，100+ 海外高权重目录提交与买家雷达回复草稿全部自动复用，告别反复复制粘贴。"
              : "Enter your assets once. Every directory submission and buyer reply pulls directly from this vault."}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="w-28 h-2 rounded-full bg-[var(--apple-surface-subtle)] overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${liveScore}%`,
                backgroundColor: liveScore >= 80 ? "var(--apple-green)" : "var(--apple-blue)",
              }}
            />
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={handleCopyPack}>
            {copiedPack ? <Check className="w-3.5 h-3.5 text-[var(--apple-green)]" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedPack ? (isZh ? "已复制物料包" : "Copied Pack") : isZh ? "复制提交物料" : "Copy Kit"}
          </Button>
        </div>
      </div>

      {/* 双栏布局：左结构化录入，右多平台实时卡片预览 */}
      <div className="grid lg:grid-cols-12 gap-5">
        <form
          onSubmit={handleSave}
          className="lg:col-span-7 rounded-[18px] border border-[var(--apple-border)] bg-[var(--apple-surface)] p-5 sm:p-6 space-y-4"
        >
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[12px]">
                <label className="font-medium text-[var(--apple-ink-secondary)]">
                  {isZh ? "短标语（60 字符内）" : "Short Tagline (≤60 chars)"}
                </label>
                <span className="tabular-nums text-[11px] text-[var(--apple-ink-tertiary)]">{shortTagline.length}/60</span>
              </div>
              <input
                type="text"
                maxLength={80}
                value={shortTagline}
                onChange={(e) => setShortTagline(e.target.value)}
                placeholder={isZh ? "例：零上传本地加密解析银行账单为 QBO/Xero CSV" : "Automated SSL & domain expiry alerts for dev teams"}
                className="w-full h-10 px-3.5 rounded-[10px] border border-[var(--apple-border-strong)] bg-[var(--apple-bg)] text-[14px] text-[var(--apple-ink)] outline-none focus:border-[var(--apple-blue)]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-[var(--apple-ink-secondary)]">
                {isZh ? "定价模式" : "Pricing Model"}
              </label>
              <select
                value={pricingModel}
                onChange={(e) => setPricingModel(e.target.value)}
                className="w-full h-10 px-3 rounded-[10px] border border-[var(--apple-border-strong)] bg-[var(--apple-bg)] text-[14px] text-[var(--apple-ink)] outline-none focus:border-[var(--apple-blue)]"
              >
                <option value="freemium">Freemium (免费版 + 付费升级)</option>
                <option value="free">100% Free / Open Source</option>
                <option value="one-time">One-Time Lifetime Deal</option>
                <option value="paid">Paid Subscription</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[12px]">
              <label className="font-medium text-[var(--apple-ink-secondary)]">
                {isZh ? "标准目录介绍（260 字符，AlternativeTo / SaaSHub / TAAFT 主简介）" : "Directory Pitch (≤260 chars)"}
              </label>
              <span className="tabular-nums text-[11px] text-[var(--apple-ink-tertiary)]">{mediumPitch.length}/260</span>
            </div>
            <textarea
              rows={3}
              maxLength={320}
              value={mediumPitch}
              onChange={(e) => setMediumPitch(e.target.value)}
              placeholder={
                isZh
                  ? "清晰写出面向谁、解决什么核心痛点、和传统工具相比快/省在哪里..."
                  : "Describe who it's built for, the exact workflow bottleneck removed, and why users switch..."
              }
              className="w-full p-3 rounded-[10px] border border-[var(--apple-border-strong)] bg-[var(--apple-bg)] text-[14px] text-[var(--apple-ink)] outline-none focus:border-[var(--apple-blue)]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-[var(--apple-ink-secondary)]">
              {isZh ? "详细功能说明（用于 BetaList / SourceForge / 深度目录页）" : "Long Description (Features & Use Cases)"}
            </label>
            <textarea
              rows={3}
              maxLength={2000}
              value={longDescription}
              onChange={(e) => setLongDescription(e.target.value)}
              placeholder={isZh ? "列出 3–5 条核心差异化亮点、技术优势与适用场景..." : "Bullet key capabilities, integrations, and security guarantees..."}
              className="w-full p-3 rounded-[10px] border border-[var(--apple-border-strong)] bg-[var(--apple-bg)] text-[14px] text-[var(--apple-ink)] outline-none focus:border-[var(--apple-blue)]"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-[var(--apple-ink-secondary)]">
                {isZh ? "产品 Logo 图片 URL" : "Logo Image URL"}
              </label>
              <input
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://your-saas.com/logo.png"
                className="w-full h-10 px-3.5 rounded-[10px] border border-[var(--apple-border-strong)] bg-[var(--apple-bg)] text-[14px] text-[var(--apple-ink)] outline-none focus:border-[var(--apple-blue)]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-[var(--apple-ink-secondary)]">
                {isZh ? "目录分类标签（英文逗号分隔）" : "Directory Categories (comma-separated)"}
              </label>
              <input
                type="text"
                value={categoriesText}
                onChange={(e) => setCategoriesText(e.target.value)}
                placeholder="SaaS, AI Tools, DevOps, Analytics"
                className="w-full h-10 px-3.5 rounded-[10px] border border-[var(--apple-border-strong)] bg-[var(--apple-bg)] text-[14px] text-[var(--apple-ink)] outline-none focus:border-[var(--apple-blue)]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-[var(--apple-ink-secondary)]">
              {isZh ? "产品截图 URL（每行 1 张，建议 1270×760 高清图）" : "Gallery Screenshot URLs (1 per line, 1270×760 recommended)"}
            </label>
            <textarea
              rows={2}
              value={screenshotsText}
              onChange={(e) => setScreenshotsText(e.target.value)}
              placeholder={"https://your-saas.com/og-dashboard.png\nhttps://your-saas.com/og-workflow.png"}
              className="w-full p-3 rounded-[10px] border border-[var(--apple-border-strong)] bg-[var(--apple-bg)] text-[13px] font-mono text-[var(--apple-ink)] outline-none focus:border-[var(--apple-blue)]"
            />
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-[var(--apple-ink-secondary)]">
                {isZh ? "主要竞品（逗号分隔）" : "Top Competitors"}
              </label>
              <input
                type="text"
                value={competitorsText}
                onChange={(e) => setCompetitorsText(e.target.value)}
                placeholder="UptimeRobot, Better Stack"
                className="w-full h-10 px-3 rounded-[10px] border border-[var(--apple-border-strong)] bg-[var(--apple-bg)] text-[13px] text-[var(--apple-ink)] outline-none focus:border-[var(--apple-blue)]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-[var(--apple-ink-secondary)]">
                {isZh ? "创始人姓名" : "Founder Name"}
              </label>
              <input
                type="text"
                value={founderName}
                onChange={(e) => setFounderName(e.target.value)}
                placeholder="Alex Chen"
                className="w-full h-10 px-3 rounded-[10px] border border-[var(--apple-border-strong)] bg-[var(--apple-bg)] text-[13px] text-[var(--apple-ink)] outline-none focus:border-[var(--apple-blue)]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-[var(--apple-ink-secondary)]">
                {isZh ? "创始人 X / Twitter" : "Founder X Handle"}
              </label>
              <input
                type="text"
                value={founderX}
                onChange={(e) => setFounderX(e.target.value)}
                placeholder="@yourhandle"
                className="w-full h-10 px-3 rounded-[10px] border border-[var(--apple-border-strong)] bg-[var(--apple-bg)] text-[13px] text-[var(--apple-ink)] outline-none focus:border-[var(--apple-blue)]"
              />
            </div>
          </div>

          {msg && (
            <div className="rounded-[10px] bg-[var(--apple-blue-soft)] text-[var(--apple-blue)] px-3.5 py-2.5 text-[12px] font-medium">
              {msg}
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-[var(--apple-ink-tertiary)]">
              {isZh ? "达 80% 完整度即可满足 100+ 目录站全字段审核标准" : "Reach 80%+ for smooth approval across all 100+ directories"}
            </span>
            <Button type="submit" variant="primary" size="md" loading={saving}>
              <Sparkles className="w-3.5 h-3.5" />
              {isZh ? "保存品牌资料库" : "Save Brand Kit"}
            </Button>
          </div>
        </form>

        {/* 右侧：真实目录站实时卡片预览器 */}
        <div className="lg:col-span-5 rounded-[18px] border border-[var(--apple-border)] bg-[var(--apple-surface)] p-5 sm:p-6 flex flex-col justify-between gap-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12px] font-semibold text-[var(--apple-ink)]">
                {isZh ? "目录收录实时预览" : "Live Listing Card Preview"}
              </span>
              <div className="inline-flex rounded-[8px] border border-[var(--apple-border)] bg-[var(--apple-bg)] p-0.5 text-[11px]">
                {[
                  { id: "alternativeto", label: "AlternativeTo" },
                  { id: "producthunt", label: "Launchpad" },
                  { id: "taaft", label: "AI Directory" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setPreviewPlatform(tab.id as "alternativeto" | "producthunt" | "taaft")}
                    className={`px-2 py-1 rounded-[6px] font-medium transition cursor-pointer ${
                      previewPlatform === tab.id
                        ? "bg-[var(--apple-surface)] text-[var(--apple-ink)] shadow-xs"
                        : "text-[var(--apple-ink-secondary)]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 模拟真实目录卡片 */}
            <div className="rounded-[16px] border border-[var(--apple-border)] bg-[var(--apple-bg)] p-4 space-y-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-[12px] border border-[var(--apple-border)] bg-[var(--apple-surface)] flex items-center justify-center shrink-0 overflow-hidden">
                    {logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logoUrl} alt={productName} className="w-full h-full object-cover" />
                    ) : (
                      <Globe className="w-5 h-5 text-[var(--apple-blue)]" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-[15px] font-semibold text-[var(--apple-ink)] truncate">
                        {productName || "Your SaaS"}
                      </p>
                      <span className="px-1.5 py-0.5 rounded bg-[var(--apple-surface-subtle)] text-[10px] font-medium uppercase text-[var(--apple-ink-secondary)]">
                        {pricingModel}
                      </span>
                    </div>
                    <p className="text-[12px] text-[var(--apple-ink-secondary)] truncate">
                      {shortTagline || (isZh ? "你的 60 字精炼卖点将显示在这里" : "Your concise 60-char tagline appears here")}
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-[var(--apple-border)] bg-[var(--apple-surface)] text-[11px] font-medium text-[var(--apple-ink)] shrink-0">
                  {previewPlatform === "producthunt" ? "▲ 128" : "Visit"}
                  {previewPlatform !== "producthunt" && <ExternalLink className="w-3 h-3" />}
                </span>
              </div>

              {/* 预览截图区 */}
              <div className="rounded-[12px] border border-[var(--apple-border)] bg-[var(--apple-surface)] h-36 flex items-center justify-center overflow-hidden">
                {screenshots[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={screenshots[0]} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center space-y-1 text-[var(--apple-ink-tertiary)]">
                    <ImageIcon className="w-6 h-6 mx-auto opacity-60" />
                    <p className="text-[11px]">
                      {isZh ? "填入截图 URL 即刻预览画廊主图" : "Add a screenshot URL to preview hero gallery"}
                    </p>
                  </div>
                )}
              </div>

              <p className="text-[12px] text-[var(--apple-ink-secondary)] leading-relaxed line-clamp-3">
                {mediumPitch ||
                  (isZh
                    ? "标准目录简介将展示在 AlternativeTo、SaaSHub、Toolify 与 Futurepedia 详情页中，帮助海外精准访客 3 秒看懂你的核心差异化。"
                    : "Your 260-char directory pitch appears across AlternativeTo, SaaSHub, and AI aggregators to convert high-intent visitors.")}
              </p>

              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {categories.map((c) => (
                  <span
                    key={c}
                    className="px-2 py-0.5 rounded-full bg-[var(--apple-surface)] border border-[var(--apple-border)] text-[10px] font-medium text-[var(--apple-ink-secondary)]"
                  >
                    #{c}
                  </span>
                ))}
                {competitors.slice(0, 2).map((comp) => (
                  <span
                    key={comp}
                    className="px-2 py-0.5 rounded-full bg-[var(--apple-blue-soft)] text-[var(--apple-blue)] text-[10px] font-medium"
                  >
                    vs {comp}
                  </span>
                ))}
              </div>

              <div className="pt-2 border-t border-[var(--apple-border)] flex items-center justify-between text-[11px] text-[var(--apple-ink-tertiary)]">
                <span className="font-mono">{domain}</span>
                <span>{founderName ? `Built by ${founderName}` : previewPlatform === "taaft" ? "Verified AI Listing" : "Dofollow Backlink Ready"}</span>
              </div>
            </div>
          </div>

          <div className="rounded-[12px] bg-[var(--apple-bg)] border border-[var(--apple-border)] p-3.5 text-[12px] text-[var(--apple-ink-secondary)] space-y-1">
            <p className="font-semibold text-[var(--apple-ink)]">
              {isZh ? "为什么完整资料库能将收录通过率提升 2.3×？" : "Why complete Brand Kits double approval rates"}
            </p>
            <p className="leading-relaxed">
              {isZh
                ? "人工审核站（BetaList / Futurepedia / SaaSHub）对缺截图、简介过短的产品拒审率极高。一次完善 80%+ 资料，即可确保 100+ 站高通过率与干净锚文本。"
                : "Human-moderated directories reject thin submissions. Completing 80%+ of fields ensures clean dofollow backlinks across Wave 1–3."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
