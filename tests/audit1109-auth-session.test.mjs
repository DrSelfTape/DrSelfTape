// Audit 2026-11-09, auth lane. Runs the REAL store, root reducer, authSlice
// thunks and http interceptors; only device services (push, purchases, tape
// store, analytics) are stubbed.
//   C  logout resets every slice, so the next account never sees cached data
//   D  a password change swaps in the token pair the server minted after it
//   E  logout after account deletion makes no call as the deleted user
import assert from 'node:assert/strict';
import {before, test} from 'node:test';
import {setTimeout as delay} from 'node:timers/promises';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {AxiosError} from 'axios';

let bundle;
before(async () => {
  const result = await build({
    stdin: {resolveDir: fileURLToPath(new URL('../', import.meta.url)), contents: `
      export {store, persistor, rootReducer} from './src/redux/store';
      export {default as http} from './src/redux/http';
      export {performLogout, updatePassword} from './src/redux/features/auth/authSlice';
      export {showSnackbar} from './src/redux/features/snackbarSlice/snackbarSlice';`},
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
      // redux-persist's own engine binds to the first localStorage it sees
      // and is cached by require, so each harness gets one over its own Map.
      builder.onResolve({filter: /^redux-persist\/lib\/storage$/}, () => ({path: 'storage', namespace: 'mock'}));
      builder.onResolve({filter: /\/(usePushNotifications|purchases|useTokenBalance|selfTapeStore|analytics)$/}, ({path}) => ({path: path.split('/').at(-1), namespace: 'mock'}));
      builder.onLoad({filter: /.*/, namespace: 'mock'}, ({path}) => ({contents: mocks[path]}));
    }}],
  });
  bundle = result.outputFiles[0].text;
});

const LOGIN = (id, access = `access-${id}`, refresh = `refresh-${id}`) =>
  ({type: 'auth/login/fulfilled', payload: {id, email: `u${id}@example.com`, token: {access, refresh}}});

async function harness(t) {
  const values = new Map();
  const storage = {getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key)};
  const previous = {window: globalThis.window, localStorage: globalThis.localStorage};
  globalThis.localStorage = storage;
  const win = {localStorage: storage, location: {pathname: '/login'}, calls: []};
  globalThis.window = win;
  const mod = {exports: {}};
  new Function('require', 'module', 'exports', bundle)(createRequire(import.meta.url), mod, mod.exports);
  const api = mod.exports;
  t.after(() => {
    api.persistor.pause();
    globalThis.window = previous.window; globalThis.localStorage = previous.localStorage;
  });
  for (let i = 0; i < 50 && !api.store.getState()._persist?.rehydrated; i++) await delay(5);
  assert.equal(api.store.getState()._persist?.rehydrated, true, 'store should rehydrate');
  const response = (config, data) => ({config, status: 200, statusText: 'OK', headers: {}, data});
  return {...api, storage, calls: win.calls, response};
}

const PERSISTED_USER_SLICES = ['auditions', 'submissions', 'readersMatch', 'sceneStudyScripts', 'profile', 'userSettings'];

test('C: auth/logoutUser returns every slice to its initial state and keeps only the snackbar', async t => {
  const h = await harness(t);
  const initial = h.rootReducer(undefined, {type: '@@audit/init'});
  // Mark every slice as holding account A's data.
  const dirty = Object.fromEntries(Object.entries(initial).map(([key, slice]) => [key, {...slice, leakedFromAccountA: true}]));
  for (const key of PERSISTED_USER_SLICES) assert.ok(key in dirty, `${key} should be a slice`);

  const after = h.rootReducer(dirty, {type: 'auth/logoutUser'});
  for (const key of Object.keys(initial)) {
    if (key === 'snackbar') continue;
    assert.deepEqual(after[key], initial[key], `${key} must not carry the previous account's state past logout`);
  }
  assert.equal(after.snackbar.leakedFromAccountA, true, 'the snackbar survives so the sign-out toast is not wiped');

  // A completed password reset ends the session too.
  const afterReset = h.rootReducer(dirty, {type: 'auth/resetPassword/fulfilled'});
  for (const key of PERSISTED_USER_SLICES) assert.equal(afterReset[key].leakedFromAccountA, undefined, key);
  assert.equal(afterReset.auth.user, null);

  // Any other action leaves state alone.
  assert.equal(h.rootReducer(dirty, {type: 'something/else'}).auditions.leakedFromAccountA, true);
});

