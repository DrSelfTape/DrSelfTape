import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

let puppeteer;
try { ({ default: puppeteer } = await import('puppeteer')); } catch { /* optional, as in existing suites */ }
let browser, page, bundle;
const errors = [];
before(async () => {
  if (!puppeteer) return;
  const root = fileURLToPath(new URL('../', import.meta.url));
  const mocks = {
    'react-redux': `const dispatch = action => window.dispatchMock(action);
      export const useDispatch = () => dispatch;
      export const useSelector = fn => fn(window.__state);`,
    'auditionsSlice': `export const fetchTrackerThunk = () => ({ kind: 'tracker' });
      export const fetchAuditionStatsThunk = () => ({});
      export const updateAuditionThunk = fetchAuditionStatsThunk,
        deleteAuditionThunk = fetchAuditionStatsThunk, createAuditionThunk = fetchAuditionStatsThunk;`,
    'submissionsSlice': `export const fetchSubmissionsThunk = () => ({ kind: 'submissions' });
      export const createSubmissionThunk = () => ({});
      export const updateSubmissionThunk = createSubmissionThunk, deleteSubmissionThunk = createSubmissionThunk,
        promoteToAuditionThunk = createSubmissionThunk;`,
    'TutorialChecklist': 'export const markStep = () => {};',
    'TalentReportImporter': 'export default function TalentReportImporter() { return null; }',
    'http': 'export default {};',
  };
  const result = await build({
    stdin: { resolveDir: root, loader: 'jsx', contents: `
      import React from 'react';
      import { createRoot } from 'react-dom/client';
      import Auditions from './src/panels/Dashboard/Auditions/index.jsx';
      import Submissions from './src/panels/Dashboard/Submissions/index.jsx';
      import { queueAuditionNotification, getPendingAuditionNotification } from './src/utils/auditionNotification.js';
      window.queueReminder = queueAuditionNotification;
      window.pendingReminder = getPendingAuditionNotification;
      window.__requests = []; window.__modalCount = 0;
      window.__state = { auditions: { tracker: { data: null }, loading: false, stats: { data: {} } },
        submissions: { submissions: [], loading: false } };
      window.dispatchMock = action => {
        if (!action.kind) { const p = Promise.resolve({}); p.unwrap = () => p; return p; }
        const promise = new Promise((resolve, reject) => window.__requests.push({ kind: action.kind, resolve, reject }));
        promise.unwrap = () => promise; return promise;
      };
      window.resolveRequest = (index, payload) => {
        const request = window.__requests[index];
        if (request.kind === 'tracker') window.__state.auditions.tracker = payload;
        else window.__state.submissions.submissions = payload;
        request.resolve(payload); window.renderPanel();
      };
      window.addEventListener('drst-modal-open', () => window.__modalCount++);
      window.addEventListener('drst-modal-closed', () => window.__modalCount--);
      const root = createRoot(document.getElementById('root'));
      let panel = 'auditions';
      window.renderPanel = () => root.render(panel === 'auditions' ? <Auditions /> : <Submissions />);
      window.mountReminder = data => { panel = queueAuditionNotification(data).panel; window.renderPanel(); };
    ` },
    bundle: true, write: false, platform: 'browser', format: 'iife', jsx: 'automatic',
    define: { 'import.meta.env': '{"DEV":true}' },
    plugins: [{ name: 'audition-services', setup(builder) {
      builder.onResolve({ filter: /.*/ }, ({ path }) => {
        const key = Object.keys(mocks).find(name => path === name || path.endsWith('/' + name));
        if (key) return { path: key, namespace: 'mock' };
      });
      builder.onLoad({ filter: /.*/, namespace: 'mock' }, ({ path }) => ({ contents: mocks[path], loader: 'js' }));
    } }],
  });
  bundle = result.outputFiles[0].text;
  // No dev server needed: the sandbox may prohibit listening on localhost.
  browser = await puppeteer.launch({ headless: true, pipe: true });
  page = await browser.newPage();
  page.on('pageerror', error => errors.push(error.message));
});
after(async () => { await browser?.close(); });
const btest = (name, fn) => test(name, async t => puppeteer ? fn() : t.skip('puppeteer not installed'));

async function mount(data, width = 375) {
  errors.length = 0;
  await page.setViewport({ width, height: 812 });
  await page.goto('about:blank');
  await page.setContent('<div id="root"></div>');
  await page.addScriptTag({ content: bundle });
  await page.evaluate(value => window.mountReminder(value), data);
  await page.waitForFunction(() => window.__requests.length >= 2);
}
const tracker = (id, title) => ({ data: { callback: [{ id, project_title: title, project_type: 'film', status: 'callback', notes: '' }] } });

for (const width of [375, 1440]) {
  btest(`queued reminder waits for fresh data then opens real audition detail (${width}px)`, async () => {
    await mount({ type: 'audition_update', audition_id: 42 }, width);
    assert.equal(await page.evaluate(() => window.__modalCount), 0);
    await page.evaluate(payload => window.resolveRequest(1, payload), tracker(42, 'OUTPOST'));
    await page.waitForFunction(() => window.__modalCount === 1);
    assert.match(await page.evaluate(() => document.body.textContent), /OUTPOST/);
    assert.equal(await page.evaluate(() => window.pendingReminder()), null);
    assert.deepEqual(errors, []);
  });
}

btest('newer push wins when the older detail response arrives late', async () => {
  await mount({ type: 'audition_update', audition_id: 42 });
  await page.evaluate(() => window.queueReminder({ type: 'audition_update', audition_id: 43 }));
  await page.waitForFunction(() => window.__requests.length === 3);
  await page.evaluate(payload => window.resolveRequest(2, payload), tracker(43, 'CURRENT TAKE'));
  await page.waitForFunction(() => window.__modalCount === 1);
  await page.evaluate(payload => window.resolveRequest(1, payload), tracker(42, 'STALE TAKE'));
  assert.equal(await page.evaluate(() => window.__modalCount), 1);
  // The old tracker response can update the background list; the open detail
  // remains the current record and must not show the old record's title twice.
  const titles = await page.$$eval('h2', nodes => nodes.map(node => node.textContent));
  assert.ok(titles.includes('CURRENT TAKE'));
  assert.deepEqual(errors, []);
});

btest('standalone submission reminder focuses its real card after fetching', async () => {
  await mount({ type: 'audition_update', submission_id: 7 });
  await page.evaluate(() => window.resolveRequest(0, [{ id: 7, project_name: 'THE LONG WAY HOME', status: 'callback', submitted_via: 'agent', submitted_at: '2026-09-07T18:00:00Z', deadline: '2026-09-08T18:00:00Z' }]));
  await page.waitForFunction(() => document.activeElement?.id === 'submission-7');
  assert.match(await page.$eval('#submission-7', node => node.textContent), /THE LONG WAY HOME/);
  assert.equal(await page.evaluate(() => window.__modalCount), 0);
  assert.deepEqual(errors, []);
});

btest('missing record leaves the tracker usable without opening another record', async () => {
  await mount({ type: 'audition_update', audition_id: 99 });
  await page.evaluate(payload => window.resolveRequest(1, payload), tracker(42, 'UNRELATED'));
  await page.waitForFunction(() => window.pendingReminder() === null);
  assert.equal(await page.evaluate(() => window.__modalCount), 0);
  assert.deepEqual(errors, []);
});
