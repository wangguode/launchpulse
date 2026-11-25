/**
 * 50 个真实可代提交的高权重海外 AI & SaaS 软件目录库（V3 清洗版）
 * -------------------------------------------------------------------
 * 已剔除 G2 / Capterra / Crunchbase / Wellfound 等需企业实名认证、无法代提交的平台；
 * 每条均含精确 submitUrl（直达提交页）、DR 权重、外链类型（dofollow/nofollow）与定价模式。
 */

export interface DirectoryChannel {
  id: string;
  name: string;
  url: string;
  submitUrl: string;
  dr: number;
  category: "SaaS Directory" | "AI Aggregator" | "Launchpad" | "Dev & Indie";
  linkType: "dofollow" | "nofollow";
  pricing: "free" | "freemium";
  defaultStatus: "queued" | "submitted" | "live";
}

export const DISTRIBUTION_DIRECTORIES: DirectoryChannel[] = [
  { id: "d01", name: "AlternativeTo", url: "https://alternativeto.net", submitUrl: "https://alternativeto.net/manage-apps/add/", dr: 82, category: "SaaS Directory", linkType: "nofollow", pricing: "free", defaultStatus: "live" },
  { id: "d02", name: "SaaSHub", url: "https://www.saashub.com", submitUrl: "https://www.saashub.com/services/submit", dr: 74, category: "SaaS Directory", linkType: "dofollow", pricing: "free", defaultStatus: "live" },
  { id: "d03", name: "There's An AI For That", url: "https://theresanaiforthat.com", submitUrl: "https://theresanaiforthat.com/submit/", dr: 78, category: "AI Aggregator", linkType: "dofollow", pricing: "freemium", defaultStatus: "submitted" },
  { id: "d04", name: "Toolify.ai", url: "https://www.toolify.ai", submitUrl: "https://www.toolify.ai/submit", dr: 72, category: "AI Aggregator", linkType: "dofollow", pricing: "freemium", defaultStatus: "submitted" },
  { id: "d05", name: "Futurepedia", url: "https://www.futurepedia.io", submitUrl: "https://www.futurepedia.io/submit-tool", dr: 75, category: "AI Aggregator", linkType: "dofollow", pricing: "freemium", defaultStatus: "queued" },
  { id: "d06", name: "BetaList", url: "https://betalist.com", submitUrl: "https://betalist.com/submit", dr: 76, category: "Launchpad", linkType: "dofollow", pricing: "freemium", defaultStatus: "submitted" },
  { id: "d07", name: "Uneed.best", url: "https://www.uneed.best", submitUrl: "https://www.uneed.best/submit-a-tool", dr: 68, category: "Launchpad", linkType: "dofollow", pricing: "freemium", defaultStatus: "live" },
  { id: "d08", name: "MicroLaunch", url: "https://microlaunch.net", submitUrl: "https://microlaunch.net/submit", dr: 61, category: "Launchpad", linkType: "dofollow", pricing: "free", defaultStatus: "live" },
  { id: "d09", name: "Fazier", url: "https://fazier.com", submitUrl: "https://fazier.com/submit", dr: 56, category: "Launchpad", linkType: "dofollow", pricing: "free", defaultStatus: "submitted" },
  { id: "d10", name: "DEV.to #showdev", url: "https://dev.to", submitUrl: "https://dev.to/new", dr: 85, category: "Dev & Indie", linkType: "nofollow", pricing: "free", defaultStatus: "live" },
  { id: "d11", name: "IndieHackers Products", url: "https://www.indiehackers.com/products", submitUrl: "https://www.indiehackers.com/products/new", dr: 80, category: "Dev & Indie", linkType: "nofollow", pricing: "free", defaultStatus: "submitted" },
  { id: "d12", name: "Peerlist Launchpad", url: "https://peerlist.io/launchpad", submitUrl: "https://peerlist.io/launchpad", dr: 70, category: "Launchpad", linkType: "dofollow", pricing: "free", defaultStatus: "queued" },
  { id: "d13", name: "Launching Next", url: "https://www.launchingnext.com", submitUrl: "https://www.launchingnext.com/submit/", dr: 62, category: "Launchpad", linkType: "dofollow", pricing: "free", defaultStatus: "queued" },
  { id: "d14", name: "SideProjectors", url: "https://www.sideprojectors.com", submitUrl: "https://www.sideprojectors.com/project/submit", dr: 61, category: "Dev & Indie", linkType: "dofollow", pricing: "free", defaultStatus: "queued" },
  { id: "d15", name: "Startup Stash", url: "https://startupstash.com", submitUrl: "https://startupstash.com/add-listing/", dr: 71, category: "SaaS Directory", linkType: "dofollow", pricing: "freemium", defaultStatus: "queued" },
  { id: "d16", name: "TopAI.tools", url: "https://topai.tools", submitUrl: "https://topai.tools/submit", dr: 66, category: "AI Aggregator", linkType: "dofollow", pricing: "freemium", defaultStatus: "queued" },
  { id: "d17", name: "AI Tools Directory", url: "https://aitoolsdirectory.com", submitUrl: "https://aitoolsdirectory.com/submit-tool", dr: 60, category: "AI Aggregator", linkType: "dofollow", pricing: "free", defaultStatus: "queued" },
  { id: "d18", name: "FutureTools", url: "https://www.futuretools.io", submitUrl: "https://www.futuretools.io/submit-a-tool", dr: 73, category: "AI Aggregator", linkType: "dofollow", pricing: "free", defaultStatus: "queued" },
  { id: "d19", name: "OpenFuture AI", url: "https://openfuture.ai", submitUrl: "https://openfuture.ai/submit-tool", dr: 54, category: "AI Aggregator", linkType: "dofollow", pricing: "free", defaultStatus: "queued" },
  { id: "d20", name: "SaaSWorthy", url: "https://www.saasworthy.com", submitUrl: "https://www.saasworthy.com/offerings", dr: 70, category: "SaaS Directory", linkType: "dofollow", pricing: "free", defaultStatus: "queued" },
  { id: "d21", name: "Crozdesk", url: "https://crozdesk.com", submitUrl: "https://vendor.crozdesk.com/", dr: 74, category: "SaaS Directory", linkType: "dofollow", pricing: "free", defaultStatus: "queued" },
  { id: "d22", name: "SourceForge Software", url: "https://sourceforge.net", submitUrl: "https://sourceforge.net/software/vendors/new", dr: 91, category: "SaaS Directory", linkType: "dofollow", pricing: "free", defaultStatus: "queued" },
  { id: "d23", name: "Slashdot Software", url: "https://slashdot.org/software", submitUrl: "https://slashdot.org/software/vendors/new", dr: 88, category: "SaaS Directory", linkType: "dofollow", pricing: "free", defaultStatus: "queued" },
  { id: "d24", name: "ProductBurst", url: "https://productburst.com", submitUrl: "https://productburst.com/submit", dr: 48, category: "Launchpad", linkType: "dofollow", pricing: "free", defaultStatus: "queued" },
  { id: "d25", name: "TinyLaunch", url: "https://tinylaunch.com", submitUrl: "https://tinylaunch.com/submit", dr: 50, category: "Launchpad", linkType: "dofollow", pricing: "free", defaultStatus: "queued" },
  { id: "d26", name: "Twelve Tools", url: "https://twelve.tools", submitUrl: "https://twelve.tools/submit", dr: 49, category: "Launchpad", linkType: "dofollow", pricing: "free", defaultStatus: "queued" },
  { id: "d27", name: "StartupRanking", url: "https://www.startupranking.com", submitUrl: "https://www.startupranking.com/login", dr: 73, category: "SaaS Directory", linkType: "dofollow", pricing: "free", defaultStatus: "queued" },
  { id: "d28", name: "BetaPage", url: "https://betapage.co", submitUrl: "https://betapage.co/product/submit", dr: 63, category: "Launchpad", linkType: "dofollow", pricing: "free", defaultStatus: "queued" },
  { id: "d29", name: "1000.tools", url: "https://1000.tools", submitUrl: "https://1000.tools/submit", dr: 52, category: "AI Aggregator", linkType: "dofollow", pricing: "free", defaultStatus: "queued" },
  { id: "d30", name: "Dang.ai", url: "https://dang.ai", submitUrl: "https://dang.ai/submit", dr: 58, category: "AI Aggregator", linkType: "dofollow", pricing: "freemium", defaultStatus: "queued" },
  { id: "d31", name: "Easy With AI", url: "https://easywithai.com", submitUrl: "https://easywithai.com/submit-tool/", dr: 56, category: "AI Aggregator", linkType: "dofollow", pricing: "freemium", defaultStatus: "queued" },
  { id: "d32", name: "Aixploria", url: "https://www.aixploria.com", submitUrl: "https://www.aixploria.com/en/free-ai/", dr: 65, category: "AI Aggregator", linkType: "dofollow", pricing: "freemium", defaultStatus: "queued" },
  { id: "d33", name: "AIxCollection", url: "https://www.aixcollection.com", submitUrl: "https://www.aixcollection.com/submit/", dr: 47, category: "AI Aggregator", linkType: "dofollow", pricing: "free", defaultStatus: "queued" },
  { id: "d34", name: "Supertools (The Rundown)", url: "https://supertools.therundown.ai", submitUrl: "https://supertools.therundown.ai/submit", dr: 70, category: "AI Aggregator", linkType: "dofollow", pricing: "free", defaultStatus: "queued" },
  { id: "d35", name: "StackShare", url: "https://stackshare.io", submitUrl: "https://stackshare.io/submit", dr: 81, category: "Dev & Indie", linkType: "dofollow", pricing: "free", defaultStatus: "queued" },
  { id: "d36", name: "LibHunt", url: "https://www.libhunt.com", submitUrl: "https://www.libhunt.com/submit", dr: 71, category: "Dev & Indie", linkType: "dofollow", pricing: "free", defaultStatus: "queued" },
  { id: "d37", name: "DevHunt", url: "https://devhunt.org", submitUrl: "https://devhunt.org/account/tools/new", dr: 62, category: "Dev & Indie", linkType: "dofollow", pricing: "free", defaultStatus: "queued" },
  { id: "d38", name: "OpenAlternative", url: "https://openalternative.co", submitUrl: "https://openalternative.co/submit", dr: 67, category: "Dev & Indie", linkType: "dofollow", pricing: "free", defaultStatus: "queued" },
  { id: "d39", name: "ToolScout", url: "https://toolscout.ai", submitUrl: "https://toolscout.ai/submit", dr: 46, category: "AI Aggregator", linkType: "dofollow", pricing: "free", defaultStatus: "queued" },
  { id: "d40", name: "SaaS AI Tools", url: "https://saasaitools.com", submitUrl: "https://saasaitools.com/submit/", dr: 55, category: "AI Aggregator", linkType: "dofollow", pricing: "free", defaultStatus: "queued" },
  { id: "d41", name: "PitchWall", url: "https://pitchwall.co", submitUrl: "https://pitchwall.co/submit", dr: 53, category: "Launchpad", linkType: "dofollow", pricing: "free", defaultStatus: "queued" },
  { id: "d42", name: "SimpleDirect / StartupBase", url: "https://startupbase.io", submitUrl: "https://startupbase.io/submit", dr: 58, category: "Launchpad", linkType: "dofollow", pricing: "free", defaultStatus: "queued" },
  { id: "d43", name: "SaaSGenius", url: "https://www.saasgenius.com", submitUrl: "https://www.saasgenius.com/add-software/", dr: 57, category: "SaaS Directory", linkType: "dofollow", pricing: "free", defaultStatus: "queued" },
  { id: "d44", name: "ToolPilot.ai", url: "https://www.toolpilot.ai", submitUrl: "https://www.toolpilot.ai/pages/submit-your-ai-tool", dr: 54, category: "AI Aggregator", linkType: "dofollow", pricing: "free", defaultStatus: "queued" },
  { id: "d45", name: "AIStage", url: "https://aistage.net", submitUrl: "https://aistage.net/submit", dr: 49, category: "AI Aggregator", linkType: "dofollow", pricing: "free", defaultStatus: "queued" },
  { id: "d46", name: "FoundrList", url: "https://foundrlist.com", submitUrl: "https://foundrlist.com/submit", dr: 48, category: "Launchpad", linkType: "dofollow", pricing: "free", defaultStatus: "queued" },
  { id: "d47", name: "StartupBuffer", url: "https://startupbuffer.com", submitUrl: "https://startupbuffer.com/site/submit", dr: 56, category: "Launchpad", linkType: "dofollow", pricing: "free", defaultStatus: "queued" },
  { id: "d48", name: "AllThingsAI", url: "https://allthingsai.com", submitUrl: "https://allthingsai.com/submit", dr: 59, category: "AI Aggregator", linkType: "dofollow", pricing: "free", defaultStatus: "queued" },
  { id: "d49", name: "Launching.io", url: "https://www.launching.io", submitUrl: "https://www.launching.io/submit", dr: 52, category: "Launchpad", linkType: "dofollow", pricing: "free", defaultStatus: "queued" },
  { id: "d50", name: "Hacker News Show HN Kit", url: "https://news.ycombinator.com", submitUrl: "https://news.ycombinator.com/submit", dr: 90, category: "Dev & Indie", linkType: "nofollow", pricing: "free", defaultStatus: "submitted" },
];
