// Audit 2026-11-09, leftovers. Runs the REAL store, authSlice thunks and http
// interceptors (same harness as audit1109-auth-session); only device services
// are stubbed.
//   B  a 401 that belongs to a session or token which has already ended must
//      not be handled as "your session has expired"
//   C  nothing calls the switch-role endpoint the API never had
import assert from 'node:assert/strict';
import {before, test} from 'node:test';
import {setTimeout as delay} from 'node:timers/promises';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {AxiosError} from 'axios';

const require = createRequire(import.meta.url);
// The bundle marks packages external, so this is the same axios object the
// interceptor's bare (non-instance) refresh POST goes through.
const bareAxios = require('axios');

let bundle;
before(async () => {
  const result = await build({
    stdin: {resolveDir: fileURLToPath(new URL('../', import.meta.url)), contents: `
      export {store, persistor} from './src/redux/store';
      export {default as http, setAuthToken, STALE_AUTH_REQUEST} from './src/redux/http';
      export {performLogout, setTokens} from './src/redux/features/auth/authSlice';`},
    bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external', logLevel: 'silent',
    define: {'import.meta.env': JSON.stringify({DEV: true, VITE_API_URL: 'https://test.invalid/api'})},
    plugins: [{name: 'device-services', setup(builder) {
      const mocks = {
        usePushNotifications: 'export const unregisterPushToken = async () => { window.calls.push("push-unregister"); };',
        purchases: 'export const resetPurchases = async () => { window.calls.push("purchases-reset"); }; export const initPurchases = () => {};',
        useTokenBalance: 'export const resetTokenCache = () => {};',
        selfTapeStore: 'export const wipeAllLocalTapes = async () => { window.calls.push("tapes-wiped"); };',
        storage: 'const ls = window.localStorage; export default {getItem: async k => ls.getItem(k), setItem: async (k, v) => { ls.setItem(k, v); }, removeItem: async k => { ls.removeItem(k); }};',
        analytics: 'export const trackEvent = () => {}; export const Events = {}; export const getPostHogDistinctId = async () => "";',
      };
      builder.onResolve({filter: /^redux-persist\/lib\/storage$/}, () => ({path: 'storage', namespace: 'mock'}));
      builder.onResolve({filter: /\/(usePushNotifications|purchases|useTokenBalance|selfTapeStore|analytics)$/}, ({path}) => ({path: path.split('/').at(-1), namespace: 'mock'}));
      builder.onLoad({filter: /.*/, namespace: 'mock'}, ({path}) => ({contents: mocks[path]}));
    }}],
  });
  bundle = result.outputFiles[0].text;
});

const LOGIN = (id, access = `access-${id}`, refresh = `refresh-${id}`) =>
  ({type: 'auth/login/fulfilled', payload: {id, email: `u${id}@example.com`, token: {access, refresh}}});

const unauthorized = config => new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, {}, {
  config, status: 401, statusText: 'Unauthorized', headers: {}, data: {detail: 'token_not_valid'},
});

async function harness(t) {
  const values = new Map();
  const storage = {getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key)};
  const previous = {window: globalThis.window, localStorage: globalThis.localStorage, adapter: bareAxios.defaults.adapter};
  globalThis.localStorage = storage;
  // Anywhere but /login, so the handler's hard reload is observable as href.
  const win = {localStorage: storage, location: {pathname: '/dashboard', href: ''}, calls: []};
  globalThis.window = win;
  const mod = {exports: {}};
  new Function('require', 'module', 'exports', bundle)(require, mod, mod.exports);
  const api = mod.exports;
  const h = {...api, calls: win.calls, refreshes: [], location: win.location};
  // Refresh fails unless a test says otherwise: the old pair is dead.
  h.refresh = config => { throw unauthorized(config); };
  bareAxios.defaults.adapter = async config => {
    assert.match(config.url, /\/v1\/users\/token\/refresh\/$/, 'the only bare request is the refresh');
    h.refreshes.push(JSON.parse(config.data).refresh);
    return h.refresh(config);
  };
  t.after(() => {
    api.persistor.pause();
    bareAxios.defaults.adapter = previous.adapter;
    globalThis.window = previous.window; globalThis.localStorage = previous.localStorage;
  });
  for (let i = 0; i < 50 && !api.store.getState()._persist?.rehydrated; i++) await delay(5);
  assert.equal(api.store.getState()._persist?.rehydrated, true, 'store should rehydrate');
  h.ok = (config, data = {ok: true}) => ({config, status: 200, statusText: 'OK', headers: {}, data});
  h.signIn = (id, access, refresh) => {
    const action = LOGIN(id, access, refresh);
    api.store.dispatch(action);
    api.setAuthToken(action.payload.token.access);
  };
  h.expired = () => /session has expired/i.test(JSON.stringify(api.store.getState().snackbar)) || win.location.href === '/login';
  return h;
}

