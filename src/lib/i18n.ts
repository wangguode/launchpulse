/**
 * LaunchPulse 全局三语词典（English / 简体中文 / 日本語）
 * 核心定位：50+ 高权重目录流量分发 ($39) + 24/7 真实买家引流雷达 ($29/月)
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
      freeBtn: "Scan Your URL Above ↑",
      fixLabel: "50+ DIRECTORY DISTRIBUTION BLITZ",
      fixBtn: "Launch 50+ Directory Blitz — $39",
      radarLabel: "24/7 BUYER RADAR & TRAFFIC PRO",
      radarBadge: "Best ROI · Cancel Anytime",
      radarBtn: "Start 24/7 Buyer Radar — $29/mo",
      loadingCheckout: "Opening Secure Checkout...",
    },
    warRoom: {
      exclusivePrefix: "TRAFFIC & BUYER WAR-ROOM FOR",
      passiveScan: "Passive read-only audit",
      readiness: "Traffic Readiness",
      leaksFound: "Traffic Leaks",
      leaksSection: "Conversion & Discovery Leaks (Bonus Audit)",
      buyersSection: "Fresh Active Pain-Point Threads",
      first3Free: "First 3 Free to Verify",
      openThread: "Open Thread & Win Customer",
      unlockAll: "Unlock 24/7 Buyer Radar ($29/mo)",
      buyFixPack: "Get 50+ Directory Blitz ($39)",
      backToScanner: "← Back to Scanner",
    },
    portal: {
      badge: "PASSWORDLESS DISTRIBUTION & BUYER PORTAL",
      title: "Track Your 50+ Backlinks & Daily Buyers",
      subtitle:
        "No passwords needed. Enter your Creem checkout email (or paste your Magic Token) to track live directory submissions, export backlink proofs, and reply to daily buyer threads.",
      inputPlaceholder: "founder@your-startup.com or magic token",
      submitBtn: "Open My Traffic Portal →",
      previewLabel: "Want to preview the live distribution & buyer portal?",
      rescanBtn: "Re-Scan My Site Now",
      rescanningBtn: "Re-Scanning Live Site...",
      switchWorkspace: "Switch Workspace",
      promptsTitle: "Bonus SEO & /llms.txt Conversion Fixes",
      buyersTitle: "Unlocked Daily Buyer Threads",
      dfyBadge: "DONE-FOR-YOU FIRST 100 USERS SPRINT ($299)",
      dfyBtn: "Book $299 Growth Sprint →",
    },
  },
  zh: {
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
      freeBtn: "在上方输入网址免费扫描 ↑",
      fixLabel: "50+ 高权重目录流量分发冲刺包",
      fixBtn: "启动 50+ 目录外链分发 — $39",
      radarLabel: "24/7 真实买家引流雷达 Pro",
      radarBadge: "持续带客 · 随时取消",
      radarBtn: "开启 24/7 买家引流雷达 — $29/月",
      loadingCheckout: "正在跳转安全收银台...",
    },
    warRoom: {
      exclusivePrefix: "专属流量与获客战情报告：",
      passiveScan: "100% 无害只读诊断",
      readiness: "流量承接评分",
      leaksFound: "项流量流失点",
      leaksSection: "流量承接与收录缺口（随赠修复）",
      buyersSection: "近期活跃痛点与求购原帖",
      first3Free: "前 3 条免费点击验真",
      openThread: "打开原帖直接获客",
      unlockAll: "开启 24/7 买家雷达 ($29/月)",
      buyFixPack: "50+ 目录外链分发 ($39)",
      backToScanner: "← 返回流量扫描器",
    },
    portal: {
      badge: "免密码分发进度与买家工作台",
      title: "追踪你的 50+ 外链分发与每日新买家",
      subtitle:
        "无需密码。输入 Creem 付款邮箱（或粘贴 Magic Token），即可实时查看 50+ 目录提交状态、导出外链回执，并一键回复每日新增的高意图开发者原帖。",
      inputPlaceholder: "输入付款邮箱或 Magic Token",
      submitBtn: "进入我的流量工作台 →",
      previewLabel: "想先预览外链分发进度与买家工作台？",
      rescanBtn: "立即 Re-Scan 复检提分",
      rescanningBtn: "正在实时复检网站...",
      switchWorkspace: "切换工作台",
      promptsTitle: "随赠：SEO 与 /llms.txt 转化修复指令",
      buyersTitle: "已解锁的每日真实买家线索流",
      dfyBadge: "高阶全包：首批 100 真实用户冲刺 ($299)",
      dfyBtn: "预约 $299 全包冷启动冲刺 →",
    },
  },
  ja: {
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
      freeBtn: "上でURLを無料スキャン ↑",
      fixLabel: "50+ ディレクトリ一括配信パック",
      fixBtn: "50+ ディレクトリ配信を開始 — $39",
      radarLabel: "24時間見込み客レーダー Pro",
      radarBadge: "継続集客 · いつでも解約可能",
      radarBtn: "24時間見込み客レーダー開始 — $29/月",
      loadingCheckout: "安全な決済ページへ移動中...",
    },
    warRoom: {
      exclusivePrefix: "専用集客・見込み客レポート：",
      passiveScan: "100% 非侵襲診断",
      readiness: "集客受け入れスコア",
      leaksFound: "件の機会損失",
      leaksSection: "流入・CVRの機会損失（無料特典診断）",
      buyersSection: "直近のリアルな課題・購入相談スレッド",
      first3Free: "最初の3件は無料検証可能",
      openThread: "スレッドを開いて顧客獲得",
      unlockAll: "24時間見込み客レーダー ($29/月)",
      buyFixPack: "50+ ディレクトリ配信 ($39)",
      backToScanner: "← スキャナーへ戻る",
    },
    portal: {
      badge: "パスワード不要の配信＆見込み客ポータル",
      title: "50+被リンク進捗と毎日の見込み客を管理",
      subtitle:
        "パスワードは不要です。Creem決済時のメールアドレス（またはMagic Token）を入力して、ディレクトリ掲載状況と毎日の見込み客一覧を確認できます。",
      inputPlaceholder: "決済メールアドレス または Magic Token",
      submitBtn: "集客ポータルを開く →",
      previewLabel: "配信＆見込み客ポータルのデモをプレビュー：",
      rescanBtn: "今すぐ再スキャンして検証",
      rescanningBtn: "ライブサイトを再スキャン中...",
      switchWorkspace: "ワークスペース切替",
      promptsTitle: "無料特典：SEO & /llms.txt 改善プロンプト",
      buyersTitle: "解除済み 毎日のリアル見込み客フィード",
      dfyBadge: "丸投げ代行：初期100ユーザー獲得スプリント ($299)",
      dfyBtn: "$299 集客スプリントを申し込む →",
    },
  },
};
