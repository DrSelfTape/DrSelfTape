import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
export const BASE = '3691147';

export async function loadDesktopReview({ baseline = false } = {}) {
  const mocks = {
    'constant': 'export const baseURL = ""; export default {};',
    'react-redux': `export const useSelector = fn => fn(globalThis.__desktopState);
      export const useDispatch = () => () => Promise.resolve({});`,
    'useTokenBalance': 'export const useTokenBalance = () => globalThis.__desktopEntitlement;',
    'useAIGate': 'export default function useAIGate() {}',
    'http': 'export default { get: () => Promise.reject(new Error("No network in render tests")) };',
    'analytics': 'export const Events = {}; export const trackEvent = () => {};',
    'useShareImageCapture': 'export const useShareImageCapture = () => ({ captureImage: async () => null });',
    'saveMedia': 'export const saveBlobUrl = async () => ({ok:true});',
    'haptics': 'export const tapSelect = () => {}; export const cheer = tapSelect, warn = tapSelect;',
    'usePushNotifications': `export const usePushNotifications = () => ({permission: 'granted'});
      export const isCapacitorNative = () => !!globalThis.__desktopNative;
      export const openNotificationSettings = () => {};`,
    'goUpgrade': 'export const goUpgrade = () => {};',
    'TutorialChecklist': 'export const markStep = () => {};',
    'TapeAnalyzerTutorial': 'export const TAPE_TUTORIAL_KEY = "tutorial"; export default function Tutorial() { return null; }',
    '@capacitor/core': 'export const Capacitor = { isNativePlatform: () => !!globalThis.__desktopNative, getPlatform: () => globalThis.__desktopNative ? "ios" : "web" };',
    'react-router-dom': `export const useSearchParams = () => [new URLSearchParams(globalThis.__desktopTab || '')];
      export const useNavigate = () => () => {};`,
  };
  const result = await build({
    stdin: { resolveDir: root, contents: `
      export { default as DesktopPerformanceDNA } from './src/panels/Dashboard/Jericho/DesktopPerformanceDNA.jsx';
      export { default as JerichoDashboard } from './src/panels/Dashboard/Jericho/index.jsx';
    ` },
    bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external', jsx: 'automatic',
    loader: { '.css': 'empty' }, define: { 'import.meta.env': '{}' },
    plugins: [{ name: 'desktop-render-services', setup(builder) {
      builder.onResolve({ filter: /.*/ }, ({ path, importer }) => {
        if (path === 'react' && /\/(DesktopCompareMatrix|DesktopPerformanceDNA|DesktopTapeReport)\.jsx$/.test(importer)) return { path: 'hooks', namespace: 'mock' };
        if (path === 'react') return { path, external: true };
        const key = Object.keys(mocks).find(name => path === name || path.endsWith('/' + name));
        if (key) return { path: key, namespace: 'mock' };
      });
      builder.onLoad({ filter: /.*/, namespace: 'mock' }, ({ path }) => ({ contents: path === 'hooks' ? `
        import * as React from 'react';
        export const useState = (...a) => (globalThis.__hooks || React).useState(...a);
        export const useRef = (...a) => (globalThis.__hooks || React).useRef(...a);
        export const useEffect = (...a) => (globalThis.__hooks || React).useEffect(...a);
        export const useId = () => globalThis.__hooks ? 'test-id' : React.useId();
      ` : mocks[path], loader: 'js' }));
      builder.onLoad({ filter: /Jericho\/(TapeReview|TapeReviewNotes|CompareTakes|index)\.jsx$/ }, ({ path }) => {
        const source = baseline
          ? execFileSync('git', ['show', `${BASE}:${path.slice(root.length)}`], { cwd: root, encoding: 'utf8' })
          : readFileSync(path, 'utf8');
        // Exercise every reveal stage, including the shared notes renderer.
        return { contents: source.replace('const [revealStage, setRevealStage] = useState(0)',
          'const [revealStage, setRevealStage] = useState(3)'), loader: 'jsx' };
      });
    } }],
  });
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', result.outputFiles[0].text)(require, mod, mod.exports);
  return mod.exports;
}

export function setupReviewRender({ native = false, mobile = false, paid = true, review = {}, compare = null } = {}) {
  globalThis.__desktopNative = native;
  globalThis.__desktopEntitlement = { isPaid: paid, balance: 4, loading: false, error: null };
  const storage = { getItem: () => null, setItem() {}, removeItem() {} };
  globalThis.window = { innerWidth: mobile ? 390 : 1440, innerHeight: mobile ? 844 : 1000,
    ...(mobile ? { ontouchstart: null } : {}), sessionStorage: storage, localStorage: storage, location: { search: '' } };
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { maxTouchPoints: mobile ? 1 : 0 } });
  globalThis.localStorage = storage;
  globalThis.sessionStorage = storage;
  globalThis.__desktopState = {
    auth: { user: { ai_consent_accepted_at: '2026-09-01' } },
    profile: { profile: { first_name: 'Alex' } },
    userSettings: { loaded: true, data: { tutorial_progress: { first_review: true } } },
    jericho: { tapeReviewResult: review, compareResult: compare, memory: { total_sessions: 3, performance_dna: { emotional_range: 7, cold_read: 6 } }, memoryHasFetched: true, insights: [], evolution: {}, recentSessions: [] },
  };
}