test('B: a 401 for a bearer the session already replaced is replayed under the live token, with no refresh and no logout', async t => {
  const h = await harness(t);
  h.signIn(7, 'pre-change', 'pre-change-refresh');
  const sent = [];
  h.http.defaults.adapter = async config => {
    sent.push(config.headers.Authorization);
    if (sent.length === 1) {
      // The password change lands while this request is in flight.
      h.store.dispatch(h.setTokens({access: 'post-change', refresh: 'post-change-refresh'}));
      h.setAuthToken('post-change');
      throw unauthorized(config);
    }
    return h.ok(config);
  };
  const response = await h.http.get('/v1/auditions/stats/');
  assert.equal(response.status, 200);
  assert.deepEqual(sent, ['Bearer pre-change', 'Bearer post-change']);
  assert.deepEqual(h.refreshes, [], 'the live pair must not be rotated for a superseded token');
  assert.equal(h.store.getState().auth.user.token, 'post-change');
  assert.equal(h.expired(), false);
});

test('B: a token swap that lands while the doomed refresh is in flight does not end the session', async t => {
  const h = await harness(t);
  h.signIn(7, 'pre-change', 'pre-change-refresh');
  const sent = [];
  h.http.defaults.adapter = async config => {
    sent.push(config.headers.Authorization);
    if (config.headers.Authorization === 'Bearer pre-change') throw unauthorized(config);
    return h.ok(config);
  };
  h.refresh = config => {
    // The 401 beat the password-change response home; it arrives now.
    h.store.dispatch(h.setTokens({access: 'post-change', refresh: 'post-change-refresh'}));
    h.setAuthToken('post-change');
    throw unauthorized(config);
  };
  const response = await h.http.get('/v1/auditions/stats/');
  assert.equal(response.status, 200);
  assert.deepEqual(sent, ['Bearer pre-change', 'Bearer post-change']);
  assert.equal(h.store.getState().auth.user?.id, 7, 'still signed in');
  assert.equal(h.expired(), false);
});

test('B: a 401 for a request issued before a sign-out is dropped, even when the same user has signed back in', async t => {
  const h = await harness(t);
  h.signIn(7, 'session-1');
  let release;
  const held = new Promise(resolve => { release = resolve; });
  const sent = [];
  h.http.defaults.adapter = async config => {
    sent.push(config.headers.Authorization);
    await held;
    throw unauthorized(config);
  };
  const pending = h.http.post('/v1/auditions/tracker/', {title: 'issued in session 1'});
  await delay(10);
  await h.store.dispatch(h.performLogout());
  h.signIn(7, 'session-2');
  release();
  await assert.rejects(pending, error => error.code === h.STALE_AUTH_REQUEST);
  assert.deepEqual(sent, ['Bearer session-1'], 'a write from the ended session is not replayed into the new one');
  assert.deepEqual(h.refreshes, []);
  assert.equal(h.store.getState().auth.user.token, 'session-2');
  assert.equal(h.expired(), false);
});

