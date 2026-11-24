import type { Locale } from "@/lib/i18n";

export interface V2Dictionary {
  nav: {
    login: string;
    dashboard: string;
    admin: string;
  };
  auth: {
    badge: string;
    loginTitle: string;
    registerTitle: string;
    loginSub: string;
    registerSub: string;
    tabLogin: string;
    tabRegister: string;
    nameLabel: string;
    namePlaceholder: string;
    emailLabel: string;
    emailPlaceholder: string;
    passwordLabel: string;
    passwordPlaceholder: string;
    loginBtn: string;
    registerBtn: string;
    submitting: string;
    portalHint: string;
    portalLink: string;
  };
  dash: {
    brandSub: string;
    menuOverview: string;
    menuCampaign: string;
    menuLinks: string;
    menuDirectories: string;
    menuBuyers: string;
    menuBilling: string;
    logout: string;
    welcomePrefix: string;
    activePlan: string;
    freePlan: string;
    kpiClicks: string;
    kpiConversions: string;
    kpiCvr: string;
    kpiDirectories: string;
    chartTitle: string;
    chartClicks: string;
    chartConversions: string;
    channelTitle: string;
    channelCol: string;
    clicksCol: string;
    convCol: string;
    cvrCol: string;
    noTrafficYet: string;
    onboardingTitle: string;
    onboardingDesc: string;
    campaignTitle: string;
    campaignDesc: string;
    fieldProduct: string;
    fieldUrl: string;
    fieldTagline: string;
    fieldCompetitors: string;
    saveCampaignBtn: string;
    savingBtn: string;
    campaignSaved: string;
    linksTitle: string;
    linksDesc: string;
    copyShortUrl: string;
    copied: string;
    testClick: string;
    createLinkTitle: string;
    createLinkBtn: string;
    pixelTitle: string;
    pixelDesc: string;
    copyPixel: string;
    dirTitle: string;
    dirDesc: string;
    buyersTitle: string;
    buyersEmpty: string;
    billingTitle: string;
    billingDesc: string;
    upgradeBlitz: string;
    upgradeRadar: string;
    upgradeDfy: string;
    loading: string;
  };
  admin: {
    badge: string;
    title: string;
    keyPlaceholder: string;
    loginBtn: string;
    refreshBtn: string;
    logoutBtn: string;
    kpiUsers: string;
    kpiCampaigns: string;
    kpiRevenue: string;
    kpiMrr: string;
    kpiClicks: string;
    kpiCvr: string;
    tabOverview: string;
    tabDirectories: string;
    tabOrders: string;
    dirUpdateTitle: string;
    dirUpdateDesc: string;
    selectCustomer: string;
    selectDir: string;
    selectStatus: string;
    liveUrlPlaceholder: string;
    saveDirBtn: string;
    savedMsg: string;
    campaignsTableTitle: string;
    usersTableTitle: string;
    ordersTableTitle: string;
    noData: string;
  };
}

