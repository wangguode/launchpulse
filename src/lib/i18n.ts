/**
 * LaunchPulse 全局三语词典（English / 简体中文 / 日本語）
 * 覆盖主官网首页、1对1专属战情页、免密客户工作台与实时扫描器
 */

export type Locale = "en" | "zh" | "ja";

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "EN",
  zh: "中文",
  ja: "日本語",
};

export interface Dictionary {
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
    freeBtn: string;
    fixLabel: string;
    fixBtn: string;
    radarLabel: string;
    radarBadge: string;
    radarBtn: string;
    loadingCheckout: string;
  };
  warRoom: {
    exclusivePrefix: string;
    passiveScan: string;
    readiness: string;
    leaksFound: string;
    leaksSection: string;
    buyersSection: string;
    first3Free: string;
    openThread: string;
    unlockAll: string;
    buyFixPack: string;
    backToScanner: string;
  };
  portal: {
    badge: string;
    title: string;
    subtitle: string;
    inputPlaceholder: string;
    submitBtn: string;
    previewLabel: string;
    rescanBtn: string;
    rescanningBtn: string;
    switchWorkspace: string;
    promptsTitle: string;
    buyersTitle: string;
    dfyBadge: string;
    dfyBtn: string;
  };
}

export const DICTIONARIES: Record<Locale, Dictionary> = {
  en: {
    nav: {
      samples: "Live War-Room Samples",
      howItWorks: "How It Works",
      pricing: "Pricing",
      portal: "Customer Portal",
      cta: "Get Fix Pack · $19",
    },
    hero: {
      badge: "PASSIVE LAUNCH TEARDOWN + 24/7 BUYER INTENT RADAR",
      titlePrefix: "Built your AI SaaS, now wondering ",
      titleHighlight: "where the paying users are?",
      subtitle:
        "Shipping code with Cursor and Claude Code takes a weekend. Getting organic traffic takes fixing hidden /llms.txt & SEO leaks — and replying to real developers actively asking for your tool today.",
      placeholder: "https://your-startup.com",
      scanBtn: "Run Free Audit & Lead Scan",
      scanningBtn: "Scanning Live...",
      trust1: "100% Passive Read-Only Check",
      trust2: "First 3 Buyer Links Unlocked Free",
      trust3: "Copy-Paste Cursor / Claude Fix Prompts",
    },
    samples: {
      kicker: "REAL GENERATED WAR-ROOMS · NOT MOCKUPS",
      titleSuffix: "-Second SaaS Teardown",
      openWarRoom: "War-Room",
      inspectFull: "Inspect Full War-Room Page",
    },
    pillars: {
      kicker: "THE GROWTH STACK FOR VIBE CODERS",
      title: "Three Shovels That Turn Silent Launches Into Paying Customers",
      p1Title: "1. Launch & Conversion Teardown",
      p1Desc:
        "Non-intrusive Playwright inspection across desktop & mobile viewports catches noindex disasters, missing SoftwareApplication schemas, header gaps, and /vs/ comparison blind spots.",
      p2Title: "2. AI Search Visibility (AEO)",
      p2Desc:
        "Over 70% of new indie apps return 404 on /llms.txt. We auto-generate your structured Markdown entity manifest and Cursor prompts so ChatGPT, Claude, and Perplexity cite you.",
      p3Title: "3. 24/7 Buyer Intent Radar",
      p3Desc:
        "Stop burning cash on cold ads. We continuously filter Hacker News, Reddit, and GitHub threads to surface developers actively hitting the exact problem you solve.",
    },
    pricing: {
      kicker: "VERIFY FIRST · PAY ONLY FOR REAL LEVERAGE",
      title: "Transparent Founder-Friendly Pricing",
      subtitle:
        "Every war-room unlocks your top 3 leaks and first 3 buyer threads for $0 so you never buy blind.",
      freeLabel: "FREE SNAPSHOT",
      freeBtn: "Scan Your URL Above ↑",
      fixLabel: "ONE-TIME LAUNCH FIX PACK",
      fixBtn: "Buy Launch Fix Pack — $19",
      radarLabel: "GROWTH & BUYER RADAR PRO",
      radarBadge: "Best ROI · Cancel Anytime",
      radarBtn: "Start 24/7 Buyer Radar — $29/mo",
      loadingCheckout: "Opening Secure Checkout...",
    },
    warRoom: {
      exclusivePrefix: "PREPARED EXCLUSIVELY FOR",
      passiveScan: "Passive read-only scan",
      readiness: "Launch Readiness",
      leaksFound: "Leaks Found",
      leaksSection: "Detected Conversion & AI Search Leaks",
      buyersSection: "Live Buyers & Pain-Point Threads",
      first3Free: "First 3 Free to Verify",
      openThread: "Open Live Thread & Reply",
      unlockAll: "Unlock All Buyers ($29/mo)",
      buyFixPack: "Buy Fix Pack ($19)",
      backToScanner: "← Back to Scanner",
    },
    portal: {
      badge: "PASSWORDLESS MAGIC PORTAL",
      title: "Access Your Fix Pack & Buyer Radar",
      subtitle:
        "No passwords to remember. Enter the email used at Creem checkout (or paste your Magic Token) to open your unlocked Cursor prompts, live Re-Scan verifier, and daily buyer threads.",
      inputPlaceholder: "founder@your-startup.com or magic token",
      submitBtn: "Open My Workspace →",
      previewLabel: "Want to preview the unlocked workspace first?",
      rescanBtn: "Re-Scan My Site Now",
      rescanningBtn: "Re-Scanning Live Site...",
      switchWorkspace: "Switch Workspace",
      promptsTitle: "Unlocked Cursor & Claude Code Fix Prompts",
      buyersTitle: "Unlocked High-Intent Buyer Feed",
      dfyBadge: "OPTIONAL DONE-FOR-YOU SPRINT ($299)",
      dfyBtn: "Book $299 Done-For-You Sprint →",
    },
  },
  zh: {
    nav: {
      samples: "真实战情样板",
      howItWorks: "核心能力",
      pricing: "透明定价",
      portal: "客户工作台",
      cta: "获取修复包 · $19",
    },
    hero: {
      badge: "无害实机体检拆解 + 24/7 全网真实买家雷达",
      titlePrefix: "用 AI 做好了 SaaS 产品，却发愁 ",
      titleHighlight: "付费用户从哪里来？",
      subtitle:
        "用 Cursor 和 Claude Code 写完产品只要一个周末，但拿到持续自然流量需要堵死隐藏的 /llms.txt 与 SEO 漏洞——并直接回复全网正在求购同类工具的真实开发者。",
      placeholder: "https://your-startup.com",
      scanBtn: "免费实时体检 & 抓取真买家",
      scanningBtn: "正在边缘实时扫描...",
      trust1: "100% 被动无害只读体检",
      trust2: "前 3 条真实买家原帖免费验真",
      trust3: "一键复制 Cursor / Claude 修复指令",
    },
    samples: {
      kicker: "真实生成的专属战情页 · 绝非假演示",
      titleSuffix: " 秒实机拆解样片",
      openWarRoom: "专属战情页",
      inspectFull: "查看完整专属战情页",
    },
    pillars: {
      kicker: "专为 VIBE CODERS 打造的增长铲子",
      title: "三套自动化武器，把无人问津的新产品变成收款机器",
      p1Title: "1. 发布与转化漏斗深度拆解",
      p1Desc:
        "真实 Chrome 跨桌面与移动端无害巡检，揪出 noindex 灾难、缺失 SoftwareApplication 结构化数据、安全响应头缺口与 /vs/ 竞品对比页盲区。",
      p2Title: "2. AI 搜索可见性优化 (AEO)",
      p2Desc:
        "超过 70% 的新上线独立产品在 /llms.txt 返回 404。我们自动生成标准 Markdown 实体卡片与 Cursor 修复指令，抢占 ChatGPT、Claude 与 Perplexity 推荐位。",
      p3Title: "3. 24/7 高意图买家雷达",
      p3Desc:
        "告别盲目烧钱投流。全天候过滤 Hacker News、Reddit 与 GitHub 真实帖子，只把正在吐槽你所解决痛点的精准买家推到你面前。",
    },
    pricing: {
      kicker: "先免费验真 · 确认有价值再付费",
      title: "透明、对独立开发者友好的定价",
      subtitle: "每份专属战情页均免费开放前 3 个高危漏洞与前 3 条真实买家原帖，绝不让你盲买。",
      freeLabel: "免费诊断快照",
      freeBtn: "在上方输入网址免费扫描 ↑",
      fixLabel: "一次性发布修复包",
      fixBtn: "买断发布修复包 — $19",
      radarLabel: "增长与买家雷达 Pro",
      radarBadge: "最高回报 · 随时取消",
      radarBtn: "开启 24/7 买家雷达 — $29/月",
      loadingCheckout: "正在跳转安全收银台...",
    },
    warRoom: {
      exclusivePrefix: "专属定制战情报告：",
      passiveScan: "100% 被动只读体检",
      readiness: "发布就绪评分",
      leaksFound: "项真实漏洞",
      leaksSection: "已检出的转化与 AI 搜索漏洞",
      buyersSection: "全网等待中的真实买家与痛点帖",
      first3Free: "前 3 条免费点击验真",
      openThread: "打开原帖直接回复",
      unlockAll: "解锁全部买家 ($29/月)",
      buyFixPack: "买断修复包 ($19)",
      backToScanner: "← 返回实时扫描器",
    },
    portal: {
      badge: "免密码 MAGIC LINK 客户工作台",
      title: "进入你的专属修复包与买家雷达",
      subtitle:
        "无需记忆密码。输入 Creem 结账邮箱（或粘贴 Magic Token），即可一键复制全部 Cursor 修复指令、实时点击 Re-Scan 复检提分并跟进每日新增买家。",
      inputPlaceholder: "输入付款邮箱或 Magic Token",
      submitBtn: "进入我的工作台 →",
      previewLabel: "想先预览已解锁的客户工作台效果？",
      rescanBtn: "立即 Re-Scan 复检提分",
      rescanningBtn: "正在实时复检网站...",
      switchWorkspace: "切换工作台",
      promptsTitle: "已解锁的 Cursor / Claude Code 修复指令",
      buyersTitle: "已解锁的高意图买家线索流",
      dfyBadge: "可选高阶代办冲刺 ($299)",
      dfyBtn: "预约 $299 全包代办冲刺 →",
    },
  },
  ja: {
    nav: {
      samples: "実機診断サンプル",
      howItWorks: "仕組み",
      pricing: "料金プラン",
      portal: "顧客ポータル",
      cta: "修正パック · $19",
    },
    hero: {
      badge: "非侵襲サイト診断動画 + 24時間バイヤー意図レーダー",
      titlePrefix: "AI SaaSを公開したのに、",
      titleHighlight: "有料ユーザーが集まらない？",
      subtitle:
        "CursorやClaude Codeで週末に開発は終わっても、自然な流入を得るには /llms.txt やSEOの欠陥を直し、今まさにあなたのツールを探している開発者へ直接アプローチする必要があります。",
      placeholder: "https://your-startup.com",
      scanBtn: "無料診断 & バイヤー検索を実行",
      scanningBtn: "エッジでリアルタイム診断中...",
      trust1: "100% 非侵襲・読み取り専用診断",
      trust2: "最初の3件の購入見込みスレッドを無料公開",
      trust3: "Cursor / Claude Code用ワンクリック修正プロンプト",
    },
    samples: {
      kicker: "実際に生成された専用レポート · モックアップではありません",
      titleSuffix: "秒のパーソナライズ診断動画",
      openWarRoom: "専用レポート",
      inspectFull: "専用レポートをすべて見る",
    },
    pillars: {
      kicker: "VIBE CODERSのためのグロース基盤",
      title: "静かなローンチを収益に変える3つの自動化エンジン",
      p1Title: "1. ローンチ＆CVR欠陥診断",
      p1Desc:
        "デスクトップとモバイル実機で非侵襲スキャンを実施。noindex事故、構造化データ不足、セキュリティヘッダー欠落、比較ページ(/vs/)不足を即座に特定します。",
      p2Title: "2. AI検索可視化 (AEO)",
      p2Desc:
        "新規インディーアプリの70%以上が /llms.txt で404を返します。ChatGPT・Claude・Perplexityに推薦されるための標準マニフェストと修正プロンプトを自動生成します。",
      p3Title: "3. 24時間バイヤー意図レーダー",
      p3Desc:
        "広告費を燃やす前に、Hacker News・Reddit・GitHubから課題を抱える開発者の投稿を毎日抽出し、返信切り口とともにお届けします。",
    },
    pricing: {
      kicker: "まず無料で検証 · 納得してからお支払い",
      title: "透明で個人開発者に優しい料金体系",
      subtitle: "すべての専用ページで上位3つの欠陥と3件の実在スレッドを無料検証できます。",
      freeLabel: "無料スナップショット",
      freeBtn: "上でURLを無料スキャン ↑",
      fixLabel: "買い切り修正パック",
      fixBtn: "修正パックを購入 — $19",
      radarLabel: "グロース＆バイヤーレーダー Pro",
      radarBadge: "最高ROI · いつでも解約可能",
      radarBtn: "24時間バイヤーレーダー開始 — $29/月",
      loadingCheckout: "安全な決済ページへ移動中...",
    },
    warRoom: {
      exclusivePrefix: "専用診断レポート：",
      passiveScan: "100% 非侵襲スキャン",
      readiness: "ローンチ完成度",
      leaksFound: "件の欠陥を検出",
      leaksSection: "検出されたCVR・AI検索の欠陥",
      buyersSection: "今すぐ返信できる見込み客スレッド",
      first3Free: "最初の3件は無料検証可能",
      openThread: "スレッドを開いて返信する",
      unlockAll: "すべての見込み客を解除 ($29/月)",
      buyFixPack: "修正パック購入 ($19)",
      backToScanner: "← スキャナーへ戻る",
    },
    portal: {
      badge: "パスワード不要のマジックポータル",
      title: "修正パック＆バイヤーレーダーへアクセス",
      subtitle:
        "パスワード管理は不要です。Creem決済時のメールアドレス（またはMagic Token）を入力して、修正プロンプト・再スキャン検証・毎日のバイヤー一覧を開いてください。",
      inputPlaceholder: "決済メールアドレス または Magic Token",
      submitBtn: "ワークスペースを開く →",
      previewLabel: "購入前に解除済みワークスペースをプレビュー：",
      rescanBtn: "今すぐ再スキャンしてスコア検証",
      rescanningBtn: "ライブサイトを再スキャン中...",
      switchWorkspace: "ワークスペース切替",
      promptsTitle: "解除済み Cursor / Claude Code 修正プロンプト",
      buyersTitle: "解除済み 高意図バイヤーフィード",
      dfyBadge: "丸投げ代行スプリント ($299)",
      dfyBtn: "$299 代行スプリントを申し込む →",
    },
  },
};
