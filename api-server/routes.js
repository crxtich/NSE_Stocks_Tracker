'use strict'
const crypto = require('crypto')
const express = require('express')
const { query } = require('./db')
const { parseDays, parseIsoDate, parseEmail, ValidationError } = require('./validate')
const { wrapEmailHtml, sendEmail, SITE_URL } = require('./email')

const router = express.Router()

// Paging guard so a "whole history" export can never run away.
const EXPORT_PAGE_LIMIT = 100_000

const SNAPSHOT_COLUMNS =
  'id, ticker, company_name, price::float8 AS price, change_ksh::float8 AS change_ksh, ' +
  'change_pct::float8 AS change_pct, volume, scraped_at'

function wrap(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res)).catch(next)
}

function statusRedirect(res, status) {
  res.redirect(302, `${SITE_URL}/#/subscription-status?status=${status}`)
}

router.get('/health', wrap(async (_req, res) => {
  const { rows } = await query('SELECT MAX(scraped_at) AS last_scrape FROM price_snapshots')
  res.json({ status: 'ok', last_scrape: rows[0]?.last_scrape ?? null })
}))

router.get('/watchlist', wrap(async (_req, res) => {
  const { rows } = await query(
    'SELECT ticker, company_name, added_at FROM watchlist ORDER BY ticker',
  )
  res.json(rows)
}))

router.get('/history', wrap(async (req, res) => {
  const days = parseDays(req.query.days)
  const { rows } = await query(
    `SELECT ${SNAPSHOT_COLUMNS} FROM price_snapshots
     WHERE scraped_at >= NOW() - ($1::int * INTERVAL '1 day')
     ORDER BY scraped_at ASC`,
    [days],
  )
  res.json(rows)
}))

router.get('/snapshots', wrap(async (req, res) => {
  const from = parseIsoDate(req.query.from, 'from')
  const to = parseIsoDate(req.query.to, 'to')
  const { rows } = await query(
    `SELECT ${SNAPSHOT_COLUMNS} FROM price_snapshots
     WHERE ($1::timestamptz IS NULL OR scraped_at >= $1)
       AND ($2::timestamptz IS NULL OR scraped_at <= $2)
     ORDER BY scraped_at ASC
     LIMIT ${EXPORT_PAGE_LIMIT}`,
    [from, to],
  )
  res.json(rows)
}))

router.get('/subscriber-count', wrap(async (_req, res) => {
  const { rows } = await query('SELECT count FROM newsletter_subscriber_count')
  res.json({ count: rows[0]?.count ?? 0 })
}))

router.post('/subscribe', wrap(async (req, res) => {
  // Honeypot: a form field real visitors never see or fill (see
  // SubscribeForm.tsx). A bot that fills every field trips this — pretend
  // success without touching the database, so it isn't tipped off.
  if (typeof req.body?.company === 'string' && req.body.company.trim() !== '') {
    return res.json({ status: 'ok', message: 'Check your inbox to confirm your subscription.' })
  }

  const email = parseEmail(req.body?.email)

  const { rows: existingRows } = await query(
    'SELECT id, confirmed FROM newsletter_subscribers WHERE email = $1',
    [email],
  )
  const existing = existingRows[0]

  if (existing?.confirmed) {
    return res.json({ status: 'ok', message: "You're already subscribed — thanks!" })
  }

  const confirmToken = crypto.randomBytes(32).toString('hex')

  if (existing) {
    await query('UPDATE newsletter_subscribers SET confirm_token = $1 WHERE id = $2', [
      confirmToken,
      existing.id,
    ])
  } else {
    const unsubscribeToken = crypto.randomBytes(32).toString('hex')
    await query(
      `INSERT INTO newsletter_subscribers (email, confirm_token, unsubscribe_token)
       VALUES ($1, $2, $3)`,
      [email, confirmToken, unsubscribeToken],
    )
  }

  const confirmUrl = `${SITE_URL}/api/confirm-subscription?token=${confirmToken}`
  await sendEmail(
    email,
    'Confirm your subscription — NSE Market Intelligence',
    wrapEmailHtml(`
      <p>One more step — confirm you'd like occasional updates on stocks I'm watching, what I've bought this week, and things I've learned building this tracker.</p>
      <p style="text-align:center;margin:28px 0;">
        <a href="${confirmUrl}" style="display:inline-block;background:#F0A93A;color:#0B0D10;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;">Confirm subscription</a>
      </p>
      <p style="color:#565E6B;font-size:13px;">Didn't request this? Just ignore this email — you won't be subscribed unless you click the button above.</p>
    `),
  )

  res.json({ status: 'ok', message: 'Check your inbox to confirm your subscription.' })
}))