test('C: performLogout on the live store leaves nothing of the account in memory or in storage', async t => {
  const h = await harness(t);
  h.store.dispatch(LOGIN(1));
  h.store.dispatch({type: 'userSettings/fetch/fulfilled', payload: {theme: 'account-a-theme'}});
  h.store.dispatch(h.showSnackbar({message: 'kept', variant: 'info'}));
  const snackbar = h.store.getState().snackbar;
  assert.deepEqual(h.store.getState().userSettings.data, {theme: 'account-a-theme'});
  await delay(20);
  assert.match(h.storage.getItem('persist:root') || '', /account-a-theme/, 'precondition: the slice was persisted');

  await h.store.dispatch(h.performLogout());
  await delay(20); // let any trailing persist write land

  const state = h.store.getState();
  assert.equal(state.auth.user, null);
  assert.deepEqual(state.userSettings.data, {});
  assert.deepEqual(state.snackbar, snackbar);
  assert.equal(state._persist.rehydrated, true, 'the reset must not disturb redux-persist bookkeeping');
  const persisted = h.storage.getItem('persist:root') || '';
  assert.doesNotMatch(persisted, /account-a-theme|access-1|refresh-1/, 'purge and the root reset must not fight');
  assert.equal(h.http.defaults.headers.common.Authorization, undefined);
});

test('D: a successful password change stores the pair the server minted after the change', async t => {
  const h = await harness(t);
  h.store.dispatch(LOGIN(7, 'pre-change-access', 'pre-change-refresh'));
  h.http.defaults.adapter = async config => {
    assert.match(config.url, /\/v1\/users\/passwordupdate\/$/);
    return h.response(config, {data: {token: {access: 'post-change-access', refresh: 'post-change-refresh'}}, message: 'Success', success: true});
  };
  const result = await h.store.dispatch(h.updatePassword({current_password: 'a', new_password: 'b'}));
  assert.equal(result.meta.requestStatus, 'fulfilled');
  const user = h.store.getState().auth.user;
  assert.equal(user.token, 'post-change-access');
  assert.equal(user.refresh, 'post-change-refresh');
  assert.equal(user.id, 7);
  assert.equal(h.http.defaults.headers.common.Authorization, 'Bearer post-change-access');
});

test('D: a pair that arrives after another account signed in is not applied to it', async t => {
  const h = await harness(t);
  h.store.dispatch(LOGIN(7));
  h.http.defaults.adapter = async config => {
    h.store.dispatch(LOGIN(8));
    return h.response(config, {data: {token: {access: 'for-user-7', refresh: 'for-user-7'}}, message: 'Success', success: true});
  };
  await h.store.dispatch(h.updatePassword({current_password: 'a', new_password: 'b'}));
  assert.equal(h.store.getState().auth.user.token, 'access-8');
  assert.equal(h.store.getState().auth.user.refresh, 'refresh-8');
});

test('D: a wrong current password rejects with the server message as a plain string', async t => {
  const h = await harness(t);
  h.store.dispatch(LOGIN(7));
  h.http.defaults.adapter = async config => {
    throw new AxiosError('Bad Request', 'ERR_BAD_REQUEST', config, {}, {
      config, status: 400, statusText: 'Bad Request', headers: {},
      data: {message: 'current_password, Invalid Current Password', success: false},
    });
  };
  const result = await h.store.dispatch(h.updatePassword({current_password: 'wrong', new_password: 'b'}));
  assert.equal(result.meta.requestStatus, 'rejected');
  assert.equal(result.payload, 'current_password, Invalid Current Password');
  assert.equal(h.store.getState().auth.user.token, 'access-7', 'a failed change leaves the session alone');
});

test('E: logout after account deletion skips the push unregister but still wipes the device', async t => {
  const h = await harness(t);
  h.store.dispatch(LOGIN(3));
  await h.store.dispatch(h.performLogout({accountDeleted: true}));
  assert.ok(!h.calls.includes('push-unregister'), 'no request may go out as the deleted user');
  assert.ok(h.calls.includes('tapes-wiped'));
  assert.ok(h.calls.includes('purchases-reset'));
  assert.equal(h.store.getState().auth.user, null);
});

test('E: an ordinary logout still unregisters the push token first', async t => {
  const h = await harness(t);
  h.store.dispatch(LOGIN(3));
  await h.store.dispatch(h.performLogout());
  assert.equal(h.calls[0], 'push-unregister');
  assert.ok(h.calls.includes('tapes-wiped'));
});
