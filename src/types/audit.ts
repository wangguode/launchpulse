/**
 * LaunchPulse 核心审计报告与买家意图线索数据结构
 * 用于全自动视频拆解脚本产出与前端 /audit/[slug] 专属战情页渲染
 */

export type LeakSeverity = "critical" | "high" | "medium";

export interface AuditLeak {
  id: string;
  severity: LeakSeverity;
  category: "AEO / AI Visibility" | "Google SEO" | "Conversion UX" | "Security & Trust";
  title: string;
  evidence: string;
  impactEstimate: string;
  /** 免费开放前 3 条真实缺陷描述，详细修复代码与一键 Prompt 锁在付费层后 */
  fixSummary: string;
  cursorFixPrompt: string;
}

export interface BuyerLead {
  id: string;
  source: "Hacker News" | "Reddit" | "GitHub Discussions";
  community: string;
  author: string;
  postedAt: string;
  title: string;
  excerpt: string;
  url: string;
  intentScore: number;
  suggestedReplyAngle: string;
  /** 前 3 条为 true（100% 免费可点击验真），第 4 条起为 false（模糊锁定） */
  unlockedByDefault: boolean;
}

export interface StartupAuditReport {
  slug: string;
  productName: string;
  targetUrl: string;
  domain: string;
  tagline: string;
  founderContact?: string;
  scannedAt: string;
  overallScore: number;
  subScores: {
    seoAndSchema: number;
    aiSearchVisibility: number;
    conversionAndUx: number;
    securityBaseline: number;
  };
  videoUrl: string;
  posterUrl: string;
  heroScreenshotUrl: string;
  mobileScreenshotUrl: string;
  videoDurationSeconds: number;
  passedChecks: string[];
  leaks: AuditLeak[];
  generatedLlmsTxtPreview: string;
  buyerLeads: BuyerLead[];
}
