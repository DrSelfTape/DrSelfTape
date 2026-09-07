import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {before, test} from 'node:test';
import {setTimeout as delay} from 'node:timers/promises';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {configureStore} from '@reduxjs/toolkit';
import {AxiosError} from 'axios';

let bundle;
before(async () => {
  const result = await build({
    stdin: {resolveDir: fileURLToPath(new URL('../', import.meta.url)), contents: `
      export {default as bareAxios} from 'axios';
      export {default as http, setAuthToken, STALE_AUTH_REQUEST} from './src/redux/http';
      export {default as profile, updateProfileThunk, fetchProfileThunk} from './src/redux/features/profile/profileSlice';
      export {createOnboardingSession} from './src/panels/Onboarding/onboardingSession';
      export {flushPendingPersonalization, pendingKey} from './src/panels/Onboarding/pendingPersonalization';`},
    bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external',
    define: {'import.meta.env': JSON.stringify({DEV: true, VITE_API_URL: 'https://test.invalid/api'})},
    plugins: [{name: 'isolated-auth-services', setup(builder) {
      const mocks = {
        store: 'export const store = {getState: () => window.store.getState(), dispatch: a => window.store.dispatch(a)}; export const persistor = {purge: async () => {window.purges++;}};',
        authSlice: 'export const setTokens = payload => ({type: "auth/setTokens", payload}); export const logoutUser = () => ({type: "auth/logoutUser"});',
        analytics: 'export const trackEvent = () => {};',
      };
      builder.onResolve({filter: /\/(store|authSlice|analytics)$/}, ({path}) => ({path: path.split('/').at(-1), namespace: 'mock'}));
      builder.onLoad({filter: /.*/, namespace: 'mock'}, ({path}) => ({contents: mocks[path]}));
    }}],
  });
  bundle = result.outputFiles[0].text;
});

// The login boundary is pinned to the REAL thunk prefix in authSlice.js (review #5 catch:
// the reducer and this test both used an invented 'auth/loginUser/fulfilled' string).
const AUTH_SLICE_SRC = readFileSync(new URL('../src/redux/features/auth/authSlice.js', import.meta.url), 'utf8');
const LOGIN_PREFIX = AUTH_SLICE_SRC.match(/export const loginUser = createAsyncThunk\(\s*'([^']+)'/)[1];
const LOGIN_FULFILLED = `${LOGIN_PREFIX}/fulfilled`;
assert.equal(LOGIN_FULFILLED, 'auth/login/fulfilled');

function harness(t) {
  const values = new Map();
  const storage = {getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key)};
  const previous = {window: globalThis.window, localStorage: globalThis.localStorage};
  globalThis.localStorage = storage;
  globalThis.window = {localStorage: storage, location: {pathname: '/login'}, purges: 0};
  const mod = {exports: {}};
  new Function('require', 'module', 'exports', bundle)(createRequire(import.meta.url), mod, mod.exports);
  const api = mod.exports;
  const adapter = api.bareAxios.defaults.adapter;
  t.after(() => {globalThis.window = previous.window; globalThis.localStorage = previous.localStorage; api.bareAxios.defaults.adapter = adapter;});
  const actions = [];
  const store = configureStore({reducer: {
    profile: api.profile,
    auth: (state = {user: {id: 42, token: 'expired', refresh: 'refresh-a'}}, action) => {
      if (action.type === 'auth/logoutUser') return {user: null};
      if (action.type === LOGIN_FULFILLED) return {user: action.payload};
      if (action.type === 'auth/setTokens') return {user: {...state.user, token: action.payload.access}};
      return state;
    },
  }, middleware: getDefault => getDefault().concat(() => next => action => {actions.push(action.type); return next(action);})});
  window.store = store;
  api.setAuthToken('expired');
  const response = (config, data) => ({config, status: 200, statusText: 'OK', headers: {}, data});
  return {...api, store, storage, actions, response};
}

test('real interceptor: a nine-second successful refresh acknowledges the save without logout', async t => {
  const h = harness(t);
  let attempts = 0;
  let refreshed = false;
  h.bareAxios.defaults.adapter = async config => {
    assert.equal(config.timeout, 15000);
    await delay(9000);
    refreshed = true;
    return h.response(config, {access: 'fresh', refresh: 'refresh-b'});
  };
  h.http.defaults.adapter = async config => {
    if (++attempts === 1) throw new AxiosError('expired', 'ERR_BAD_RESPONSE', config, null, {status: 401, data: {}, config});
    return h.response(config, {data: {id: 42, first_name: 'Joseph'}});
  };
  const scope = h.createOnboardingSession(h.store);
  t.after(() => scope.dispose());
  const saved = await scope.run(h.store.dispatch, h.updateProfileThunk(new FormData()));
  await delay(1100); // Let the pre-fix refresh/logout finish even if its save aborted at 8s.
  assert.equal(refreshed, true);
  assert.equal(h.actions.includes('auth/logoutUser'), false);
  assert.equal(window.purges, 0);
  assert.equal(saved, true);
  assert.equal(attempts, 2);
  assert.equal(h.store.getState().profile.profile.first_name, 'Joseph');
});

