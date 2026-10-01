#!/bin/bash
# Deploy the synthetic sign-up monitor to a runtime location OUTSIDE ~/Downloads.
#
# WHY THIS EXISTS: macOS privacy protection (TCC) denies launchd user agents
# access to ~/Downloads. A plist whose Program or WorkingDirectory lives in
# there fails with "last exit code = 78: EX_CONFIG" and NEVER RUNS — launchd
# cannot even spawn the process, so nothing is written to the error log and
# the failure is completely silent. That is exactly how this monitor went dark
# from 2026-09-25 to 2026-09-30 without anyone noticing.
#
# The canonical scripts stay in this repo (version controlled). This script
# copies them to ~/.local/dst-monitors/synthetic-signup/ and points launchd
# there. Re-run it after changing either .mjs file.
#
# Usage: bash scripts/install-synthetic-monitor.sh
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST="$HOME/.local/dst-monitors/synthetic-signup"
LABEL="com.drselftapes.synthetic-signup"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
NODE="/opt/homebrew/bin/node"

[ -x "$NODE" ] || { echo "FATAL: node not found at $NODE"; exit 1; }

echo "==> deploying to $DEST"
mkdir -p "$DEST/output" "$DEST/scripts"
chmod 700 "$DEST/output"

# Runtime needs its own puppeteer-core: it cannot load node_modules from the
# repo, because the repo is the protected path we are escaping.
if [ ! -f "$DEST/package.json" ]; then
  cat > "$DEST/package.json" <<'JSON'
{
  "name": "dst-synthetic-signup-runtime",
  "private": true,
  "type": "module",
  "dependencies": { "puppeteer-core": "^25.10.0" }
}
JSON
fi
# Keep the scripts/ subdirectory: the runner computes ROOT as its parent and
# spawns ROOT/scripts/synthetic-signup.mjs. node_modules sits at $DEST so
# puppeteer-core still resolves by walking up from scripts/.
cp "$REPO/scripts/synthetic-signup.mjs" "$DEST/scripts/"
cp "$REPO/scripts/synthetic-signup-run.mjs" "$DEST/scripts/"

( cd "$DEST" && npm install --silent --no-audit --no-fund )
( cd "$DEST" && "$NODE" -e "import('puppeteer-core').then(()=>0)" ) \
  || { echo "FATAL: puppeteer-core does not resolve in $DEST"; exit 1; }

echo "==> writing $PLIST"
cat > "$PLIST" <<PLIST_EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key><array>
    <string>$NODE</string>
    <string>$DEST/scripts/synthetic-signup-run.mjs</string>
  </array>
  <key>WorkingDirectory</key><string>$DEST</string>
  <key>EnvironmentVariables</key><dict>
    <key>DST_SYNTHETIC_OUTPUT</key><string>$DEST/output</string>
  </dict>
  <key>StartCalendarInterval</key><dict><key>Hour</key><integer>7</integer><key>Minute</key><integer>30</integer></dict>
  <key>ProcessType</key><string>Background</string>
  <key>StandardOutPath</key><string>$DEST/output/scheduler.log</string>
  <key>StandardErrorPath</key><string>$DEST/output/scheduler-error.log</string>
</dict></plist>
PLIST_EOF

echo "==> reloading launchd"
launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"

echo "==> done. verify with:"
echo "    launchctl kickstart -k gui/$(id -u)/$LABEL && sleep 25 && tail -2 $DEST/output/history.log"
