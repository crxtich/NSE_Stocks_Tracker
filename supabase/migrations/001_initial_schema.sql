-- 001_initial_schema.sql
-- NSE Market Intelligence — initial schema
-- Run this in the Supabase SQL editor, or via `supabase db push`.

-- All price snapshots from every scrape run
CREATE TABLE IF NOT EXISTS price_snapshots (
  id            BIGSERIAL PRIMARY KEY,
  ticker        TEXT NOT NULL,
  company_name  TEXT NOT NULL,
  price         NUMERIC(12, 2) NOT NULL,
  change_ksh    NUMERIC(12, 2),      -- absolute change in KES
  change_pct    NUMERIC(8, 4),       -- % change this session
  volume        BIGINT,
  scraped_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast ticker + time queries
CREATE INDEX IF NOT EXISTS idx_snapshots_ticker_time ON price_snapshots (ticker, scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_snapshots_time ON price_snapshots (scraped_at DESC);

-- Watchlist (hardcoded at seed time — not user-editable on the public site)
CREATE TABLE IF NOT EXISTS watchlist (
  ticker        TEXT PRIMARY KEY,
  company_name  TEXT NOT NULL,
  added_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (Row Level Security) — all reads public, no writes from frontend
ALTER TABLE price_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read price_snapshots" ON price_snapshots;
DROP POLICY IF EXISTS "Public read watchlist" ON watchlist;

CREATE POLICY "Public read price_snapshots" ON price_snapshots FOR SELECT USING (true);
CREATE POLICY "Public read watchlist" ON watchlist FOR SELECT USING (true);

-- No INSERT/UPDATE/DELETE policies are defined for the anon or authenticated
-- roles, so RLS denies all writes from the frontend by default. Only the
-- service role key (used exclusively inside the scrape-nse Edge Function)
-- bypasses RLS and can write to price_snapshots.

-- Seed watchlist
INSERT INTO watchlist (ticker, company_name) VALUES
  ('BAT',  'British American Tobacco Kenya'),
  ('KUKZ', 'Kakuzi Limited'),
  ('JUB',  'Jubilee Holdings Limited'),
  ('SCBK', 'Standard Chartered Bank Limited'),
  ('EABL', 'East African Breweries Limited'),
  ('DTK',  'Diamond Trust Bank Kenya Limited'),
  ('NCBA', 'NCBA Group'),
  ('PORT', 'East African Portland Cement'),
  ('EQTY', 'Equity Group Holdings Limited'),
  ('KCB',  'KCB Group'),
  ('CRWN', 'Crown Paints Kenya Limited'),
  ('ABSA', 'Absa Bank Kenya Plc'),
  ('COOP', 'Co-operative Bank of Kenya'),
  ('SCOM', 'Safaricom Plc'),
  ('SASN', 'Sasini Tea and Coffee Limited'),
  ('NSE',  'Nairobi Securities Exchange Limited'),
  ('KPLC', 'Kenya Power and Lighting'),
  ('NMG',  'Nation Media Group'),
  ('CTUM', 'Centum Investment Company'),
  ('BRIT', 'Britam Holdings Limited'),
  ('SLAM', 'Sanlam Kenya Plc'),
  ('KPC',  'Kenya Pipeline'),
  ('UMME', 'Umeme Limited'),
  ('KQ',   'Kenya Airways Limited'),
  ('CIC',  'CIC Insurance Group Limited'),
  ('KNRE', 'Kenya Re-Insurance Corporation'),
  ('LKL',  'Longhorn Publishers Limited'),
  ('UCHM', 'Uchumi Supermarket Limited'),
  ('NBV',  'Nairobi Business Ventures')
ON CONFLICT (ticker) DO NOTHING;
