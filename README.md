# NSE Market Intelligence

A public dashboard that tracks live share prices on the Nairobi Securities Exchange (NSE),
keeps a running history of every price it sees, and turns that history into plain-English
quantitative signals — momentum, trend, stability, and a single composite score per stock —
without relying on news, analyst opinions, or company fundamentals. It's built to be read by
anyone, not just finance professionals.

**Live site:** [nse-tracker.dukaribu.com](https://nse-tracker.dukaribu.com/)

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Data source | `live.mystocks.co.ke/m/pricelist` | A publicly available NSE price list, scraped on a schedule. |
| Scraper | `api-server/scrape.js`, run from cron | A plain Node script, close to the database it writes to. |
| Database | Self-hosted PostgreSQL | Runs on the same box as the API — no managed service, no network hop. |
| API | Express (`api-server/`) | A small read-only REST API plus the newsletter subscribe/confirm/unsubscribe flow. |
| Frontend | React + Vite + TypeScript | Fast dev loop, small production bundle, fully static output. |
| Charts | Recharts | Lightweight, composable charting built on SVG. |
| Styling | Tailwind CSS | Utility-first styling that keeps the dark, data-dense design consistent. |
| Hosting | Self-hosted (nginx + PM2) | Static frontend served by nginx; the API runs under PM2 on the same server. |
| CI/CD | Push-to-deploy webhook | A GitHub push fires a signed webhook that builds and swaps in the new release — see "Deploying" below. |

## What's on the site

- **Market Overview** — every tracked stock's live price, session change, and volume, sortable, with today's top 5 gainers and losers.
- **Top 10 Picks** — the ten highest-scoring stocks by the quantitative Market Signal Score, with a plain-English explanation of the methodology.
- **Stock Detail** — price and volume history charts with a 20-day moving average overlay, plus every underlying metric explained in plain language.
- **My Watchlist** — the same analysis applied to a fixed set of 29 tracked companies.

Every score on the site is a mathematical signal derived from price and volume data — never a
buy or sell recommendation. See the disclaimer on every analysis page.

## Local development

The frontend needs no environment variables — it talks to the API at a relative `/api/` path
(`vite.config.ts` proxies that to `http://127.0.0.1:3015` in dev, matching nginx in production).

```bash
npm install
npm run dev
```

To run the API locally too:

```bash
cd api-server
npm install
cp ../.env.example .env   # fill in DATABASE_URL at minimum
npm start
```

## Deploying

`main` is the deploy branch. Push to it and the site updates itself:

```
git push origin main      # -> GitHub webhook -> server -> build -> swap -> health check
```

### What happens on a push

GitHub POSTs to `https://nse-tracker.dukaribu.com/_deploy`. A loopback listener
(`deploy/webhook-listener.mjs`, running as `www-data`) verifies the HMAC signature and
spawns `deploy/deploy.sh`, which:

1. refuses to start if the server has under 250 MB of usable memory
2. `git fetch` + `git reset --hard origin/main`
3. builds the frontend into `releases/<stamp>/` with the Node heap capped
4. `pg_dump`s the database to `backups/` and aborts if the dump is empty
5. copies `api-server/*` into the live API directory (reinstalling deps only if `package.json` changed)
6. swaps the new `dist/` into place, keeping the old one
7. restarts the API under PM2 and health-checks `127.0.0.1:3015/health`
8. **rolls back automatically** if that check fails

Any failure before step 6 leaves the live site completely untouched.

### Gotchas

- **`deploy.sh` destroys local edits in the server's checkout.** All code must travel through
  GitHub; there is no way to deploy a server-local change.
- **A push made from the server itself may not fire the webhook.** Run
  `FORCE_DEPLOY=1 deploy/deploy.sh` by hand in that case.
- **The script no-ops when HEAD already equals `origin/main`.** Same fix: `FORCE_DEPLOY=1`.
- `.env` files are gitignored and live only on the server.

### Checking a deploy

```
cat .last_deploy_status
tail -40 logs/deploy.log
tail -20 logs/webhook.log
journalctl -t nse-deploy -n 20
```

## Email updates

The site has a "Get occasional updates" subscribe form (Market Overview page) for personal
notes — stocks being watched, what's been bought, things learned building the tracker.
Subscribers live in the `newsletter_subscribers` table, and email sending goes through
[Resend](https://resend.com)'s free tier via `api-server/email.js`.

**One-time setup**, in `api-server/.env` on the server (see `.env.example`):

```bash
RESEND_API_KEY=re_your_resend_api_key
NEWSLETTER_ADMIN_SECRET=some-long-random-string-only-you-know
SITE_URL=https://nse-tracker.dukaribu.com
# Optional, once a custom domain is verified in the Resend dashboard —
# otherwise emails send from Resend's shared onboarding@resend.dev sandbox sender.
RESEND_FROM_EMAIL="NSE Market Intelligence <updates@yourdomain.com>"
# Optional — a one-line email whenever someone confirms a subscription.
OWNER_NOTIFICATION_EMAIL=you@yourdomain.com
```

Five routes in `api-server/routes.js` handle the flow:

| Route | Trigger | What it does |
|---|---|---|
| `POST /api/subscribe` | Fetch from the site's form | Validates the email (and checks a honeypot field), stores it unconfirmed, sends a confirmation email |
| `GET /api/confirm-subscription` | Link click, from the confirmation email | Marks the subscriber confirmed, sends a welcome email |
| `GET /api/unsubscribe` | Link click, in every update email's footer | Removes the subscriber |
| `POST /api/send-newsletter` | Manual — see below | Broadcasts an update to every confirmed subscriber |
| `GET /api/subscriber-count` | Loaded by the subscribe form | Public count of confirmed subscribers only |

There's no admin UI for sending an update — invoke the endpoint directly whenever there's
something worth sharing:

```bash
curl -X POST 'https://nse-tracker.dukaribu.com/api/send-newsletter' \
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

The API is public and read-only — no scraping or headless browser needed to get the underlying
data out:

```
# Every tracked stock's price history for the last N days (default 30)
GET https://nse-tracker.dukaribu.com/api/history?days=30

# Every snapshot in an arbitrary date range (both bounds optional)
GET https://nse-tracker.dukaribu.com/api/snapshots?from=2026-01-01&to=2026-02-01

# The tracked-company watchlist
GET https://nse-tracker.dukaribu.com/api/watchlist
```

`days` must be a whole number between 1 and 3650; date bounds are ISO 8601.

## Disclaimer

This project is for informational purposes only. Nothing on this site constitutes financial
advice. All analysis is derived purely from historical price and trading-volume data and is not
a recommendation to buy or sell any security.

## Author

Built by [Collins Rotich](https://www.linkedin.com/in/crotich/).