function switchActor(h) {
  h.store.dispatch({type: 'auth/logoutUser'});
  h.store.dispatch({type: LOGIN_FULFILLED, payload: {id: 99, token: 'actor-b', refresh: 'refresh-b'}});
  h.setAuthToken('actor-b');
}

test('a late 401 from actor A never refreshes or retries A’s payload as actor B', async t => {
  const h = harness(t);
  let release, sent;
  const gate = new Promise(resolve => {release = resolve;});
  const started = new Promise(resolve => {sent = resolve;});
  t.after(release);
  let refreshes = 0;
  h.bareAxios.defaults.adapter = async config => {refreshes++; return h.response(config, {access: 'actor-b-refreshed'});};
  const attempts = [];
  const serverB = {id: 99, first_name: 'B'};
  h.http.defaults.adapter = async config => {
    attempts.push({id: config._authUserId, token: config.headers.Authorization, name: config.data.get('first_name')});
    if (attempts.length === 1) {
      sent(); await gate;
      throw new AxiosError('expired', 'ERR_BAD_RESPONSE', config, null, {status: 401, data: {}, config});
    }
    serverB.first_name = config.data.get('first_name');
    return h.response(config, {data: serverB});
  };
  const scope = h.createOnboardingSession(h.store);
  t.after(() => scope.dispose());
  const fd = new FormData(); fd.append('first_name', 'A');
  const pending = scope.run(h.store.dispatch, h.updateProfileThunk(fd));
  await started;
  assert.equal(h.store.getState().profile.updateLoading, true);
  switchActor(h);
  release();
  assert.equal(await pending, false);
  assert.equal(refreshes, 0);
  assert.deepEqual(attempts, [{id: 42, token: 'Bearer expired', name: 'A'}]);
  assert.deepEqual(serverB, {id: 99, first_name: 'B'});
  assert.deepEqual(h.store.getState().profile, {profile: null, loading: false, updateLoading: false, error: null});
  assert.equal(window.purges, 0);
  assert.equal(h.actions.filter(a => a === 'auth/logoutUser').length, 1);
});

test('a stale HTTP request has a distinct not-applied error', async t => {
  const h = harness(t);
  h.http.defaults.adapter = async config => {
    switchActor(h);
    throw new AxiosError('expired', 'ERR_BAD_RESPONSE', config, null, {status: 401, data: {}, config});
  };
  await assert.rejects(h.http.patch('/profile/', new FormData()), {code: h.STALE_AUTH_REQUEST});
});

test('an account switch during refresh cannot install old tokens, retry, or log out B', async t => {
  const h = harness(t);
  let release, refreshing;
  const gate = new Promise(resolve => {release = resolve;});
  const started = new Promise(resolve => {refreshing = resolve;});
  t.after(release);
  let attempts = 0;
  h.http.defaults.adapter = async config => {
    attempts++;
    throw new AxiosError('expired', 'ERR_BAD_RESPONSE', config, null, {status: 401, data: {}, config});
  };
  h.bareAxios.defaults.adapter = async config => {refreshing(); await gate; return h.response(config, {access: 'new-a', refresh: 'new-refresh-a'});};
  const pending = h.store.dispatch(h.updateProfileThunk(new FormData()));
  await started;
  switchActor(h);
  release();
  const result = await pending;
  assert.equal(result.meta.notApplied, true);
  assert.equal(attempts, 1);
  assert.equal(h.store.getState().auth.user.token, 'actor-b');
  assert.equal(h.store.getState().profile.error, null);
  assert.equal(window.purges, 0);
  assert.equal(h.actions.filter(a => a === 'auth/logoutUser').length, 1);
});

test('concurrent 401s for the same actor still share one refresh and both retry', async t => {
  const h = harness(t);
  let release, refreshing;
  const gate = new Promise(resolve => {release = resolve;});
  const started = new Promise(resolve => {refreshing = resolve;});
  t.after(release);
  let refreshes = 0;
  const attempts = [];
  h.bareAxios.defaults.adapter = async config => {refreshes++; refreshing(); await gate; return h.response(config, {access: 'fresh'});};
  h.http.defaults.adapter = async config => {
    attempts.push(config._authUserId);
    if (!config._authRetried) throw new AxiosError('expired', 'ERR_BAD_RESPONSE', config, null, {status: 401, data: {}, config});
    return h.response(config, {ok: true});
  };
  const pending = Promise.all([h.http.get('/one/'), h.http.get('/two/')]);
  await started;
  await delay(20);
  assert.equal(refreshes, 1);
  release();
  assert.equal((await pending).length, 2);
  assert.deepEqual(attempts, [42, 42, 42, 42]);
  assert.equal(h.actions.includes('auth/logoutUser'), false);
});

