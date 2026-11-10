// Regression guards for the 2026-11-09 audit, lane S: behaviour that only
// shows up when the real components run on a phone-sized touch screen.
import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './browser.mjs';

let browser, bundle;
before(async () => {
  const mocks = {
    'react-redux': `export const useSelector = f => f(window.state);
      export const useDispatch = () => action => { window.dispatched.push(action); return { unwrap: async () => ({}) }; };`,
    'react-router-dom': 'export const useNavigate = () => path => { window.route = path; };',
    '@capacitor/core': 'export const Capacitor = { isNativePlatform: () => false, getPlatform: () => "web" };',
    '@capacitor/app': 'export const App = { addListener: async () => ({ remove() {} }) };',
    'http': `export default {
      get: async url => { window.gets.push(url);
        if (url.includes('announcement')) return { data: { announcement: window.announcement } };
        if (url.includes('quota')) return { data: { data: null } };
        if (window.failLoad) throw Object.assign(new Error('offline'), { code: 'ERR_NETWORK' });
        return { data: { data: window.tapes } }; },
      post: async url => { if (url.includes('/submit/')) throw Object.assign(new Error('500'), { response: { status: 500, data: { message: 'Casting inbox is unavailable.' } } }); return { data: {} }; },
      delete: async () => ({ data: {} }), patch: async () => ({ data: {} }) };`,
    'constant': 'export const baseURL = ""; export default {};',
    'openExternal': 'export const openExternal = async () => true;',
    'analytics': 'export const trackEvent = () => {}; export const Events = {};',
    'communications': `export const campaignReceipt = async () => {};
      export const CAMPAIGN_ROUTES = { 'tape-review': '/dashboard/jericho?tab=tape' };`,
    'readersMatchSlice': 'export const toggleAvailability = next => ({ type: "toggleAvailability", payload: next });',
    'userSettingsSlice': 'export const patchUserSettings = payload => ({ type: "patchUserSettings", payload });',
    'snackbarSlice': 'export const showSnackbar = payload => ({ type: "showSnackbar", payload });',
    'jerichoSlice': 'export const selectReviewRecording = payload => ({ type: "selectReviewRecording", payload });',
    'selfTapeStore': `export const isIOSNative = () => false; export const saveLocalTape = async () => {};
      export const deleteLocalTape = async id => { window.deletedLocal.push(id); return true; };
      export const makeLocalTapeId = () => 'new'; export const listLocalTapes = async () => [];`,
    'uploadQueue': `const listeners = new Set(); const emit = () => listeners.forEach(fn => fn(window.queue));
      export const enqueueUpload = () => {}; export const getQueueSnapshot = () => window.queue;
      export const subscribe = fn => { listeners.add(fn); fn(window.queue); return () => listeners.delete(fn); };
      export const removeTask = id => { window.removedTasks.push(id); window.queue = window.queue.filter(t => t.localTapeId !== id); emit(); };`,
  };
  const out = await build({
    stdin: { resolveDir: fileURLToPath(new URL('../', import.meta.url)), loader: 'jsx', contents: `
      import React from 'react'; import { createRoot } from 'react-dom/client';
      import AnnouncementBanner from './src/components/AnnouncementBanner.jsx';
      import TutorialChecklist from './src/components/Dashboard/TutorialChecklist.jsx';
      import SelfTapes from './src/panels/Dashboard/SelfTapes/index.jsx';
      const screens = { banner: AnnouncementBanner, checklist: TutorialChecklist, tapes: SelfTapes };
      const root = createRoot(document.getElementById('root'));
      window.render = kind => root.render(React.createElement(screens[kind]));
    ` }, outfile: 'test.js', bundle: true, write: false, jsx: 'automatic', loader: { '.css': 'empty' },
    define: { 'import.meta.env': '{}' },
    plugins: [{ name: 'mocks', setup(b) {
      b.onResolve({ filter: /.*/ }, ({ path }) => { const key = Object.keys(mocks).find(k => path === k || path.endsWith('/' + k)); if (key) return { path: key, namespace: 'mock' }; });
      b.onLoad({ filter: /.*/, namespace: 'mock' }, ({ path }) => ({ contents: mocks[path], loader: 'js' }));
    } }],
  });
  bundle = out.outputFiles.find(f => f.path.endsWith('.js')).text;
  browser = await launchBrowser();
});
after(async () => { await browser?.close(); });

