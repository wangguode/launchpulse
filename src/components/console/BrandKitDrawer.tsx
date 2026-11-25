"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { IconCheck, IconCopy, IconSparkles, IconWorldDownload } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
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
 * 基于官方 shadcn/ui Sheet + Progress 的品牌提交资料库
 * 新增：输入官网 URL 一键自动抓取并智能填充 Brand Kit（支持超时保护与体验模式预览）
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
  const [saving, setSaving] = useState(false);
  const [copiedPack, setCopiedPack] = useState(false);

  useEffect(() => {
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
  }, [brandKit, campaignId, targetUrl, initialTagline, initialCompetitors, open]);

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

  const handleAutofillFromUrl = async () => {
    const raw = autofillUrl.trim();
    if (!raw) {
      toast.error(isZh ? "请先输入官网地址" : "Enter a website URL first");
      return;
    }
    if (isSample) {
      setScreenshotsText((prev) => prev || "https://acmeflow.example/og-dashboard.png");
      setShortTagline((prev) => prev || "Automated SSL & domain expiry alerts for lean SaaS teams");
      toast.success(
        isZh
          ? "体验模式已补全主图与定位（登录后支持抓取任意真实官网自动填充）"
          : "Sample metadata applied (sign in to crawl any live website)"
      );
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
      if (json.logoUrl) setLogoUrl(json.logoUrl);
      if (json.screenshots?.length) setScreenshotsText(json.screenshots.join("\n"));
      if (json.pricingModel) setPricingModel(json.pricingModel);
      if (json.categories?.length) setCategoriesText(json.categories.join(", "));
      if (json.founderX) setFounderX(json.founderX);
      toast.success(isZh ? "已从官网自动抓取并填充资料，核对后点击保存即可" : "Website metadata imported");
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
        toast.error(isZh ? "保存失败，请重试" : "Failed to save Brand Kit");
      } else {
        toast.success(isZh ? "品牌资料已保存，100 目录队列已同步" : "Brand Kit saved");
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
      `Logo: ${logoUrl}`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(pack);
      setCopiedPack(true);
      toast.success(isZh ? "整套品牌提交包已复制" : "Brand Kit pack copied");
      setTimeout(() => setCopiedPack(false), 1600);
    } catch {
      // ignore
    }
  };

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col p-0">
        <SheetHeader className="border-b px-5 py-4 space-y-2.5">
          <div>
            <SheetTitle>{isZh ? "品牌提交资料" : "Brand Kit"}</SheetTitle>
            <SheetDescription>
              {isZh
                ? "输入官网一键自动抓取，一次校对复用于 100+ 海外目录与 AI 回复"
                : "Auto-import from your website URL once — reused across 100+ directories"}
            </SheetDescription>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs tabular-nums">
              <span className="font-medium">{isZh ? `完成度 ${progress.score}%` : `${progress.score}% complete`}</span>
              <span className="text-muted-foreground">
                {missingList.length > 0
                  ? isZh
                    ? `还差：${missingList.slice(0, 2).join("、")}`
                    : `Missing: ${missingList.slice(0, 2).join(", ")}`
                  : isZh
                    ? "已达 100% 满配"
                    : "100% ready"}
              </span>
            </div>
            <Progress value={progress.score} />
          </div>
        </SheetHeader>

        <form onSubmit={handleSave} className="flex flex-1 flex-col min-h-0">
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            {/* 一键抓取官网元数据快捷条 */}
            <div className="rounded-lg border bg-muted/40 p-3.5 space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium">
                <IconSparkles className="size-3.5 text-primary" />
                <span>{isZh ? "输入官网网址，一键自动抓取并填充资料" : "Auto-fill Brand Kit from Website URL"}</span>
              </div>
              <div className="flex gap-2">
                <Input
                  value={autofillUrl}
                  onChange={(e) => setAutofillUrl(e.target.value)}
                  placeholder="https://your-saas.com"
                  className="h-8 font-mono text-xs bg-background"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="h-8 shrink-0"
                  disabled={autofilling}
                  onClick={() => void handleAutofillFromUrl()}
                >
                  <IconWorldDownload className="size-3.5" />
                  {autofilling ? (isZh ? "抓取中..." : "Crawling...") : isZh ? "一键抓取" : "Auto-fill"}
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>{isZh ? "一句话定位（英文 ≤ 60 字符）" : "One-line Tagline"}</Label>
                  <span className="font-mono text-xs text-muted-foreground">{shortTagline.length}/60</span>
                </div>
                <Input value={shortTagline} onChange={(e) => setShortTagline(e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>{isZh ? "标准目录简介（120–240 字符）" : "Standard Pitch"}</Label>
                  <span className="font-mono text-xs text-muted-foreground">{mediumPitch.length}/240</span>
                </div>
                <Textarea rows={3} value={mediumPitch} onChange={(e) => setMediumPitch(e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <Label>{isZh ? "深度场景介绍" : "Full Description"}</Label>
                <Textarea rows={3} value={longDescription} onChange={(e) => setLongDescription(e.target.value)} />
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>{isZh ? "产品标志 Logo URL" : "Logo URL"}</Label>
                <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} className="font-mono text-xs" />
              </div>

              <div className="space-y-1.5">
                <Label>{isZh ? "产品主图截图链接（每行 1 条，1280×720）" : "Hero Screenshot URLs"}</Label>
                <Textarea
                  rows={2}
                  value={screenshotsText}
                  onChange={(e) => setScreenshotsText(e.target.value)}
                  placeholder="https://your-saas.com/hero.png"
                  className="font-mono text-xs"
                />
              </div>
            </div>

            <Separator />

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{isZh ? "收费模式" : "Pricing"}</Label>
                <select
                  value={pricingModel}
                  onChange={(e) => setPricingModel(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm outline-none"
                >
                  <option value="freemium">{isZh ? "免费增值 (Freemium)" : "Freemium"}</option>
                  <option value="free">{isZh ? "完全免费 / 开源" : "Free / OSS"}</option>
                  <option value="paid">{isZh ? "付费订阅" : "Paid"}</option>
                  <option value="open-source">{isZh ? "开源自托管" : "Open Source"}</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>{isZh ? "所属分类" : "Categories"}</Label>
                <Input value={categoriesText} onChange={(e) => setCategoriesText(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>{isZh ? "主要竞品" : "Competitors"}</Label>
                <Input value={competitorsText} onChange={(e) => setCompetitorsText(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>{isZh ? "创始人署名 / X" : "Founder & X"}</Label>
                <div className="grid grid-cols-2 gap-1.5">
                  <Input value={founderName} onChange={(e) => setFounderName(e.target.value)} placeholder="Alex" />
                  <Input value={founderX} onChange={(e) => setFounderX(e.target.value)} placeholder="@handle" className="font-mono text-xs" />
                </div>
              </div>
            </div>
          </div>

          <SheetFooter className="border-t px-5 py-3 flex-row items-center justify-between gap-2">
            <Button type="button" variant="outline" size="sm" onClick={handleCopyPack}>
              {copiedPack ? <IconCheck className="size-3.5" /> : <IconCopy className="size-3.5" />}
              {isZh ? "复制物料包" : "Copy Pack"}
            </Button>
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                {isZh ? "关闭" : "Close"}
              </Button>
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? (isZh ? "保存中..." : "Saving...") : isZh ? "保存资料" : "Save"}
              </Button>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
