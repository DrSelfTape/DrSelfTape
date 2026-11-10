// Regression guards for the 2026-11-09 audit, lane S (mobile shell, home,
// tapes). Pure-module checks import the real code; the rest pin the exact
// source pattern that caused each bug, because the mobile shell is one 4,700
// line component that cannot be mounted here.
process.env.TZ = 'America/Los_Angeles';

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (path) => readFileSync(fileURLToPath(new URL(`../${path}`, import.meta.url)), 'utf8');

const { toLocalInputValue, localInputToISO } = await import('../src/panels/Dashboard/Submissions/dateTimeLocal.js');
const { importSummary } = await import('../src/panels/Dashboard/Submissions/importSummary.js');
const { NAV_GROUPS } = await import('../src/components/navGroups.js');

// ── H: datetime-local is local wall time; the API stores UTC ──────────────
test('a Los Angeles 5:00 PM is sent as its real instant, not as 5:00 PM UTC', () => {
  assert.equal(localInputToISO('2026-11-09T17:00'), '2026-11-10T01:00:00.000Z'); // PST, UTC-8
  assert.equal(localInputToISO('2026-07-09T17:00'), '2026-07-10T00:00:00.000Z'); // PDT, UTC-7
  assert.equal(localInputToISO(''), null);
  assert.equal(localInputToISO('not a date'), null);
});

test('a stored instant loads back into the input as local wall time and round-trips', () => {
  assert.equal(toLocalInputValue('2026-11-10T01:00:00Z'), '2026-11-09T17:00');
  assert.equal(toLocalInputValue('2026-11-10T01:00:00+00:00'), '2026-11-09T17:00');
  assert.equal(toLocalInputValue(null), '');
  assert.equal(toLocalInputValue('garbage'), '');
  for (const local of ['2026-11-09T17:00', '2026-03-08T01:30', '2026-12-31T23:59']) {
    assert.equal(toLocalInputValue(localInputToISO(local)), local);
  }
});

