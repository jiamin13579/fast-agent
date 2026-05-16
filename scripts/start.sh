#!/bin/bash
set -e

trap 'kill 0; exit' SIGINT SIGTERM

echo "=== Starting Backend (port 8080) ==="
(cd backend && mvn spring-boot-run -q) &
BACKEND_PID=$!

sleep 3

echo "=== Starting user-frontend (port 3000) ==="
(cd user-frontend && npm run dev) &
USER_PID=$!

echo "=== Starting admin-frontend (port 3001) ==="
(cd admin-frontend && npm run dev -- -p 3001) &
ADMIN_PID=$!

echo ""
echo "All services started:"
echo "  Backend:       http://localhost:8080"
echo "  User Frontend: http://localhost:3000"
echo "  Admin Frontend: http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop all services"

wait
