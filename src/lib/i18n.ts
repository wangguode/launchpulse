/**
 * LaunchPulse 全局三语词典（English / 简体中文 / 日本語）
 * 统一核心定位：50+ 高权重目录流量分发 ($39) + 24/7 真实买家引流雷达 ($29/月) + 全包冷启动冲刺 ($299)
 */

export type Locale = "en" | "zh" | "ja";

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "EN",
  zh: "中文",
  ja: "日本語",
};

export interface Dictionary {
  common: {
    privacy: string;
    terms: string;
    runFreeScan: string;
    backToHome: string;
    copy: string;
    copied: string;
    copyPrompt: string;
    copyFile: string;
    copiedBang: string;
    loading: string;
    networkCheckoutError: string;
    unableCheckoutError: string;
    questionsEmailFounder: string;
    passiveFooterNote: string;
    questionsPrefix: string;
  };
  nav: {
    samples: string;
    howItWorks: string;
    pricing: string;
    portal: string;
    cta: string;
  };
  hero: {
    badge: string;
    titlePrefix: string;
    titleHighlight: string;
    subtitle: string;
    placeholder: string;
    scanBtn: string;
    scanningBtn: string;
    trust1: string;
    trust2: string;
    trust3: string;
  };
  scanner: {
    scanFailed: string;
    networkScanError: string;
    liveSnapshot: string;
    readinessScore: string;
    detectedLeaks: string;
    matchedDiscussions: string;
    first3Free: string;
    noLeadsFallback: string;
    openLiveThread: string;
    upsellPromptPrefix: string;
    upsellPromptSuffix: string;
    getBlitzBtn: string;
    startRadarBtn: string;
  };
  samples: {
    kicker: string;
    titleSuffix: string;
    openWarRoom: string;
    inspectFull: string;
  };
  pillars: {
    kicker: string;
    title: string;
    p1Title: string;
    p1Desc: string;
    p2Title: string;
    p2Desc: string;
    p3Title: string;
    p3Desc: string;
  };
  pricing: {
    kicker: string;
    title: string;
    subtitle: string;
    freeLabel: string;
    freePeriod: string;
    freeDesc: string;
    freeF1: string;
    freeF2: string;
    freeF3: string;
    freeBtn: string;
    fixLabel: string;
    fixPeriod: string;
    fixDesc: string;
    fixF1: string;
    fixF2: string;
    fixF3: string;
    fixF4Prefix: string;
    fixF4Text: string;
    fixBtn: string;
    radarLabel: string;
    radarPeriod: string;
    radarBadge: string;
    radarDesc: string;
    radarF1: string;
    radarF2: string;
    radarF3: string;
    radarF4: string;
    radarBtn: string;
    loadingCheckout: string;
  };
  warRoom: {
    privateWarRoom: string;
    fullPackUnlocked: string;
    postCheckoutTitle: string;
    claimEmailPlaceholder: string;
    sendMagicLinkBtn: string;
    magicLinkSentFallback: string;
    paymentVerifiedStrong: string;
    paymentVerifiedBodyPrefix: string;
    paymentVerifiedBodyMid: string;
    paymentVerifiedBodySuffix: string;
    exclusivePrefix: string;
    passiveScan: string;
    teardownHeadingSuffix: string;
    introPrefix: string;
    introMid1: string;
    introMid2: string;
    introThreadsUnit: string;
    introSuffix: string;
    readiness: string;
    leaksFound: string;
    subScoreAi: string;
    subScoreSeo: string;
    subScoreUx: string;
    subScoreSec: string;
    videoTitleMid: string;
    videoSpecs: string;
    ch1: string;
    ch2Suffix: string;
    ch3: string;
    ch4: string;
    videoUnsupported: string;
    leaksSection: string;
    passiveBadge: string;
    leakTagPrefix: string;
    impactPrefix: string;
    readyPromptLabel: string;
    lockedPromptLabel: string;
    unlockBlitzShort: string;
    generatedLlmsTitle: string;
    llmsOverlayDescPrefix: string;
    llmsOverlayDescSuffix: string;
    unlockBlitzLong: string;
    buyersSection: string;
    first3Free: string;
    unlockedTag: string;
    intentLabel: string;
    authorLabel: string;
    openThread: string;
    moreQueuedPrefix: string;
    moreQueuedSuffix: string;
    updatedDaily: string;
    mostPopular: string;
    radarTitle: string;
    perMonth: string;
    radarBullet1Prefix: string;
    radarBullet1Suffix: string;
    radarBullet2: string;
    radarBullet3Prefix: string;
    radarBullet3Suffix: string;
    radarBullet4: string;
    unlockAll: string;
    blitzCardDesc: string;
    buyFixPack: string;
    backToScanner: string;
  };
  portal: {
    headerLabel: string;
    badge: string;
    title: string;
    subtitle: string;
    inputPlaceholder: string;
    checkingBtn: string;
    submitBtn: string;
    noOrderFallback: string;
    lookupError: string;
    unboundTitlePrefix: string;
    unboundTitleSuffix: string;
    activatingBtn: string;
    activateBtn: string;
    scanUrlError: string;
    bindNetworkError: string;
    previewLabel: string;
    previewDemoBtn: string;
    activeWorkspace: string;
    planBlitzLabel: string;
    planDfyLabel: string;
    planRadarLabel: string;
    workspaceHint: string;
    rescanBtn: string;
    rescanningBtn: string;
    switchWorkspace: string;
    rescanDonePrefix: string;
    rescanDoneMid: string;
    rescanDoneSuffix: string;
    dirTrackerBadge: string;
    dirTrackerTitlePrefix: string;
    exportCsvBtn: string;
    statusQueued: string;
    statusSubmitted: string;
    statusLive: string;
    verifiedBacklink: string;
    promptsTitle: string;
    fixTagPrefix: string;
    readyLlmsHeader: string;
    buyersTitle: string;
    clickBadgeHint: string;
    leadStatusNew: string;
    leadStatusReplied: string;
    leadStatusWon: string;
    radarUpgradeTitle: string;
    radarUpgradeDesc: string;
    radarUpgradeBtn: string;
    suggestedReplyLabel: string;
    openThreadReply: string;
    vsGeneratorTitle: string;
    copyVsMarkdown: string;
    copiedMarkdown: string;
    competitorPlaceholder: string;
    vsHintPrefix: string;
    vsHintMid: string;
    vsHintSuffix: string;
    dfyBadge: string;
    dfyHeadline: string;
    dfyDescPrefix: string;
    dfyDescSuffix: string;
    dfyBtn: string;
  };
  liveAudit: {
    missingSlug: string;
    notFound: string;
    unableToLoad: string;
    loadingText: string;
  };
  legal: {
    lastUpdated: string;
    privacyTitle: string;
    privacyS1Title: string;
    privacyS1Body: string;
    privacyS2Title: string;
    privacyS2Body: string;
    privacyS3Title: string;
    privacyS3BodyPrefix: string;
    privacyS3BodySuffix: string;
    termsTitle: string;
    termsS1Title: string;
    termsS1Body: string;
    termsS2Title: string;
    termsS2BodyPrefix: string;
    termsS2BodySuffix: string;
  };
}

