'use strict'

// Boundary validation: every value below arrives from a public HTTP query
// string, so nothing is trusted until it has been through here.

const MAX_HISTORY_DAYS = 3650
const DEFAULT_HISTORY_DAYS = 30

function parseDays(raw) {
  if (raw === undefined || raw === null || raw === '') return DEFAULT_HISTORY_DAYS
  const n = Number(raw)
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1 || n > MAX_HISTORY_DAYS) {
    throw new ValidationError(`"days" must be a whole number between 1 and ${MAX_HISTORY_DAYS}.`)
  }
  return n
}

function parseIsoDate(raw, field) {
  if (raw === undefined || raw === null || raw === '') return null
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) {
    throw new ValidationError(`"${field}" must be an ISO 8601 date.`)
  }
  return d.toISOString()
}

// Deliberately permissive but bounded — real validation is the confirmation
// email; this only rejects input that could not possibly be an address.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function parseEmail(raw) {
  if (typeof raw !== 'string') throw new ValidationError('An email address is required.')
  const email = raw.trim().toLowerCase()
  if (email.length > 254 || !EMAIL_RE.test(email)) {
    throw new ValidationError('That does not look like a valid email address.')
  }
  return email
}

class ValidationError extends Error {
  constructor(message) {
    super(message)
    this.name = 'ValidationError'
    this.statusCode = 400
  }
}

module.exports = { parseDays, parseIsoDate, parseEmail, ValidationError, MAX_HISTORY_DAYS }
