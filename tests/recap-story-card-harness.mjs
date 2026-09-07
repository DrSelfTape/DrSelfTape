// Mounted harness for the V-02 RecapStoryCard: the REAL component, portaled
// out of a `.noir-review` parent with the real desktopReview.css + the recap
// CSS from App.css applied, so parent-style collisions are caught. No API,
// analytics or account service is touched.
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));

export async function startHarness(port = 0) {
  const appCss = await readFile(path.join(root, 'src/App.css'), 'utf8');
  const recapCss = appCss.slice(appCss.indexOf('/* ── V-02 RecapStoryCard'));
  const reviewCss = await readFile(path.join(root, 'src/panels/Dashboard/Jericho/desktopReview.css'), 'utf8');
  const result = await build({
    stdin: {
      contents: `import React from 'react';
        import { createRoot } from 'react-dom/client';
        import RecapStoryCard from './src/panels/Dashboard/Jericho/RecapStoryCard.jsx';
        const root = createRoot(document.getElementById('root'));
        window.mountRecap = (props = {}) => {
          window.__closed = 0; window.__shared = [];
          const file = props.withFile ? new File([new Uint8Array([0, 0, 0, 24])], 'take.mp4', { type: 'video/mp4' }) : undefined;
          root.render(<RecapStoryCard key={Math.random()} review={props.review} band={props.band} avg={props.avg}
            firstName={props.firstName} thumbnailUrl={props.thumbnailUrl} file={file} sharing={props.sharing}
            onClose={() => { window.__closed++; }} onShare={props.share === false ? undefined : (f) => window.__shared.push(f)} />);
        };
        window.unmountRecap = () => root.render(null);`,
      resolveDir: root, loader: 'jsx',
    },
    bundle: true, write: false, platform: 'browser', format: 'iife', jsx: 'automatic',
    loader: { '.css': 'empty' },
    plugins: [{
      name: 'mock-mobile-header',
      setup(b) {
        b.onResolve({ filter: /useHideMobileHeader$/ }, () => ({ path: 'useHideMobileHeader', namespace: 'mock' }));
        b.onLoad({ filter: /.*/, namespace: 'mock' }, () => ({ contents: 'export default function useHideMobileHeader() {}', loader: 'js' }));
      },
    }],
  });
  const server = createServer((req, res) => {
    if (req.url === '/bundle.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(result.outputFiles[0].text); return; }
    res.setHeader('Content-Type', 'text/html');
    res.end(`<!doctype html><html><head><meta charset="utf-8"><title>V-02 recap harness</title>
      <style>${reviewCss}\n${recapCss}</style></head>
      <body><input id="outside" aria-label="outside input" value="abc" />
      <div class="noir-review"><h2>Report behind</h2><button id="behind">Behind</button><div id="root"></div></div>
      <script src="/bundle.js"></script></body></html>`);
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  return { url: `http://127.0.0.1:${server.address().port}`, close: () => new Promise((resolve) => server.close(resolve)) };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const harness = await startHarness(5175);
  console.log(`V-02 recap harness: ${harness.url}`);
}