export const DICTIONARIES: Record<Locale, Dictionary> = {
  en: {
    common: {
      privacy: "Privacy",
      terms: "Terms",
      runFreeScan: "Run Free Scan",
      backToHome: "← Back to LaunchPulse",
      copy: "Copy",
      copied: "Copied",
      copyPrompt: "Copy Prompt",
      copyFile: "Copy File",
      copiedBang: "Copied!",
      loading: "Loading...",
      networkCheckoutError: "Network error while connecting to Creem checkout.",
      unableCheckoutError: "Unable to open checkout right now.",
      questionsEmailFounder: "Questions? Email Founder →",
      passiveFooterNote: "LaunchPulse · 100% Passive Read-Only Diagnostics",
      questionsPrefix: "Questions?",
    },
    nav: {
      samples: "Live Traffic Samples",
      howItWorks: "How We Drive Users",
      pricing: "Pricing",
      portal: "Customer Portal",
      cta: "50+ Directory Blitz · $39",
    },
    hero: {
      badge: "50+ HIGH-DR DIRECTORY DISTRIBUTION + 24/7 BUYER TRAFFIC RADAR",
      titlePrefix: "Stop shipping into the void — ",
      titleHighlight: "get real buyers & backlinks to your SaaS.",
      subtitle:
        "Claude Code can build your app in a weekend, but it can't submit you to 50+ high-DR directories or hunt active buyers across Hacker News & Reddit. We handle distribution so real users actually visit and pay.",
      placeholder: "https://your-startup.com",
      scanBtn: "Scan Traffic Gaps & Live Buyers",
      scanningBtn: "Scanning Live...",
      trust1: "50+ High-DR Directories (DR 45–91)",
      trust2: "First 3 Fresh Buyer Threads Free",
      trust3: "Free Bonus: SEO & /llms.txt Audit",
    },
    scanner: {
      scanFailed: "Scan failed. Please check the URL.",
      networkScanError: "Network error while running passive edge scan.",
      liveSnapshot: "LIVE EDGE SNAPSHOT",
      readinessScore: "READINESS SCORE",
      detectedLeaks: "Detected SEO / AEO / Header Leaks",
      matchedDiscussions: "Matched Developer Discussions",
      first3Free: "First 3 Free",
      noLeadsFallback:
        "Start 24/7 Buyer Radar Pro ($29/mo) to run deep multi-keyword Hacker News, Reddit & GitHub monitoring for",
      openLiveThread: "Open Live Thread",
      upsellPromptPrefix:
        "Want 50+ high-DR directory backlinks, a custom 80s teardown video & daily buyer alerts for",
      upsellPromptSuffix: "?",
      getBlitzBtn: "50+ Directory Blitz ($39)",
      startRadarBtn: "Start 24/7 Radar ($29/mo)",
    },
    samples: {
      kicker: "REAL TRAFFIC WAR-ROOMS · NOT MOCKUPS",
      titleSuffix: "-Second Traffic & Buyer Teardown",
      openWarRoom: "War-Room",
      inspectFull: "Inspect Full War-Room Page",
    },
    pillars: {
      kicker: "REAL DISTRIBUTION CLAUDE CODE CAN'T DO FOR YOU",
      title: "Three Traffic Engines That Send Paying Customers to Your Site",
      p1Title: "1. 50+ High-DR Directory Blitz ($39)",
      p1Desc:
        "Skip 15 hours of tedious form-filling. We submit your SaaS to 50+ curated AI & SaaS directories (AlternativeTo, SaaSHub, Toolify, Uneed, MicroLaunch) with a live backlink proof dashboard.",
      p2Title: "2. 24/7 Live Buyer Intent Radar ($29/mo)",
      p2Desc:
        "Every day we filter Hacker News, Reddit, and GitHub for fresh (<45d) developer pain-point threads — delivering direct links and non-spam reply angles that turn readers into paid signups.",
      p3Title: "3. Free Bonus: SEO, AEO & /vs/ Pages",
      p3Desc:
        "We include a full passive launch audit, custom /llms.txt AI search manifest, and weekly competitor /vs/ landing page generator so the traffic we drive converts at maximum rate.",
    },
    pricing: {
      kicker: "PAY FOR REAL DISTRIBUTION · NEVER BUY BLIND",
      title: "Direct Traffic & Backlink Pricing for Founders",
      subtitle:
        "Verify your top 3 fresh buyer threads for $0 first — then unlock 50+ directory distribution or 24/7 buyer radar.",
      freeLabel: "FREE TRAFFIC SNAPSHOT",
      freePeriod: "forever",
      freeDesc:
        "Verify our diagnostic accuracy and click real buyer threads before spending a cent.",
      freeF1: "Instant Traffic Readiness score (0–100)",
      freeF2: "Top 3 critical SEO / AEO / security leaks",
      freeF3: "First 3 fresh community buyer links unlocked",
      freeBtn: "Scan Your URL Above ↑",
      fixLabel: "50+ DIRECTORY DISTRIBUTION BLITZ",
      fixPeriod: "one-time blitz",
      fixDesc:
        "We manually & programmatically distribute your SaaS to 50+ high-DR directories to drive real backlinks & referral clicks.",
      fixF1: "Submissions to 50+ AI & SaaS directories (DR 45–91)",
      fixF2: "Live backlink proof tracker & CSV report in /portal",
      fixF3: "Saves 15+ hours of tedious directory form-filling",
      fixF4Prefix: "Free Bonus:",
      fixF4Text: "Custom /llms.txt + SEO & Cursor fix prompts",
      fixBtn: "Launch 50+ Directory Blitz — $39",
      radarLabel: "24/7 BUYER RADAR & TRAFFIC PRO",
      radarPeriod: "/ month",
      radarBadge: "Best ROI · Cancel Anytime",
      radarDesc:
        "24/7 alerts whenever real buyers ask for a tool in your space, plus weekly competitor /vs/ pages and full SEO bonus prompts.",
      radarF1: "Unlock all 10+ fresh (<45d) HN, Reddit & GitHub buyer threads",
      radarF2: "Daily high-intent buyer alerts + non-spam reply angles",
      radarF3: "Weekly SEO competitor /vs/ landing page generator",
      radarF4: "Free Bonus: Full SEO/AEO audit prompts & /llms.txt manifest",
      radarBtn: "Start 24/7 Buyer Radar — $29/mo",
      loadingCheckout: "Opening Secure Checkout...",
    },
    warRoom: {
      privateWarRoom: "PRIVATE WAR-ROOM",
      fullPackUnlocked: "Full Pack Unlocked",
      postCheckoutTitle:
        "Payment received! Check your inbox for your instant Magic Unlock Link, or enter your checkout email below to resend it right now:",
      claimEmailPlaceholder: "checkout-email@your-startup.com",
      sendMagicLinkBtn: "Send Magic Unlock Link →",
      magicLinkSentFallback: "Magic Link sent to your checkout email.",
      paymentVerifiedStrong: "Payment verified!",
      paymentVerifiedBodyPrefix: "All Cursor / Claude Code fix prompts, your custom",
      paymentVerifiedBodyMid: "manifest, and all",
      paymentVerifiedBodySuffix: "high-intent buyer threads are now unlocked below.",
      exclusivePrefix: "TRAFFIC & BUYER WAR-ROOM FOR",
      passiveScan: "Passive read-only audit",
      teardownHeadingSuffix: "Launch & Buyer Intent Teardown",
      introPrefix: "We inspected",
      introMid1: "across desktop & mobile viewports, audited AI search citation endpoints (",
      introMid2: "& JSON-LD), and matched",
      introThreadsUnit: "live developer threads",
      introSuffix: "discussing the exact pain point this product solves.",
      readiness: "Traffic Readiness",
      leaksFound: "Traffic Leaks",
      subScoreAi: "AI Search Visibility (/llms.txt)",
      subScoreSeo: "Google SEO & Rich Schema",
      subScoreUx: "Bottom-Funnel & Mobile UX",
      subScoreSec: "HTTP Security Hardening",
      videoTitleMid: "s Personalized Video Walkthrough for",
      videoSpecs: "(Narrated · 720p HD · Subtitled)",
      ch1: "01 · Product UI",
      ch2Suffix: "Leaks",
      ch3: "03 · Waiting Buyers",
      ch4: "04 · 50+ Directories",
      videoUnsupported: "Your browser does not support HTML5 video playback.",
      leaksSection: "Conversion & Discovery Leaks (Bonus Audit)",
      passiveBadge: "100% Passive Check",
      leakTagPrefix: "LEAK #0",
      impactPrefix: "Impact:",
      readyPromptLabel: "Ready-to-Paste Cursor / Claude Code Prompt",
      lockedPromptLabel: "Bonus 1-Click Cursor / Claude Fix Prompt",
      unlockBlitzShort: "Unlock with $39 Directory Blitz",
      generatedLlmsTitle: "Generated /llms.txt Manifest for",
      llmsOverlayDescPrefix: "Free Bonus with $39 Blitz: Ready-to-deploy",
      llmsOverlayDescSuffix: "+ SoftwareApplication JSON-LD",
      unlockBlitzLong: "Get 50+ Directory Blitz + Free Bonus Prompts — $39",
      buyersSection: "Fresh Active Pain-Point Threads",
      first3Free: "First 3 Free to Verify",
      unlockedTag: "UNLOCKED",
      intentLabel: "Intent",
      authorLabel: "Author:",
      openThread: "Open Thread & Win Customer",
      moreQueuedPrefix: "+",
      moreQueuedSuffix: "More High-Intent Threads Queued",
      updatedDaily: "Updated daily",
      mostPopular: "Most Popular for Solo Founders",
      radarTitle: "24/7 Buyer Intent Radar Pro",
      perMonth: "/mo",
      radarBullet1Prefix: "✓ Unlock all",
      radarBullet1Suffix: "fresh buyer URLs + non-spam reply angles",
      radarBullet2: "✓ Free Bonus: Full SEO/AEO fix prompts + custom /llms.txt",
      radarBullet3Prefix: "✓ Daily email alerts when developers ask for tools like",
      radarBullet3Suffix: "",
      radarBullet4: "✓ Weekly SEO competitor /vs/ landing page generator",
      unlockAll: "Unlock 24/7 Buyer Radar ($29/mo)",
      blitzCardDesc:
        "Submit to 50+ high-DR directories (DR 45–91) + live backlink proof + free /llms.txt bonus",
      buyFixPack: "Get 50+ Directory Blitz ($39)",
      backToScanner: "← Back to Scanner",
    },
    portal: {
      headerLabel: "CUSTOMER PORTAL",
      badge: "PASSWORDLESS DISTRIBUTION & BUYER PORTAL",
      title: "Track Your 50+ Backlinks & Daily Buyers",
      subtitle:
        "No passwords needed. Enter your Creem checkout email (or paste your Magic Token) to track live directory submissions, export backlink proofs, and reply to daily buyer threads.",
      inputPlaceholder: "founder@your-startup.com or magic token",
      checkingBtn: "Checking...",
      submitBtn: "Open My Traffic Portal →",
      noOrderFallback:
        "No active Creem order matched that email yet. Try the interactive demo workspace below.",
      lookupError: "Unable to connect to portal lookup right now.",
      unboundTitlePrefix: "✓ Active plan verified for",
      unboundTitleSuffix:
        "! Enter your SaaS URL to activate your live 50+ Directory & Buyer Radar workspace:",
      activatingBtn: "Activating...",
      activateBtn: "Activate →",
      scanUrlError: "Unable to scan that URL.",
      bindNetworkError: "Network error while activating your domain.",
      previewLabel: "Want to preview the live distribution & buyer portal?",
      previewDemoBtn: "Preview Sample Demo Workspace (AcmeFlow) →",
      activeWorkspace: "ACTIVE WORKSPACE",
      planBlitzLabel: "50+ Directory Distribution Blitz ($39)",
      planDfyLabel: "Done-For-You Growth Sprint ($299)",
      planRadarLabel: "24/7 Buyer Intent Radar Pro ($29/mo)",
      workspaceHint:
        "Track your 50+ directory backlinks below, apply the bonus SEO/AEO prompts, then click Re-Scan to verify your score jump.",
      rescanBtn: "Re-Scan My Site Now",
      rescanningBtn: "Re-Scanning Live Site...",
      switchWorkspace: "Switch Workspace",
      rescanDonePrefix: "Live Re-Scan Complete",
      rescanDoneMid: "Current edge readiness score is",
      rescanDoneSuffix: "remaining items detected.",
      dirTrackerBadge: "50+ HIGH-DR DIRECTORY DISTRIBUTION TRACKER (DR 45–91)",
      dirTrackerTitlePrefix: "Backlink & Referral Traffic Proof for",
      exportCsvBtn: "Export 50-Directory CSV Proof ↓",
      statusQueued: "queued",
      statusSubmitted: "submitted",
      statusLive: "live",
      verifiedBacklink: "Verified Backlink ↗",
      promptsTitle: "Bonus SEO & /llms.txt Conversion Fixes",
      fixTagPrefix: "FIX #0",
      readyLlmsHeader: "READY-TO-DEPLOY public/llms.txt",
      buyersTitle: "Unlocked Daily Buyer Threads",
      clickBadgeHint: "Click badge to track outreach",
      leadStatusNew: "new",
      leadStatusReplied: "replied",
      leadStatusWon: "won",
      radarUpgradeTitle: "24/7 Buyer Intent Radar is included in Radar Pro ($29/mo)",
      radarUpgradeDesc:
        "Your $39 Directory Distribution Blitz includes 50+ directory backlinks, bonus SEO prompts, /llms.txt, and unlimited Re-Scans. Upgrade to Radar Pro to unlock daily fresh community buyer threads and weekly competitor /vs/ pages.",
      radarUpgradeBtn: "Upgrade to Buyer Radar Pro ($29/mo) →",
      suggestedReplyLabel: "Suggested reply angle:",
      openThreadReply: "Open Live Thread & Reply",
      vsGeneratorTitle: "SEO Competitor /vs/ Page Generator",
      copyVsMarkdown: "Copy /vs/ Markdown",
      copiedMarkdown: "Copied Markdown!",
      competitorPlaceholder: "Competitor name (e.g. UptimeRobot)",
      vsHintPrefix: "Generates a ready-to-publish",
      vsHintMid: "comparison page targeting high-intent buyers searching",
      vsHintSuffix: "alternative.",
      dfyBadge: "DONE-FOR-YOU FIRST 100 USERS SPRINT ($299)",
      dfyHeadline:
        "Too busy shipping features to submit directories, apply SEO fixes, or reply to threads yourself?",
      dfyDescPrefix:
        "Our team handles your 50+ directory blitz, submits a clean GitHub PR fixing all AEO/SEO/security headers, ships 5 competitor",
      dfyDescSuffix: "pages, and runs a 7-day non-spam buyer outreach sprint for you.",
      dfyBtn: "Book $299 Growth Sprint →",
    },
    liveAudit: {
      missingSlug: "Missing audit slug (?s=your-product).",
      notFound: "Audit report not found.",
      unableToLoad: "Unable to load live audit.",
      loadingText: "Loading private war-room from LaunchPulse D1 edge...",
    },
    legal: {
      lastUpdated: "Last updated: November 24, 2026",
      privacyTitle: "Privacy Policy",
      privacyS1Title: "1. Passive Public Website Diagnostics",
      privacyS1Body:
        "LaunchPulse performs strictly read-only, non-intrusive checks on publicly accessible URLs (such as homepage HTML metadata, HTTP headers, /robots.txt, /sitemap.xml, and /llms.txt). We never submit forms, probe private endpoints, or access authenticated data.",
      privacyS2Title: "2. Payment Processing",
      privacyS2Body:
        "Payments for the 50+ Directory Distribution Blitz ($39), 24/7 Buyer Intent Radar Pro ($29/mo), and Done-For-You Growth Sprint ($299) are processed securely by Creem.io as Merchant of Record. LaunchPulse never stores credit card numbers.",
      privacyS3Title: "3. Report Removal & Contact",
      privacyS3BodyPrefix:
        "Founders may request immediate removal or refresh of any custom audit page at any time by emailing",
      privacyS3BodySuffix: ".",
      termsTitle: "Terms of Service",
      termsS1Title: "1. Authorized Use",
      termsS1Body:
        "By submitting a domain to LaunchPulse, you confirm that you are requesting a passive, read-only diagnostic of publicly served web metadata, directory distribution submissions, and community discussion threads.",
      termsS2Title: "2. Plans, Refunds & Cancellation",
      termsS2BodyPrefix:
        "The $39 50+ Directory Distribution Blitz is a one-time purchase delivering high-DR directory submissions and bonus SEO/AEO prompts. The $29/month Buyer Intent Radar Pro subscription can be canceled anytime with one click; if you are unsatisfied within 7 days of initial purchase, email",
      termsS2BodySuffix: "for a full refund.",
    },
  },
  zh: {
    common: {
      privacy: "隐私政策",
      terms: "服务条款",
      runFreeScan: "免费运行诊断",
      backToHome: "← 返回 LaunchPulse 首页",
      copy: "复制",
      copied: "已复制",
      copyPrompt: "复制修复指令",
      copyFile: "复制文件",
      copiedBang: "已复制！",
      loading: "加载中...",
      networkCheckoutError: "连接 Creem 安全收银台时发生网络错误，请重试。",
      unableCheckoutError: "暂时无法打开收银台，请稍后再试。",
      questionsEmailFounder: "有疑问？直邮创始人 →",
      passiveFooterNote: "LaunchPulse · 100% 无害只读公开诊断",
      questionsPrefix: "商务与售后咨询：",
    },
    nav: {
      samples: "真实带客样板",
      howItWorks: "如何带来真实流量",
      pricing: "透明定价",
      portal: "客户分发工作台",
      cta: "50+ 目录外链分发 · $39",
    },
    hero: {
      badge: "50+ 海外高权重目录分发外链 + 24/7 全网真实买家引流雷达",
      titlePrefix: "别再把产品发进黑洞——",
      titleHighlight: "直接把高权重外链与付费买家送到你网站。",
      subtitle:
        "Claude Code 一个周末就能帮你写完软件，但它没法替你提交 50+ 海外高权重目录，也没法天天去 Hacker News 和 Reddit 捞真实求购客户。把枯燥分发交给我们，让真实用户走进你网站付钱。",
      placeholder: "https://your-startup.com",
      scanBtn: "免费扫描流量缺口 & 抓真买家",
      scanningBtn: "正在边缘实时扫描...",
      trust1: "50+ 高权重 AI/SaaS 目录分发 (DR 45–91)",
      trust2: "前 3 条近期真实痛点原帖免费验真",
      trust3: "免费赠送：全套 SEO 与 /llms.txt 修复包",
    },
    scanner: {
      scanFailed: "扫描失败，请检查输入的网址是否可公开访问。",
      networkScanError: "边缘实时扫描发生网络错误，请重试。",
      liveSnapshot: "边缘实时诊断快照",
      readinessScore: "流量承接评分",
      detectedLeaks: "已检出的 SEO / AEO / 安全头流失点",
      matchedDiscussions: "已匹配的近期开发者真实讨论",
      first3Free: "前 3 条免费验真",
      noLeadsFallback:
        "开启 24/7 买家引流雷达 Pro（$29/月），即可为该域名启动 Hacker News、Reddit 与 GitHub 深度多关键词监控：",
      openLiveThread: "打开原帖直接获客",
      upsellPromptPrefix: "想要 50+ 高权重目录外链、定制 80 秒拆解视频与每日真买家推送，助力",
      upsellPromptSuffix: " 增长？",
      getBlitzBtn: "50+ 目录外链分发 ($39)",
      startRadarBtn: "开启 24/7 买家雷达 ($29/月)",
    },
    samples: {
      kicker: "真实生成的流量与获客战情页 · 绝非假演示",
      titleSuffix: " 秒流量与买家实机拆解",
      openWarRoom: "获客战情页",
      inspectFull: "查看完整获客战情页",
    },
    pillars: {
      kicker: "CLAUDE CODE 永远替代不了的真实获客苦力",
      title: "三大流量引擎，把真实访问与付费客户直接送进你的 SaaS",
      p1Title: "1. 50+ 高权重目录一键分发 ($39 买断)",
      p1Desc:
        "省下 15 小时枯燥填表！我们将你的产品提交至 AlternativeTo、SaaSHub、Toolify、Uneed、MicroLaunch 等 50+ 海外高权重目录站，在工作台交付实时外链进度与回执表。",
      p2Title: "2. 24/7 全网高意图买家雷达 ($29/月)",
      p2Desc:
        "每天自动过滤 Hacker News、Reddit 与 GitHub 近 45 天内最新痛点讨论，直接递上原帖链接与不招人烦的原生回复话术，帮你天天捡精准付费用户。",
      p3Title: "3. 免费附赠：SEO / llms.txt 与竞品截流页",
      p3Desc:
        "买流量分发直接免费附赠全套技术体检、定制 /llms.txt 与每周竞品 /vs/ 对比页源码，确保导入你网站的每一波真实流量都能高效转化付费。",
    },
    pricing: {
      kicker: "花钱买真实流量分发与外链 · 绝不卖空洞提示词",
      title: "直击流量的透明等价交换定价",
      subtitle: "先免费验真前 3 条近期真实买家帖，再按需解锁 50+ 目录外链分发或 24/7 自动获客雷达。",
      freeLabel: "免费流量与线索快照",
      freePeriod: "永久免费",
      freeDesc: "先亲自核验我们的诊断准确度并点击真实买家原帖，满意后再花一分钱。",
      freeF1: "实时流量承接评分（0–100 分）",
      freeF2: "核心 SEO / AEO / 安全头流失点排查",
      freeF3: "前 3 条近期社区真实买家原帖免费解锁",
      freeBtn: "在上方输入网址免费扫描 ↑",
      fixLabel: "50+ 高权重目录流量分发冲刺包",
      fixPeriod: "一次性买断",
      fixDesc: "人工 + 自动化将你的 SaaS 批量提交至 50+ 海外高权重目录，直接带来真实外链与推荐点击。",
      fixF1: "提交至 50+ 海外高权重 AI/SaaS 目录（DR 45–91）",
      fixF2: "/portal 工作台实时外链进度追踪 + CSV 回执导出",
      fixF3: "替你省下 15+ 小时枯燥重复的目录填表时间",
      fixF4Prefix: "免费附赠：",
      fixF4Text: "专属 /llms.txt 清单 + 全套 SEO 与 Cursor 修复指令",
      fixBtn: "启动 50+ 目录外链分发 — $39",
      radarLabel: "24/7 真实买家引流雷达 Pro",
      radarPeriod: "/ 月",
      radarBadge: "持续带客 · 随时取消",
      radarDesc: "全天候盯紧正在找同类工具的真实海外买家，附带每周竞品 /vs/ 截流页生成器与全套 SEO 修复包。",
      radarF1: "解锁全部 10+ 条近 45 天 HN / Reddit / GitHub 真实买家帖",
      radarF2: "每日高意图买家邮件提醒 + 防封号原生回复切入点",
      radarF3: "每周 SEO 竞品 /vs/ 对比落地页一键生成器",
      radarF4: "免费附赠：全套 SEO/AEO 修复提示词与 /llms.txt",
      radarBtn: "开启 24/7 买家引流雷达 — $29/月",
      loadingCheckout: "正在跳转安全收银台...",
    },
    warRoom: {
      privateWarRoom: "专属获客战情页",
      fullPackUnlocked: "全套权限已解锁",
      postCheckoutTitle:
        "已收到你的付款！请查收邮箱中的免密 Magic 解锁链接，或在下方输入付款邮箱立即重发：",
      claimEmailPlaceholder: "输入 Creem 付款邮箱",
      sendMagicLinkBtn: "立即发送免密解锁链接 →",
      magicLinkSentFallback: "免密解锁链接已发送至你的付款邮箱。",
      paymentVerifiedStrong: "付款核验通过！",
      paymentVerifiedBodyPrefix: "全部随赠 Cursor / Claude Code 修复指令、专属",
      paymentVerifiedBodyMid: "清单，以及全部",
      paymentVerifiedBodySuffix: "条高意图买家原帖均已在下方完整解锁。",
      exclusivePrefix: "专属流量与获客战情报告：",
      passiveScan: "100% 无害只读诊断",
      teardownHeadingSuffix: "上线流量与真实买家深度拆解",
      introPrefix: "我们对",
      introMid1: "进行了桌面端与移动端实机巡检，审计了 AI 搜索收录端点（",
      introMid2: "与 JSON-LD 结构化数据），并实时匹配出",
      introThreadsUnit: "条近期活跃开发者讨论帖",
      introSuffix: "——他们正在讨论该产品正好解决的痛点。",
      readiness: "流量承接评分",
      leaksFound: "项流量流失点",
      subScoreAi: "AI 搜索可见度 (/llms.txt)",
      subScoreSeo: "Google SEO 与结构化数据",
      subScoreUx: "转化承接与移动端体验",
      subScoreSec: "HTTP 安全基线加固",
      videoTitleMid: " 秒专属实机拆解视频：",
      videoSpecs: "（真人级配音 · 720p 高清 · 字幕同步）",
      ch1: "01 · 产品首屏",
      ch2Suffix: "项流失点",
      ch3: "03 · 等待中的买家",
      ch4: "04 · 50+ 目录分发",
      videoUnsupported: "当前浏览器不支持 HTML5 视频播放。",
      leaksSection: "流量承接与收录缺口（随赠修复）",
      passiveBadge: "100% 只读无害检测",
      leakTagPrefix: "流失点 #0",
      impactPrefix: "业务影响：",
      readyPromptLabel: "可直接粘贴至 Cursor / Claude Code 的修复指令",
      lockedPromptLabel: "随赠：一键 Cursor / Claude 修复指令",
      unlockBlitzShort: "购买 $39 目录分发即解锁",
      generatedLlmsTitle: "已自动生成的 /llms.txt 清单：",
      llmsOverlayDescPrefix: "购买 $39 目录分发免费赠送：开箱即用的",
      llmsOverlayDescSuffix: "与 SoftwareApplication JSON-LD",
      unlockBlitzLong: "获取 50+ 目录外链分发 + 免费附赠修复包 — $39",
      buyersSection: "近期活跃痛点与求购原帖",
      first3Free: "前 3 条免费点击验真",
      unlockedTag: "已免费解锁",
      intentLabel: "购买意图",
      authorLabel: "发帖人：",
      openThread: "打开原帖直接获客",
      moreQueuedPrefix: "另有",
      moreQueuedSuffix: "条高意图精准原帖待解锁",
      updatedDaily: "每日自动更新",
      mostPopular: "独立开发者高性价比首选",
      radarTitle: "24/7 真实买家引流雷达 Pro",
      perMonth: "/月",
      radarBullet1Prefix: "✓ 完整解锁全部",
      radarBullet1Suffix: "条近期真买家原帖链接 + 防反感回复话术",
      radarBullet2: "✓ 免费附赠：全套 SEO/AEO 修复指令 + 专属 /llms.txt",
      radarBullet3Prefix: "✓ 每天一旦有人求购类似",
      radarBullet3Suffix: " 的工具，第一时间邮件推送",
      radarBullet4: "✓ 每周竞品 /vs/ 截流对比落地页源码生成器",
      unlockAll: "开启 24/7 买家雷达 ($29/月)",
      blitzCardDesc: "提交 50+ 高权重海外目录（DR 45–91）+ 实时外链回执 + 免费附赠 /llms.txt",
      buyFixPack: "50+ 目录外链分发 ($39)",
      backToScanner: "← 返回流量扫描器",
    },
    portal: {
      headerLabel: "客户分发工作台",
      badge: "免密码分发进度与买家工作台",
      title: "追踪你的 50+ 外链分发与每日新买家",
      subtitle:
        "无需密码。输入 Creem 付款邮箱（或粘贴 Magic Token），即可实时查看 50+ 目录提交状态、导出外链回执，并一键回复每日新增的高意图开发者原帖。",
      inputPlaceholder: "输入付款邮箱或 Magic Token",
      checkingBtn: "正在核验...",
      submitBtn: "进入我的流量工作台 →",
      noOrderFallback: "暂未查到该邮箱的生效 Creem 订单。你可以先点击下方预览交互式演示工作台。",
      lookupError: "暂时无法连接工作台查询接口，请稍后重试。",
      unboundTitlePrefix: "✓ 已核验有效套餐（",
      unboundTitleSuffix: "）！请输入你的 SaaS 网址，立即激活 50+ 目录分发与买家雷达工作台：",
      activatingBtn: "正在激活...",
      activateBtn: "立即激活 →",
      scanUrlError: "无法扫描该网址，请确认可公网访问。",
      bindNetworkError: "激活域名时发生网络错误，请重试。",
      previewLabel: "想先预览外链分发进度与买家工作台？",
      previewDemoBtn: "预览交互式演示工作台 (AcmeFlow) →",
      activeWorkspace: "当前已激活工作台",
      planBlitzLabel: "50+ 高权重目录外链分发包 ($39)",
      planDfyLabel: "首批 100 用户全包冲刺 ($299)",
      planRadarLabel: "24/7 真实买家引流雷达 Pro ($29/月)",
      workspaceHint:
        "在下方实时追踪 50+ 高权重目录外链收录进度，应用随赠 SEO/AEO 修复指令后点击 Re-Scan 复检提分。",
      rescanBtn: "立即 Re-Scan 复检提分",
      rescanningBtn: "正在实时复检网站...",
      switchWorkspace: "切换工作台",
      rescanDonePrefix: "实时复检完成",
      rescanDoneMid: "当前边缘流量承接评分为",
      rescanDoneSuffix: "项待优化项。",
      dirTrackerBadge: "50+ 高权重目录分发外链进度追踪 (DR 45–91)",
      dirTrackerTitlePrefix: "实时外链收录与推荐流量回执：",
      exportCsvBtn: "导出 50+ 目录外链 CSV 回执 ↓",
      statusQueued: "排队中",
      statusSubmitted: "已提交",
      statusLive: "已收录",
      verifiedBacklink: "已验真外链 ↗",
      promptsTitle: "随赠：SEO 与 /llms.txt 转化修复指令",
      fixTagPrefix: "修复项 #0",
      readyLlmsHeader: "开箱即用 public/llms.txt",
      buyersTitle: "已解锁的每日真实买家线索流",
      clickBadgeHint: "点击右侧状态标签标记跟进进度",
      leadStatusNew: "待联系",
      leadStatusReplied: "已回复",
      leadStatusWon: "已成单",
      radarUpgradeTitle: "24/7 每日真买家雷达包含在 Radar Pro（$29/月）套餐中",
      radarUpgradeDesc:
        "你当前的 $39 目录外链分发包已包含 50+ 高权重目录提交、随赠 SEO 修复指令、/llms.txt 与无限次 Re-Scan 复检。升级至 Radar Pro 即可解锁每日活跃求购帖与每周竞品 /vs/ 截流页生成器。",
      radarUpgradeBtn: "升级至 24/7 买家雷达 Pro ($29/月) →",
      suggestedReplyLabel: "推荐原生回复切入点：",
      openThreadReply: "打开原帖并回复获客",
      vsGeneratorTitle: "SEO 竞品 /vs/ 对比页一键生成器",
      copyVsMarkdown: "复制 /vs/ Markdown 源码",
      copiedMarkdown: "已复制 Markdown！",
      competitorPlaceholder: "输入竞品名称（如 UptimeRobot）",
      vsHintPrefix: "一键生成可直接发布的",
      vsHintMid: "对比落地页，精准截流搜索“",
      vsHintSuffix: " alternative”的高意图买家。",
      dfyBadge: "高阶全包：首批 100 真实用户冲刺 ($299)",
      dfyHeadline: "忙着写核心功能，没精力自己填目录、改 SEO 或天天去社区回帖？",
      dfyDescPrefix:
        "我们团队全包你的 50+ 高权重目录提交，直接提一份干净的 GitHub PR 修完所有 AEO/SEO/安全头，上线 5 个竞品",
      dfyDescSuffix: "截流页，并替你执行 7 天非垃圾广告式精准外联冲刺。",
      dfyBtn: "预约 $299 全包冷启动冲刺 →",
    },
    liveAudit: {
      missingSlug: "缺少诊断标识参数（?s=your-product）。",
      notFound: "未找到该专属诊断报告。",
      unableToLoad: "暂时无法加载实时诊断报告。",
      loadingText: "正在从 LaunchPulse D1 边缘节点加载专属战情页...",
    },
    legal: {
      lastUpdated: "最后更新：2026 年 11 月 24 日",
      privacyTitle: "隐私政策",
      privacyS1Title: "1. 100% 无害只读公开网站诊断",
      privacyS1Body:
        "LaunchPulse 仅对公开可访问的网址执行严格只读、非侵入式检查（如首页 HTML 元数据、HTTP 响应头、/robots.txt、/sitemap.xml 与 /llms.txt）。我们绝不提交表单、绝不探测私有接口，也绝不访问任何需要登录鉴权的数据。",
      privacyS2Title: "2. 支付与账单处理",
      privacyS2Body:
        "50+ 目录外链分发包（$39）、24/7 真实买家引流雷达 Pro（$29/月）以及全包增长冲刺（$299）的付款均由合规收单方 Creem.io 作为 Merchant of Record 安全处理。LaunchPulse 永不存储你的信用卡号。",
      privacyS3Title: "3. 报告下架与联系方式",
      privacyS3BodyPrefix: "网站创始人可随时发邮件至",
      privacyS3BodySuffix: "，申请立即删除或刷新任意专属诊断报告页。",
      termsTitle: "服务条款",
      termsS1Title: "1. 合规使用范围",
      termsS1Body:
        "向 LaunchPulse 提交域名即表示你确认仅请求对公开网页元数据、公开目录提交及公开社区讨论帖进行只读诊断与合规增长分发。",
      termsS2Title: "2. 套餐、退款与随时取消",
      termsS2BodyPrefix:
        "$39 50+ 目录外链分发包为一次性买断服务，交付高权重目录提交与随赠 SEO/AEO 修复指令；$29/月 买家引流雷达 Pro 订阅支持随时一键取消。若首次购买后 7 天内不满意，请发邮件至",
      termsS2BodySuffix: "申请全额退款。",
    },
  },
  ja: {
    common: {
      privacy: "プライバシーポリシー",
      terms: "利用規約",
      runFreeScan: "無料スキャンを実行",
      backToHome: "← LaunchPulse トップへ戻る",
      copy: "コピー",
      copied: "コピー済み",
      copyPrompt: "プロンプトをコピー",
      copyFile: "ファイルをコピー",
      copiedBang: "コピーしました！",
      loading: "読み込み中...",
      networkCheckoutError: "Creem決済ページへの接続中にネットワークエラーが発生しました。",
      unableCheckoutError: "現在決済ページを開けません。しばらくしてからお試しください。",
      questionsEmailFounder: "質問がありますか？開発者へメール →",
      passiveFooterNote: "LaunchPulse · 100% 非侵襲・読み取り専用診断",
      questionsPrefix: "お問い合わせ：",
    },
    nav: {
      samples: "集客診断サンプル",
      howItWorks: "集客の仕組み",
      pricing: "料金プラン",
      portal: "配信・顧客ポータル",
      cta: "50+ディレクトリ配信 · $39",
    },
    hero: {
      badge: "50+高DRディレクトリ一括掲載 + 24時間リアル見込み客レーダー",
      titlePrefix: "作っただけで終わらせない——",
      titleHighlight: "本物の流入と有料ユーザーをあなたのSaaSへ。",
      subtitle:
        "Claude Codeで開発は週末に終わっても、50以上の海外高DRディレクトリへの掲載や毎日の顧客開拓は自動化できません。煩雑な集客配信を私たちが代行し、実際の訪問と課金につなげます。",
      placeholder: "https://your-startup.com",
      scanBtn: "流入ギャップと最新見込み客を無料診断",
      scanningBtn: "リアルタイム診断中...",
      trust1: "50+ 高DRディレクトリへ配信 (DR 45–91)",
      trust2: "最新の見込み客スレッド3件を無料公開",
      trust3: "無料特典：SEO & /llms.txt 改善パック付き",
    },
    scanner: {
      scanFailed: "スキャンに失敗しました。URLが公開されているかご確認ください。",
      networkScanError: "エッジ診断中にネットワークエラーが発生しました。",
      liveSnapshot: "ライブエッジ診断スナップショット",
      readinessScore: "集客受け入れスコア",
      detectedLeaks: "検出された SEO / AEO / ヘッダーの機会損失",
      matchedDiscussions: "マッチした最新の開発者スレッド",
      first3Free: "最初の3件は無料",
      noLeadsFallback:
        "24時間見込み客レーダー Pro（$29/月）を開始すると、Hacker News・Reddit・GitHub の複数キーワード監視を有効化できます：",
      openLiveThread: "スレッドを開いて顧客獲得",
      upsellPromptPrefix:
        "50+ 高DRディレクトリ被リンク、専用80秒解説動画、毎日の見込み客通知をご希望ですか？対象：",
      upsellPromptSuffix: "",
      getBlitzBtn: "50+ ディレクトリ配信 ($39)",
      startRadarBtn: "24時間レーダー開始 ($29/月)",
    },
    samples: {
      kicker: "実際に生成された集客レポート · モックアップではありません",
      titleSuffix: "秒の集客＆見込み客診断動画",
      openWarRoom: "集客レポート",
      inspectFull: "専用集客レポートを見る",
    },
    pillars: {
      kicker: "AIコーディングツールでは代替できない「リアルな集客代行」",
      title: "あなたのサイトへ有料ユーザーを送り込む3つの集客エンジン",
      p1Title: "1. 50+ 高DRディレクトリ一括配信 ($39 買い切り)",
      p1Desc:
        "15時間かかる退屈なフォーム入力を代行。AlternativeTo、SaaSHub、Toolify、Uneedなど50以上の海外有力ディレクトリへ掲載し、被リンク進捗ダッシュボードを納品します。",
      p2Title: "2. 24時間リアル見込み客レーダー ($29/月)",
      p2Desc:
        "Hacker News・Reddit・GitHubから直近45日以内のリアルな悩み投稿を毎日抽出し、自然な返信切り口とともに直接お届けします。",
      p3Title: "3. 無料特典：SEO・llms.txt・競合比較ページ",
      p3Desc:
        "配信した流入を確実に課金へ変えるため、技術診断・/llms.txt・競合比較(/vs/)ページ生成ツールを無料で同梱しています。",
    },
    pricing: {
      kicker: "プロンプトではなく「実際の流入と被リンク」に投資",
      title: "結果に直結する透明な集客料金プラン",
      subtitle: "まず最新3件の実在スレッドを無料で検証し、納得してから配信を開始できます。",
      freeLabel: "無料集客スナップショット",
      freePeriod: "ずっと無料",
      freeDesc: "1セントも払う前に、診断精度と実際の見込み客スレッドをご自身で検証できます。",
      freeF1: "集客受け入れスコア（0〜100点）を即時算出",
      freeF2: "重要な SEO / AEO / セキュリティ機会損失を検出",
      freeF3: "最新の見込み客スレッド3件を無料で直接閲覧",
      freeBtn: "上でURLを無料スキャン ↑",
      fixLabel: "50+ ディレクトリ一括配信パック",
      fixPeriod: "買い切り",
      fixDesc:
        "手動＋自動で50以上の高DR海外ディレクトリへSaaSを掲載し、確かな被リンクと流入を獲得します。",
      fixF1: "50+ の海外有力 AI / SaaS ディレクトリへ掲載（DR 45–91）",
      fixF2: "/portal でリアルタイム被リンク進捗確認＆CSV出力",
      fixF3: "15時間以上の煩雑なディレクトリ入力作業を削減",
      fixF4Prefix: "無料特典：",
      fixF4Text: "専用 /llms.txt ＋ SEO・Cursor 改善プロンプト一式",
      fixBtn: "50+ ディレクトリ配信を開始 — $39",
      radarLabel: "24時間見込み客レーダー Pro",
      radarPeriod: "/ 月",
      radarBadge: "継続集客 · いつでも解約可能",
      radarDesc:
        "あなたの領域でツールを探しているリアルな見込み客を毎日通知。競合比較 /vs/ ページ生成とSEO特典も同梱。",
      radarF1: "直近45日以内のHN・Reddit・GitHub見込み客10件以上を全解除",
      radarF2: "毎日の高意図見込み客通知＋自然な返信切り口",
      radarF3: "毎週使える競合比較 /vs/ ランディングページ生成ツール",
      radarF4: "無料特典：SEO/AEO 改善プロンプト一式＆ /llms.txt",
      radarBtn: "24時間見込み客レーダー開始 — $29/月",
      loadingCheckout: "安全な決済ページへ移動中...",
    },
    warRoom: {
      privateWarRoom: "専用集客レポート",
      fullPackUnlocked: "全機能アンロック済み",
      postCheckoutTitle:
        "お支払いを確認しました！受信箱のマジックリンクをご確認ください。または決済時のメールアドレスを入力して再送信できます：",
      claimEmailPlaceholder: "決済時のメールアドレス",
      sendMagicLinkBtn: "マジックリンクを再送信 →",
      magicLinkSentFallback: "決済時のメールアドレスへマジックリンクを送信しました。",
      paymentVerifiedStrong: "決済が確認されました！",
      paymentVerifiedBodyPrefix: "無料特典の Cursor / Claude Code 改善プロンプト、専用",
      paymentVerifiedBodyMid: "マニフェスト、および全",
      paymentVerifiedBodySuffix: "件の高意図見込み客スレッドが以下でアンロックされています。",
      exclusivePrefix: "専用集客・見込み客レポート：",
      passiveScan: "100% 非侵襲診断",
      teardownHeadingSuffix: "集客＆見込み客インテント診断",
      introPrefix: "対象サイト",
      introMid1: "をデスクトップ＆モバイルで実機診断し、AI検索エンドポイント（",
      introMid2: "および JSON-LD）を監査したうえ、課題を直接解決できる",
      introThreadsUnit: "件の最新開発者スレッド",
      introSuffix: "を抽出しました。",
      readiness: "集客受け入れスコア",
      leaksFound: "件の機会損失",
      subScoreAi: "AI検索可視性 (/llms.txt)",
      subScoreSeo: "Google SEO・構造化データ",
      subScoreUx: "CVR導線・モバイルUX",
      subScoreSec: "HTTPセキュリティ基盤",
      videoTitleMid: "秒 専用解説動画：",
      videoSpecs: "（音声解説 · 720p HD · 字幕付き）",
      ch1: "01 · 製品UI",
      ch2Suffix: "件の損失",
      ch3: "03 · 見込み客",
      ch4: "04 · 50+ディレクトリ",
      videoUnsupported: "お使いのブラウザは HTML5 動画再生に対応していません。",
      leaksSection: "流入・CVRの機会損失（無料特典診断）",
      passiveBadge: "100% 非侵襲チェック",
      leakTagPrefix: "機会損失 #0",
      impactPrefix: "影響：",
      readyPromptLabel: "そのまま貼れる Cursor / Claude Code 改善プロンプト",
      lockedPromptLabel: "無料特典：ワンクリック Cursor / Claude 改善プロンプト",
      unlockBlitzShort: "$39 ディレクトリ配信で解除",
      generatedLlmsTitle: "自動生成された /llms.txt：",
      llmsOverlayDescPrefix: "$39 パック無料特典：そのまま使える",
      llmsOverlayDescSuffix: "＋ SoftwareApplication JSON-LD",
      unlockBlitzLong: "50+ ディレクトリ配信＋無料特典プロンプトを入手 — $39",
      buyersSection: "直近のリアルな課題・購入相談スレッド",
      first3Free: "最初の3件は無料検証可能",
      unlockedTag: "無料公開中",
      intentLabel: "購買意図",
      authorLabel: "投稿者：",
      openThread: "スレッドを開いて顧客獲得",
      moreQueuedPrefix: "さらに",
      moreQueuedSuffix: "件の高意図スレッドが待機中",
      updatedDaily: "毎日更新",
      mostPopular: "個人開発者に最も人気",
      radarTitle: "24時間見込み客レーダー Pro",
      perMonth: "/月",
      radarBullet1Prefix: "✓ 全",
      radarBullet1Suffix: "件の最新見込み客URL＋自然な返信切り口を解除",
      radarBullet2: "✓ 無料特典：SEO/AEO 改善プロンプト一式＋専用 /llms.txt",
      radarBullet3Prefix: "✓ 毎日",
      radarBullet3Suffix: " のようなツールを求める投稿をメール通知",
      radarBullet4: "✓ 競合比較 /vs/ ランディングページ生成ツール",
      unlockAll: "24時間見込み客レーダー ($29/月)",
      blitzCardDesc:
        "50+ 高DRディレクトリへ掲載（DR 45–91）＋被リンク進捗確認＋無料 /llms.txt 特典",
      buyFixPack: "50+ ディレクトリ配信 ($39)",
      backToScanner: "← スキャナーへ戻る",
    },
    portal: {
      headerLabel: "顧客ポータル",
      badge: "パスワード不要の配信＆見込み客ポータル",
      title: "50+被リンク進捗と毎日の見込み客を管理",
      subtitle:
        "パスワードは不要です。Creem決済時のメールアドレス（またはMagic Token）を入力して、ディレクトリ掲載状況と毎日の見込み客一覧を確認できます。",
      inputPlaceholder: "決済メールアドレス または Magic Token",
      checkingBtn: "確認中...",
      submitBtn: "集客ポータルを開く →",
      noOrderFallback:
        "該当する有効なCreem注文がまだ見つかりません。下のデモワークスペースをお試しください。",
      lookupError: "ポータル照会に接続できませんでした。",
      unboundTitlePrefix: "✓ 有効なプランを確認しました（",
      unboundTitleSuffix:
        "）。SaaSのURLを入力して、50+ディレクトリ＆見込み客ワークスペースを有効化してください：",
      activatingBtn: "有効化中...",
      activateBtn: "有効化する →",
      scanUrlError: "URLをスキャンできませんでした。",
      bindNetworkError: "ドメイン有効化中にネットワークエラーが発生しました。",
      previewLabel: "配信＆見込み客ポータルのデモをプレビュー：",
      previewDemoBtn: "デモワークスペースをプレビュー (AcmeFlow) →",
      activeWorkspace: "有効なワークスペース",
      planBlitzLabel: "50+ ディレクトリ一括配信パック ($39)",
      planDfyLabel: "初期100ユーザー獲得スプリント ($299)",
      planRadarLabel: "24時間見込み客レーダー Pro ($29/月)",
      workspaceHint:
        "下で50+ディレクトリの被リンク進捗を確認し、無料特典のSEO改善後に再スキャンしてスコア上昇を検証できます。",
      rescanBtn: "今すぐ再スキャンして検証",
      rescanningBtn: "ライブサイトを再スキャン中...",
      switchWorkspace: "ワークスペース切替",
      rescanDonePrefix: "再スキャン完了",
      rescanDoneMid: "現在の集客受け入れスコア：",
      rescanDoneSuffix: "件の改善項目が残っています。",
      dirTrackerBadge: "50+ 高DRディレクトリ掲載＆被リンクトラッカー (DR 45–91)",
      dirTrackerTitlePrefix: "被リンク＆リファラル流入レポート：",
      exportCsvBtn: "50+ディレクトリCSV証明を出力 ↓",
      statusQueued: "待機中",
      statusSubmitted: "申請済み",
      statusLive: "掲載済み",
      verifiedBacklink: "掲載確認済み ↗",
      promptsTitle: "無料特典：SEO & /llms.txt 改善プロンプト",
      fixTagPrefix: "改善 #0",
      readyLlmsHeader: "そのまま配置できる public/llms.txt",
      buyersTitle: "解除済み 毎日のリアル見込み客フィード",
      clickBadgeHint: "バッジをクリックして対応状況を記録",
      leadStatusNew: "未対応",
      leadStatusReplied: "返信済み",
      leadStatusWon: "獲得済み",
      radarUpgradeTitle: "24時間見込み客レーダーは Radar Pro（$29/月）に含まれます",
      radarUpgradeDesc:
        "現在の $39 ディレクトリ配信パックには50+ディレクトリ掲載、無料SEOプロンプト、/llms.txt、無制限再スキャンが含まれます。Radar Proへアップグレードすると毎日の最新見込み客と競合 /vs/ ページ生成が解除されます。",
      radarUpgradeBtn: "24時間レーダー Pro へアップグレード ($29/月) →",
      suggestedReplyLabel: "おすすめの自然な返信切り口：",
      openThreadReply: "スレッドを開いて返信する",
      vsGeneratorTitle: "SEO 競合比較 /vs/ ページ生成ツール",
      copyVsMarkdown: "/vs/ Markdown をコピー",
      copiedMarkdown: "コピーしました！",
      competitorPlaceholder: "競合サービス名（例：UptimeRobot）",
      vsHintPrefix: "そのまま公開できる",
      vsHintMid: "比較ページを生成し、「",
      vsHintSuffix: " alternative」検索ユーザーを獲得します。",
      dfyBadge: "丸投げ代行：初期100ユーザー獲得スプリント ($299)",
      dfyHeadline: "機能開発で忙しく、ディレクトリ登録やSEO修正、スレッド返信の時間がありませんか？",
      dfyDescPrefix:
        "50+ディレクトリ登録代行、AEO/SEO/セキュリティ修正のGitHub PR作成、5件の競合比較",
      dfyDescSuffix: "ページ公開、7日間の非スパム顧客開拓スプリントまで丸ごと代行します。",
      dfyBtn: "$299 集客スプリントを申し込む →",
    },
    liveAudit: {
      missingSlug: "診断スラッグが不足しています（?s=your-product）。",
      notFound: "診断レポートが見つかりませんでした。",
      unableToLoad: "ライブ診断を読み込めませんでした。",
      loadingText: "LaunchPulse D1 エッジから専用レポートを読み込み中...",
    },
    legal: {
      lastUpdated: "最終更新日：2026年11月24日",
      privacyTitle: "プライバシーポリシー",
      privacyS1Title: "1. 非侵襲・公開Webサイト診断について",
      privacyS1Body:
        "LaunchPulseは公開アクセス可能なURL（ホームページHTMLメタデータ、HTTPヘッダー、/robots.txt、/sitemap.xml、/llms.txt等）に対し、厳格に読み取り専用の非侵襲チェックのみを行います。フォーム送信や認証済み領域へのアクセスは一切行いません。",
      privacyS2Title: "2. 決済処理について",
      privacyS2Body:
        "50+ディレクトリ配信パック（$39）、24時間見込み客レーダー Pro（$29/月）、丸投げ成長スプリント（$299）の決済は、Merchant of Record である Creem.io により安全に処理されます。LaunchPulseがクレジットカード番号を保存することはありません。",
      privacyS3Title: "3. レポート削除・お問い合わせ",
      privacyS3BodyPrefix: "サイト運営者はいつでも",
      privacyS3BodySuffix: "までご連絡いただくことで、専用レポートの即時削除・更新を依頼できます。",
      termsTitle: "利用規約",
      termsS1Title: "1. 正当な利用範囲",
      termsS1Body:
        "LaunchPulseにドメインを送信することで、公開Webメタデータの非侵襲診断、ディレクトリ掲載支援、および公開コミュニティ投稿の抽出を依頼することに同意したものとみなされます。",
      termsS2Title: "2. プラン・返金・解約について",
      termsS2BodyPrefix:
        "$39 50+ディレクトリ配信パックは買い切りプランです。$29/月の見込み客レーダー Pro はいつでもワンクリックで解約可能です。初回購入から7日以内にご満足いただけない場合は",
      termsS2BodySuffix: "までご連絡いただければ全額返金いたします。",
    },
  },
};

