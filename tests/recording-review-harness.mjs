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
        jerichoTapeReview: '/v1/ai/jericho/tape-review/', jerichoTapeReviewPresign: '/presign/', analysisJob: '/jobs/' };`,
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
    'CompareTakes': 'export default function CompareTakes() { return null; }',
    'TapeAnalyzerTutorial': 'export const TAPE_TUTORIAL_KEY = "tutorial"; export default function Tutorial() { return null; }',
    'selfTapeStore': `export const isIOSNative = () => false; export const saveLocalTape = () => {};
      export const deleteLocalTape = saveLocalTape, makeLocalTapeId = saveLocalTape, listLocalTapes = saveLocalTape;`,
    'uploadQueue': 'export const enqueueUpload = () => {}; export const subscribe = () => () => {}; export const getQueueSnapshot = () => [];',
    'openExternal': 'export const openExternal = () => {};',
    '@sentry/react': 'export const captureException = () => {};',
  };
  const result = await build({
    stdin: { resolveDir: root, contents: `
      export { default as reducer, reviewTape, selectReviewRecording, clearTapeReview } from './src/redux/features/jericho/jerichoSlice.js';
      export { default as TapeReview } from './src/panels/Dashboard/Jericho/TapeReview.jsx';
      export { TapeCard } from './src/panels/Dashboard/SelfTapes/index.jsx';
    ` },
    bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external', jsx: 'automatic',
    define: { 'import.meta.env': '{}' },
    plugins: [{ name: 'recording-review-services', setup(builder) {
      builder.onResolve({ filter: /.*/ }, ({ path }) => {
        const key = Object.keys(mocks).find(name => path === name || path.endsWith('/' + name));
        if (key) return { path: key, namespace: 'mock' };
      });
      builder.onLoad({ filter: /.*/, namespace: 'mock' }, ({ path }) => ({ contents: mocks[path], loader: 'js' }));
    } }],
  });
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', result.outputFiles[0].text)(require, mod, mod.exports);
  return mod.exports;
}
