// launchd entry point for the synthetic sign-up check. Runs the monitor, then
// reports anything other than a PASS to the ops-alert endpoint so the owner
// gets a push. A crash before the monitor writes its report counts as a
// failure too: a broken monitor must never be silent.
//
// Node, not bash, on purpose: a launchd-spawned /bin/bash is denied access to
// ~/Downloads by macOS privacy protection (exit 126), Homebrew's node is not.
import {spawnSync} from 'node:child_process';
import {appendFileSync, mkdirSync, readFileSync, statSync} from 'node:fs';
import {hostname} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(process.env.DST_SYNTHETIC_OUTPUT || path.join(ROOT, 'output/synthetic-signup'));
const API = (process.env.DST_SYNTHETIC_API_URL || 'https://drselftape-api-production.up.railway.app/api').replace(/\/$/, '');
mkdirSync(OUT, {recursive: true, mode: 0o700});

// Shared secret lives outside the repo (mode 600): KEY=VALUE lines.
const envFile = path.join(process.env.HOME || '', '.config/dst-synthetic/env');
try {
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch {}

const one = (s) => String(s || '').replace(/\s+/g, ' ').slice(0, 200);
const log = (line) => appendFileSync(path.join(OUT, 'history.log'), `${new Date().toISOString()} ${line}\n`);

const startedAt = Date.now();
const run = spawnSync(process.execPath, [path.join(ROOT, 'scripts/synthetic-signup.mjs')],
  {cwd: ROOT, env: process.env, encoding: 'utf8', timeout: 5 * 60 * 1000});
const code = run.status ?? (run.signal ? `signal ${run.signal}` : 'unknown');

let status = 'CRASH', stage = 'before_report', error = `exit ${code}`;
try {
  const reportPath = path.join(OUT, 'latest.json');
  if (statSync(reportPath).mtimeMs >= startedAt - 1000) {          // written by THIS run
    const r = JSON.parse(readFileSync(reportPath, 'utf8'));
    status = r.status || 'CRASH';
    stage = r.stage || 'report_unreadable';
    error = one(r.cleanup_error || r.error || '');
  }
} catch { stage = 'report_unreadable'; }
if (status === 'CRASH') error = one(`exit ${code}: ${(run.stderr || '').slice(-120)} ${(run.stdout || '').slice(-120)}`);
log(`status=${status} stage=${stage} code=${code}`);
if (status === 'PASS') process.exit(0);

const token = process.env.DST_OPS_ALERT_TOKEN;
if (!token) { log('ALERT NOT SENT: DST_OPS_ALERT_TOKEN missing'); process.exit(1); }
try {
  const res = await fetch(`${API}/v1/notifications/system/ops-alert/`, {
    method: 'POST', signal: AbortSignal.timeout(20000),
    headers: {'Content-Type': 'application/json', 'X-Ops-Alert-Token': token},
    body: JSON.stringify({check: 'synthetic-signup', status, stage, error, host: hostname()}),
  });
  log(`alert ${res.status} ${(await res.text()).slice(0, 200)}`);
} catch (e) { log(`alert failed ${e.message}`); }
process.exit(1);
