-- LaunchPulse 商业帝国核心五表结构（Cloudflare D1 / SQLite）

-- 1. 全网猎物池（Show HN / Product Hunt / BetaList / X）
CREATE TABLE IF NOT EXISTS leads_targets (
  slug TEXT PRIMARY KEY,
  product_name TEXT NOT NULL,
  target_url TEXT NOT NULL,
  domain TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'Show HN',
  founder_contact TEXT DEFAULT '',
  has_pricing INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'queued', -- queued | audited | emailed | replied | paid | skipped
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 2. 体检与视频资产表（支持动态渲染 /audit/[slug] 无需重新 build）
CREATE TABLE IF NOT EXISTS audits_assets (
  slug TEXT PRIMARY KEY,
  product_name TEXT NOT NULL,
  target_url TEXT NOT NULL,
  domain TEXT NOT NULL,
  overall_score INTEGER NOT NULL DEFAULT 60,
  leaks_count INTEGER NOT NULL DEFAULT 0,
  leads_count INTEGER NOT NULL DEFAULT 0,
  video_url TEXT NOT NULL DEFAULT '',
  poster_url TEXT NOT NULL DEFAULT '',
  report_json TEXT NOT NULL,
  scanned_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 3. 触达与行为热力追踪表（记录发信状态、战情页访问次数、视频播放最大秒数、点击线索数）
CREATE TABLE IF NOT EXISTS outreach_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL,
  recipient_email TEXT NOT NULL DEFAULT '',
  channel TEXT NOT NULL DEFAULT 'email',
  sent_at TEXT DEFAULT '',
  page_views INTEGER NOT NULL DEFAULT 0,
  max_video_seconds INTEGER NOT NULL DEFAULT 0,
  buyer_clicks INTEGER NOT NULL DEFAULT 0,
  last_event_at TEXT DEFAULT '',
  last_event_type TEXT DEFAULT '',
  follow_up_status TEXT NOT NULL DEFAULT 'pending', -- pending | sent | replied | won
  UNIQUE(slug)
);

-- 4. 付费客户与订阅台账（由 Creem Webhook 自动入账，签发免密 Magic Token）
CREATE TABLE IF NOT EXISTS customers_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT UNIQUE NOT NULL,
  customer_email TEXT NOT NULL,
  slug TEXT DEFAULT '',
  target_url TEXT DEFAULT '',
  plan TEXT NOT NULL, -- fixpack | radar | dfy
  amount_usd INTEGER NOT NULL DEFAULT 19,
  status TEXT NOT NULL DEFAULT 'active', -- active | canceled | refunded
  magic_token TEXT UNIQUE NOT NULL,
  token_expires_at TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 6. 内部管理后台操作审计日志（V09）
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,
  target_slug TEXT DEFAULT '',
  ip TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 7. 50+ 高权重目录真实提交与外链回执表（$39 主力商品真实交付台账）
CREATE TABLE IF NOT EXISTS directory_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_email TEXT NOT NULL,
  slug TEXT NOT NULL,
  directory_id TEXT NOT NULL,
  directory_name TEXT NOT NULL,
  directory_url TEXT NOT NULL,
  dr INTEGER NOT NULL DEFAULT 50,
  category TEXT NOT NULL DEFAULT 'SaaS Directory',
  status TEXT NOT NULL DEFAULT 'queued', -- queued | submitted | live
  live_backlink_url TEXT DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(customer_email, directory_id)
);
CREATE INDEX IF NOT EXISTS idx_dir_sub_email ON directory_submissions(customer_email);

-- 5. 付费客户每日买家线索交付与整改追踪表
CREATE TABLE IF NOT EXISTS radar_deliveries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_email TEXT NOT NULL,
  slug TEXT NOT NULL,
  lead_id TEXT NOT NULL,
  source TEXT NOT NULL,
  community TEXT NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  url TEXT NOT NULL,
  reply_draft TEXT DEFAULT '',
  lead_status TEXT NOT NULL DEFAULT 'new', -- new | replied | won | archived
  delivered_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(customer_email, lead_id)
);

CREATE INDEX IF NOT EXISTS idx_outreach_slug ON outreach_logs(slug);
CREATE INDEX IF NOT EXISTS idx_orders_email ON customers_orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_token ON customers_orders(magic_token);
CREATE INDEX IF NOT EXISTS idx_radar_email ON radar_deliveries(customer_email);

-- 8. V2 SaaS 客户账号表（邮箱 + PBKDF2 加盐密码哈希）
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer', -- customer | admin
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 9. V2 会话表（HttpOnly Cookie 会话凭证，30 天有效）
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  email TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sessions_email ON sessions(email);

-- 10. V2 客户推广项目表（提交网站 URL、卖点、竞品名，关联推流与归因）
CREATE TABLE IF NOT EXISTS campaigns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_email TEXT NOT NULL,
  slug TEXT NOT NULL,
  product_name TEXT NOT NULL,
  target_url TEXT NOT NULL,
  tagline TEXT NOT NULL DEFAULT '',
  competitors TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active', -- active | paused
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_email, slug)
);
CREATE INDEX IF NOT EXISTS idx_campaigns_email ON campaigns(user_email);

