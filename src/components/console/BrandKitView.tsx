"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  IconCheck,
  IconCircleCheck,
  IconCircleDashed,
  IconCopy,
  IconExternalLink,
  IconPhoto,
  IconSparkles,
  IconWorldDownload,
} from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { computeBrandKitProgress, type BrandKitRecord } from "@/lib/console-ledger";

interface BrandKitViewProps {
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

interface AutofillResponse {
  ok?: boolean;
  error?: string;
  productName?: string;
  shortTagline?: string;
  mediumPitch?: string;
  longDescription?: string;
  logoUrl?: string;
  screenshots?: string[];
  pricingModel?: string;
  categories?: string[];
  founderX?: string;
}

/**
 * 视图 ⑤：品牌物料库全宽双栏工作台（彻底取代 384px 窄抽屉）
 * - 左 7 列：官网一键抓取 + 完整 10 字段表单（全量绑定 htmlFor + 支持买断制 one-time）
 * - 右 5 列：粘性实时目录卡片预览（含 Logo 与产品主图真实预览）+ 可点击缺项清单
 */
export default function BrandKitView({
  campaignId,
  productName,
  targetUrl,
  initialTagline = "",
  initialCompetitors = "",
  brandKit,
  isZh,
  isSample,
  onSaved,
}: BrandKitViewProps) {
  const [autofillUrl, setAutofillUrl] = useState("");
  const [autofilling, setAutofilling] = useState(false);

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
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copiedPack, setCopiedPack] = useState(false);
  const [logoImgError, setLogoImgError] = useState(false);
  const [heroImgError, setHeroImgError] = useState(false);

  const lastSyncedKeyRef = useRef<string>("");

  useEffect(() => {
    const syncKey = `${campaignId}:${brandKit?.short_tagline || ""}:${brandKit?.completeness_score || 0}`;
    if (dirty && lastSyncedKeyRef.current === syncKey) return;
    lastSyncedKeyRef.current = syncKey;
    setAutofillUrl(targetUrl || "");
    setLogoUrl(brandKit?.logo_url || "");
    setScreenshotsText((brandKit?.screenshots || []).join("\n"));
    setShortTagline(brandKit?.short_tagline || initialTagline || "");
    setMediumPitch(brandKit?.medium_pitch || "");
    setLongDescription(brandKit?.long_description || "");
    setPricingModel(brandKit?.pricing_model || "freemium");
    setCategoriesText(
      (brandKit?.categories?.length ? brandKit.categories : ["SaaS", "Developer Tools"]).join(", ")
    );
    setCompetitorsText(
      (brandKit?.competitors?.length ? brandKit.competitors.join(", ") : initialCompetitors) || ""
    );
    setFounderName(brandKit?.founder_name || "");
    setFounderX(brandKit?.founder_x || "");
    setDirty(false);
    setLogoImgError(false);
    setHeroImgError(false);
  }, [campaignId, brandKit, targetUrl, initialTagline, initialCompetitors]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const mark = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setDirty(true);
  };

