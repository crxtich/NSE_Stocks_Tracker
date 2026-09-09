-- 002_latest_price_snapshots_view.sql
--
-- One row per ticker: its most recent price snapshot. Lets a single REST
-- call return "current market state" instead of requiring the caller to
-- fetch the whole price_snapshots history and deduplicate client-side.
-- Exposed automatically by PostgREST alongside the base tables, under the
-- same public-read RLS policy as price_snapshots (security_invoker ensures
-- the view is subject to the querying role's RLS, not the view owner's).

CREATE OR REPLACE VIEW latest_price_snapshots
WITH (security_invoker = true) AS
SELECT DISTINCT ON (ticker) *
FROM price_snapshots
ORDER BY ticker, scraped_at DESC;

GRANT SELECT ON latest_price_snapshots TO anon, authenticated;