router.get('/confirm-subscription', wrap(async (req, res) => {
  const token = typeof req.query.token === 'string' ? req.query.token : ''
  if (!token) return statusRedirect(res, 'missing-token')

  const { rows } = await query(
    `UPDATE newsletter_subscribers
     SET confirmed = true, confirmed_at = now()
     WHERE confirm_token = $1 AND confirmed = false
     RETURNING email, unsubscribe_token`,
    [token],
  )
  const subscriber = rows[0]
  if (!subscriber) return statusRedirect(res, 'invalid-token')

  const unsubscribeUrl = `${SITE_URL}/api/unsubscribe?token=${subscriber.unsubscribe_token}`
  await sendEmail(
    subscriber.email,
    "You're subscribed! — NSE Market Intelligence",
    wrapEmailHtml(
      `<p>You're all set. You'll get occasional emails on stocks I'm watching, what I've bought, and things I've learned building this tracker — never on a fixed schedule.</p>`,
      unsubscribeUrl,
    ),
  ).catch((err) => console.error('[nse-api] welcome email failed:', err.message))

  const ownerEmail = process.env.OWNER_NOTIFICATION_EMAIL
  if (ownerEmail) {
    await sendEmail(
      ownerEmail,
      'New newsletter subscriber',
      wrapEmailHtml(`<p>${subscriber.email} just confirmed their subscription.</p>`),
    ).catch((err) => console.error('[nse-api] owner notification failed:', err.message))
  }

  statusRedirect(res, 'confirmed')
}))

router.get('/unsubscribe', wrap(async (req, res) => {
  const token = typeof req.query.token === 'string' ? req.query.token : ''
  if (!token) return statusRedirect(res, 'missing-unsub-token')

  const { rowCount } = await query(
    'DELETE FROM newsletter_subscribers WHERE unsubscribe_token = $1',
    [token],
  )
  statusRedirect(res, rowCount > 0 ? 'unsubscribed' : 'already-unsubscribed')
}))

// Manual broadcast to every confirmed subscriber — ported from the old
// send-newsletter Edge Function. No admin UI; invoke directly:
//   curl -X POST https://nse-tracker.dukaribu.com/api/send-newsletter \
//     -H "x-admin-secret: <NEWSLETTER_ADMIN_SECRET>" -H 'Content-Type: application/json' \
//     -d '{"subject": "...", "html": "..."}'
router.post('/send-newsletter', wrap(async (req, res) => {
  const adminSecret = process.env.NEWSLETTER_ADMIN_SECRET
  if (!adminSecret) {
    return res.status(503).json({ status: 'error', message: 'NEWSLETTER_ADMIN_SECRET is not configured.' })
  }
  const provided = req.get('x-admin-secret') || ''
  const a = Buffer.from(provided)
  const b = Buffer.from(adminSecret)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ status: 'error', message: 'Invalid admin secret.' })
  }

  const { subject, html } = req.body ?? {}
  if (typeof subject !== 'string' || !subject.trim() || typeof html !== 'string' || !html.trim()) {
    return res.status(400).json({ status: 'error', message: '"subject" and "html" are both required.' })
  }

  const { rows: subscribers } = await query(
    'SELECT email, unsubscribe_token FROM newsletter_subscribers WHERE confirmed = true',
  )

  let sent = 0
  const failed = []
  for (const sub of subscribers) {
    const unsubscribeUrl = `${SITE_URL}/api/unsubscribe?token=${sub.unsubscribe_token}`
    try {
      await sendEmail(sub.email, subject, wrapEmailHtml(html, unsubscribeUrl))
      sent += 1
    } catch (err) {
      failed.push({ email: sub.email, error: err.message })
    }
  }

  res.json({ status: 'ok', sent, failed_count: failed.length, failed })
}))

router.use((_req, res) => res.status(404).json({ status: 'error', message: 'Unknown endpoint.' }))

// eslint-disable-next-line no-unused-vars
router.use((err, _req, res, _next) => {
  if (err instanceof ValidationError) {
    return res.status(err.statusCode).json({ status: 'error', message: err.message })
  }
  console.error('[nse-api] unhandled error:', err)
  // Detail stays in the server log; the client gets nothing exploitable.
  res.status(500).json({ status: 'error', message: 'Something went wrong on our end.' })
})

module.exports = router
