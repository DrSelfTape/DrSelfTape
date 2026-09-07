import assert from 'node:assert/strict';
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
      export {default as http, setAuthToken} from './src/redux/http';
      export {default as profile, updateProfileThunk} from './src/redux/features/profile/profileSlice';
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
