// Every drst-navigate panel target must be registered in PANEL_COMPONENTS.
//
// MobileApp's handler is `if (targetPanel && PANEL_COMPONENTS[targetPanel])`,
// so an unregistered target is dropped with no error and no screen change —
// the tap fires and nothing happens. That is how `panel: 'marketplace'` kept
// shipping from four call sites (two notification types and a push
// destination) for weeks after the marketplace panel itself was deleted.
//
// This test fails the moment a dispatch names a panel the shell cannot render.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SRC = new URL('../src/', import.meta.url).pathname;

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.(jsx?|mjs)$/.test(entry)) out.push(full);
  }
  return out;
}

const files = walk(SRC);

// Strip comments before matching. Without this the scan fires on prose — the
// first run flagged a line in auditionNotification.js that was a comment
// explaining this exact hazard ("A {panel:'auditions'} would be silently
// dropped"), while the code beside it was already correct. A nav test that
// cries wolf on comments gets muted, which is worse than not having it.
function stripComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')          // block comments
    .replace(/(^|[^:])\/\/.*$/gm, '$1');        // line comments (keep https://)
}

function registeredPanels() {
  const mobileApp = readFileSync(join(SRC, 'panels/Mobile/MobileApp.jsx'), 'utf8');
  const start = mobileApp.indexOf('const PANEL_COMPONENTS = {');
  assert.ok(start !== -1, 'PANEL_COMPONENTS should exist in MobileApp.jsx');
  const body = mobileApp.slice(start, mobileApp.indexOf('};', start));
  return new Set([...body.matchAll(/["']([a-z0-9-]+)["']\s*:/g)].map((m) => m[1]));
}

// Targets the shell handles explicitly BEFORE the PANEL_COMPONENTS guard, so
// they are reachable without being registered. Keep this list tiny and cited.
const SPECIAL_CASED = new Set([
  'meeting', // MobileApp.jsx: redirected in the drst-navigate handler — MeetingRoom
             // is react-router-only (useParams + location.state) and cannot mount
             // as a panel, so it is deliberately unregistered.
]);

test('every dispatched panel target is renderable by the mobile shell', () => {
  const panels = registeredPanels();
  assert.ok(panels.size > 5, 'expected a populated PANEL_COMPONENTS');

  const problems = [];
  for (const file of files) {
    const text = stripComments(readFileSync(file, 'utf8'));
    for (const m of text.matchAll(/panel:\s*['"]([a-z0-9-]+)['"]/g)) {
      const target = m[1];
      if (panels.has(target) || SPECIAL_CASED.has(target)) continue;
      const line = text.slice(0, m.index).split('\n').length;
      problems.push(`${file.replace(SRC, 'src/')}:${line} → panel: '${target}'`);
    }
  }

  assert.deepEqual(
    problems,
    [],
    `These dispatch a panel the shell cannot render, so the tap silently does nothing.\n` +
      `Either register it in PANEL_COMPONENTS, repoint it, or special-case it here with a reason:\n  ` +
      problems.join('\n  ')
  );
});

test('the retired marketplace panel is not referenced anywhere', () => {
  const hits = files
    .filter((f) => !f.includes('/tests/'))
    .filter((f) => /panel:\s*['"]marketplace['"]/.test(stripComments(readFileSync(f, 'utf8'))))
    .map((f) => f.replace(SRC, 'src/'));
  assert.deepEqual(hits, [], `marketplace panel was deleted; these still point at it: ${hits.join(', ')}`);
});