export const V2_DICTIONARIES: Record<Locale, V2Dictionary> = {
  en: {
    nav: {
      login: "Log In",
      dashboard: "Dashboard",
      admin: "Admin",
    },
    auth: {
      badge: "LAUNCHPULSE SAAS CONSOLE",
      loginTitle: "Sign in to your Traffic Console",
      registerTitle: "Create your LaunchPulse Account",
      loginSub: "Track your 50+ directory backlinks, real referral clicks, and conversion rate.",
      registerSub: "Register free, submit your SaaS URL, and generate live attribution tracking links in 30 seconds.",
      tabLogin: "Sign In",
      tabRegister: "Create Account",
      nameLabel: "Your Name",
      namePlaceholder: "Alex Chen",
      emailLabel: "Work Email",
      emailPlaceholder: "founder@your-startup.com",
      passwordLabel: "Password (min 6 chars)",
      passwordPlaceholder: "••••••••",
      loginBtn: "Sign In to Dashboard →",
      registerBtn: "Create Free Account →",
      submitting: "Authenticating...",
      portalHint: "Already paid via Creem with a Magic Link?",
      portalLink: "Open Passwordless Portal →",
    },
    dash: {
      brandSub: "Traffic Console",
      menuOverview: "Overview & Analytics",
      menuCampaign: "My SaaS Campaign",
      menuLinks: "Tracking Links & Pixel",
      menuDirectories: "50+ Directory Backlinks",
      menuBuyers: "Daily Buyer Radar",
      menuBilling: "Plans & Billing",
      logout: "Sign Out",
      welcomePrefix: "Welcome back,",
      activePlan: "Active Plan",
      freePlan: "Free Starter (Upgrade to launch 50+ directories)",
      kpiClicks: "Total Referral Clicks",
      kpiConversions: "Verified Conversions",
      kpiCvr: "Conversion Rate (CVR)",
      kpiDirectories: "Live Directories",
      chartTitle: "14-Day Traffic & Conversion Trend",
      chartClicks: "Clicks",
      chartConversions: "Conversions",
      channelTitle: "Channel Attribution Breakdown",
      channelCol: "Channel",
      clicksCol: "Clicks",
      convCol: "Conversions",
      cvrCol: "CVR %",
      noTrafficYet: "Save your SaaS campaign and share your tracking links to see live clicks & CVR.",
      onboardingTitle: "Step 1: Submit Your SaaS to Start Traffic Distribution",
      onboardingDesc: "Enter your website URL and value prop below. We will automatically generate 3 attribution short links (/r/...) for directories, community replies, and SEO pages.",
      campaignTitle: "My SaaS Product & Distribution Brief",
      campaignDesc: "Used by our team & scripts to submit your SaaS to 50+ high-DR directories and monitor relevant buyer threads.",
      fieldProduct: "Product Name",
      fieldUrl: "Website URL (HTTPS)",
      fieldTagline: "One-Line Value Proposition",
      fieldCompetitors: "Top Competitors (comma-separated, for /vs/ pages)",
      saveCampaignBtn: "Save Campaign & Generate Tracking Links →",
      savingBtn: "Saving...",
      campaignSaved: "Campaign saved! Your attribution short links are live below.",
      linksTitle: "Edge Attribution Short Links (/r/...)",
      linksDesc: "Every click through these links is logged in real time (channel, country, device) before redirecting to your site with UTM tags.",
      copyShortUrl: "Copy Link",
      copied: "Copied!",
      testClick: "Test 302",
      createLinkTitle: "Create Custom Tracking Link",
      createLinkBtn: "+ Create Link",
      pixelTitle: "1-Line Conversion Pixel (Calculate Real CVR %)",
      pixelDesc: "Paste this into your site <head> and call window.lpConvert('signup') or window.lpConvert('purchase', 29) on your thank-you page.",
      copyPixel: "Copy Pixel Snippet",
      dirTitle: "50+ Hand-Curated Directory Submissions (DR 45–91)",
      dirDesc: "What this does: Our specialists manually submit your SaaS to 50+ trusted software marketplaces (AlternativeTo, SaaSHub, Toolify, Uneed) to drive real referral clicks and boost your Google ranking — zero spam bots. Started within 48h of payment.",
      buyersTitle: "Daily High-Intent Buyer Threads",
      buyersEmpty: "No delivered threads yet. Activate $29/mo Buyer Radar Pro to receive daily fresh Hacker News & Reddit leads.",
      billingTitle: "Upgrade Traffic Distribution",
      billingDesc: "Scale your real backlinks and daily paying customers with transparent pricing.",
      upgradeBlitz: "Launch 50+ Directory Blitz — $39",
      upgradeRadar: "Start 24/7 Buyer Radar — $29/mo",
      upgradeDfy: "Book Done-For-You Sprint — $299",
      loading: "Loading your traffic console...",
    },
    admin: {
      badge: "INTERNAL OPS CONSOLE",
      title: "LaunchPulse Admin Management",
      keyPlaceholder: "Enter ADMIN_API_KEY to unlock",
      loginBtn: "Unlock Admin Console →",
      refreshBtn: "Refresh Live Data",
      logoutBtn: "Lock",
      kpiUsers: "Registered Users",
      kpiCampaigns: "Active Campaigns",
      kpiRevenue: "Total Revenue",
      kpiMrr: "Active MRR",
      kpiClicks: "Platform Clicks",
      kpiCvr: "Overall CVR",
      tabOverview: "Customers & Campaigns",
      tabDirectories: "Directory Fulfillment",
      tabOrders: "Orders & Outreach",
      dirUpdateTitle: "Update Customer Directory Backlink Status",
      dirUpdateDesc: "Changes immediately reflect in the customer's /dashboard and /portal.",
      selectCustomer: "Customer Email",
      selectDir: "Directory",
      selectStatus: "Status",
      liveUrlPlaceholder: "https://directory.com/your-listing-url",
      saveDirBtn: "Save Backlink Proof →",
      savedMsg: "Updated in Cloudflare D1!",
      campaignsTableTitle: "Submitted SaaS Campaigns",
      usersTableTitle: "Registered Accounts",
      ordersTableTitle: "Paid Creem Orders",
      noData: "No records yet.",
    },
  },
  zh: {
    nav: {
      login: "登录 / 注册",
      dashboard: "客户控制台",
      admin: "管理后台",
    },
    auth: {
      badge: "LAUNCHPULSE 推流控制台",
      loginTitle: "登录你的推流与转化控制台",
      registerTitle: "免费注册 LaunchPulse 账号",
      loginSub: "实时查看 50+ 目录外链进度、每日导入点击数与真实转化率报表。",
      registerSub: "30 秒注册账号、提交你的 SaaS 网址，自动生成专属归因追踪短链与转化像素。",
      tabLogin: "账号登录",
      tabRegister: "免费注册",
      nameLabel: "你的称呼",
      namePlaceholder: "王先生 / Alex",
      emailLabel: "常用邮箱",
      emailPlaceholder: "founder@your-startup.com",
      passwordLabel: "登录密码（至少 6 位）",
      passwordPlaceholder: "••••••••",
      loginBtn: "进入客户控制台 →",
      registerBtn: "免费注册并进入控制台 →",
      submitting: "正在验证...",
      portalHint: "已通过 Creem 付款并收到免密 Magic Link？",
      portalLink: "打开免密工作台 →",
    },
    dash: {
      brandSub: "推流与转化工作台",
      menuOverview: "数据概览与报表",
      menuCampaign: "我的推广项目",
      menuLinks: "追踪短链与转化像素",
      menuDirectories: "50+ 目录外链进度",
      menuBuyers: "每日真实买家雷达",
      menuBilling: "套餐升级与账单",
      logout: "退出登录",
      welcomePrefix: "欢迎回来，",
      activePlan: "当前生效套餐",
      freePlan: "免费体验版（升级后立即启动 50+ 目录外链推流）",
      kpiClicks: "累计导入点击 (Clicks)",
      kpiConversions: "已回传转化 (Conversions)",
      kpiCvr: "整体转化率 (CVR)",
      kpiDirectories: "已收录高权重目录",
      chartTitle: "近 14 天真实导流点击与转化趋势图",
      chartClicks: "真实点击",
      chartConversions: "转化注册/付费",
      channelTitle: "各推流渠道归因与转化率排行",
      channelCol: "推流渠道",
      clicksCol: "点击数",
      convCol: "转化数",
      cvrCol: "转化率 CVR",
      noTrafficYet: "先在「我的推广项目」保存你的官网地址，拿到追踪短链后即可实时看到点击与转化曲线。",
      onboardingTitle: "第一步：提交你的网站，立即开启推流与归因追踪",
      onboardingDesc: "填写你的 SaaS 官网地址、一句话卖点与核心竞品。系统会自动为你生成 3 条边缘追踪短链（目录外链 / 社区引流 / SEO 截流页），精确统计每一笔流量。",
      campaignTitle: "我的 SaaS 产品与推流档案",
      campaignDesc: "我们的 50+ 目录提交流水线与每日买家监听引擎将直接使用这里的资料为你推流。",
      fieldProduct: "产品名称",
      fieldUrl: "官网地址（HTTPS）",
      fieldTagline: "一句话核心卖点（用于目录简介）",
      fieldCompetitors: "主要竞品（逗号分隔，用于生成 /vs/ 截流页）",
      saveCampaignBtn: "保存项目并自动生成追踪短链 →",
      savingBtn: "正在保存...",
      campaignSaved: "项目已保存！专属归因追踪短链已自动生成并生效。",
      linksTitle: "专属追踪短链（统计哪个渠道真正带来点击）",
      linksDesc: "简单来说，这就是你的「流量计数器」：我们把你的产品发到 50+ 目录或社区时使用这些短链，海外用户一点就会自动记下点击数、国家与来源，并秒跳你的官网。",
      copyShortUrl: "复制短链",
      copied: "已复制！",
      testClick: "测试跳转",
      createLinkTitle: "新建自定义渠道短链",
      createLinkBtn: "+ 生成短链",
      pixelTitle: "可选：1 行转化统计代码（统计点进来后有多少人注册/付费）",
      pixelDesc: "如果你想在后台直接看到「注册转化率 CVR %」，把下面 1 行代码放进网站即可；不放也能正常看全部点击数与外链进度。",
      copyPixel: "复制追踪代码",
      dirTitle: "50+ 海外高权重软件目录人工投流进度（DR 45–91）",
      dirDesc: "作用：把你的产品逐站人工提交到 AlternativeTo、SaaSHub、Toolify 等 50+ 海外知名软件导航站——既能直接带来逛导航站的精准用户点击，又能为你的网站建立高权重外链提升 Google 排名。付款后 48 小时内由专员逐站人工提交并实时回传收录链接。",
      buyersTitle: "每日高意图买家原帖线索",
      buyersEmpty: "暂无已推送线索。开启 $29/月 买家雷达 Pro 后，系统每天自动抓取 HN / Reddit 最新求购帖推送到这里。",
      billingTitle: "升级推流套餐，加速真实获客",
      billingDesc: "透明定价、直连 Creem 安全支付，买的是真实目录外链与每日活跃买家。",
      upgradeBlitz: "启动 50+ 目录外链分发 — $39",
      upgradeRadar: "开启 24/7 买家雷达 — $29/月",
      upgradeDfy: "预约首批 100 用户全包冲刺 — $299",
      loading: "正在加载你的推流控制台...",
    },
    admin: {
      badge: "内部运营管理台",
      title: "LaunchPulse 全局管理后台",
      keyPlaceholder: "输入 ADMIN_API_KEY 解锁管理后台",
      loginBtn: "解锁进入管理台 →",
      refreshBtn: "刷新实时数据",
      logoutBtn: "锁定退出",
      kpiUsers: "注册客户数",
      kpiCampaigns: "推广项目数",
      kpiRevenue: "累计实收营收",
      kpiMrr: "活跃月订阅 MRR",
      kpiClicks: "全平台导流点击",
      kpiCvr: "全平台转化率",
      tabOverview: "客户与推广项目",
      tabDirectories: "50+ 目录外链履约回填",
      tabOrders: "付费订单与外联日志",
      dirUpdateTitle: "可视化回填客户目录外链收录状态",
      dirUpdateDesc: "在此更新目录状态与真实收录链接后，客户在 /dashboard 与 /portal 会秒级同步看到绿色已收录徽章。",
      selectCustomer: "客户邮箱",
      selectDir: "目标目录站",
      selectStatus: "提交状态",
      liveUrlPlaceholder: "填入真实收录外链 URL（如 https://theresanaiforthat.com/ai/...）",
      saveDirBtn: "保存并同步给客户 →",
      savedMsg: "已写入 Cloudflare D1 并同步至客户前台！",
      campaignsTableTitle: "客户提交的推广项目列表",
      usersTableTitle: "平台注册账号列表",
      ordersTableTitle: "Creem 实付订单台账",
      noData: "暂无记录。",
    },
  },
  ja: {
    nav: {
      login: "ログイン / 登録",
      dashboard: "ダッシュボード",
      admin: "管理画面",
    },
    auth: {
      badge: "LAUNCHPULSE コンソール",
      loginTitle: "集客コンソールにログイン",
      registerTitle: "LaunchPulse 無料アカウント作成",
      loginSub: "50+ディレクトリの被リンク進捗、クリック数、CVRレポートをリアルタイム確認。",
      registerSub: "30秒で登録し、SaaSのURLを入力するだけで計測用短縮リンクを自動発行します。",
      tabLogin: "ログイン",
      tabRegister: "新規登録",
      nameLabel: "お名前",
      namePlaceholder: "山田 太郎",
      emailLabel: "メールアドレス",
      emailPlaceholder: "founder@your-startup.com",
      passwordLabel: "パスワード（6文字以上）",
      passwordPlaceholder: "••••••••",
      loginBtn: "ダッシュボードへログイン →",
      registerBtn: "無料でアカウント作成 →",
      submitting: "認証中...",
      portalHint: "Creem決済済みのマジックリンクをお持ちですか？",
      portalLink: "パスワード不要ポータルを開く →",
    },
    dash: {
      brandSub: "集客コンソール",
      menuOverview: "概要・CVRレポート",
      menuCampaign: "対象SaaS設定",
      menuLinks: "計測リンク・ピクセル",
      menuDirectories: "50+ディレクトリ掲載",
      menuBuyers: "毎日の見込み客",
      menuBilling: "プラン・課金",
      logout: "ログアウト",
      welcomePrefix: "ようこそ、",
      activePlan: "現在のプラン",
      freePlan: "無料スターター（アップグレードで50+ディレクトリ配信開始）",
      kpiClicks: "総リファラルクリック",
      kpiConversions: "計測コンバージョン",
      kpiCvr: "コンバージョン率 (CVR)",
      kpiDirectories: "掲載完了ディレクトリ",
      chartTitle: "直近14日間のクリック＆コンバージョン推移",
      chartClicks: "クリック数",
      chartConversions: "コンバージョン",
      channelTitle: "チャネル別流入・CVR内訳",
      channelCol: "チャネル",
      clicksCol: "クリック",
      convCol: "CV数",
      cvrCol: "CVR %",
      noTrafficYet: "まず対象SaaSを保存し、自動発行された短縮リンクを共有すると推移が表示されます。",
      onboardingTitle: "ステップ1：対象SaaSを登録して集客計測を開始",
      onboardingDesc: "URLと概要を保存すると、ディレクトリ・コミュニティ・SEO用の3本の計測短縮リンクを自動生成します。",
      campaignTitle: "対象SaaSと配信プロフィール",
      campaignDesc: "50+ディレクトリ登録代行および毎日の見込み客探索に使用されます。",
      fieldProduct: "製品名",
      fieldUrl: "公式サイトURL (HTTPS)",
      fieldTagline: "一言キャッチコピー",
      fieldCompetitors: "主要競合（カンマ区切り、/vs/ページ用）",
      saveCampaignBtn: "保存して計測リンクを自動発行 →",
      savingBtn: "保存中...",
      campaignSaved: "保存しました！計測用短縮リンクが有効になりました。",
      linksTitle: "エッジ帰属トラッキング短縮リンク (/r/...)",
      linksDesc: "クリック時にチャネル・国・端末を記録し、UTM付きで公式サイトへ302リダイレクトします。",
      copyShortUrl: "コピー",
      copied: "コピー済み",
      testClick: "テスト遷移",
      createLinkTitle: "カスタム計測リンクを作成",
      createLinkBtn: "+ リンク作成",
      pixelTitle: "1行コンバージョン計測ピクセル（CVR自動算出）",
      pixelDesc: "サイトの <head> に貼り、登録/課金完了時に window.lpConvert('signup') を呼び出してください。",
      copyPixel: "コードをコピー",
      dirTitle: "50+ 高DRディレクトリ掲載ステータス (DR 45–91)",
      dirDesc: "Cloudflare D1とリアルタイム同期。$39パック購入後48時間以内に配信開始します。",
      buyersTitle: "毎日の高意図見込み客スレッド",
      buyersEmpty: "まだ配信スレッドはありません。$29/月のレーダーPro有効化で毎日届きます。",
      billingTitle: "集客配信プランをアップグレード",
      billingDesc: "透明な料金体系で被リンクとリアル見込み客を加速します。",
      upgradeBlitz: "50+ ディレクトリ配信を開始 — $39",
      upgradeRadar: "24時間レーダー開始 — $29/月",
      upgradeDfy: "初期100ユーザー丸投げ — $299",
      loading: "コンソールを読み込み中...",
    },
    admin: {
      badge: "運営管理コンソール",
      title: "LaunchPulse 管理者ダッシュボード",
      keyPlaceholder: "ADMIN_API_KEY を入力してロック解除",
      loginBtn: "管理コンソールを開く →",
      refreshBtn: "最新データを取得",
      logoutBtn: "ロック",
      kpiUsers: "登録ユーザー数",
      kpiCampaigns: "登録プロジェクト",
      kpiRevenue: "累計売上",
      kpiMrr: "有効MRR",
      kpiClicks: "全体クリック数",
      kpiCvr: "全体CVR",
      tabOverview: "顧客・プロジェクト一覧",
      tabDirectories: "ディレクトリ掲載更新",
      tabOrders: "注文・アウトリーチ",
      dirUpdateTitle: "顧客のディレクトリ掲載ステータスを更新",
      dirUpdateDesc: "更新内容は即座に顧客の /dashboard と /portal に反映されます。",
      selectCustomer: "顧客メールアドレス",
      selectDir: "ディレクトリ",
      selectStatus: "ステータス",
      liveUrlPlaceholder: "掲載完了ページのURL",
      saveDirBtn: "保存して顧客画面へ反映 →",
      savedMsg: "Cloudflare D1へ保存しました！",
      campaignsTableTitle: "登録SaaSプロジェクト一覧",
      usersTableTitle: "登録アカウント一覧",
      ordersTableTitle: "Creem 決済注文一覧",
      noData: "データがありません。",
    },
  },
};