async function mount(kind, overrides = {}, { phone = true } = {}) {
  const page = await browser.newPage();
  await page.setViewport(phone ? { width: 390, height: 844, hasTouch: true } : { width: 1280, height: 800 });
  await page.setRequestInterception(true);
  page.on('request', r => r.respond({ status: 200, contentType: 'text/html', body: '<div id="root"></div>' }));
  await page.goto('https://shell.test');
  await page.evaluate(options => {
    localStorage.clear(); sessionStorage.clear();
    Object.assign(window, {
      dispatched: [], gets: [], navigations: [], removedTasks: [], deletedLocal: [], queue: [], tapes: [], failLoad: false,
      announcement: { id: 10, title: 'Your next great take', body: 'Get notes.', cta_label: 'Review my tape', cta_url: 'tape-review' },
      state: {
        auth: { user: { id: 1 } }, profile: { profile: {} }, auditions: { data: [] },
        readersMatch: { isAvailable: false, availabilityToggling: false },
        userSettings: { loaded: true, data: { tutorial_progress: {} } },
        jericho: { tapeReviewLoading: false, compareLoading: false },
      },
      ...options,
    });
    window.addEventListener('drst-navigate', e => window.navigations.push(e.detail));
  }, overrides);
  await page.addScriptTag({ content: bundle });
  await page.evaluate(k => window.render(k), kind);
  return page;
}
const clickText = (page, selector, text) => page.evaluate((s, t) => {
  const el = [...document.querySelectorAll(s)].find(e => e.textContent.trim().startsWith(t));
  if (!el) throw new Error(`no ${s} starting with "${t}"`);
  el.click();
}, selector, text);

// D — a phone browser renders the mobile shell with no router Outlet.
test('announcement CTA on mobile web routes through the shell, not the router', async () => {
  const page = await mount('banner');
  await page.waitForSelector('.dst-banner__actions button');
  await page.click('.dst-banner__actions button');
  await page.waitForFunction(() => window.navigations.length === 1);
  assert.equal(await page.evaluate(() => window.navigations[0].tab), 'tape-review');
  assert.equal(await page.evaluate(() => window.route), undefined);
  await page.close();
});
test('announcement CTA on desktop web still uses the router', async () => {
  const page = await mount('banner', {}, { phone: false });
  await page.waitForSelector('.dst-banner__actions button');
  await page.click('.dst-banner__actions button');
  await page.waitForFunction(() => window.route === '/dashboard/jericho?tab=tape');
  assert.equal(await page.evaluate(() => window.navigations.length), 0);
  await page.close();
});

// C — the only listener for the old event is a component the shell never mounts.
test('"Go Available" in the checklist toggles availability itself', async () => {
  const page = await mount('checklist');
  await page.waitForFunction(() => document.body.textContent.includes('Go Available'));
  await page.evaluate(() => {
    const row = [...document.querySelectorAll('p')].find(p => p.textContent === 'Go Available').parentElement.parentElement;
    row.querySelector('button').click();
  });
  await page.waitForFunction(() => window.dispatched.some(a => a.type === 'toggleAvailability'));
  assert.deepEqual(await page.evaluate(() => window.dispatched.filter(a => a.type === 'toggleAvailability')), [{ type: 'toggleAvailability', payload: true }]);
  await page.close();
});
test('"Go Available" does nothing while already available', async () => {
  const page = await mount('checklist', { state: {
    auth: { user: { id: 1 } }, profile: { profile: {} }, auditions: { data: [] },
    readersMatch: { isAvailable: true, availabilityToggling: false },
    // Loaded but not yet marked, so the row is still on screen.
    userSettings: { loaded: true, data: { tutorial_progress: {} } },
  } });
  await page.waitForFunction(() => document.body.textContent.includes('Go Available'));
  await page.evaluate(() => {
    const row = [...document.querySelectorAll('p')].find(p => p.textContent === 'Go Available').parentElement.parentElement;
    row.querySelector('button').click();
  });
  await new Promise(r => setTimeout(r, 100));
  assert.equal(await page.evaluate(() => window.dispatched.some(a => a.type === 'toggleAvailability')), false);
  await page.close();
});

