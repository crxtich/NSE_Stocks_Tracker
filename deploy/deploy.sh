#!/bin/bash
# Push-to-deploy for nse-tracker.dukaribu.com
#
# Modelled on the assessment.eoc.co.ke deploy, adapted for Box A. Runs wholly
# as www-data (no sudo), builds a complete release BEFORE touching anything
# live, and rolls back automatically if the new release fails its health check.
#
# Box A has ~900 MB of RAM and eleven other live sites on it, so unlike the EOC
# box this script refuses to start a build when memory is short, and caps the
# Node heap. A refused deploy leaves the live site exactly as it was.
#
# Usage: deploy.sh [--reason "<text>"]

set -uo pipefail

BRANCH="${DEPLOY_BRANCH:-main}"
ROOT="/var/www/nse-tracker"
SRC="$ROOT/src"
LIVE="$ROOT/dist"
API="$ROOT/api"
RELEASES="$ROOT/releases"
BACKUPS="$ROOT/backups"
LOG="$ROOT/logs/deploy.log"
LOCK="$ROOT/.deploy.lock"
STATUS_FILE="$ROOT/.last_deploy_status"
HEALTH_URL="http://127.0.0.1:3015/health"
PM2_APP="nse-tracker-api"
KEEP_RELEASES=3
MIN_FREE_MB=250          # refuse to build below this (available + free swap)
NODE_HEAP_MB=512

REASON="manual"
[ "${1:-}" = "--reason" ] && REASON="${2:-manual}"

mkdir -p "$RELEASES" "$BACKUPS" "$(dirname "$LOG")"

log() { echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] $*" | tee -a "$LOG"; }
notify() { command -v logger >/dev/null 2>&1 && logger -t nse-deploy "$*" || true; }
fail() {
  log "DEPLOY FAILED: $*"
  notify "FAILED: $* (see $LOG)"
  echo "FAILED $(date -u '+%Y-%m-%dT%H:%M:%SZ') $*" > "$STATUS_FILE" 2>/dev/null || true
  exit 1
}

# Serialise: a second push mid-deploy must not interleave. A lock that cannot
# even be created is a real failure - never let it masquerade as "busy".
if ! exec 9>"$LOCK"; then
  log "cannot create lock file $LOCK - check ownership of $ROOT"
  notify "FAILED: cannot create $LOCK"
  exit 1
fi
if ! flock -n 9; then
  log "another deploy is in progress; skipping (reason: $REASON)"
  exit 0
fi

STAMP="$(date -u '+%Y%m%d-%H%M%S')"
log "=== deploy start (branch=$BRANCH reason=$REASON stamp=$STAMP) ==="

command -v node >/dev/null 2>&1 || fail "node not on PATH"
log "node $(node -v), npm $(npm -v)"

# --- 0. memory pre-flight --------------------------------------------------
AVAIL_MB=$(free -m | awk '/^Mem:/{print $7}')
SWAP_FREE_MB=$(free -m | awk '/^Swap:/{print $4}')
TOTAL_MB=$((AVAIL_MB + SWAP_FREE_MB))
log "memory: ${AVAIL_MB}MB available + ${SWAP_FREE_MB}MB swap = ${TOTAL_MB}MB"
[ "$TOTAL_MB" -ge "$MIN_FREE_MB" ] || fail "only ${TOTAL_MB}MB usable memory (need ${MIN_FREE_MB}MB) - live site untouched"

# --- 1. fetch source -------------------------------------------------------
[ -d "$SRC/.git" ] || fail "no git clone at $SRC"
cd "$SRC" || fail "cannot cd $SRC"

export GIT_SSH_COMMAND="ssh -F $ROOT/.ssh/config"
log "fetching origin/$BRANCH"
git fetch --prune origin "$BRANCH" >>"$LOG" 2>&1 || fail "git fetch failed - is the deploy key still on GitHub?"

OLD_SHA="$(git rev-parse HEAD 2>/dev/null || echo none)"
# NOTE: this destroys local edits in $SRC. Code must travel through GitHub.
git reset --hard "origin/$BRANCH" >>"$LOG" 2>&1 || fail "git reset failed"
NEW_SHA="$(git rev-parse HEAD)"
log "source now at $NEW_SHA ($(git log -1 --pretty=%s | head -c 72))"

if [ "$OLD_SHA" = "$NEW_SHA" ] && [ "${FORCE_DEPLOY:-0}" != "1" ]; then
  log "already at $NEW_SHA; nothing to deploy (use FORCE_DEPLOY=1 to override)"
  log "=== deploy end (no-op) ==="
  exit 0
fi

# --- 2. build the frontend out-of-place ------------------------------------
REL="$RELEASES/$STAMP"
log "staging release at $REL"
rm -rf "$REL"; mkdir -p "$REL"
tar -C "$SRC" --exclude=.git --exclude=node_modules --exclude=dist -cf - . | tar -C "$REL" -xf - \
  || fail "copy to release dir failed"

cd "$REL" || fail "cannot cd $REL"
log "installing frontend dependencies"
npm ci --no-audit --no-fund >>"$LOG" 2>&1 || npm install --no-audit --no-fund >>"$LOG" 2>&1 \
  || fail "dependency install failed - live site untouched"

