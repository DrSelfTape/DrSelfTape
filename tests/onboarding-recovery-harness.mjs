// Real App, Home, onboarding, Redux slices and HTTP interceptor. Only leaf UI,
// platform services and the network adapter are replaced. No live API calls.
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));

export async function recoveryBundle(firstReviewFlow = true) {
  const mobile = await readFile(new URL('../src/panels/Mobile/MobileApp.jsx', import.meta.url), 'utf8');
  const closeMarkup = mobile.match(/\{showOnboarding && <AuroraOnboarding onClose=\{\(\) => setShowOnboarding\(false\)\} \/>\}/)?.[0];
  if (!closeMarkup) throw new Error('Update harness for the real MobileApp close handler');
  const analytics = await readFile(new URL('../src/utils/analytics.js', import.meta.url), 'utf8');
  const events = analytics.match(/export const Events = \{[\s\S]*?\n\};/)[0];
  const mocks = {
    store: `export const store = {getState: () => window.store.getState(), dispatch: a => window.store.dispatch(a)};
      export const persistor = {purge: async () => { window.purges++; }};`,
    analytics: `${events}
      export const trackEvent = (event, props) => window.events.push({event, props});
      export const initAnalytics = () => {}; export const identifyUser = () => {};
      export const getPostHogDistinctId = () => '';`,
    socket: 'export const SocketProvider = ({children}) => children;',
    sentry: 'export const identifySentryUser = () => {}; export const clearSentryUser = () => {};',
    purchases: 'export const initPurchases = () => {}; export const resetPurchases = () => {};',
    openExternal: 'export const openExternal = () => {};',
    uploadQueue: 'export const resumeQueue = () => {};',
    usePushNotifications: `export const usePushNotifications = () => ({permission: 'prompt', requestPermission: async () => {}});
      export const unregisterPushToken = async () => {};`,
    AIConsentModal: 'export default () => null; export const requestAiConsent = async () => true;',
    AgeGateModal: 'export default () => null;',
    auditionsSlice: 'export const fetchAuditionStatsThunk = () => ({type: "test/noop"});',
    submissionsSlice: 'export const fetchSubmissionsThunk = () => ({type: "test/noop"});',
    readersMatchSlice: 'export const fetchMatchingStats = () => ({type: "test/noop"});',
    routes: `import React from 'react'; import {MemoryRouter, Routes, Route} from 'react-router-dom';
      import Home from './src/panels/Dashboard/Home/index.jsx';
      export const Router = () => <MemoryRouter initialEntries={['/dashboard/home']}><Routes>
        <Route path="/dashboard/home" element={<Home />} />
        <Route path="/dashboard/jericho" element={<div data-testid="jericho">Tape review</div>} />
      </Routes></MemoryRouter>;`,
    leaf: 'export default () => null;',
  };
  const result = await build({
    stdin: { resolveDir: root, loader: 'jsx', contents: `
      import React, {useState} from 'react'; import {createRoot} from 'react-dom/client';
      import {Provider} from 'react-redux'; import {configureStore} from '@reduxjs/toolkit';
      import bareAxios, {AxiosError} from 'axios';
      import http, {setAuthToken} from './src/redux/http';
      import auth, {logoutUser, setTokens, loginUser} from './src/redux/features/auth/authSlice';
      import profile from './src/redux/features/profile/profileSlice';
      import userSettings from './src/redux/features/userSettings/userSettingsSlice';
      import AuroraOnboarding from './src/panels/Onboarding/AuroraOnboarding';
      import {flushPendingPersonalization} from './src/panels/Onboarding/pendingPersonalization';
      import App from './src/App';
      window.events = []; window.actions = []; window.attempts = []; window.accepted = [];
      window.purges = 0; window.refreshes = 0; window.serverSettings = {};
      window.serverProfile = {id: 42, first_name: 'Joseph', last_name: 'Actor'};
      window.store = configureStore({reducer: {auth, profile, userSettings,
        auditions: () => ({stats: {data: {}, loading: false}}), submissions: () => ({submissions: []})},
        preloadedState: {auth: {user: {id: 42, token: 'expired', refresh: 'refresh-a', first_name: 'Joseph', last_name: 'Actor'}, isAuthenticated: true}},
        middleware: getDefault => getDefault().concat(() => next => action => {window.actions.push(action.type); sessionStorage.setItem('actions', JSON.stringify(window.actions)); return next(action);})});
      setAuthToken('expired');
      const response = (config, data) => ({config, status: 200, statusText: 'OK', headers: {}, data});
      const fail = (config, status) => { throw new AxiosError('test failure', 'ERR_BAD_RESPONSE', config, null, {status, data: {}, config}); };
      bareAxios.defaults.adapter = async config => {
        if (!config.url.endsWith('/token/refresh/')) throw new Error('Unexpected bare HTTP request');
        window.refreshes++;
        if (window.refreshDelay) await new Promise(resolve => setTimeout(resolve, window.refreshDelay));
        sessionStorage.setItem('refreshed', 'true'); return response(config, {access: 'fresh', refresh: 'refresh-b'});
      };
      http.defaults.adapter = async config => {
        if (config.url.endsWith('/settings/')) {
          if (config.method === 'patch') Object.assign(window.serverSettings, JSON.parse(config.data).data);
          return response(config, {data: {data: {...window.serverSettings}}});
        }
        if (!config.url.endsWith('/profile/')) throw new Error('Unexpected HTTP request: ' + config.url);
        if (config.method === 'patch') {
          const fields = Object.fromEntries(config.data);
          window.attempts.push(fields);
          if (window.expireNext) {window.expireNext = false; fail(config, 401);}
          if (window.failWrites) fail(config, 503);
          if (window.holdWrites) await new Promise(resolve => {window.releaseWrite = resolve;});
          if (window.late401AfterHold) {window.late401AfterHold = false; fail(config, 401);}
          if (config.signal?.aborted) throw new bareAxios.CanceledError();
          if (fields.onboarding_personalization) fields.onboarding_personalization = JSON.parse(fields.onboarding_personalization);
          Object.assign(window.serverProfile, fields);
          window.accepted.push(fields);
        }
        return response(config, {data: {...window.serverProfile}});
      };
      const root = createRoot(document.getElementById('root'));
      function MobileCloseHarness() {
        const [showOnboarding, setShowOnboarding] = useState(true);
        return <><button onClick={() => setShowOnboarding(false)}>Parent closes onboarding</button>
          ${closeMarkup}
          {!showOnboarding && <div data-testid="closed">Closed</div>}
        </>;
      }
      window.mountOnboarding = (step = 0) => {
        localStorage.setItem('dst_onb_step_v3', String(step));
        root.render(<Provider store={window.store}><MobileCloseHarness key={Math.random()} /></Provider>);
      };
      window.mountApp = () => root.render(<Provider store={window.store}><App /></Provider>);
      window.logout = () => window.store.dispatch(logoutUser());
      window.signIn = id => {
        window.store.dispatch(loginUser.fulfilled({id, first_name: 'Actor', token: {access: 'fresh', refresh: 'refresh-b'}}, 'test-login'));
        setAuthToken('fresh');
      };
      window.rotate = () => window.store.dispatch(setTokens({access: 'fresh', refresh: 'refresh-b'}));
      window.flushPersonalization = () => flushPendingPersonalization(window.store);
      window.mountOnboarding();
    ` },
    bundle: true, write: false, platform: 'browser', format: 'iife', jsx: 'automatic',
    loader: {'.css': 'empty'},
    define: {'import.meta.env': JSON.stringify({DEV: true, VITE_FIRST_REVIEW_FLOW: String(firstReviewFlow), VITE_API_URL: 'https://test.invalid/api'})},
    plugins: [{name: 'isolated-services', setup(builder) {
      builder.onResolve({filter: /.*/}, ({path, importer}) => {
        let key;
        if (path.endsWith('/store') && importer.includes('/src/redux/')) key = 'store';
        else if (path === './routes/index' && importer.endsWith('/App.jsx')) key = 'routes';
        else key = Object.keys(mocks).find(name => !['store', 'routes'].includes(name) && path.endsWith('/' + name));
        if (importer.endsWith('/Home/index.jsx') && path.includes('/components/') && !path.includes('/ui/card')) key = 'leaf';
        if (key) return {path: key, namespace: 'mock'};
      });
      builder.onLoad({filter: /.*/, namespace: 'mock'}, ({path}) => ({contents: mocks[path], loader: 'jsx', resolveDir: root}));
    }}],
  });
  return result.outputFiles[0].text;
}
