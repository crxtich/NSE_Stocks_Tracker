# NSE Market Intelligence

A public dashboard that tracks live share prices on the Nairobi Securities Exchange (NSE),
keeps a running history of every price it sees, and turns that history into plain-English
quantitative signals — momentum, trend, stability, and a single composite score per stock —
without relying on news, analyst opinions, or company fundamentals. It's built to be read by
anyone, not just finance professionals.

**Live site:** [crxtich.github.io/NSE_Stocks_Tracker](https://crxtich.github.io/NSE_Stocks_Tracker/)

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
| CI/CD | GitHub Actions | Builds the frontend and deploys it straight to GitHub Pages (native Actions deployment — no separate build branch) on every push. |

## What's on the site

- **Market Overview** — every tracked stock's live price, session change, and volume, sortable, with today's top 5 gainers and losers.
- **Top 10 Picks** — the ten highest-scoring stocks by the quantitative Market Signal Score, with a plain-English explanation of the methodology.
- **Stock Detail** — price and volume history charts with a 20-day moving average overlay, plus every underlying metric explained in plain language.
- **My Watchlist** — the same analysis applied to a fixed set of 29 tracked companies.

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

In **Settings → Pages → Build and deployment → Source**, choose **GitHub Actions** (not
"Deploy from a branch" — there is no build-output branch in this setup, the workflow uploads
the built site directly). Push to your default branch — GitHub Actions will build the site and
deploy it automatically on every push, no extra branch required.

## How it stays up to date

Once deployed, the site updates itself automatically: the Supabase cron job scrapes fresh
prices every 30 minutes during NSE trading hours (Monday–Friday, 09:00–15:30 EAT) and writes
them straight to the database. The frontend reads that data live on every page load — there's
no separate rebuild step required to see new prices.

## Email updates

The site has a "Get occasional updates" subscribe form (Market Overview page) for personal
notes — stocks being watched, what's been bought, things learned building the tracker. It's
self-hosted: subscribers live in a `newsletter_subscribers` table (no RLS policies at all —
everything goes through the Edge Functions below, using the service role key), and email
sending goes through [Resend](https://resend.com)'s free tier.

**One-time setup**, as Supabase Edge Function secrets:

```bash
supabase secrets set RESEND_API_KEY=re_your_resend_api_key
supabase secrets set NEWSLETTER_ADMIN_SECRET=some-long-random-string-only-you-know
# Optional, once a custom domain is verified in the Resend dashboard —
# otherwise emails send from Resend's shared onboarding@resend.dev sandbox sender.
supabase secrets set RESEND_FROM_EMAIL="NSE Market Intelligence <updates@yourdomain.com>"
```

Four Edge Functions handle the flow:

| Function | Trigger | What it does |
|---|---|---|
| `subscribe-newsletter` | Fetch from the site's form | Validates the email, stores it unconfirmed, sends a confirmation email |
| `confirm-subscription` | Link click, from the confirmation email | Marks the subscriber confirmed |
| `unsubscribe` | Link click, in every update email's footer | Removes the subscriber |
| `send-newsletter` | Manual — see below | Broadcasts an update to every confirmed subscriber |

There's no admin UI for sending an update — invoke the function directly whenever there's
something worth sharing:

```bash
curl -X POST 'https://lvtjtxtfminipebdwaxi.supabase.co/functions/v1/send-newsletter' \
  -H 'x-admin-secret: <your NEWSLETTER_ADMIN_SECRET>' \
  -H 'Content-Type: application/json' \
  -d '{
    "subject": "This week: added EQTY to the watchlist",
    "html": "<p>Picked up a small position in EQTY this week — here'\''s why...</p>"
  }'
```

The `html` field is wrapped in the same branded template as the confirmation email, with a
working unsubscribe link appended automatically — just write the update itself.

## Reading the data programmatically

The database is a public, read-only Supabase REST API (PostgREST) — no scraping or headless
browser needed to get the underlying data out. `price_snapshots` and `watchlist` are exposed
directly, plus a `latest_price_snapshots` view (one row per ticker: its most recent snapshot)
so a single call returns current market state without dedup logic.

PostgREST normally expects the API key as an `apikey` header, which a plain link can't carry —
but Supabase's gateway also accepts it as a query parameter, so these work as plain URLs (safe
to share: this is the anon key, already public in the frontend bundle, and RLS restricts it to
read-only regardless):

```
# Current price/volume for every tracked stock, sorted by % change
https://lvtjtxtfminipebdwaxi.supabase.co/rest/v1/latest_price_snapshots?select=ticker,company_name,price,change_pct,volume,scraped_at&order=change_pct.desc&apikey=<anon key>

# The 29-ticker watchlist
https://lvtjtxtfminipebdwaxi.supabase.co/rest/v1/watchlist?select=*&apikey=<anon key>
```

(Get the current anon key from Project Settings → API in the Supabase dashboard.) Standard
PostgREST query syntax applies for filtering/sorting/paging — see the
[PostgREST docs](https://postgrest.org/en/stable/references/api/tables_views.html).

## Disclaimer

This project is for informational purposes only. Nothing on this site constitutes financial
advice. All analysis is derived purely from historical price and trading-volume data and is not
a recommendation to buy or sell any security.

## Author

Built by [Collins Rotich](https://www.linkedin.com/in/crotich/).
