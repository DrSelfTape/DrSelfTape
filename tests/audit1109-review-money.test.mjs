// Audit 2026-11-09, Tape Review + paywall money path. Real modules bundled with
// esbuild; only network, native and analytics services are replaced.
import assert from 'node:assert/strict';
import { beforeEach, test, mock } from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { configureStore } from '@reduxjs/toolkit';
import { loadRecordingReview, mountComponent } from './recording-review-harness.mjs';
import { compareNotesPromise } from '../src/panels/Dashboard/Jericho/compareCopy.js';
import { scrubTelemetry } from '../src/utils/telemetryPrivacy.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
const src = (path) => readFileSync(root + path, 'utf8');

async function bundle(entry, mocks, hookedImporter) {
  const result = await build({
    stdin: { resolveDir: root, contents: entry },
    bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external', jsx: 'automatic',
    loader: { '.css': 'empty' }, define: { 'import.meta.env': '{}' },
    plugins: [{ name: 'audit1109-mocks', setup(builder) {
      builder.onResolve({ filter: /.*/ }, ({ path, importer }) => {
        if (path === 'react' && hookedImporter?.test(importer)) return { path: 'hooks', namespace: 'mock' };
        const key = Object.keys(mocks).find(name => path === name || path.endsWith('/' + name));
        if (key) return { path: key, namespace: 'mock' };
      });
      builder.onLoad({ filter: /.*/, namespace: 'mock' }, ({ path }) => ({ contents: path === 'hooks' ? `
        export const useState = (...a) => globalThis.__hooks.useState(...a);
        export const useEffect = (...a) => globalThis.__hooks.useEffect(...a);
      ` : mocks[path], loader: 'js' }));
    } }],
  });
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', result.outputFiles[0].text)(require, mod, mod.exports);
  return mod.exports;
}

// Every bundle loads before the first test installs its fake `window`.
const { telemetryPath } = await bundle(`export { telemetryPath } from './src/redux/http.js';`, {
  'constant': 'export const baseURL = ""; export default {};',
  'store': 'export const store = {};', 'authSlice': 'export const setTokens = () => ({});',
  'analytics': 'export const trackEvent = () => {};',
  'deviceId': 'export const getDeviceId = () => "d";',
  'apiDestination': 'export const assertApiDestination = () => {};',
});
const Membership = (await bundle(`export { default } from './src/panels/Dashboard/Membership/index.jsx';`, {
  'react-redux': 'export const useDispatch = () => (a) => { globalThis.__m.dispatched.push(a); }; export const useSelector = (fn) => fn({ auth: { user: { id: 7 } } });',
  'http': 'export default { get: (...a) => globalThis.__m.get(...a), post: (...a) => globalThis.__m.post(...a) };',
  'snackbarSlice': 'export const showSnackbar = (p) => ({ type: "snackbar", payload: p });',
  '@capacitor/core': 'export const Capacitor = { isNativePlatform: () => globalThis.__m.native, getPlatform: () => globalThis.__m.native ? "ios" : "web" };',
  'purchases': `const m = () => globalThis.__m;
    export const isNativeIOS = () => m().native, isNativeStore = () => m().native, storePlatform = () => m().native ? 'ios' : null;
    export const purchase = (...a) => m().purchase(...a);
    export const restorePurchases = async () => ({}), manageSubscriptions = async () => {}, getIntroOfferFor = async () => null, getStorePriceFor = async () => null;`,
  'useHideMobileHeader': 'export default function useHideMobileHeader() {}',
  'goUpgrade': 'export const consumeUpgradeIntent = () => globalThis.__m.intent;',
  'analytics': 'export const Events = { PURCHASE: "purchase" }; export const trackEvent = (event, props) => globalThis.__m.events.push({ event, props });',
  'sentry': 'export const Sentry = { captureMessage() {} };',
}, /Membership\/index\.jsx$/)).default;
const NoTokensModal = (await bundle(`export { default } from './src/components/NoTokensModal.jsx';`, {
  'useHideMobileHeader': 'export default function useHideMobileHeader() {}',
  'analytics': 'export const trackEvent = () => {};',
  'http': 'export default { get: () => new Promise(() => {}) };',
  'purchases': 'export const isNativeIOS = () => globalThis.__iosNative;',
}, /NoTokensModal\.jsx$/)).default;

// ── D: a 402 token gate is the modal's message, not also an inline banner ──
const { reducer, reviewTape, compareTakes, isTokenGate } = await loadRecordingReview();
const gate402 = { response: { status: 402, data: { code: 'insufficient_tokens', message: 'Not enough tokens' } } };
let store;
beforeEach(() => {
  globalThis.window = { sessionStorage: { getItem: () => null, removeItem() {} }, addEventListener() {}, removeEventListener() {}, dispatchEvent() {} };
  globalThis.document = { visibilityState: 'hidden', addEventListener() {}, removeEventListener() {} };
  globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
  globalThis.__reviewEvents = [];
  store = configureStore({ reducer: { jericho: reducer,
    userSettings: () => ({ data: { tutorial_progress: { first_review: true } } }),
    profile: () => ({ profile: {} }), auth: () => ({ user: { id: 1, ai_consent_accepted_at: '2026-09-01' } }),
  } });
  globalThis.__reviewStore = store;
});
const failWith = (err) => { globalThis.__reviewHttp = { post: async () => { throw err; }, get: async () => { throw err; }, put: async () => { throw err; } }; };