for (const boundary of ['auth/logoutUser', LOGIN_FULFILLED]) {
  test(`real profile reducer clears both pending flags and old profile on ${boundary}`, t => {
    const h = harness(t);
    h.store.dispatch(h.fetchProfileThunk.fulfilled({id: 42}, 'fetch'));
    h.store.dispatch(h.fetchProfileThunk.pending('fetch-pending'));
    h.store.dispatch(h.updateProfileThunk.pending('save-pending'));
    assert.equal(h.store.getState().profile.loading, true);
    assert.equal(h.store.getState().profile.updateLoading, true);
    h.store.dispatch({type: boundary, payload: {id: 99}});
    assert.deepEqual(h.store.getState().profile, {profile: null, loading: false, updateLoading: false, error: null});
  });
}

test('a background profile PATCH still completes nine seconds after its screen disposes the session', async t => {
  const h = harness(t);
  const slowWrite = delay(9000);
  t.after(() => slowWrite);
  h.http.defaults.adapter = async config => {
    await slowWrite;
    return h.response(config, {data: {id: 42, first_name: 'Joseph'}});
  };
  const scope = h.createOnboardingSession(h.store);
  const pending = scope.run(h.store.dispatch, h.updateProfileThunk(new FormData()));
  scope.dispose();
  assert.equal(await pending, true);
  assert.equal(h.store.getState().profile.profile.first_name, 'Joseph');
});

test('quota failure requires a real PATCH acknowledgment of the in-memory snapshot', async t => {
  const h = harness(t);
  const snapshot = JSON.stringify({plate: 'building_reel', taped_before: 'yes'});
  h.storage.setItem = () => {throw new DOMException('Quota exceeded', 'QuotaExceededError');};
  assert.throws(() => h.storage.setItem(h.pendingKey(42), snapshot), {name: 'QuotaExceededError'});
  assert.equal(h.storage.getItem(h.pendingKey(42)), null);
  let release;
  const gate = new Promise(resolve => {release = resolve;});
  t.after(release);
  const attempts = [];
  h.http.defaults.adapter = async config => {
    attempts.push(JSON.parse(config.data.get('onboarding_personalization')));
    await gate;
    return h.response(config, {data: {id: 42, onboarding_personalization: attempts.at(-1)}});
  };
  let acknowledged = false;
  const pending = h.flushPendingPersonalization(h.store, h.store.dispatch, snapshot).then(saved => {acknowledged = saved; return saved;});
  await delay(20);
  assert.deepEqual(attempts, [JSON.parse(snapshot)]);
  assert.equal(acknowledged, false);
  release();
  assert.equal(await pending, true);
  assert.deepEqual(h.store.getState().profile.profile.onboarding_personalization, JSON.parse(snapshot));
});

test('an in-memory snapshot stays unacknowledged after a failed PATCH and can be retried', async t => {
  const h = harness(t);
  const snapshot = JSON.stringify({plate: 'between_jobs'});
  h.storage.setItem = () => {throw new DOMException('Quota exceeded', 'QuotaExceededError');};
  let attempts = 0;
  h.http.defaults.adapter = async config => {
    if (++attempts === 1) throw new AxiosError('offline', 'ERR_BAD_RESPONSE', config, null, {status: 503, data: {}, config});
    return h.response(config, {data: {id: 42, onboarding_personalization: JSON.parse(config.data.get('onboarding_personalization'))}});
  };
  assert.equal(await h.flushPendingPersonalization(h.store, h.store.dispatch, snapshot), false);
  assert.equal(h.store.getState().profile.profile, null);
  assert.equal(await h.flushPendingPersonalization(h.store, h.store.dispatch, snapshot), true);
  assert.equal(attempts, 2);
});

test('the shared writer serializes a newer in-memory snapshot behind the pending PATCH', async t => {
  const h = harness(t);
  const older = JSON.stringify({plate: 'building_reel'});
  const newer = JSON.stringify({plate: 'between_jobs'});
  h.storage.setItem(h.pendingKey(42), older);
  let release;
  const gate = new Promise(resolve => {release = resolve;});
  t.after(release);
  const attempts = [];
  h.http.defaults.adapter = async config => {
    attempts.push(JSON.parse(config.data.get('onboarding_personalization')));
    if (attempts.length === 1) await gate;
    return h.response(config, {data: {id: 42, onboarding_personalization: attempts.at(-1)}});
  };
  const first = h.flushPendingPersonalization(h.store);
  await delay(20);
  const second = h.flushPendingPersonalization(h.store, h.store.dispatch, newer);
  assert.equal(first, second);
  assert.equal(attempts.length, 1);
  release();
  assert.equal(await second, true);
  assert.deepEqual(attempts, [JSON.parse(older), JSON.parse(newer)]);
  assert.equal(h.storage.getItem(h.pendingKey(42)), null);
  assert.deepEqual(h.store.getState().profile.profile.onboarding_personalization, JSON.parse(newer));
});
