#!/usr/bin/env bash
# Helper to start vite in background (uses nohup). Useful if you don't use pm2/launchd/systemd.
cd "$(dirname "$0")/.." || exit 1
nohup npm run dev > /tmp/vite.log 2>&1 &
echo $! > /tmp/vite.pid
printf "Started Vite in background (pid=$(cat /tmp/vite.pid)). Logs: /tmp/vite.log\n"