/**
 * 彻底解码残留的 HTML 实体（如 &#x2F; -> /, &#x27; -> '）
 */
export function decodeHtmlEntities(raw: string): string {
  if (!raw) return "";
  return raw
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&nbsp;/g, " ");
}

/**
 * 本地化严重级别标签
 */
export function localizeSeverity(severity: string, locale: Locale): string {
  const s = severity.toLowerCase();
  if (locale === "zh") {
    if (s === "critical") return "严重";
    if (s === "high") return "高危";
    if (s === "medium") return "中危";
  }
  if (locale === "ja") {
    if (s === "critical") return "重大";
    if (s === "high") return "高";
    if (s === "medium") return "中";
  }
  return severity;
}

/**
 * 本地化诊断维度标签
 */
export function localizeCategory(category: string, locale: Locale): string {
  if (locale === "en") return category;
  const mapZh: Record<string, string> = {
    "AEO / AI Visibility": "AEO / AI 搜索可见度",
    "Google SEO": "Google SEO 收录",
    "Conversion UX": "转化与体验",
    "Security & Trust": "安全与信任",
  };
  const mapJa: Record<string, string> = {
    "AEO / AI Visibility": "AEO / AI検索可視性",
    "Google SEO": "Google SEO",
    "Conversion UX": "CVR・UX改善",
    "Security & Trust": "セキュリティ・信頼性",
  };
  return (locale === "zh" ? mapZh : mapJa)[category] || category;
}

