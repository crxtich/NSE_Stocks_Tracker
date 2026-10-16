'use strict'

// In-memory limits on the newsletter signup, which sends an email to whatever
// address is typed in. Without them anyone could script the form to flood a
// stranger's inbox in our name and burn the Resend quota.
//   - per address: one confirmation email every 10 minutes
//   - per visitor IP: 5 signups an hour (only when nginx passes the real IP)
//   - overall: 60 confirmation emails an hour
// Kept in memory on purpose: a restart resets them, which is fine at this size.

const HOUR = 60 * 60 * 1000

function windowCounter(max, windowMs) {
  const hits = new Map()
  return {
    allow(key) {
      const now = Date.now()
      const recent = (hits.get(key) || []).filter((t) => now - t < windowMs)
      if (recent.length >= max) {
        hits.set(key, recent)
        return false
      }
      recent.push(now)
      hits.set(key, recent)
      if (hits.size > 10_000) hits.clear() // never grow without bound
      return true
    },
  }
}

const perEmail = windowCounter(1, 10 * 60 * 1000)
const perIp = windowCounter(5, HOUR)
const overall = windowCounter(60, HOUR)

const isLoopback = (ip) => !ip || ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1'

// 'ip' = too many from this visitor, 'busy' = overall cap, 'email' = sent to
// this address moments ago (the caller answers as if it had sent), null = go.
function signupBlock(ip, email) {
  if (!isLoopback(ip) && !perIp.allow(ip)) return 'ip'
  if (!perEmail.allow(email)) return 'email'
  if (!overall.allow('all')) return 'busy'
  return null
}

module.exports = { signupBlock, windowCounter }
