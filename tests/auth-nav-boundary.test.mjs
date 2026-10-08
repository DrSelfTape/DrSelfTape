// Pins the boundary of the drst-navigate rule, which applies to panel
// navigation INSIDE the MobileApp shell and not to the pre-auth routes.
//
// Written after an adversarial review flagged SignUp's "Already have an
// account? Log in" button as broken on Capacitor because it calls react-router
// navigate(). It is not: MobileApp mounts from DashboardLayout, which is
// post-login, so a logged-out user on /signup has no panel shell to swallow the
// navigation. The suggested fix — dispatch drst-navigate at a login panel —
// would have been dropped by the shell's own PANEL_COMPONENTS guard, because
// there is no auth panel to target. These assertions fail if either premise
// stops holding, which is when that review would start being right.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('MobileApp mounts from the post-login DashboardLayout, not the auth routes', () => {
  const layout = read('src/panels/Dashboard/DashboardLayout.jsx');
  assert.match(layout, /import MobileApp from/, 'DashboardLayout should own MobileApp');
  assert.match(layout, /<MobileApp\s*\/>/, 'DashboardLayout should render MobileApp');

  for (const authPanel of [
    'src/panels/Auth/LoginPage.jsx',
    'src/panels/Authentication/SignUp/index.jsx',
  ]) {
    assert.doesNotMatch(
      read(authPanel),
      /MobileApp/,
      `${authPanel} must not mount the panel shell; if it ever does, react-router navigation there needs a drst-navigate companion`
    );
  }
});

test('PANEL_COMPONENTS registers no auth panel, so drst-navigate cannot reach login', () => {
  const mobileApp = read('src/panels/Mobile/MobileApp.jsx');
  const start = mobileApp.indexOf('const PANEL_COMPONENTS = {');
  assert.ok(start !== -1, 'PANEL_COMPONENTS should exist');
  const map = mobileApp.slice(start, mobileApp.indexOf('};', start));

  for (const key of ['login', 'signup', 'sign-up', 'auth']) {
    assert.ok(
      !new RegExp(`["']${key}["']\\s*:`).test(map),
      `PANEL_COMPONENTS gained a "${key}" panel — the auth screens can now be reached through the shell, so revisit how they navigate`
    );
  }
});

test('the login screen still enters the app by react-router, proving navigate() works pre-auth', () => {
  assert.match(
    read('src/panels/Auth/LoginPage.jsx'),
    /navigate\(getFirstRouteByRole\(/,
    'post-login entry is plain react-router navigation; it is shipped and working on iOS, which is the evidence that navigate() is not dead on the auth surface'
  );
});