/**
 * 本地化「已通过检查项」徽章文案
 */
export function localizePassedCheck(check: string, locale: Locale): string {
  if (locale === "en") return check;
  const exactZh: Record<string, string> = {
    "Indexable meta robots configuration": "Meta Robots 可正常收录",
    "Indexable robots meta": "Robots Meta 可正常收录",
    "CSP & clickjacking protection headers": "已配置 CSP 与防点击劫持响应头",
    "Zero horizontal overflow on 390px mobile viewport": "390px 移动端零横向溢出",
    "Valid XML sitemap live at /sitemap.xml": "/sitemap.xml 站点地图有效",
    "Valid XML sitemap": "XML 站点地图有效",
    "Clean /robots.txt crawl rules": "/robots.txt 爬虫规则正常",
    "OpenGraph social preview card configured": "已配置 OpenGraph 社交分享卡片",
    "Canonical URL tag present": "已配置 Canonical 规范链接",
  };
  const exactJa: Record<string, string> = {
    "Indexable meta robots configuration": "インデックス可能な meta robots 設定",
    "Indexable robots meta": "インデックス可能な robots meta",
    "CSP & clickjacking protection headers": "CSP・クリックジャッキング対策ヘッダー済み",
    "Zero horizontal overflow on 390px mobile viewport": "390pxモバイル幅で横はみ出しゼロ",
    "Valid XML sitemap live at /sitemap.xml": "/sitemap.xml が有効",
    "Valid XML sitemap": "有効な XML サイトマップ",
    "Clean /robots.txt crawl rules": "/robots.txt クロール設定が正常",
    "OpenGraph social preview card configured": "OpenGraph SNSカード設定済み",
    "Canonical URL tag present": "Canonical URL タグ設定済み",
  };
  return (locale === "zh" ? exactZh : exactJa)[check] || check;
}