test('D: an insufficient_tokens 402 leaves no inline Tape Review error', async () => {
  failWith(gate402);
  await store.dispatch(reviewTape({ recordingId: 42, idempotencyKey: 'gate-review' }));
  const state = store.getState().jericho;
  assert.equal(state.tapeReviewError, null);
  assert.equal(state.tapeReviewLoading, false);
});

test('D: an insufficient_tokens 402 leaves no inline Compare error', async () => {
  failWith(gate402);
  await store.dispatch(compareTakes({ takes: [], idempotencyKey: 'gate-compare' }));
  const state = store.getState().jericho;
  assert.equal(state.compareError, null);
  assert.equal(state.compareLoading, false);
});

test('D: any other failure still shows its inline error', async () => {
  assert.equal(isTokenGate({ response: { status: 402, data: {} } }), false);
  failWith({ response: { status: 402, data: {} } }); // no modal fires without the code
  await store.dispatch(reviewTape({ recordingId: 42, idempotencyKey: 'plain-402' }));
  assert.match(store.getState().jericho.tapeReviewError, /out of AI tokens/);
  failWith({ response: { status: 502, data: { message: 'Tape review temporarily unavailable.' } } });
  await store.dispatch(compareTakes({ takes: [], idempotencyKey: 'plain-502' }));
  assert.equal(store.getState().jericho.compareError, 'Tape review temporarily unavailable.');
});

// ── C: the Compare cost line promises only what the plan delivers ──
test('C: free users are not promised full notes on each take', () => {
  const free = compareNotesPromise(true, false);
  assert.doesNotMatch(free, /each take gets full notes/);
  assert.match(free, /Full notes on each take need a plan/);
  assert.match(compareNotesPromise(false, true), /each take gets full notes too/);
  assert.equal(compareNotesPromise(false, false), ''); // plan unknown: promise nothing
  assert.doesNotMatch(src('src/panels/Dashboard/Jericho/CompareTakes.jsx'), /tokens \(1 per take\) · each take gets full notes/);
});

// ── E: the button that only clears the result says so ──
test('E: the desktop report no longer offers a "Re-run" that does not re-run', () => {
  const report = src('src/panels/Dashboard/Jericho/DesktopTapeReport.jsx');
  assert.doesNotMatch(report, /Re-run review/);
  assert.match(report, /onClick=\{onReset\}>Review another take</);
});

// ── H1: the 402 event names the endpoint in a form the scrubber keeps ──

test('H1: the endpoint path survives telemetry scrubbing with ids collapsed', () => {
  const full = 'https://drselftape-api-production.up.railway.app/api/v1/ai/jericho/tape-review/?x=1';
  assert.equal(scrubTelemetry({ path: full }).path, 'https://drselftape-api-production.up.railway.app/[redacted]'); // the bug
  const path = telemetryPath(full);
  assert.equal(path, '/api/v1/ai/jericho/tape-review/');
  assert.equal(scrubTelemetry({ path }).path, path);
  assert.equal(telemetryPath('/v1/ai/jericho/jobs/8841/'), '/v1/ai/jericho/jobs/:id/');
  assert.equal(telemetryPath('/v1/tapes/3f2b8c1e-9a4d-4e5f-8b6a-0c1d2e3f4a5b/review'), '/v1/tapes/:id/review');
  assert.equal(telemetryPath('/v1/recordings/42'), '/v1/recordings/:id');
  assert.equal(telemetryPath(undefined), undefined);
  assert.match(src('src/redux/http.js'), /path: telemetryPath\(error\?\.config\?\.url\)/);
});

// ── F / H2 / H3: Membership ──

const settle = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
const find = (node, test_) => {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) { for (const n of node) { const hit = find(n, test_); if (hit) return hit; } return null; }
  if (test_(node)) return node;
  return find(node.props?.children, test_);
};
const text = (node) => !node || typeof node === 'boolean' ? '' : typeof node !== 'object' ? String(node)
  : Array.isArray(node) ? node.map(text).join('') : text(node.props?.children);