log "building frontend (heap capped at ${NODE_HEAP_MB}MB)"
NODE_OPTIONS="--max-old-space-size=$NODE_HEAP_MB" nice -n 10 npx vite build >>"$LOG" 2>&1 \
  || fail "vite build failed - live site untouched"
[ -s "$REL/dist/index.html" ] || fail "build produced no dist/index.html - live site untouched"
log "build ok ($(du -sh "$REL/dist" | cut -f1))"

# --- 3. back up the database before swapping -------------------------------
[ -f "$API/.env" ] || fail "missing $API/.env - refusing to deploy"
set -a; . "$API/.env"; set +a
[ -n "${DATABASE_URL:-}" ] || fail "DATABASE_URL not set - refusing to deploy without a backup"
command -v pg_dump >/dev/null 2>&1 || fail "pg_dump not found - refusing to deploy without a backup"
pg_dump "$DATABASE_URL" 2>/dev/null | gzip > "$BACKUPS/db-$STAMP.sql.gz"
if [ -s "$BACKUPS/db-$STAMP.sql.gz" ]; then
  log "db backup: $BACKUPS/db-$STAMP.sql.gz ($(du -h "$BACKUPS/db-$STAMP.sql.gz" | cut -f1))"
else
  rm -f "$BACKUPS/db-$STAMP.sql.gz"
  fail "database backup was empty - refusing to deploy"
fi

# --- 4. update the API in place, then swap the frontend --------------------
# The API is small and its deps rarely change; reinstall only when they do.
if ! diff -q "$REL/api-server/package.json" "$API/package.json" >/dev/null 2>&1; then
  log "api dependencies changed - reinstalling"
  cp "$REL/api-server/package.json" "$API/package.json"
  (cd "$API" && npm install --omit=dev --no-audit --no-fund >>"$LOG" 2>&1) \
    || fail "api dependency install failed"
fi
for f in server.js routes.js db.js validate.js scrape.js email.js; do
  [ -f "$REL/api-server/$f" ] && cp "$REL/api-server/$f" "$API/$f"
done
log "api sources updated"

PREV="$RELEASES/prev-$STAMP"
log "swapping frontend into $LIVE"
mv "$LIVE" "$PREV" || fail "could not move live dist aside"
if ! mv "$REL/dist" "$LIVE"; then
  mv "$PREV" "$LIVE"
  fail "could not move new dist into place; live dist restored"
fi
chmod -R a+rX "$LIVE" 2>/dev/null || true

# --- 5. restart and health check -------------------------------------------
log "restarting $PM2_APP"
pm2 restart "$PM2_APP" --update-env >>"$LOG" 2>&1 || log "WARN: pm2 restart returned nonzero"
pm2 save >>"$LOG" 2>&1 || true

HEALTHY=0
for _ in $(seq 1 15); do
  sleep 1
  if curl -fsS --max-time 5 "$HEALTH_URL" >/dev/null 2>&1; then HEALTHY=1; break; fi
done

if [ "$HEALTHY" != "1" ]; then
  log "HEALTH CHECK FAILED - rolling back"
  mv "$LIVE" "$RELEASES/failed-$STAMP"
  mv "$PREV" "$LIVE"
  pm2 restart "$PM2_APP" --update-env >>"$LOG" 2>&1
  pm2 save >>"$LOG" 2>&1 || true
  sleep 3
  if curl -fsS --max-time 5 "$HEALTH_URL" >/dev/null 2>&1; then
    log "ROLLED BACK; failed build kept at $RELEASES/failed-$STAMP"
    notify "ROLLED BACK: new release failed health check"
    echo "ROLLED_BACK $(date -u '+%Y-%m-%dT%H:%M:%SZ')" > "$STATUS_FILE" 2>/dev/null || true
  else
    log "CRITICAL: rollback did not restore health"
    notify "CRITICAL: rollback did not restore health - site may be down"
    echo "CRITICAL $(date -u '+%Y-%m-%dT%H:%M:%SZ')" > "$STATUS_FILE" 2>/dev/null || true
  fi
  exit 1
fi

# The page itself must also serve, not just the API.
curl -fsS --max-time 5 -H "Host: nse-tracker.dukaribu.com" http://127.0.0.1/ >/dev/null 2>&1 \
  || log "WARN: page check via nginx did not return 200"

log "health check ok; deployed $NEW_SHA"

# --- 6. prune --------------------------------------------------------------
rm -rf "$REL"
cd "$RELEASES" || exit 0
ls -1dt prev-* 2>/dev/null | tail -n +$((KEEP_RELEASES + 1)) | while read -r old; do
  log "pruning $old"; rm -rf "$old"
done
ls -1dt "$BACKUPS"/db-*.sql.gz 2>/dev/null | tail -n +11 | while read -r old; do rm -f "$old"; done

echo "OK $(date -u '+%Y-%m-%dT%H:%M:%SZ') deployed $NEW_SHA" > "$STATUS_FILE" 2>/dev/null || true
notify "ok: deployed $NEW_SHA"
log "=== deploy end (ok) ==="