/**
 * 本地化标准化诊断漏洞标题（保留域名、字符数、毫秒等关键实测数字）
 */
export function localizeLeakTitle(title: string, locale: Locale): string {
  if (locale === "en") return title;
  if (locale === "zh") {
    if (/Missing .*\/llms\.txt/i.test(title)) {
      return "缺失有效的 /llms.txt AI 搜索清单（大模型无法准确引用你的产品）";
    }
    if (/Missing SoftwareApplication JSON-LD/i.test(title)) {
      return "缺失 SoftwareApplication JSON-LD 结构化数据（影响 Google 富媒体展示）";
    }
    if (/Zero .*\/vs\/|Alternative to/i.test(title)) {
      return "缺少竞品 /vs/ 或“Alternative to”底部漏斗截流对比页";
    }
    if (/meta description/i.test(title)) {
      const m = title.match(/(\d+)\s*chars/i);
      return m
        ? `首页 Meta Description 描述偏短（当前 ${m[1]} 字符，最佳为 145–158 字符）`
        : "首页 Meta Description 描述长度未优化（建议 145–158 字符）";
    }
    if (/Content-Security-Policy|X-Frame-Options/i.test(title)) {
      return "缺失 Content-Security-Policy / X-Frame-Options 安全响应头";
    }
    if (/sitemap\.xml/i.test(title)) {
      return "缺失或无效的 /sitemap.xml 站点地图";
    }
    if (/og:image/i.test(title)) {
      return "缺失 OpenGraph (og:image) 社交分享预览图";
    }
    if (/noindex/i.test(title)) {
      return "首页存在 meta robots noindex（搜索引擎被直接禁止收录）";
    }
    if (/TTFB/i.test(title)) {
      const m = title.match(/(\d+)ms/i);
      return m
        ? `首字节响应时间偏慢（实测 TTFB ${m[1]}ms > 1,200ms 警戒线）`
        : "首字节响应时间 TTFB 偏慢（超过 1,200ms 警戒线）";
    }
  }
  if (locale === "ja") {
    if (/Missing .*\/llms\.txt/i.test(title)) {
      return "有効な /llms.txt AI検索マニフェストが未設置です";
    }
    if (/Missing SoftwareApplication JSON-LD/i.test(title)) {
      return "SoftwareApplication JSON-LD 構造化データが未設定です";
    }
    if (/Zero .*\/vs\/|Alternative to/i.test(title)) {
      return "競合比較 /vs/・代替ページ（Alternative to）が存在しません";
    }
    if (/meta description/i.test(title)) {
      const m = title.match(/(\d+)\s*chars/i);
      return m
        ? `メタディスクリプションが短すぎます（現在 ${m[1]} 文字／推奨 145–158 文字）`
        : "メタディスクリプションの長さが最適化されていません";
    }
    if (/Content-Security-Policy|X-Frame-Options/i.test(title)) {
      return "Content-Security-Policy / X-Frame-Options セキュリティヘッダーが未設定です";
    }
    if (/sitemap\.xml/i.test(title)) {
      return "/sitemap.xml が見つからないか無効です";
    }
    if (/og:image/i.test(title)) {
      return "OpenGraph (og:image) SNSプレビュー画像が未設定です";
    }
    if (/noindex/i.test(title)) {
      return "トップページに meta robots noindex が含まれています";
    }
    if (/TTFB/i.test(title)) {
      const m = title.match(/(\d+)ms/i);
      return m
        ? `初期サーバー応答が遅いです（TTFB ${m[1]}ms > 1,200ms 基準）`
        : "初期サーバー応答（TTFB）が遅すぎます";
    }
  }
  return title;
}

