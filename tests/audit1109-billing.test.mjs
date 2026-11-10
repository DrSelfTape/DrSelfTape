// Audit 2026-11-09, billing gaps on the Membership screen. The real component
// bundled with esbuild; only network, native and analytics services are replaced.
//
// 1. A plan billed by another store is "managed in <that store>", never a
//    second checkout or a second in-app purchase.
// 2. Restore (and a purchase whose webhook never lands) asks the backend to
//    re-read the store subscription, once, instead of only re-polling.
import assert from 'node:assert/strict';
import { test, mock } from 'node:test';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { mountComponent } from './recording-review-harness.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);

async function bundle(entry, mocks, hookedImporter) {
  const result = await build({
    stdin: { resolveDir: root, contents: entry },
    bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external', jsx: 'automatic',
    loader: { '.css': 'empty' }, define: { 'import.meta.env': '{}' },
    plugins: [{ name: 'audit1109-billing-mocks', setup(builder) {
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

const Membership = (await bundle(`export { default } from './src/panels/Dashboard/Membership/index.jsx';`, {
  'react-redux': 'export const useDispatch = () => (a) => { globalThis.__m.dispatched.push(a); }; export const useSelector = (fn) => fn({ auth: { user: { id: 7 } } });',
  'http': 'export default { get: (...a) => globalThis.__m.get(...a), post: (...a) => globalThis.__m.post(...a) };',
  'snackbarSlice': 'export const showSnackbar = (p) => ({ type: "snackbar", payload: p });',
  '@capacitor/core': 'export const Capacitor = { isNativePlatform: () => !!globalThis.__m.native, getPlatform: () => globalThis.__m.native || "web" };',
  'purchases': `const m = () => globalThis.__m;
    export const isNativeIOS = () => m().native === 'ios', isNativeStore = () => !!m().native, storePlatform = () => m().native || null;
    export const purchase = (...a) => m().purchase(...a);
    export const restorePurchases = (...a) => m().restore(...a);
    export const manageSubscriptions = async () => {}, getIntroOfferFor = async () => null, getStorePriceFor = async () => null;`,
  'useHideMobileHeader': 'export default function useHideMobileHeader() {}',
  'goUpgrade': 'export const consumeUpgradeIntent = () => null;',
  'analytics': 'export const Events = { PURCHASE: "purchase" }; export const trackEvent = () => {};',
  'sentry': 'export const Sentry = { captureMessage() {} };',
}, /Membership\/index\.jsx$/)).default;

const settle = async () => { for (let i = 0; i < 30; i++) await Promise.resolve(); };
const find = (node, test_) => {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) { for (const n of node) { const hit = find(n, test_); if (hit) return hit; } return null; }
  if (test_(node)) return node;
  return find(node.props?.children, test_);
};
const text = (node) => !node || typeof node === 'boolean' ? '' : typeof node !== 'object' ? String(node)
  : Array.isArray(node) ? node.map(text).join('') : text(node.props?.children);
const byClass = (tree, name) => find(tree, n => n.props?.className === name);

// `native`: false (web) | 'ios' | 'android'. `status`: the /status/ payload.
async function openMembership({ native = false, status, post, purchase, restore }) {
  const calls = { get: [], post: [] };
  globalThis.__m = { native, purchase, restore, dispatched: [], calls, status,
    get: async (url) => { calls.get.push(url); return { data: { data: globalThis.__m.status } }; },
    post: async (url, body) => { calls.post.push(url); return post ? post(url, body) : { data: { data: {} } }; } };
  globalThis.window = { location: { search: '', pathname: '/dashboard/membership', href: '' }, history: { replaceState() {} } };
  const view = mountComponent(Membership);
  view.render(); view.flush(); await settle();
  return { view, calls, tree: () => view.render() };
}
const snackbars = () => globalThis.__m.dispatched.filter(a => a.type === 'snackbar').map(a => a.payload.message);
const active = (extra) => ({ balance: 12, plan: 'plus', billing: 'monthly', status: 'active', ...extra });

// ── 1. one subscriber, one store ──

test('web: an App Store plan is shown as managed there, with nothing to buy', async () => {
  const page = await openMembership({ status: active({ store: 'app_store' }) });
  const tree = page.tree();
  assert.equal(byClass(tree, 'studio-cta'), null, 'no checkout button');
  assert.equal(byClass(tree, 'studio-cta-ghost'), null, 'no Stripe portal button for a plan Stripe does not bill');
  assert.match(text(tree), /Your Plus plan is managed in the App Store/);
  assert.doesNotMatch(text(tree), /Subscribe ·|Switch ·/);
});

test('web: selecting another tier still offers no second subscription', async () => {
  const page = await openMembership({ status: active({ store: 'app_store' }) });
  byClass(page.tree(), 'studio-plans').props.children
    .find(card => text(card).includes('Premium')).props.onClick();
  const tree = page.tree();
  assert.equal(byClass(tree, 'studio-cta'), null);
  assert.match(text(tree), /managed in the App Store/);
  assert.deepEqual(page.calls.post, []);
});

test('web: a Google Play plan and a plan of unknown origin are not sold again either', async () => {
  let tree = (await openMembership({ status: active({ store: 'play_store' }) })).tree();
  assert.equal(byClass(tree, 'studio-cta'), null);
  assert.match(text(tree), /managed in Google Play/);

  tree = (await openMembership({ status: active({ store: '' }) })).tree();
  assert.equal(byClass(tree, 'studio-cta'), null);
  assert.equal(byClass(tree, 'studio-cta-ghost'), null);
  assert.match(text(tree), /isn’t billed on the web/);
});

test('web: a Stripe plan keeps Manage Plan and the in-place switch', async () => {
  const page = await openMembership({ status: active({ store: 'stripe' }) });
  assert.match(text(byClass(page.tree(), 'studio-cta-ghost')), /Manage Plan/);
  byClass(page.tree(), 'studio-plans').props.children
    .find(card => text(card).includes('Premium')).props.onClick();
  assert.match(text(byClass(page.tree(), 'studio-cta')), /Switch ·/);
  assert.doesNotMatch(text(page.tree()), /managed in/);
});

test('web: an ended store plan, a free user and an older backend all still see checkout', async () => {
  for (const status of [
    { balance: 0, plan: 'plus', status: 'expired', store: 'app_store' },
    { balance: 0, plan: null, status: 'inactive', store: '' },
    active({}), // backend that does not send `store` yet: unchanged behaviour
  ]) {
    const tree = (await openMembership({ status })).tree();
    assert.ok(byClass(tree, 'studio-cta') || byClass(tree, 'studio-cta-ghost'), JSON.stringify(status));
    assert.doesNotMatch(text(tree), /managed in|billed on the web/);
  }
});

test('web: a checkout the backend refuses shows the backend’s reason', async () => {
  // Status raced or was stale: the server-side refusal is the real guard.
  const refusal = { response: { status: 409, data: { code: 'managed_elsewhere', store: 'app_store',
    error: 'Your plan is managed in the App Store. Change or cancel it there.' } } };
  const page = await openMembership({ status: { balance: 0, plan: null, status: 'inactive', store: '' },
    post: async () => { throw refusal; } });
  byClass(page.tree(), 'studio-cta').props.onClick(); await settle();
  assert.deepEqual(snackbars(), ['Your plan is managed in the App Store. Change or cancel it there.']);
  assert.equal(globalThis.window.location.href, '', 'never navigated to a checkout');
  assert.equal(byClass(page.tree(), 'studio-cta').props.disabled, false);
});

test('iOS: a plan billed on the web is not sold again through the App Store', async () => {
  let purchases = 0;
  const page = await openMembership({ native: 'ios', status: active({ store: 'stripe' }),
    purchase: async () => { purchases += 1; return { ok: false }; } });
  const tree = page.tree();
  assert.equal(byClass(tree, 'studio-cta'), null);
  assert.equal(byClass(tree, 'studio-cta-ghost'), null);
  assert.match(text(tree), /Your Plus plan is billed on the web/);
  assert.equal(purchases, 0);
});

test('Android: an App Store plan is not sold again through Google Play', async () => {
  const tree = (await openMembership({ native: 'android', status: active({ store: 'app_store' }) })).tree();
  assert.equal(byClass(tree, 'studio-cta'), null);
  assert.match(text(tree), /managed in the App Store/);
});

test('iOS: its own App Store plan, and a legacy plan with no store on record, are unchanged', async () => {
  for (const store of ['app_store', '']) {
    const page = await openMembership({ native: 'ios', status: active({ store }) });
    assert.match(text(byClass(page.tree(), 'studio-cta-ghost')), /Manage Plan/, `store=${JSON.stringify(store)}`);
    assert.doesNotMatch(text(page.tree()), /managed in|billed on the web/);
  }
});

// ── 2. a lost webhook is recoverable ──

const restoreLink = (tree) => find(tree, n => n.type === 'button' && text(n) === 'Restore Purchases');

test('restore asks the backend to re-read the store subscription, once, before polling', async () => {
  const order = [];
  const page = await openMembership({ native: 'ios', status: { balance: 0, plan: null, status: 'inactive', store: '' },
    restore: async () => ({ ok: true, hasActive: true }),
    post: async (url) => { order.push(url); globalThis.__m.status = active({ store: 'app_store' }); return { data: { data: { reconciled: true } } }; } });
  page.calls.get.length = 0;
  restoreLink(page.tree()).props.onClick(); await settle();
  assert.deepEqual(order, ['/v1/subscriptions/reconcile/']);
  assert.deepEqual(page.calls.get, ['/v1/subscriptions/status/']);
  assert.deepEqual(snackbars(), ['Purchases restored.']);
});

test('restore still works when reconcile is unavailable, and does not retry it', async () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    let reconciles = 0;
    const page = await openMembership({ native: 'ios', status: { balance: 0, plan: null, status: 'inactive', store: '' },
      restore: async () => ({ ok: true, hasActive: true }),
      post: async () => { reconciles += 1; throw { response: { status: 502 } }; } });
    restoreLink(page.tree()).props.onClick(); await settle();
    globalThis.__m.status = active({ store: 'app_store' }); // the webhook lands on its own
    mock.timers.tick(3000); await settle();
    assert.equal(reconciles, 1);
    assert.deepEqual(snackbars(), ['Purchases restored.']);
  } finally { mock.timers.reset(); }
});

test('restore with nothing to restore never calls the backend', async () => {
  const page = await openMembership({ native: 'ios', status: { balance: 0, plan: null, status: 'inactive', store: '' },
    restore: async () => ({ ok: true, hasActive: false }) });
  restoreLink(page.tree()).props.onClick(); await settle();
  assert.deepEqual(page.calls.post, []);
  assert.deepEqual(snackbars(), ['No purchases found on this Apple ID.']);
});

test('a purchase whose webhook never lands is recovered by one reconcile', async () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const page = await openMembership({ native: 'ios', status: { balance: 0, plan: null, status: 'inactive', store: '' },
      purchase: async () => ({ ok: true, hasActive: true }),
      post: async () => { globalThis.__m.status = active({ store: 'app_store' }); return { data: { data: { reconciled: true } } }; } });
    byClass(page.tree(), 'studio-cta').props.onClick(); await settle();
    for (let i = 0; i < 15; i++) { mock.timers.tick(3000); await settle(); } // the whole poll window, no webhook
    assert.deepEqual(page.calls.post, ['/v1/subscriptions/reconcile/']);
    assert.deepEqual(snackbars(), ['Subscription activated. Welcome aboard!']);
  } finally { mock.timers.reset(); }
});

test('a purchase the webhook confirms in time never calls reconcile', async () => {
  const page = await openMembership({ native: 'ios', status: { balance: 0, plan: null, status: 'inactive', store: '' },
    purchase: async () => { globalThis.__m.status = active({ store: 'app_store' }); return { ok: true, hasActive: true }; } });
  byClass(page.tree(), 'studio-cta').props.onClick(); await settle();
  assert.deepEqual(page.calls.post, []);
  assert.deepEqual(snackbars(), ['Subscription activated. Welcome aboard!']);
});