// G — a failed load looked exactly like an empty library.
test('self-tapes: a failed load shows an error with retry, not the empty state', async () => {
  const page = await mount('tapes', { failLoad: true });
  await page.waitForSelector('[role=alert]');
  const text = await page.evaluate(() => document.body.textContent);
  assert.match(text, /couldn.t load your self-tapes/i);
  assert.doesNotMatch(text, /Your takes land here/);
  await page.evaluate(() => { window.failLoad = false; });
  await clickText(page, 'button', 'Try again');
  await page.waitForFunction(() => document.body.textContent.includes('Your takes land here'));
  assert.equal(await page.$('[role=alert]'), null);
  await page.close();
});
test('self-tapes: cards read the fields the API sends', async () => {
  const page = await mount('tapes', { tapes: [{ id: 1, title: 'Monologue', thumbnail_url: 'https://cdn.test/t.jpg', duration_seconds: 75, created_at: '2026-11-01T00:00:00Z' }] });
  await page.waitForSelector('img');
  assert.equal(await page.$eval('img', e => e.getAttribute('src')), 'https://cdn.test/t.jpg');
  assert.match(await page.evaluate(() => document.body.textContent), /1:15/);
  await page.close();
});
test('self-tapes: a failed submit says so', async () => {
  const page = await mount('tapes', { tapes: [{ id: 1, title: 'Monologue', duration_seconds: 0 }] });
  await page.waitForFunction(() => document.body.textContent.includes('Monologue'));
  await clickText(page, 'button', 'Submit');
  await page.waitForSelector('input');
  await page.type('input', 'Casting Co');
  await page.evaluate(() => [...document.querySelectorAll('button')].filter(b => b.textContent.trim() === 'Submit').pop().click());
  await page.waitForFunction(() => window.dispatched.some(a => a.type === 'showSnackbar'));
  assert.deepEqual(await page.evaluate(() => window.dispatched.find(a => a.type === 'showSnackbar').payload), { message: 'Casting inbox is unavailable.', variant: 'error' });
  assert.doesNotMatch(await page.evaluate(() => document.body.textContent), /Submitted!/);
  await page.close();
});
test('self-tapes: a failed upload can be removed from the list', async () => {
  const page = await mount('tapes', { queue: [{ localTapeId: 'L1', status: 'failed', fields: { title: 'Broken upload' }, queuedAt: '2026-11-09T00:00:00Z' }] });
  await page.waitForFunction(() => document.body.textContent.includes('Broken upload'));
  await page.click('button[title="Delete"]');
  await clickText(page, 'button', 'Delete');
  await page.waitForFunction(() => !document.body.textContent.includes('Broken upload'));
  assert.deepEqual(await page.evaluate(() => [window.removedTasks, window.deletedLocal]), [['L1'], ['L1']]);
  await page.close();
});
test('self-tapes: an upload still in flight has no remove action', async () => {
  const page = await mount('tapes', { queue: [{ localTapeId: 'L2', status: 'uploading', progress: 40, fields: { title: 'In flight' }, queuedAt: '2026-11-09T00:00:00Z' }] });
  await page.waitForFunction(() => document.body.textContent.includes('In flight'));
  assert.equal(await page.$('button[title="Delete"]'), null);
  await page.close();
});