/**
 * 本地化标准化业务影响说明
 */
export function localizeLeakImpact(impact: string, locale: Locale): string {
  if (locale === "en") return impact;
  if (locale === "zh") {
    if (/ChatGPT|Perplexity/i.test(impact)) {
      return "正在错失 ChatGPT 与 Perplexity 等 AI 搜索引擎的高意图推荐流量";
    }
    if (/SERP click-through/i.test(impact)) {
      return "缺少富媒体摘要导致 Google 自然搜索点击率降低 18%–24%";
    }
    if (/bottom-funnel|ready to switch/i.test(impact)) {
      return "错失最容易直接付费转化的“寻找替代品”底部漏斗搜索买家";
    }
    if (/SERP snippet|buyer qualification/i.test(impact)) {
      return "搜索结果摘要展示不充分，削弱点击意愿与目标买家筛选";
    }
    if (/enterprise|clickjacking|security/i.test(impact)) {
      return "可能影响企业客户安全评估与防点击劫持信任度";
    }
    if (/organic discovery/i.test(impact)) {
      return "直接影响自然搜索收录效率与访客转化率";
    }
  }
  if (locale === "ja") {
    if (/ChatGPT|Perplexity/i.test(impact)) {
      return "ChatGPT や Perplexity のAI検索推薦から高意図ユーザーを取りこぼしています";
    }
    if (/SERP click-through/i.test(impact)) {
      return "リッチスニペット欠如により Google 検索クリック率が 18%〜24% 低下します";
    }
    if (/bottom-funnel|ready to switch/i.test(impact)) {
      return "乗り換え検討中の最も成約率が高い検索見込み客を逃しています";
    }
    if (/SERP snippet|buyer qualification/i.test(impact)) {
      return "検索結果スニペットの訴求力が弱まり、クリック率低下につながります";
    }
    if (/enterprise|clickjacking|security/i.test(impact)) {
      return "セキュリティ評価やクリックジャッキング耐性の信頼に影響します";
    }
    if (/organic discovery/i.test(impact)) {
      return "自然検索での発見率とコンバージョン率に直接影響します";
    }
  }
  return impact;
}
