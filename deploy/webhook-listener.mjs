// GitHub push webhook listener for nse-tracker.dukaribu.com
//
// Binds to loopback only; nginx terminates TLS and proxies /_deploy here.
// Every request must carry a valid X-Hub-Signature-256 HMAC computed with the
// shared secret over the RAW body - an unsigned or mis-signed request is
// rejected before the payload is parsed or trusted in any way.
//
// Runs as www-data, which has no sudo. It never executes anything from the
// payload; the only action it can take is to spawn the fixed deploy script.

import http from 'http';
import crypto from 'crypto';
import { spawn } from 'child_process';
import fs from 'fs';

const PORT = Number(process.env.WEBHOOK_PORT || 9002);
const SECRET_FILE = process.env.WEBHOOK_SECRET_FILE || '/var/www/nse-tracker/.webhook_secret';
const DEPLOY_SCRIPT = '/var/www/nse-tracker/deploy/deploy.sh';
const TARGET_REF = `refs/heads/${process.env.DEPLOY_BRANCH || 'main'}`;
const MAX_BODY = 2 * 1024 * 1024;

const SECRET = fs.readFileSync(SECRET_FILE, 'utf8').trim();
if (!SECRET) {
  console.error('webhook secret is empty; refusing to start');
  process.exit(1);
}

function log(...args) {
  console.log(new Date().toISOString(), ...args);
}

// Timing-safe compare that cannot throw on length mismatch.
function signatureMatches(rawBody, provided) {
  if (typeof provided !== 'string' || !provided.startsWith('sha256=')) return false;
  const expected = 'sha256=' + crypto.createHmac('sha256', SECRET).update(rawBody).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

let deploying = false;

function runDeploy(reason) {
  if (deploying) {
    log('deploy already running; the script also holds an flock, skipping spawn');
    return;
  }
  deploying = true;
  log('spawning deploy:', reason);
  const child = spawn('/bin/bash', [DEPLOY_SCRIPT, '--reason', reason], {
    detached: true,
    stdio: 'ignore',
  });
  child.on('exit', (code) => {
    deploying = false;
    log('deploy process exited with code', code);
  });
  child.unref();
  // Safety valve: never latch `deploying` forever if the exit event is missed.
  setTimeout(() => { deploying = false; }, 15 * 60 * 1000).unref();
}

const server = http.createServer((req, res) => {
  const send = (code, msg) => {
    res.writeHead(code, { 'content-type': 'text/plain' });
    res.end(msg + '\n');
  };

  if (req.method === 'GET' && req.url === '/health') return send(200, 'webhook listener ok');
  if (req.method !== 'POST') return send(405, 'method not allowed');

  const chunks = [];
  let size = 0;
  let aborted = false;

  req.on('data', (c) => {
    size += c.length;
    if (size > MAX_BODY) {
      aborted = true;
      send(413, 'payload too large');
      req.destroy();
      return;
    }
    chunks.push(c);
  });

  req.on('end', () => {
    if (aborted) return;
    const raw = Buffer.concat(chunks);

    if (!signatureMatches(raw, req.headers['x-hub-signature-256'])) {
      log('REJECTED: bad or missing signature from', req.socket.remoteAddress);
      return send(401, 'invalid signature');
    }

    const event = req.headers['x-github-event'];
    if (event === 'ping') {
      log('ping received; webhook is wired correctly');
      return send(200, 'pong');
    }
    if (event !== 'push') {
      log('ignoring event:', event);
      return send(200, `ignored event ${event}`);
    }

    let payload;
    try {
      payload = JSON.parse(raw.toString('utf8'));
    } catch {
      return send(400, 'invalid json');
    }

    if (payload.ref !== TARGET_REF) {
      log(`ignoring push to ${payload.ref} (watching ${TARGET_REF})`);
      return send(200, `ignored ref ${payload.ref}`);
    }
    if (payload.deleted) return send(200, 'ignored deletion');

    const sha = String(payload.after || '').slice(0, 8);
    const pusher = payload.pusher?.name ?? 'unknown';
    // Reason is a single argv element to a fixed script, never a shell string.
    runDeploy(`push ${sha} by ${pusher}`);
    return send(202, `deploy queued for ${sha}`);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  log(`webhook listener on 127.0.0.1:${PORT}, watching ${TARGET_REF}`);
});
