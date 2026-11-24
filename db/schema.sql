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
