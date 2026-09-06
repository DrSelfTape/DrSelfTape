// Real history rows, detail sheet, notes and share templates; isolated services.
// Run directly alongside yarn dev for visual inspection, with ?styles=1.
import { build } from 'esbuild';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));

export async function startHistoryHarness(port = 0) {
  const mocks = {
    'react-redux': `export const useSelector = fn => fn(window.__state);
      export const useDispatch = () => () => Promise.resolve({});`,
    'jerichoSlice': `export const fetchActorMemory = () => ({});
      export const fetchInsights = fetchActorMemory, fetchEvolution = fetchActorMemory,
      fetchRecentSessions = fetchActorMemory, updateActorMemory = fetchActorMemory;`,
    'useAIGate': 'export default function useAIGate() {}',
    'TapeReview': 'export default function TapeReview() { return null; }',
    'useTokenBalance': 'export const useTokenBalance = () => window.__entitlement;',
    'http': `export default { get: (url, options) => {
      window.__requests.push({ url, options });
      return new Promise((resolve, reject) => window.__pending.push({ resolve, reject }));
    } };`,
    'analytics': 'export const trackEvent = (event, props) => window.__events.push({ event, props });',
    'goUpgrade': 'export const goUpgrade = options => { window.__upgrade = options; };',
    'useShareImageCapture': `export const useShareImageCapture = () => ({ captureImage: async (node, dimensions) => {
      window.__captures.push({ text: node.textContent, dimensions });
      return URL.createObjectURL(new Blob(['fixture'], { type: 'image/png' }));
    } });`,
    'saveMedia': `export const saveBlobUrl = async (url, filename) => {
      window.__saves.push({ url, filename }); return { ok: !window.__shareFails };
    };`,
  };
  const result = await build({
    stdin: {
      resolveDir: root, loader: 'jsx',
      contents: `import React from 'react';
        import { createRoot } from 'react-dom/client';
        import { MemoryRouter } from 'react-router-dom';
        import JerichoDashboard from './src/panels/Dashboard/Jericho/index.jsx';
        import { sampleReview } from './src/data/sampleReview.js';
        window.__fullReview = { ...sampleReview,
          scores: { framing: 7, eyeline: 8, lighting: 7, energy_commitment: 8, dynamic_range: 7 },
          performance: { emotional_arc: 'The hope fades when the call stays unanswered.', strongest_beat: 'The pause after the watch.', choices: 'Use the watch to reopen contact.', listening_presence: 'The silence changes the invitation.', truth_vs_indicated: 'Let the thought arrive before the expression.' },
        };
        window.__requests = []; window.__pending = []; window.__captures = [];
        window.__saves = []; window.__events = []; window.__modalCount = 0;
        window.addEventListener('drst-modal-open', () => window.__modalCount++);
        window.addEventListener('drst-modal-closed', () => window.__modalCount--);
        const root = createRoot(document.getElementById('root'));
        window.mountHistory = (paid = true) => {
          window.__entitlement = { isPaid: paid, loading: false, error: null, balance: 5 };
          window.__state = {
            userSettings: { loaded: true, data: { tutorial_progress: { first_review: true } } },
            jericho: { memory: { total_sessions: 4 }, memoryHasFetched: true, insights: [],
              evolution: {}, recentSessions: [
                { id: 101, session_type: 'self_tape_review', role_played: 'Morgan', created_at: '2026-08-01T12:00:00Z', ai_feedback: { verdict: 'CACHED PAID SECRET', the_one_thing: 'CACHED DEEP SECRET' } },
                { id: 102, session_type: 'self_tape_review', role_played: 'Robin' },
                { id: 103, session_type: 'live_scene' },
                { id: 104, session_type: 'take_compare' },
              ], tapeReviewResult: { verdict: 'CACHED PAID SECRET', the_one_thing: 'CACHED DEEP SECRET' } },
          };
          // Expired job slots and local caches must be irrelevant to history.
          localStorage.setItem('dst_pending_analysis', JSON.stringify({ jobId: 'expired', startedAt: 1 }));
          localStorage.setItem('dst_personal_bests', 'UNCHANGED');
          root.render(<MemoryRouter key={Math.random()} initialEntries={['/dashboard/jericho?tab=history']}><JerichoDashboard /></MemoryRouter>);
        };
        window.resolveReview = (feedback = window.__fullReview, index = window.__pending.length - 1, wrapped = true) => {
          const body = { id: 101, session_type: 'self_tape_review', ai_feedback: feedback };
          window.__pending[index].resolve({ data: wrapped ? { data: body, success: true } : body });
        };
        window.mountHistory();`,
    },
    bundle: true, write: false, platform: 'browser', format: 'iife', jsx: 'automatic',
    plugins: [{
      name: 'history-services',
      setup(builder) {
        builder.onResolve({ filter: /.*/ }, ({ path }) => {
          const key = Object.keys(mocks).find(name => path === name || path.endsWith('/' + name));
          if (key) return { path: key, namespace: 'mock' };
        });
        builder.onLoad({ filter: /.*/, namespace: 'mock' }, ({ path }) => ({ contents: mocks[path], loader: 'js' }));
      },
    }],
  });
  const server = createServer((req, res) => {
    if (req.url === '/bundle.js') {
      res.setHeader('Content-Type', 'text/javascript'); res.end(result.outputFiles[0].text); return;
    }
    res.setHeader('Content-Type', 'text/html');
    res.end(`<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><title>F-02 isolated history</title></head>
      <body><div id="root"></div><script>
      if (location.search.includes('styles=1')) {
        import('http://127.0.0.1:5173/src/index.css');
        import('http://127.0.0.1:5173/src/App.css');
      }
      </script><script src="/bundle.js"></script></body></html>`);
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  return { url: `http://127.0.0.1:${server.address().port}`, close: () => new Promise(resolve => server.close(resolve)) };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const harness = await startHistoryHarness(5175);
  console.log(`Isolated F-02 history: ${harness.url}/?styles=1`);
}