async function openMembership({ native, purchase, post, intent = null }) {
  globalThis.__m = { native, purchase, post, intent, events: [], dispatched: [],
    get: async () => ({ data: { data: { balance: 0, plan: null, status: 'none' } } }) };
  globalThis.window = { location: { search: '', pathname: '/dashboard/membership' }, history: { replaceState() {} } };
  const view = mountComponent(Membership);
  view.render(); view.flush(); await settle();
  return { view, tree: () => view.render(),
    subscribe: () => find(view.render(), n => n.props?.className === 'studio-cta').props.onClick() };
}
const snackbars = () => globalThis.__m.dispatched.filter(a => a.type === 'snackbar').map(a => a.payload.message);
const purchaseStatuses = () => globalThis.__m.events.filter(e => e.event === 'purchase').map(e => e.props.status);

test('F: no watchdog error while the native purchase sheet is still up', async () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const page = await openMembership({ native: true, purchase: () => new Promise(() => {}) });
    page.subscribe(); await settle();
    mock.timers.tick(60000); await settle();
    assert.deepEqual(snackbars(), []);
    // Still disabled: the sheet is up, a second purchase must not be startable.
    assert.equal(find(page.tree(), n => n.props?.className === 'studio-cta').props.disabled, true);
  } finally { mock.timers.reset(); }
});

test('F: the web checkout request keeps its 12s watchdog', async () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const page = await openMembership({ native: false, post: () => new Promise(() => {}) });
    page.subscribe(); await settle();
    mock.timers.tick(12000); await settle();
    assert.deepEqual(snackbars(), ['Checkout is taking longer than expected. Please try again.']);
    assert.equal(find(page.tree(), n => n.props?.className === 'studio-cta').props.disabled, false);
  } finally { mock.timers.reset(); }
});

test('H2: the paywall reports a view, with the surface that sent the actor', async () => {
  await openMembership({ native: false, intent: { source: 'compare_full_notes', plan: 'basic', cycle: 'monthly' } });
  assert.deepEqual(globalThis.__m.events.filter(e => e.event === 'paywall_viewed').map(e => e.props),
    [{ source: 'compare_full_notes', platform: 'stripe_web' }]);
  await openMembership({ native: true });
  assert.deepEqual(globalThis.__m.events.filter(e => e.event === 'paywall_viewed').map(e => e.props),
    [{ source: 'direct', platform: 'ios_iap' }]);
});

test('H3: purchase outcomes are distinct from the tap', async () => {
  let page = await openMembership({ native: true, purchase: async () => ({ ok: false, userCancelled: true }) });
  page.subscribe(); await settle();
  assert.deepEqual(purchaseStatuses(), ['initiated', 'cancelled']);

  page = await openMembership({ native: true, purchase: async () => ({ ok: false, reason: 'purchase_failed', error: 'declined' }) });
  page.subscribe(); await settle();
  assert.deepEqual(purchaseStatuses(), ['initiated', 'failed']);

  // Ask to Buy resolves without a sale: it used to be counted as 'success'.
  page = await openMembership({ native: true, purchase: async () => ({ ok: true, pending: true }) });
  page.subscribe(); await settle();
  assert.deepEqual(purchaseStatuses(), ['initiated', 'pending']);

  page = await openMembership({ native: true, purchase: async () => ({ ok: true, hasActive: true }) });
  globalThis.__m.get = async () => ({ data: { data: { status: 'active', plan: 'plus' } } });
  page.subscribe(); await settle();
  assert.deepEqual(purchaseStatuses(), ['initiated', 'success']);
});

// ── G: price and promise match; Apple wording only where Apple bills ──
test('G: Apple billing copy renders on native iOS only', async () => {
  const web = text((await openMembership({ native: false })).tree());
  assert.doesNotMatch(web, /Apple ID|reportaproblem\.apple\.com/);
  assert.match(web, /auto-renew at the price shown until cancelled\./);
  assert.match(web, /through Stripe at checkout/);
  const ios = text((await openMembership({ native: true })).tree());
  assert.match(ios, /Apple ID Subscription settings/);
  assert.match(ios, /reportaproblem\.apple\.com/);
  assert.doesNotMatch(ios, /Stripe/);
});


test('G: the out-of-tokens modal does not sell "Unlimited" at the Basic price', () => {
  const render = (ios) => { globalThis.__iosNative = ios; return text(mountComponent(NoTokensModal).render()); };
  const web = render(false);
  assert.match(web, /from \$9\.99\/mo/);
  assert.doesNotMatch(web, /Unlimited/); // $9.99 is Basic: 10 a month
  assert.match(web, /From 10 AI actions a month · unlimited on Premium \(150 a day fair use\)/);
  assert.doesNotMatch(web, /App Store/);
  assert.match(web, /Cancel anytime\./);
  assert.match(render(true), /Cancel anytime in the App Store\./);
});

test('a refunded 5xx drops the idempotency key; an unexplained 5xx keeps it', async () => {
  const { shouldReuseKey } = await loadRecordingReview();
  assert.equal(shouldReuseKey({ response: { status: 502, data: { charge_refunded: true } } }), false);
  assert.equal(shouldReuseKey({ response: { status: 502, data: {} } }), true);
  assert.equal(shouldReuseKey({ response: null }), true);
});