-- 11. V2 边缘归因追踪短链表（复刻 Dub 架构：/r/:code -> 302 跳转 + UTM 归因）
CREATE TABLE IF NOT EXISTS tracking_links (
  code TEXT PRIMARY KEY,
  campaign_id INTEGER NOT NULL,
  user_email TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'directory', -- directory | community | seo | custom
  label TEXT NOT NULL DEFAULT '',
  destination_url TEXT NOT NULL,
  clicks_count INTEGER NOT NULL DEFAULT 0,
  conversions_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_links_campaign ON tracking_links(campaign_id);
CREATE INDEX IF NOT EXISTS idx_links_email ON tracking_links(user_email);

-- 12. V2 短链实时点击明细表（记录渠道、来源、国家、UA、日期用于趋势图与排行）
CREATE TABLE IF NOT EXISTS link_clicks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL,
  campaign_id INTEGER NOT NULL,
  user_email TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'directory',
  country TEXT NOT NULL DEFAULT 'UN',
  referer TEXT NOT NULL DEFAULT '',
  device TEXT NOT NULL DEFAULT 'desktop',
  clicked_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_clicks_campaign_date ON link_clicks(campaign_id, clicked_at);
CREATE INDEX IF NOT EXISTS idx_clicks_email_date ON link_clicks(user_email, clicked_at);

-- 13. V2 转化回传明细表（由客户官网 1 行像素或回调触发：signup / purchase）
CREATE TABLE IF NOT EXISTS conversions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id INTEGER NOT NULL,
  user_email TEXT NOT NULL,
  code TEXT NOT NULL DEFAULT '',
  event_type TEXT NOT NULL DEFAULT 'signup', -- signup | purchase
  value_usd REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_conv_email_date ON conversions(user_email, created_at);


-- ============================================================================
-- V4 Growth OS 增量数据表（品牌资料库 / 买家雷达 / 外链验活 / 公开战报）
-- ============================================================================

-- 14. V4 品牌提交资料库（支持 1 账号多项目一次录入、全渠道复用）
CREATE TABLE IF NOT EXISTS brand_kits (
  campaign_id INTEGER PRIMARY KEY,
  user_email TEXT NOT NULL,
  logo_url TEXT NOT NULL DEFAULT '',
  screenshots_json TEXT NOT NULL DEFAULT '[]',
  short_tagline TEXT NOT NULL DEFAULT '',
  medium_pitch TEXT NOT NULL DEFAULT '',
  long_description TEXT NOT NULL DEFAULT '',
  pricing_model TEXT NOT NULL DEFAULT 'freemium',
  categories_json TEXT NOT NULL DEFAULT '[]',
  competitors_json TEXT NOT NULL DEFAULT '[]',
  founder_name TEXT NOT NULL DEFAULT '',
  founder_x TEXT NOT NULL DEFAULT '',
  completeness_score INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_brand_kits_email ON brand_kits(user_email);

-- 15. V4 买家雷达自定义监听规则（布尔关键词 / 竞品词 / 排除词 / Webhook）
CREATE TABLE IF NOT EXISTS radar_monitors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id INTEGER NOT NULL UNIQUE,
  user_email TEXT NOT NULL,
  keywords_json TEXT NOT NULL DEFAULT '[]',
  competitors_json TEXT NOT NULL DEFAULT '[]',
  exclude_words_json TEXT NOT NULL DEFAULT '[]',
  sources_json TEXT NOT NULL DEFAULT '["hn","github","devto"]',
  webhook_url TEXT NOT NULL DEFAULT '',
  daily_digest_enabled INTEGER NOT NULL DEFAULT 1,
  last_scanned_at TEXT DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_radar_monitors_email ON radar_monitors(user_email);

-- 16. V4 客户级实时买家线索池与 CRM 状态机
CREATE TABLE IF NOT EXISTS radar_leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id INTEGER NOT NULL,
  user_email TEXT NOT NULL,
  external_id TEXT NOT NULL,
  source TEXT NOT NULL,
  community TEXT NOT NULL,
  author TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  url TEXT NOT NULL,
  intent_type TEXT NOT NULL DEFAULT 'pain', -- alternative | pain | buying
  intent_score INTEGER NOT NULL DEFAULT 86,
  status TEXT NOT NULL DEFAULT 'new', -- new | drafted | replied | won | dismissed
  draft_reply TEXT NOT NULL DEFAULT '',
  posted_at TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(campaign_id, external_id)
);
CREATE INDEX IF NOT EXISTS idx_radar_leads_campaign ON radar_leads(campaign_id, status);

-- 17. V4 目录选站审批、排期波次、截图凭证与外链自动验活状态
CREATE TABLE IF NOT EXISTS directory_health_checks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_email TEXT NOT NULL,
  campaign_id INTEGER NOT NULL DEFAULT 0,
  directory_id TEXT NOT NULL,
  moderation_state TEXT NOT NULL DEFAULT 'approved', -- approved | skipped | priority
  scheduled_wave INTEGER NOT NULL DEFAULT 1, -- 1=Week1 | 2=Week2 | 3=Week3
  proof_screenshot_url TEXT NOT NULL DEFAULT '',
  last_http_status INTEGER NOT NULL DEFAULT 0,
  is_dofollow_verified INTEGER NOT NULL DEFAULT 0,
  last_checked_at TEXT DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(customer_email, campaign_id, directory_id)
);
CREATE INDEX IF NOT EXISTS idx_dir_health_email ON directory_health_checks(customer_email);

-- 18. V4 公开只读增长战报分享表
CREATE TABLE IF NOT EXISTS public_reports (
  share_id TEXT PRIMARY KEY,
  campaign_id INTEGER NOT NULL UNIQUE,
  user_email TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  show_revenue INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_public_reports_email ON public_reports(user_email);