  const handleAutofillFromUrl = async () => {
    const raw = autofillUrl.trim();
    if (!raw) {
      toast.error(isZh ? "请先输入官网地址" : "Enter a website URL first");
      return;
    }
    if (isSample) {
      setScreenshotsText((prev) => prev || "https://acmeflow.example/og-dashboard.png");
      setShortTagline((prev) => prev || "Automated SSL & domain expiry alerts for lean SaaS teams");
      setDirty(true);
      toast.success(isZh ? "体验模式已补全主图与定位（登录后支持抓取任意真实网站）" : "Sample assets applied");
      return;
    }
    setAutofilling(true);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    try {
      const res = await fetch("/api/dashboard/brand-kit/autofill", {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: raw }),
      });
      const json = (await res.json()) as AutofillResponse;
      if (!res.ok) {
        toast.error(json.error || (isZh ? "抓取失败，请检查网址是否可公网访问" : "Failed to inspect URL"));
        return;
      }
      if (json.shortTagline) setShortTagline(json.shortTagline);
      if (json.mediumPitch) setMediumPitch(json.mediumPitch);
      if (json.longDescription) setLongDescription(json.longDescription);
      if (json.logoUrl) {
        setLogoUrl(json.logoUrl);
        setLogoImgError(false);
      }
      if (json.screenshots?.length) {
        setScreenshotsText(json.screenshots.join("\n"));
        setHeroImgError(false);
      }
      if (json.pricingModel) setPricingModel(json.pricingModel);
      if (json.categories?.length) setCategoriesText(json.categories.join(", "));
      if (json.founderX) setFounderX(json.founderX);
      setDirty(true);
      toast.success(isZh ? "官网资料已自动提取，核对右侧预览后点击保存" : "Website metadata imported");
    } catch {
      toast.error(isZh ? "抓取超时或网络异常，请重试" : "Autofill request timed out");
    } finally {
      clearTimeout(timer);
      setAutofilling(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSample) {
      await onSaved({ ...liveDraft, completeness_score: progress.score });
      setDirty(false);
      toast.success(isZh ? "体验资料已实时同步（登录后永久保存）" : "Preview Brand Kit updated");
      return;
    }
    if (!campaignId) return;
    setSaving(true);
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
      if (!res.ok) {
        toast.error(isZh ? "保存失败，请检查输入并重试" : "Failed to save Brand Kit");
      } else {
        setDirty(false);
        toast.success(isZh ? "品牌资料已保存，100 目录队列与 AI 拟稿已同步" : "Brand Kit saved");
        await onSaved();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCopyPack = async () => {
    const pack = [
      `Product: ${productName}`,
      `URL: ${targetUrl}`,
      `Tagline: ${shortTagline}`,
      `Pitch: ${mediumPitch}`,
      `Long: ${longDescription}`,
      `Pricing: ${pricingModel}`,
      `Categories: ${categories.join(", ")}`,
      `Competitors: ${competitors.join(", ")}`,
      `Founder: ${founderName} ${founderX}`,
      `Logo: ${logoUrl}`,
      `Screenshots: ${screenshots.join(", ")}`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(pack);
      setCopiedPack(true);
      toast.success(isZh ? "整套品牌物料包已复制" : "Brand Kit pack copied");
      setTimeout(() => setCopiedPack(false), 1600);
    } catch {
      toast.error(isZh ? "复制失败" : "Copy failed");
    }
  };

  const pricingLabel = (val: string) => {
    if (val === "freemium") return isZh ? "免费增值 (Freemium)" : "Freemium";
    if (val === "free") return isZh ? "完全免费" : "Free";
    if (val === "paid") return isZh ? "付费订阅" : "Paid Subscription";
    if (val === "one-time") return isZh ? "一次性买断" : "One-time Purchase";
    return isZh ? "开源自托管" : "Open Source";
  };

  const checklistItems = [
    { id: "bk-tagline", ok: shortTagline.trim().length >= 10, label: isZh ? "一句话定位 (≥10 字)" : "One-line Tagline" },
    { id: "bk-pitch", ok: mediumPitch.trim().length >= 30, label: isZh ? "标准目录简介 (≥30 字)" : "Standard Pitch" },
    { id: "bk-long", ok: longDescription.trim().length >= 60, label: isZh ? "深度场景介绍 (≥60 字)" : "Full Description" },
    { id: "bk-logo", ok: Boolean(logoUrl.trim()), label: isZh ? "产品标志 Logo" : "Brand Logo URL" },
    { id: "bk-shots", ok: screenshots.length > 0, label: isZh ? "产品主图截图 (1280×720)" : "Hero Screenshot" },
    { id: "bk-cats", ok: categories.length > 0, label: isZh ? "产品分类标签" : "Categories" },
    { id: "bk-comps", ok: competitors.length > 0, label: isZh ? "主要竞品词" : "Competitors" },
    { id: "bk-founder", ok: Boolean(founderName.trim() || founderX.trim()), label: isZh ? "创始人署名 / X" : "Founder Profile" },
  ];

  return (
    <div className="flex flex-1 flex-col gap-5 p-4 md:p-6 min-w-0 tabular-nums">
      {/* 顶栏 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{isZh ? "品牌物料库" : "Brand Launch Kit"}</h1>
            <Badge variant={progress.score === 100 ? "success" : "info"} className="font-mono">
              {progress.score}%
            </Badge>
            {dirty && (
              <Badge variant="warning" className="text-[11px]">
                {isZh ? "有未保存更改" : "Unsaved changes"}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isZh
              ? "一次录入并校对品牌资产，自动同步至 100+ 海外目录表单、代投履约台与 AI 买家回复"
              : "Calibrate your assets once — synced automatically to 100+ directories, ops fulfillment, and AI replies"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleCopyPack}>
            {copiedPack ? <IconCheck className="size-3.5" /> : <IconCopy className="size-3.5" />}
            {isZh ? "复制整套物料" : "Copy Full Pack"}
          </Button>
          <Button size="sm" disabled={saving} onClick={handleSave}>
            {saving ? (isZh ? "保存中..." : "Saving...") : isZh ? "保存物料库" : "Save Brand Kit"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 items-start">
        {/* 左侧 7 列：完整表单 */}
        <form onSubmit={handleSave} className="lg:col-span-7 space-y-5">
          {/* 官网一键抓取卡片 */}
          <Card className="border-primary/25 bg-primary/[0.03] shadow-xs">
            <CardContent className="p-4 space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <IconSparkles className="size-4 text-primary" />
                <span>{isZh ? "从产品官网一键自动提取物料" : "Auto-Import Brand Kit from Website"}</span>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  aria-label={isZh ? "官网抓取地址" : "Website URL to crawl"}
                  value={autofillUrl}
                  onChange={(e) => setAutofillUrl(e.target.value)}
                  placeholder="https://your-saas.com"
                  className="h-9 font-mono text-xs bg-background flex-1"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="h-9 shrink-0"
                  disabled={autofilling}
                  onClick={() => void handleAutofillFromUrl()}
                >
                  <IconWorldDownload className="size-4" />
                  {autofilling ? (isZh ? "正在提取..." : "Crawling...") : isZh ? "一键抓取填充" : "Auto-fill"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{isZh ? "英文文案与定位" : "Copy & Positioning"}</CardTitle>
              <CardDescription>
                {isZh ? "海外目录对英文字符长度敏感，系统已按主流平台标准实时计数" : "Sized to match top SaaS directory character limits"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="bk-tagline">{isZh ? "一句话定位（推荐 ≤ 60 字符）" : "One-line Tagline (≤ 60 chars)"}</Label>
                  <span className={`font-mono text-xs ${shortTagline.length > 60 ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                    {shortTagline.length}/60
                  </span>
                </div>
                <Input
                  id="bk-tagline"
                  value={shortTagline}
                  onChange={(e) => mark(setShortTagline)(e.target.value)}
                  placeholder="Automated SSL & domain expiry alerts for lean SaaS teams"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="bk-pitch">{isZh ? "标准目录简介（120–240 字符）" : "Standard Pitch (120–240 chars)"}</Label>
                  <span className={`font-mono text-xs ${mediumPitch.length > 240 ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                    {mediumPitch.length}/240
                  </span>
                </div>
                <Textarea
                  id="bk-pitch"
                  rows={3}
                  value={mediumPitch}
                  onChange={(e) => mark(setMediumPitch)(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bk-long">{isZh ? "深度场景介绍（用于 AlternativeTo / G2 / SaaSHub）" : "Full Description"}</Label>
                <Textarea
                  id="bk-long"
                  rows={4}
                  value={longDescription}
                  onChange={(e) => mark(setLongDescription)(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{isZh ? "视觉资产与产品分类" : "Visual Assets & Metadata"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="bk-logo">{isZh ? "产品标志 Logo URL（正方形 PNG / SVG）" : "Logo URL (Square PNG / SVG)"}</Label>
                <Input
                  id="bk-logo"
                  value={logoUrl}
                  onChange={(e) => {
                    mark(setLogoUrl)(e.target.value);
                    setLogoImgError(false);
                  }}
                  placeholder="https://your-saas.com/logo.png"
                  className="font-mono text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bk-shots">{isZh ? "产品主图截图 URL（每行 1 条，建议 1280×720）" : "Hero Screenshot URLs (1 per line, 1280×720)"}</Label>
                <Textarea
                  id="bk-shots"
                  rows={2}
                  value={screenshotsText}
                  onChange={(e) => {
                    mark(setScreenshotsText)(e.target.value);
                    setHeroImgError(false);
                  }}
                  placeholder="https://your-saas.com/og-dashboard.png"
                  className="font-mono text-xs"
                />
              </div>

              <Separator />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="bk-pricing">{isZh ? "收费模式" : "Pricing Model"}</Label>
                  <Select value={pricingModel} onValueChange={(v) => v && mark(setPricingModel)(String(v))}>
                    <SelectTrigger id="bk-pricing" className="w-full h-9">
                      <SelectValue>{pricingLabel(pricingModel)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="freemium">{pricingLabel("freemium")}</SelectItem>
                      <SelectItem value="free">{pricingLabel("free")}</SelectItem>
                      <SelectItem value="paid">{pricingLabel("paid")}</SelectItem>
                      <SelectItem value="one-time">{pricingLabel("one-time")}</SelectItem>
                      <SelectItem value="open-source">{pricingLabel("open-source")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bk-founder">{isZh ? "创始人署名" : "Founder Name"}</Label>
                  <Input
                    id="bk-founder"
                    value={founderName}
                    onChange={(e) => mark(setFounderName)(e.target.value)}
                    placeholder="Alex Chen"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bk-founderx">{isZh ? "创始人 X 账号" : "Founder X Handle"}</Label>
                  <Input
                    id="bk-founderx"
                    value={founderX}
                    onChange={(e) => mark(setFounderX)(e.target.value)}
                    placeholder="@handle"
                    className="font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="bk-cats">{isZh ? "所属分类（逗号分隔）" : "Categories (comma-separated)"}</Label>
                  <Input
                    id="bk-cats"
                    value={categoriesText}
                    onChange={(e) => mark(setCategoriesText)(e.target.value)}
                    placeholder="SaaS, Developer Tools, AI"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bk-comps">{isZh ? "主要竞品（供买家雷达监听）" : "Competitors (for Buyer Radar)"}</Label>
                  <Input
                    id="bk-comps"
                    value={competitorsText}
                    onChange={(e) => mark(setCompetitorsText)(e.target.value)}
                    placeholder="UptimeRobot, Better Stack"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </form>

        {/* 右侧 5 列：实时目录展示预览 + 完整性清单 */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-20">
          <Card className="shadow-xs overflow-hidden">
            <CardHeader className="pb-3 border-b bg-muted/25">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{isZh ? "目录平台实时卡片预览" : "Live Directory Card Preview"}</CardTitle>
                <Badge variant="neutral" className="text-[11px]">{pricingLabel(pricingModel)}</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {/* 主图预览区 */}
              <div className="aspect-video w-full overflow-hidden rounded-lg border bg-muted/40 flex items-center justify-center">
                {screenshots[0] && !heroImgError ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={screenshots[0]}
                    alt={`${productName} hero preview`}
                    className="h-full w-full object-cover"
                    onError={() => setHeroImgError(true)}
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1.5 text-xs text-muted-foreground p-4 text-center">
                    <IconPhoto className="size-6 opacity-50" />
                    <span>
                      {screenshots[0] && heroImgError
                        ? isZh
                          ? "主图链接无法加载，请检查公开图片地址"
                          : "Screenshot URL failed to load"
                        : isZh
                          ? "尚未填写 1280×720 产品主图链接"
                          : "Add a 1280×720 hero screenshot URL"}
                    </span>
                  </div>
                )}
              </div>

              {/* 品牌头部 */}
              <div className="flex items-start gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-background">
                  {logoUrl.trim() && !logoImgError ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logoUrl.trim()}
                      alt={`${productName} logo`}
                      className="size-full object-contain p-1"
                      onError={() => setLogoImgError(true)}
                    />
                  ) : (
                    <span className="font-bold text-primary text-base">
                      {(productName || "L").slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-base truncate">{productName || "Your SaaS"}</h3>
                    {targetUrl && (
                      <a
                        href={targetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary inline-flex items-center gap-0.5 shrink-0 hover:underline"
                      >
                        {isZh ? "访问" : "Visit"}
                        <IconExternalLink className="size-3" />
                      </a>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {shortTagline || (isZh ? "在此展示你的英文一句话定位..." : "Your one-line tagline appears here...")}
                  </p>
                </div>
              </div>

              <p className="text-xs text-foreground/85 leading-relaxed line-clamp-3">
                {mediumPitch || (isZh ? "填写标准简介后，目录平台访客将在这里看到核心卖点。" : "Your standard pitch will appear here.")}
              </p>

              <div className="flex flex-wrap gap-1.5">
                {categories.map((cat) => (
                  <Badge key={cat} variant="info" className="text-[11px]">
                    {cat}
                  </Badge>
                ))}
                {(founderName || founderX) && (
                  <Badge variant="neutral" className="text-[11px]">
                    {founderName || founderX}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 可点击完整度检查清单 */}
          <Card className="shadow-xs">
            <CardHeader className="pb-2.5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{isZh ? "提交就绪度检查" : "Submission Readiness"}</CardTitle>
                <span className="font-mono text-xs font-semibold text-primary">{progress.score}%</span>
              </div>
              <Progress value={progress.score} className="h-1.5 mt-1" />
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              {checklistItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => document.getElementById(item.id)?.focus()}
                  className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-accent/50 cursor-pointer"
                >
                  {item.ok ? (
                    <IconCircleCheck className="size-3.5 text-emerald-500 shrink-0" />
                  ) : (
                    <IconCircleDashed className="size-3.5 text-amber-500 shrink-0" />
                  )}
                  <span className={`truncate ${item.ok ? "text-muted-foreground" : "font-medium text-foreground"}`}>
                    {item.label}
                  </span>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
