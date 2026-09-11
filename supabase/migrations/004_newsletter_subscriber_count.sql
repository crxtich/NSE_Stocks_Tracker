-- 004_newsletter_subscriber_count.sql
--
-- Exposes only a subscriber count for a public "Join N subscribers" UI
-- element — never individual rows or emails. newsletter_subscribers itself
-- stays fully locked down (RLS, no policies — see 003_newsletter_subscribers.sql).
--
-- Deliberately NOT security_invoker (unlike latest_price_snapshots in
-- 002): this view runs with its owner's privileges so it can read the
-- table to compute the count, but its SELECT list is a single aggregate
-- number — there is no way for a caller to get anything else out of it,
-- so this doesn't reopen the table to the anon key.
CREATE OR REPLACE VIEW newsletter_subscriber_count AS
SELECT count(*)::int AS count
FROM newsletter_subscribers
WHERE confirmed = true;

GRANT SELECT ON newsletter_subscriber_count TO anon, authenticated;
