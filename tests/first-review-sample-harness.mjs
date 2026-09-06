// Local, isolated harness: real onboarding/results, mocked account services.
// No API or telemetry requests leave this page. Used by the browser tests and
// manual inspection: node tests/first-review-sample-harness.mjs
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);

export async function loadResults() {
  const result = await build({
    stdin: {
      contents: `export { default as TapeReviewNotes } from './src/panels/Dashboard/Jericho/TapeReviewNotes.jsx';
        export { default as SampleReview } from './src/panels/Onboarding/SampleReview.jsx';
        export { sampleReview } from './src/data/sampleReview.js';`,
      resolveDir: root,
    },
    bundle: true, write: false, platform: 'node', format: 'cjs',
    packages: 'external', jsx: 'automatic',
  });
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', result.outputFiles[0].text)(require, mod, mod.exports);
  return mod.exports;
}

export async function startHarness(port = 0) {
  const analytics = await readFile(path.join(root, 'src/utils/analytics.js'), 'utf8');
  const events = analytics.match(/export const Events = \{[\s\S]*?\n\};/)[0];
  const mocks = {
    'react-redux': `export const useSelector = fn => fn({auth: {user: {first_name: window.__firstName, last_name: 'Actor'}}});
      export const useDispatch = () => () => { const p = Promise.resolve({}); p.unwrap = () => p; return p; };`,
    'profileSlice': 'export const updateProfileThunk = () => ({}); export const fetchProfileThunk = () => ({});',
    'userSettingsSlice': 'export const patchUserSettings = () => ({});',
    'usePushNotifications': 'export const usePushNotifications = () => ({ permission: "prompt", requestPermission: async () => {} });',
    'AIConsentModal': `export const requestAiConsent = () => {
      window.__consentCalls += 1;
      return window.__holdConsent ? new Promise(resolve => { window.__resolveConsent = resolve; }) : Promise.resolve(window.__consent);
    };`,
    'analytics': `${events}\nexport const trackEvent = (event, props) => window.__events.push({event, props});`,
  };
  const result = await build({
    stdin: {
      contents: `import React from 'react';
        import { createRoot } from 'react-dom/client';
        import AuroraOnboarding from './src/panels/Onboarding/AuroraOnboarding.jsx';
        window.__events = []; window.__handoffs = []; window.__consentCalls = 0;
        window.__consent = true; window.__firstName = 'Joseph';
        window.__modalCount = 0;
        window.addEventListener('drst-modal-open', () => window.__modalCount++);
        window.addEventListener('drst-modal-closed', () => window.__modalCount--);
        window.addEventListener('drst-start-first-review', () => window.__handoffs.push(sessionStorage.getItem('dst_first_review_variant')));
        const root = createRoot(document.getElementById('root'));
        window.mountOffer = (step = 1, firstName = 'Joseph') => {
          window.__firstName = firstName;
          localStorage.clear(); sessionStorage.clear();
          localStorage.setItem('dst_onb_step_v3', String(step));
          window.__events = []; window.__handoffs = []; window.__consentCalls = 0;
          root.render(<AuroraOnboarding key={Math.random()} onClose={opts => { window.__closed = opts; }} />);
        };
        window.mountOffer();`,
      resolveDir: root, loader: 'jsx',
    },
    bundle: true, write: false, platform: 'browser', format: 'iife', jsx: 'automatic',
    define: { 'import.meta.env': JSON.stringify({ VITE_FIRST_REVIEW_FLOW: 'true' }) },
    plugins: [{
      name: 'isolated-onboarding-services',
      setup(builder) {
        builder.onResolve({ filter: /react-redux|profileSlice|userSettingsSlice|usePushNotifications|AIConsentModal|utils\/analytics$/ }, ({ path: importPath }) => {
          const key = Object.keys(mocks).find(name => importPath === name || importPath.endsWith('/' + name));
          if (key) return { path: key, namespace: 'mock' };
        });
        builder.onLoad({ filter: /.*/, namespace: 'mock' }, ({ path: key }) => ({ contents: mocks[key], loader: 'js' }));
      },
    }],
  });
  // CSS is optional for automated behavior tests. For visual inspection, run
  // yarn dev --host 127.0.0.1 and open this harness with ?styles=1.
  const server = createServer((req, res) => {
    if (req.url === '/bundle.js') {
      res.setHeader('Content-Type', 'text/javascript');
      res.end(result.outputFiles[0].text);
      return;
    }
    res.setHeader('Content-Type', 'text/html');
    res.end(`<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><title>F-01 isolated onboarding</title></head>
      <body><div id="root"></div><script>
      if (location.search.includes('styles=1')) {
        import('http://127.0.0.1:5173/src/index.css');
        import('http://127.0.0.1:5173/src/App.css');
      }
      </script><script src="/bundle.js"></script></body></html>`);
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
  return { url: `http://127.0.0.1:${server.address().port}`, close: () => new Promise(resolve => server.close(resolve)) };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const harness = await startHarness(5174);
  console.log(`Isolated F-01 harness: ${harness.url}/?styles=1`);
}
