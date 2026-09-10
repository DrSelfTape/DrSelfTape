#!/bin/bash
# launchd entry point for the synthetic sign-up check. Runs the monitor, then
# reports anything other than a PASS to the ops-alert endpoint so the owner
# gets a push. A crash before the script writes its report counts as a
# failure too; the whole point is that a broken monitor is never silent.
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT" || exit 1
OUT="${DST_SYNTHETIC_OUTPUT:-$ROOT/output/synthetic-signup}"
mkdir -p "$OUT"
# Shared secret lives outside the repo, mode 600.
if [ -f "$HOME/.config/dst-synthetic/env" ]; then . "$HOME/.config/dst-synthetic/env"; fi
API="${DST_SYNTHETIC_API_URL:-https://drselftape-api-production.up.railway.app/api}"
NODE="${DST_SYNTHETIC_NODE:-/opt/homebrew/bin/node}"

"$NODE" scripts/synthetic-signup.mjs > "$OUT/run.out" 2> "$OUT/run.err"
code=$?
status="CRASH"; stage="before_report"; error="exit $code"
if [ -f "$OUT/latest.json" ]; then
  # Only trust the report if this run wrote it (mtime within the last 10 min).
  if [ -n "$(find "$OUT/latest.json" -mmin -10 2>/dev/null)" ]; then
    read -r status stage error < <("$NODE" -e '
      const r=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));
      const one=s=>String(s||"").replace(/\s+/g," ").slice(0,200);
      console.log([r.status,r.stage,one(r.cleanup_error||r.error||"")].map(x=>encodeURIComponent(x||"")).join(" "));
    ' "$OUT/latest.json")
    status=$("$NODE" -e 'console.log(decodeURIComponent(process.argv[1]))' "$status")
    stage=$("$NODE" -e 'console.log(decodeURIComponent(process.argv[1]))' "$stage")
    error=$("$NODE" -e 'console.log(decodeURIComponent(process.argv[1]))' "$error")
  fi
fi
if [ "$status" = "CRASH" ]; then error="exit $code: $(tail -c 200 "$OUT/run.err" | tr '\n' ' ')"; fi
echo "$(date -u +%FT%TZ) status=$status stage=$stage code=$code" >> "$OUT/history.log"
[ "$status" = "PASS" ] && exit 0

if [ -z "${DST_OPS_ALERT_TOKEN:-}" ]; then
  echo "$(date -u +%FT%TZ) ALERT NOT SENT: DST_OPS_ALERT_TOKEN missing" >> "$OUT/history.log"; exit 1
fi
"$NODE" -e '
  const [api,token,status,stage,error]=process.argv.slice(1);
  const body={check:"synthetic-signup",status:status==="PASS"?"FAIL":status,stage,error,host:require("os").hostname()};
  fetch(api+"/v1/notifications/system/ops-alert/",{method:"POST",signal:AbortSignal.timeout(20000),
    headers:{"Content-Type":"application/json","X-Ops-Alert-Token":token},body:JSON.stringify(body)})
   .then(async r=>{console.log("alert",r.status,(await r.text()).slice(0,200));process.exitCode=r.ok?0:1;})
   .catch(e=>{console.log("alert failed",e.message);process.exitCode=1;});
' "$API" "$DST_OPS_ALERT_TOKEN" "$status" "$stage" "$error" >> "$OUT/history.log" 2>&1
exit 1
