# NSE Market Intelligence

A public dashboard that tracks live share prices on the Nairobi Securities Exchange (NSE),
keeps a running history of every price it sees, and turns that history into plain-English
quantitative signals — momentum, trend, stability, and a single composite score per stock —
without relying on news, analyst opinions, or company fundamentals. It's built to be read by
anyone, not just finance professionals.

> _Add a screenshot of your deployed site here once it's live — e.g. `docs/screenshot.png`._

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Data source | `live.mystocks.co.ke/m/pricelist` | A publicly available NSE price list, scraped on a schedule. |
| Scraper | Supabase Edge Function (Deno) | Runs on a cron schedule server-side, close to the database it writes to. |
| Database | Supabase (PostgreSQL) | Managed Postgres with Row Level Security, so the public frontend can read data safely without ever writing to it. |
| Frontend | React + Vite + TypeScript | Fast dev loop, small production bundle, fully static output. |
| Charts | Recharts | Lightweight, composable charting built on SVG. |
| Styling | Tailwind CSS | Utility-first styling that keeps the dark, data-dense design consistent. |
| Hosting | GitHub Pages | Free static hosting, deployed automatically from CI. |
| CI/CD | GitHub Actions | Builds the frontend and publishes it to the `gh-pages` branch on every push to `main`. |

## What's on the site

- **Market Overview** — every tracked stock's live price, session change, and volume, sortable, with today's top 5 gainers and losers.
- **Top 10 Picks** — the ten highest-scoring stocks by the quantitative Market Signal Score, with a plain-English explanation of the methodology.
- **Stock Detail** — price and volume history charts with a 20-day moving average overlay, plus every underlying metric explained in plain language.
- **Watchlist** — the same analysis applied to a fixed set of 29 tracked companies.

Every score on the site is a mathematical signal derived from price and volume data — never a
buy or sell recommendation. See the disclaimer on every analysis page.

## Setup

### 1. Fork and clone

Fork this repository, then clone your fork locally.

### 2. Create a Supabase project

1. Create a new project at [supabase.com](https://supabase.com).
2. Open the SQL editor and run the contents of [`supabase/migrations/001_initial_schema.sql`](supabase/migrations/001_initial_schema.sql). This creates the `price_snapshots` and `watchlist` tables, enables Row Level Security with public-read/no-write policies, and seeds the watchlist.
3. Note your **Project URL** and **anon public key** (Project Settings → API) — you'll need these for the frontend. Note the **service role key** too, but treat it as a secret — it bypasses Row Level Security entirely and must never reach the frontend or a public repo.

### 3. Deploy the scraper Edge Function

With the [Supabase CLI](https://supabase.com/docs/guides/cli) installed and linked to your project:

```bash
supabase functions deploy scrape-nse
supabase secrets set SUPABASE_URL=https://your-project-ref.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. Schedule the scraper

In the Supabase Dashboard, go to **Edge Functions → scrape-nse → Cron** and schedule it to run
every 30 minutes on weekdays, e.g.:

```
*/30 8-16 * * 1-5
```

(This runs a little outside NSE trading hours too, which is fine — outside the 09:00–15:30 EAT
session the function still runs but prices will simply be flat, which is expected.)

Alternatively, use `pg_cron` + `pg_net` from the SQL editor if you prefer a database-driven
schedule instead of the Dashboard UI.

You can check the scraper is alive at any time by hitting its health check:

```
GET https://your-project-ref.supabase.co/functions/v1/scrape-nse?health=true
```

### 5. Configure the frontend locally (optional)

```bash
cp .env.example .env
# fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

The anon key is safe to expose in frontend code — the Row Level Security policies restrict it
to read-only access.

### 6. Add GitHub Secrets and deploy

In your fork's **Settings → Secrets and variables → Actions**, add:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Push to `main` — GitHub Actions will build the site and publish it to the `gh-pages` branch
automatically. Enable GitHub Pages for the repo (**Settings → Pages**) with the source set to
the `gh-pages` branch, if it isn't already.

## How it stays up to date

Once deployed, the site updates itself automatically: the Supabase cron job scrapes fresh
prices every 30 minutes during NSE trading hours (Monday–Friday, 09:00–15:30 EAT) and writes
them straight to the database. The frontend reads that data live on every page load — there's
no separate rebuild step required to see new prices.

## Disclaimer

This project is for informational purposes only. Nothing on this site constitutes financial
advice. All analysis is derived purely from historical price and trading-volume data and is not
a recommendation to buy or sell any security.
