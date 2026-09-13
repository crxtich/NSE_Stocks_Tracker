'use strict'
require('dotenv').config()
const { Pool } = require('pg')

if (!process.env.DATABASE_URL) {
  console.error('[nse-api] FATAL: DATABASE_URL is not set. Refusing to start.')
  process.exit(1)
}

// Small pool: this box is memory-constrained and the workload is light reads.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 4,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
})

pool.on('error', (err) => {
  // A pooled client dying in the background must never take the process down.
  console.error('[nse-api] idle client error:', err.message)
})

async function query(text, params) {
  const started = Date.now()
  try {
    return await pool.query(text, params)
  } catch (err) {
    console.error(`[nse-api] query failed after ${Date.now() - started}ms:`, err.message)
    throw err
  }
}

module.exports = { pool, query }
