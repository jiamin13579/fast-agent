#!/bin/bash
set -e

trap 'kill 0 2>/dev/null; playwright-cli kill-all 2>/dev/null; exit' SIGINT SIGTERM

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
while [ ! -f "$SCRIPT_DIR/CLAUDE.md" ] && [ "$SCRIPT_DIR" != "/" ]; do
  SCRIPT_DIR="$(dirname "$SCRIPT_DIR")"
done

# prerequisite check
command -v mvn >/dev/null 2>&1 || { echo "Missing: mvn (Java/Maven)"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "Missing: npm"; exit 1; }
if ! command -v playwright-cli >/dev/null 2>&1; then
  echo "playwright-cli not found globally, trying npx..."
  if ! npx playwright-cli --version >/dev/null 2>&1; then
    echo "playwright-cli not available. Install: npm install -g @playwright/cli"
    exit 1
  fi
  PLAYWRIGHT="npx playwright-cli"
else
  PLAYWRIGHT="playwright-cli"
fi

echo "=== Killing existing processes ==="
lsof -ti:8080 -ti:3000 -ti:3001 2>/dev/null | xargs kill -9 2>/dev/null || true
$PLAYWRIGHT kill-all 2>/dev/null || true
sleep 1

# check & install frontend dependencies
for dir in user-frontend admin-frontend; do
  if [ ! -d "$SCRIPT_DIR/$dir/node_modules" ]; then
    echo "=== Installing $dir dependencies ==="
    (cd "$SCRIPT_DIR/$dir" && npm install)
  fi
done

echo "=== Starting Backend (port 8080) ==="
(cd "$SCRIPT_DIR/backend" && nohup mvn spring-boot:run -q > /tmp/backend.log 2>&1) &
BACKEND_PID=$!

echo "=== Starting user-frontend (port 3000) ==="
(cd "$SCRIPT_DIR/user-frontend" && nohup npm run dev > /tmp/user-frontend.log 2>&1) &
USER_PID=$!

echo "=== Starting admin-frontend (port 3001) ==="
(cd "$SCRIPT_DIR/admin-frontend" && nohup npm run dev -- -p 3001 > /tmp/admin-frontend.log 2>&1) &
ADMIN_PID=$!

echo "Waiting for backend..."
for i in $(seq 1 120); do
  curl -s -o /dev/null -w "%{http_code}" http://localhost:8080 2>/dev/null | grep -q "200\|302\|401\|403\|404" && { echo "Backend READY"; break; }
  sleep 2
done

echo "Waiting for frontends..."
for i in $(seq 1 30); do
  curl -s -o /dev/null -w "%{http_code}" -L http://localhost:3000 2>/dev/null | grep -q "200" && { echo "user-frontend READY"; break; }
  sleep 2
done
for i in $(seq 1 30); do
  curl -s -o /dev/null -w "%{http_code}" -L http://localhost:3001 2>/dev/null | grep -q "200" && { echo "admin-frontend READY"; break; }
  sleep 2
done

echo "=== Opening Playwright browsers ==="
$PLAYWRIGHT -s=user-browser open http://localhost:3000 --headed
$PLAYWRIGHT -s=admin-browser open http://localhost:3001 --headed

echo ""
echo "============================================"
echo "  Test Environment Ready"
echo "============================================"
echo "  Backend:       http://localhost:8080"
echo "  User Frontend: http://localhost:3000 (user-browser)"
echo "  Admin Frontend: http://localhost:3001 (admin-browser)"
echo ""
echo "  Accounts:"
echo "    User:  admin@fast.com / 123456"
echo "    Admin: admin / 123456"
echo ""
echo "  Test commands:"
echo "    $PLAYWRIGHT -s=user-browser console error"
echo "    $PLAYWRIGHT -s=admin-browser console error"
echo "    $PLAYWRIGHT -s=admin-browser snapshot --depth=4"
echo "============================================"
echo ""
echo "Press Ctrl+C to stop all services"

wait
