// Real Redux pipeline and React components; only network/native services are
// replaced. Runs without a local server, browser, credentials or AI provider.
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('../', import.meta.url));

export async function loadRecordingReview() {
  const mocks = {
    'react-redux': `export const useSelector = fn => fn(globalThis.__reviewStore.getState());
      export const useDispatch = () => globalThis.__reviewStore.dispatch;`,
    'http': 'export default { post: (...args) => globalThis.__reviewHttp.post(...args), get: (...args) => globalThis.__reviewHttp.get(...args) };',
    'axios': 'export default { put: (...args) => globalThis.__reviewHttp.put(...args) };',
    'constant': `export const baseURL = '';
      export default { jerichoReviewRecording: '/v1/ai/jericho/review-recording/',
        jerichoTapeReview: '/v1/ai/jericho/tape-review/', jerichoTapeReviewPresign: '/presign/', analysisJob: '/jobs/', latestReview: '/latest/' };`,
    'analytics': `export const Events = { TAPE_REVIEW: 'tape_review' };
      export const trackEvent = (event, props) => globalThis.__reviewEvents.push({event, props});`,
    'useAIGate': 'export default function useAIGate() {}',
    'useTokenBalance': 'export const useTokenBalance = () => ({ isPaid: false, balance: 2, loading: false, error: null });',
    'usePushNotifications': `export const usePushNotifications = () => ({permission: 'granted'});
      export const isCapacitorNative = () => false; export const openNotificationSettings = () => {};`,
    'useShareImageCapture': 'export const useShareImageCapture = () => ({ captureImage: async () => null });',
    'saveMedia': 'export const saveBlobUrl = async () => ({ok: true});',
    'haptics': 'export const tapSelect = () => {}; export const cheer = tapSelect, warn = tapSelect;',
    'goUpgrade': 'export const goUpgrade = () => {};',
    'TutorialChecklist': 'export const markStep = () => {};',
    'CompareTakes': 'export default function CompareTakes() { return "Compare screen"; }',
    'TapeAnalyzerTutorial': 'export const TAPE_TUTORIAL_KEY = "tutorial"; export default function Tutorial() { return null; }',
    'selfTapeStore': `export const isIOSNative = () => false; export const saveLocalTape = () => {};
      export const deleteLocalTape = saveLocalTape, makeLocalTapeId = saveLocalTape; export const listLocalTapes = async () => [];`,
    'uploadQueue': 'export const enqueueUpload = () => {}; export const subscribe = () => () => {}; export const getQueueSnapshot = () => [];',
    'openExternal': 'export const openExternal = () => {};',
    '@sentry/react': 'export const captureException = () => {};',
    '@capacitor/core': 'export const Capacitor = { isNativePlatform: () => !!globalThis.__native, getPlatform: () => globalThis.__native ? "ios" : "web" };',
    'react-router-dom': 'export const useNavigate = () => path => globalThis.__routes.push(path); export const Outlet = () => null;',
    'Sidebar.jsx': 'export default function Sidebar() { return null; }',
    'MobileApp.jsx': 'export default function MobileApp() { return null; }',
    'AnnouncementBanner.jsx': 'export default function AnnouncementBanner() { return null; }',
    'ConsoleCommandPalette.jsx': 'export default function ConsoleCommandPalette() { return null; }',
  };
  const result = await build({
    stdin: { resolveDir: root, contents: `
      export * from './src/redux/features/jericho/jerichoSlice.js';
      export { default as reducer } from './src/redux/features/jericho/jerichoSlice.js';
      export { default as TapeReview } from './src/panels/Dashboard/Jericho/TapeReview.jsx';
      export { TapeCard, default as SelfTapes } from './src/panels/Dashboard/SelfTapes/index.jsx';
      export { default as DashboardLayout } from './src/panels/Dashboard/DashboardLayout.jsx';
    ` },
    bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external', jsx: 'automatic',
    define: { 'import.meta.env': '{}' },
    plugins: [{ name: 'recording-review-services', setup(builder) {
      builder.onResolve({ filter: /.*/ }, ({ path, importer }) => {
        if (path === 'react' && /(?:TapeReview\.jsx|DashboardLayout\.jsx|SelfTapes\/index\.jsx|useIsMobile\.js)$/.test(importer)) {
          return { path: 'hooks', namespace: 'mock' };
        }
        if (path === 'react') return { path, external: true };
        const key = Object.keys(mocks).find(name => path === name || path.endsWith('/' + name));
        if (key) return { path: key, namespace: 'mock' };
      });
      builder.onLoad({ filter: /.*/, namespace: 'mock' }, ({ path }) => ({ contents: path === 'hooks' ? `
        import * as React from 'react';
        export const Suspense = React.Suspense;
        export const useState = (...a) => (globalThis.__hooks || React).useState(...a);
        export const useRef = (...a) => (globalThis.__hooks || React).useRef(...a);
        export const useEffect = (...a) => (globalThis.__hooks || React).useEffect(...a);
      ` : mocks[path], loader: 'js' }));
    } }],
  });
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', result.outputFiles[0].text)(require, mod, mod.exports);
  return mod.exports;
}

// Explicit hook lifecycle driver for the real component functions. Effects,
// handlers and Redux thunks run; DOM layout/native events are not simulated.
// This avoids making the money-path regressions depend on a listening port.
export function mountComponent(Component, props = {}) {
  const slots = [], effects = [], cleanups = [];
  let cursor = 0;
  const hooks = {
    useState(initial) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial;
      return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }];
    },
    useRef(initial) { const [ref] = hooks.useState(() => ({ current: initial })); return ref; },
    useEffect(fn, deps) {
      const i = cursor++;
      if (!slots[i] || !deps || deps.some((v, j) => v !== slots[i][j])) {
        effects.push(() => { cleanups[i]?.(); cleanups[i] = fn(); });
        slots[i] = deps;
      }
    },
  };
  return {
    render() {
      cursor = 0; globalThis.__hooks = hooks;
      try { return Component(props); } finally { delete globalThis.__hooks; }
    },
    flush() { effects.splice(0).forEach(run => run()); },
    unmount() { cleanups.forEach(cleanup => cleanup?.()); },
  };
}