test('no form in the owned panels slices a UTC ISO string into a datetime-local input', () => {
  for (const path of ['src/panels/Dashboard/Submissions/index.jsx', 'src/panels/Dashboard/Auditions/index.jsx']) {
    const source = read(path);
    assert.doesNotMatch(source, /\.slice\(0, ?16\)/, `${path} still shows UTC wall time as local`);
    assert.match(source, /localInputToISO\(/, `${path} must send an absolute instant`);
  }
  // Both audition writes — the new-audition form and the detail edit.
  assert.equal(read('src/panels/Dashboard/Auditions/index.jsx').match(/callback_date: localInputToISO\(form\.callback_date\)/g)?.length, 2);
});

// ── I: the import upserts, so "added" was wrong for updated rows ──────────
test('the import summary says what the endpoint actually did', () => {
  assert.equal(importSummary({ created: 3, updated: 0 }, 3), '3 submissions added to your tracker');
  assert.equal(importSummary({ created: 0, updated: 5 }, 5), '5 submissions updated in your tracker');
  assert.equal(importSummary({ created: 1, updated: 2 }, 3), '1 submission added and 2 updated in your tracker');
  assert.match(importSummary({ created: 0, updated: 0 }, 2), /Nothing new/);
  assert.equal(importSummary(undefined, 4), '4 submissions imported to your tracker');
});

test('an import failure after a successful parse is shown', () => {
  const source = read('src/panels/Dashboard/Submissions/TalentReportImporter.jsx');
  assert.doesNotMatch(source, /\{error && !parsedReport && /);
  assert.match(source, /\{error && importDone === null && /);
});

// ── E: routed pages nothing linked to ─────────────────────────────────────
test('Favorites and Craft Journey are reachable from the desktop nav', () => {
  const group = (key) => NAV_GROUPS.find((g) => g.key === key).items;
  const favorites = group('connect').find((i) => i.path === '/dashboard/favorites');
  const craft = group('practice').find((i) => i.path === '/dashboard/craft-journey');
  for (const item of [favorites, craft]) {
    assert.ok(item, 'nav entry missing');
    assert.ok(item.label && item.icon, 'nav entry needs a label and an icon');
  }
  const routes = read('src/routes/config.jsx');
  assert.match(routes, /path: 'favorites'/);
  assert.match(routes, /path: 'craft-journey'/);
});

// ── B: the desktop console Home lost its card gap ─────────────────────────
test('the home cards wrapper carries the column gap without needing the native surface class', () => {
  const css = read('src/styles/studio-panels.css').replace(/\s+/g, ' ');
  assert.match(css, /\.dst-home > \.future-home-support \{ display: flex; flex-direction: column; gap: var\(--dst-space-xl\); \}/);
  // The sheet inset is for the native hero surface only.
  assert.match(css, /\.dst-home:not\(\.future-home-surface\) > \.future-home-support \{ padding: 0; margin: 0;/);
});

// ── A: text that vanished on the dark shell ───────────────────────────────
test('mobile shell: no cream ink on a pastel fill and no near-black on a dark token', () => {
  const source = read('src/panels/Mobile/MobileApp.jsx');
  const lines = source.split('\n');
  lines.forEach((line, i) => {
    const context = lines.slice(Math.max(0, i - 2), i + 3).join('\n');
    if (/background: (?:auroraColor|statusColor|STATUS_COLORS\[)/.test(line)) {
      assert.doesNotMatch(context, /color: 'var\(--dst-ink\)'/, `line ${i + 1}: cream text on a pastel pill`);
    }
    if (/background: 'var\(--dst-glass\)'/.test(line)) {
      assert.doesNotMatch(context, /color: '#0[0-9A-F]{5}'/i, `line ${i + 1}: near-black text on dark glass`);
    }
  });
  assert.match(source, /color: 'var\(--dst-ink\)', margin: 0 \}\}>\s*Up next:/);
  // The token the pills now use has to be dark on the theme the shell forces.
  const theme = read('src/components/FutureStudio/future-theme.css');
  const onFill = theme.match(/--dst-on-fill-ink:\s*#([0-9a-f]{6})/i)[1];
  const luminance = [0, 2, 4].map((o) => parseInt(onFill.slice(o, o + 2), 16)).reduce((a, b) => a + b) / 3;
  assert.ok(luminance < 64, `--dst-on-fill-ink (#${onFill}) must be a dark ink in the future theme`);
});

// ── F: the script preload was rewritten on every render ───────────────────
test('mobile shell: the Scene Study preload is written when a script is launched, not during render', () => {
  const source = read('src/panels/Mobile/MobileApp.jsx');
  assert.equal(source.match(/sessionStorage\.setItem\('preloadedScript'/g).length, 1);
  const launch = source.slice(source.indexOf('const launchScript = (script) => {'));
  assert.ok(launch.indexOf("sessionStorage.setItem('preloadedScript'") < launch.indexOf('setSelectedScript(script);'));
  const renderBranch = source.slice(source.indexOf('  if (selectedScript) {\n    return ('));
  assert.ok(renderBranch.length > 100, 'the selected-script render branch moved; update this guard');
  // Every way of opening a script goes through launchScript.
  assert.equal(source.match(/setSelectedScript\(\{/g), null);
  assert.equal(source.match(/setSelectedScript\(sc\)/g), null);
});

// ── J: copy that claimed more than the numbers say ────────────────────────
test('the leaderboard does not call all-time totals a season or every account a grinder', () => {
  const source = read('src/panels/Dashboard/Leaderboard/index.jsx');
  assert.doesNotMatch(source, /grinding/i);
  assert.doesNotMatch(source, /['">][^'"<\n]*this season/i);
  assert.match(source, /actors on the board\./);
});

// ── G: the recorder hid the server's reason behind alert() ────────────────
test('the recorder shows the server message for a failed save instead of a generic alert', () => {
  const source = read('src/panels/Dashboard/SceneStudy/SelfTapeRecorder.jsx');
  const save = source.slice(source.indexOf('const handleSave = async'), source.indexOf('const handleDownload = async'));
  assert.doesNotMatch(save, /\balert\(['"`]/);
  assert.match(save, /setSaveError\(err\?\.response\?\.data\?\.message \|\|/);
  assert.match(source, /role="alert"[^>]*>\s*\{saveError\}/);
});
