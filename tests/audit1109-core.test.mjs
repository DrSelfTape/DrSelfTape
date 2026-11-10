// Regressions from the 2026-11-09 audit that have no runtime harness of their
// own. Each one was a contract between two files that nothing checked: a field
// name, an event with no listener, a prop the child never read.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8');
const code = (path) => read(path)
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

test('mobile Home reads the stats fields the API sends', () => {
  // GET /v1/auditions/stats/ returns total, by_status and pipeline.*. The
  // shell read total_auditions / total_booked, which never existed, so the
  // pipeline card never rendered and the next-step card never advanced.
  const src = code('panels/Mobile/MobileApp.jsx');
  assert.doesNotMatch(src, /\.total_auditions\b/);
  assert.doesNotMatch(src, /\.total_booked\b/);
  assert.match(src, /stats\?\.total \|\| 0\) > 0/);
});

test('the command palette renders verbs that have no icon', () => {
  const src = code('components/ConsoleCommandPalette.jsx');
  const verbs = src.slice(src.indexOf('const SLASH_VERBS'), src.indexOf('];', src.indexOf('const SLASH_VERBS')));
  assert.doesNotMatch(verbs, /icon:/, 'if verbs gain icons this guard can go');
  assert.match(src, /\{Icon\s*\?\s*<Icon/, 'an undefined Icon must not be rendered as an element');
  assert.match(src, /key=\{cmd\.verb \|\| cmd\.path\}/, '/review and /compare share a path; /shortcuts has none');
});

test('desktop web listens for drst-navigate and mounts the out-of-tokens modal', () => {
  const layout = code('panels/Dashboard/DashboardLayout.jsx');
  const effect = layout.slice(layout.indexOf('const routeFor'), layout.indexOf("removeEventListener('drst-navigate'"));
  assert.match(layout, /if \(isMobile\) return;/);
  assert.doesNotMatch(layout, /if \(isMobile \|\| !Capacitor\.isNativePlatform\(\)\) return;/);
  assert.match(effect, /membership: '\/dashboard\/membership'/);

  const frame = code('panels/Dashboard/ConsoleFrame.jsx');
  assert.equal(frame.match(/<ConsoleNoTokens \/>/g)?.length, 2, 'both desktop frames need it');
  assert.match(frame, /addEventListener\('insufficient_tokens'/);
});

test('every notification the server sends for these types has somewhere to go', () => {
  const bell = code('components/Dashboard/NotificationBell.jsx');
  const page = code('routes/notificationConfig.js');
  for (const type of ['tape_review_complete', 'headshot_nudge', 'studio_bridge', 'reader_clips_received']) {
    assert.match(bell, new RegExp(`${type}:\\s*\\{ web:`), `bell has no destination for ${type}`);
    assert.match(page, new RegExp(`${type}:\\s*\\{ route:`), `notifications page has no destination for ${type}`);
  }
  assert.doesNotMatch(page, /booking_(confirmed|cancelled):\s*\{ route: '\/dashboard\/marketplace'/);
  const push = code('hooks/usePushNotifications.js');
  for (const type of ['headshot_nudge', 'studio_bridge', 'reader_clips_received']) {
    assert.match(push, new RegExp(`case '${type}':`));
  }
});

test('login keeps the AI consent the server already holds', () => {
  const src = code('redux/features/auth/authSlice.js');
  assert.equal(src.match(/ai_consent_accepted_at: (src|action\.payload)\?\.ai_consent_accepted_at/g)?.length, 3);
  assert.match(src, /removeItem\('dst_onb_step_v3'\)/);
});

test('the page-enter animation does not un-pin full-screen overlays', () => {
  const css = read('components/FutureStudio/future-studio.css').replace(/\/\*[\s\S]*?\*\//g, '');
  const rule = css.match(/\.future-theme \.aurora-page-in\{([^}]*)\}/);
  assert.ok(rule, 'page-in needs its own rule');
  assert.doesNotMatch(rule[1], /\bboth\b|\bforwards\b/, 'a filling transform keeps the wrapper a containing block');
  assert.match(css, /\.future-theme \.aurora-page-in:has\(\.dst-rehearsal\)\{animation:none\}/);
});

test('the match overlay on Who Wants to Read is wired to the props it reads', () => {
  const overlay = code('panels/Dashboard/FindAReader/components/MatchCelebration.jsx');
  assert.match(overlay, /\(\{ actor, onConnect, onDismiss \}\)/);
  const caller = code('panels/Dashboard/FindAReader/WhoWantsToRead.jsx');
  const use = caller.slice(caller.indexOf('<MatchCelebration'));
  assert.match(use, /onConnect=\{/);
  assert.match(use, /onDismiss=\{/);
  assert.doesNotMatch(use.slice(0, 300), /onDone=/);
});

test('a subscriber is not put through the free-first-review paywall', () => {
  const src = code('panels/Dashboard/Jericho/index.jsx');
  assert.match(src, /setWebFirstReview\(!firstReviewDone && !firstReviewIsPaid\)/);
});