test('B: after the server confirms account deletion, 401s as that user are not a session expiry', async t => {
  const h = await harness(t);
  h.signIn(3);
  h.http.defaults.adapter = async config => {
    if (config.method === 'delete') return h.ok(config, {success: true});
    throw unauthorized(config); // the account no longer exists
  };
  await h.http.delete('/v1/users/account/', {data: {confirm_email: 'u3@example.com'}});
  // performLogout has not reached logoutUser yet: the user is still in the store.
  assert.equal(h.store.getState().auth.user.id, 3);
  await assert.rejects(h.http.get('/v1/notifications/'), error => error.code === h.STALE_AUTH_REQUEST);
  assert.deepEqual(h.refreshes, []);
  assert.equal(h.expired(), false, 'no "session expired" toast or reload may cut the device wipe short');

  await h.store.dispatch(h.performLogout({accountDeleted: true}));
  assert.ok(h.calls.includes('tapes-wiped'));
  assert.equal(h.store.getState().auth.user, null);
});

test('B: deleting the account does not blunt expiry handling for whoever signs in next', async t => {
  const h = await harness(t);
  h.signIn(3);
  h.http.defaults.adapter = async config => h.ok(config);
  await h.http.delete('/v1/users/account/');
  await h.store.dispatch(h.performLogout({accountDeleted: true}));
  h.signIn(4);
  h.http.defaults.adapter = async config => { throw unauthorized(config); };
  await assert.rejects(h.http.get('/v1/notifications/'), error => error.response?.status === 401);
  assert.deepEqual(h.refreshes, ['refresh-4']);
  assert.equal(h.store.getState().auth.user, null);
  assert.equal(h.expired(), true);
});

test('B: a genuine expiry still refreshes once, and still logs out when the refresh is dead', async t => {
  const h = await harness(t);
  h.signIn(7, 'stale-access', 'live-refresh');
  const sent = [];
  h.http.defaults.adapter = async config => {
    sent.push(config.headers.Authorization);
    if (config.headers.Authorization === 'Bearer stale-access') throw unauthorized(config);
    return h.ok(config);
  };
  h.refresh = config => h.ok(config, {access: 'fresh-access', refresh: 'fresh-refresh'});
  assert.equal((await h.http.get('/v1/auditions/stats/')).status, 200);
  assert.deepEqual(sent, ['Bearer stale-access', 'Bearer fresh-access']);
  assert.deepEqual(h.refreshes, ['live-refresh']);
  assert.equal(h.expired(), false);

  h.http.defaults.adapter = async config => { throw unauthorized(config); };
  h.refresh = config => { throw unauthorized(config); };
  await assert.rejects(h.http.get('/v1/auditions/stats/'), error => error.response?.status === 401);
  assert.equal(h.store.getState().auth.user, null);
  assert.equal(h.expired(), true);
});

const read = path => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8');
const code = path => read(path).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

test('B: a completed password reset runs the full sign-out, without calling the API as the revoked session', () => {
  // The root reducer clears redux on auth/resetPassword/fulfilled, but the
  // axios bearer, the entitlement cache, the purchases identity and the tapes
  // on the device are outside redux.
  const src = code('panels/Authentication/ResetPassword/index.jsx');
  const success = src.slice(src.indexOf("requestStatus === 'fulfilled'"), src.indexOf("navigate('/login')"));
  assert.match(success, /await dispatch\(performLogout\(\{ accountDeleted: true \}\)\)/);
});

test('C: the role picker cannot strand anyone on a call to an endpoint the API does not have', () => {
  const modal = code('components/Auth/RoleSelectionModal.jsx');
  assert.doesNotMatch(modal, /switchRole|switch-role/);
  // PublicRoutes mounts it with a no-op onClose, so handing the route back is
  // the only way out; it must not wait on a tap or a request.
  assert.match(modal, /useEffect\(\(\) => \{\s*if \(open\) onRoleSelected\?\.\(role, getFirstRouteByRole\(role\)\);/);
  assert.match(modal, /return null;/);
});
