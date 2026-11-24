/**
 * 50+ 海外高权重 AI & SaaS 目录分发清单（Launch Distribution Blitz $39 核心交付资产）
 * 涵盖高 DR 外链、自然搜索权重与精准独立开发者/B2B 买家流量入口
 */

export interface DirectoryChannel {
  id: string;
  name: string;
  url: string;
  dr: number;
  category: "SaaS Directory" | "AI Aggregator" | "Launchpad" | "Dev & Indie";
  defaultStatus: "queued" | "submitted" | "live";
}

export const DISTRIBUTION_DIRECTORIES: DirectoryChannel[] = [
  { id: "d01", name: "AlternativeTo", url: "https://alternativeto.net", dr: 82, category: "SaaS Directory", defaultStatus: "submitted" },
  { id: "d02", name: "SaaSHub", url: "https://www.saashub.com", dr: 74, category: "SaaS Directory", defaultStatus: "submitted" },
  { id: "d03", name: "There's An AI For That", url: "https://theresanaiforthat.com", dr: 78, category: "AI Aggregator", defaultStatus: "submitted" },
  { id: "d04", name: "Toolify.ai", url: "https://www.toolify.ai", dr: 72, category: "AI Aggregator", defaultStatus: "submitted" },
  { id: "d05", name: "Futurepedia", url: "https://www.futurepedia.io", dr: 75, category: "AI Aggregator", defaultStatus: "queued" },
  { id: "d06", name: "BetaList", url: "https://betalist.com", dr: 76, category: "Launchpad", defaultStatus: "queued" },
  { id: "d07", name: "Uneed.best", url: "https://www.uneed.best", dr: 64, category: "Launchpad", defaultStatus: "submitted" },
  { id: "d08", name: "MicroLaunch", url: "https://microlaunch.net", dr: 58, category: "Launchpad", defaultStatus: "submitted" },
  { id: "d09", name: "Fazier", url: "https://fazier.com", dr: 54, category: "Launchpad", defaultStatus: "queued" },
  { id: "d10", name: "DEV.to Showcase", url: "https://dev.to", dr: 85, category: "Dev & Indie", defaultStatus: "submitted" },
  { id: "d11", name: "IndieHackers Products", url: "https://www.indiehackers.com/products", dr: 80, category: "Dev & Indie", defaultStatus: "queued" },
  { id: "d12", name: "Peerlist Launchpad", url: "https://peerlist.io/launchpad", dr: 68, category: "Launchpad", defaultStatus: "queued" },
  { id: "d13", name: "SimpleDirect / Launching Next", url: "https://www.launchingnext.com", dr: 62, category: "Launchpad", defaultStatus: "queued" },
  { id: "d14", name: "SideProjectors", url: "https://www.sideprojectors.com", dr: 61, category: "Dev & Indie", defaultStatus: "queued" },
  { id: "d15", name: "Startup Stash", url: "https://startupstash.com", dr: 71, category: "SaaS Directory", defaultStatus: "queued" },
  { id: "d16", name: "TopAI.tools", url: "https://topai.tools", dr: 66, category: "AI Aggregator", defaultStatus: "queued" },
  { id: "d17", name: "AI Tools Directory", url: "https://aitoolsdirectory.com", dr: 60, category: "AI Aggregator", defaultStatus: "queued" },
  { id: "d18", name: "FutureTools", url: "https://www.futuretools.io", dr: 73, category: "AI Aggregator", defaultStatus: "queued" },
  { id: "d19", name: "OpenFuture AI", url: "https://openfuture.ai", dr: 52, category: "AI Aggregator", defaultStatus: "queued" },
  { id: "d20", name: "SaaSWorthy", url: "https://www.saasworthy.com", dr: 70, category: "SaaS Directory", defaultStatus: "queued" },
  { id: "d21", name: "Crozdesk", url: "https://crozdesk.com", dr: 74, category: "SaaS Directory", defaultStatus: "queued" },
  { id: "d22", name: "SourceForge Software", url: "https://sourceforge.net", dr: 91, category: "SaaS Directory", defaultStatus: "queued" },
  { id: "d23", name: "Slashdot Software", url: "https://slashdot.org/software", dr: 88, category: "SaaS Directory", defaultStatus: "queued" },
  { id: "d24", name: "G2 Software Listing", url: "https://www.g2.com", dr: 90, category: "SaaS Directory", defaultStatus: "queued" },
  { id: "d25", name: "Capterra / GetApp", url: "https://www.capterra.com", dr: 89, category: "SaaS Directory", defaultStatus: "queued" },
  { id: "d26", name: "ProductBurst", url: "https://productburst.com", dr: 46, category: "Launchpad", defaultStatus: "queued" },
  { id: "d27", name: "TinyLaunch", url: "https://tinylaunch.com", dr: 49, category: "Launchpad", defaultStatus: "queued" },
  { id: "d28", name: "Twelve Tools", url: "https://twelve.tools", dr: 48, category: "Launchpad", defaultStatus: "queued" },
  { id: "d29", name: "StartupRanking", url: "https://www.startupranking.com", dr: 73, category: "SaaS Directory", defaultStatus: "queued" },
  { id: "d30", name: "F6S Startup Profile", url: "https://www.f6s.com", dr: 82, category: "SaaS Directory", defaultStatus: "queued" },
  { id: "d31", name: "Crunchbase Profile", url: "https://www.crunchbase.com", dr: 91, category: "SaaS Directory", defaultStatus: "queued" },
  { id: "d32", name: "Wellfound / AngelList", url: "https://wellfound.com", dr: 86, category: "SaaS Directory", defaultStatus: "queued" },
  { id: "d33", name: "BetaPage", url: "https://betapage.co", dr: 63, category: "Launchpad", defaultStatus: "queued" },
  { id: "d34", name: "1000.tools", url: "https://1000.tools", dr: 51, category: "AI Aggregator", defaultStatus: "queued" },
  { id: "d35", name: "Dang.ai", url: "https://dang.ai", dr: 57, category: "AI Aggregator", defaultStatus: "queued" },
  { id: "d36", name: "Easy With AI", url: "https://easywithai.com", dr: 56, category: "AI Aggregator", defaultStatus: "queued" },
  { id: "d37", name: "Aixploria", url: "https://www.aixploria.com", dr: 65, category: "AI Aggregator", defaultStatus: "queued" },
  { id: "d38", name: "AIxCollection", url: "https://www.aixcollection.com", dr: 47, category: "AI Aggregator", defaultStatus: "queued" },
  { id: "d39", name: "Supertools (The Rundown)", url: "https://supertools.therundown.ai", dr: 70, category: "AI Aggregator", defaultStatus: "queued" },
  { id: "d40", name: "StackShare", url: "https://stackshare.io", dr: 81, category: "Dev & Indie", defaultStatus: "queued" },
  { id: "d41", name: "LibHunt / Awesome Lists", url: "https://www.libhunt.com", dr: 71, category: "Dev & Indie", defaultStatus: "queued" },
  { id: "d42", name: "Daily.dev Community", url: "https://daily.dev", dr: 76, category: "Dev & Indie", defaultStatus: "queued" },
  { id: "d43", name: "Hashnode Showcase", url: "https://hashnode.com", dr: 82, category: "Dev & Indie", defaultStatus: "queued" },
  { id: "d44", name: "HackerNoon Tech", url: "https://hackernoon.com", dr: 84, category: "Dev & Indie", defaultStatus: "queued" },
  { id: "d45", name: "ToolScout", url: "https://toolscout.ai", dr: 45, category: "AI Aggregator", defaultStatus: "queued" },
  { id: "d46", name: "SaaS AI Tools", url: "https://saasaitools.com", dr: 55, category: "AI Aggregator", defaultStatus: "queued" },
  { id: "d47", name: "PitchWall", url: "https://pitchwall.co", dr: 53, category: "Launchpad", defaultStatus: "queued" },
  { id: "d48", name: "DevHunt", url: "https://devhunt.org", dr: 60, category: "Dev & Indie", defaultStatus: "queued" },
  { id: "d49", name: "OpenAlternative", url: "https://openalternative.co", dr: 66, category: "Dev & Indie", defaultStatus: "queued" },
  { id: "d50", name: "Show HN & Ask HN Launch Kit", url: "https://news.ycombinator.com", dr: 90, category: "Dev & Indie", defaultStatus: "submitted" },
];
