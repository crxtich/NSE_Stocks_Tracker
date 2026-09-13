'use strict'
const express = require('express')
const routes = require('./routes')
const { pool } = require('./db')

const app = express()
const PORT = Number(process.env.PORT) || 3015

app.disable('x-powered-by')
app.use(express.json({ limit: '8kb' }))
app.use('/', routes)

// Bound to loopback only — nginx is the sole public entry point.
const server = app.listen(PORT, '127.0.0.1', () => {
  console.log(`[nse-api] listening on 127.0.0.1:${PORT}`)
})

function shutdown(signal) {
  console.log(`[nse-api] ${signal} received, shutting down`)
  server.close(() => pool.end().then(() => process.exit(0)))
  setTimeout(() => process.exit(1), 10_000).unref()
}
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
