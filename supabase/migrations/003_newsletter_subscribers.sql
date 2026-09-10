-- 003_newsletter_subscribers.sql
-- Email updates: subscriber list for occasional personal notes (stocks
-- bought this week, insights discovered, site changes) sent via Resend.

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id                BIGSERIAL PRIMARY KEY,
  email             TEXT NOT NULL UNIQUE,
  confirmed         BOOLEAN NOT NULL DEFAULT FALSE,
  confirm_token     TEXT NOT NULL,
  unsubscribe_token TEXT NOT NULL,
  subscribed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_subscribers_confirm_token ON newsletter_subscribers (confirm_token);
CREATE INDEX IF NOT EXISTS idx_subscribers_unsubscribe_token ON newsletter_subscribers (unsubscribe_token);

ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Deliberately no policies at all: unlike price_snapshots/watchlist, this
-- table holds email addresses and is never read or written directly via
-- PostgREST/the anon key. Every touchpoint (subscribing, confirming,
-- unsubscribing, sending an update) goes through an Edge Function using the
-- service role key, which does its own validation and bypasses RLS.
