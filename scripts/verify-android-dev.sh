#!/usr/bin/env bash
# Quick checks when the dev client hangs on "Loading from ...".
set -uo pipefail
echo "== adb devices =="
adb devices -l || true
echo ""
echo "== port reverse (emulator USB maps 127.0.0.1:8081 on device -> host:8081) =="
adb -e reverse --list 2>/dev/null || adb reverse --list || true
echo ""
echo "== probe Metro /status from host (start Metro first: pnpm start:android) =="
if curl -sS -m 2 "http://127.0.0.1:8081/status" >/dev/null 2>&1; then
  echo "OK: Metro responded on http://127.0.0.1:8081/status"
else
  echo "FAIL: nothing on 127.0.0.1:8081 — start Metro or fix port"
fi
echo ""
echo "== probe from emulator (HTTP to device loopback; needs reverse active) =="
adb -e shell "curl -sS -m 3 http://127.0.0.1:8081/status" 2>/dev/null && echo "" || echo "(skip if no emulator, or curl missing on image — reverse may still work for the app)"
