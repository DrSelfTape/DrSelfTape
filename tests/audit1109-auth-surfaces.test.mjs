// Audit 2026-11-09, auth lane: source-level pins for the fixes that live in
// JSX (theme tokens, route tables, call sites). Behaviour of the store and
// thunks is exercised for real in audit1109-auth-session.test.mjs.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

const GATES = ['src/components/AgeGate/AgeGateModal.jsx', 'src/components/AIConsent/AIConsentModal.jsx'];

test('A: the legal gates take their ink from the theme, not from hard-coded dark text', () => {
  for (const file of GATES) {
    const src = read(file);
    assert.match(src, /background: 'var\(--dst-paper\)'/, `${file} still sits on --dst-paper`);
    assert.doesNotMatch(src, /#1A1612|rgba\(26, ?22, ?18/i, `${file}: dark ink is unreadable on dark paper`);
    assert.match(src, /color: 'var\(--dst-ink\)'/, `${file} heading should use --dst-ink`);
    assert.match(src, /color: 'var\(--dst-ink-2\)'/, `${file} body should use --dst-ink-2`);
  }
});

test('A: every token the gates use is defined by all four themes', () => {
  const used = new Set(GATES.flatMap((f) => read(f).match(/--dst-[a-z0-9-]+/g) || []));
  const tokens = read('src/tokens.css');
  const future = read('src/components/FutureStudio/future-theme.css');
  for (const token of used) {
    const defs = tokens.match(new RegExp(`^\\s*${token}:`, 'gm')) || [];
    assert.ok(defs.length >= 3, `${token} needs light, dark and console values in tokens.css (found ${defs.length})`);
    assert.ok(future.includes(`${token}:`), `${token} needs a future-theme value`);
  }
});

const routeBlock = (name) => {
  const config = read('src/routes/config.jsx');
  const start = config.indexOf(`export const ${name} = [`);
  assert.ok(start !== -1, `${name} should exist`);
  return config.slice(start, config.indexOf('\n];', start));
};

test('B: terms, privacy and reset-password render whether or not you are signed in', () => {
  const open = routeBlock('openRoutes');
  const auth = routeBlock('authRoutes');
  for (const path of ['/terms', '/privacy', '/reset-password']) {
    assert.ok(open.includes(`path: '${path}'`), `${path} belongs in openRoutes`);
    assert.ok(!auth.includes(`path: '${path}'`), `${path} under PublicRoutes bounces a signed-in user to the dashboard`);
  }
  // Signed-out entry points stay where they were.
  for (const path of ['/login', '/signup', '/forgot-password']) {
    assert.ok(auth.includes(`path: '${path}'`), `${path} stays an auth route`);
  }

  // openRoutes is mounted outside both guards.
  const index = read('src/routes/index.jsx');
  const openAt = index.indexOf('{openRoutes.map(');
  assert.ok(openAt !== -1 && openAt < index.indexOf('<Route element={<PrivateRoutes />}>'));
  assert.ok(openAt < index.indexOf('<Route element={<PublicRoutes />}>'));
});

test('C/E: sign-out call sites take the full performLogout path', () => {
  const ageGate = read('src/components/AgeGate/AgeGateModal.jsx');
  assert.match(ageGate, /dispatch\(performLogout\(\)\)/);
  assert.doesNotMatch(ageGate, /logoutUser/, 'bare logoutUser skips the push, purchases and tape cleanup');

  assert.match(
    read('src/components/Dashboard/DeleteAccountModal.jsx'),
    /performLogout\(\{ accountDeleted: true \}\)/,
    'after a delete, logout must not call the API as the deleted user'
  );
});

test('D: the settings panel shows the server message for a failed password change', () => {
  const panel = read('src/panels/UserPanel/ProfileSetting/index.jsx');
  assert.match(panel, /toast\.error\(result\?\.payload \|\| 'Failed to change password'\)/);
  assert.doesNotMatch(panel, /payload\?\.response/, 'the rejected payload is a string, not an axios error');
});
