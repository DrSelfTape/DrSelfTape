import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { loadPersonalRecords, reviewRecordId } from '../src/utils/personalRecords.js';
import { loadRecordingReview, mountComponent } from './recording-review-harness.mjs';

const { usePersonalRecords, TapeReview } = await loadRecordingReview();
const full = { bests: { overall: 8, framing: 9 }, count: 3,
  first_review_at: '2026-09-01T00:00:00Z', last_review_at: '2026-09-03T00:00:00Z',
  history: [{ t: 1, avg: 6 }, { t: 2, avg: 7 }, { t: 3, avg: 8 }],
  records: [{ key: 'overall', value: 8, prev: 7 }, { key: 'framing', value: 9, prev: 8 }] };
const request = async () => ({ data: { data: structuredClone(full) } });
let storage, listeners;
beforeEach(() => {
  storage = new Map(); listeners = new Map();
  globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
  globalThis.window = { addEventListener: (type, fn) => listeners.set(type, fn), removeEventListener: type => listeners.delete(type) };
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { onLine: true } });
  globalThis.__reviewStore = { getState: () => ({ auth: { user: { id: 1 } } }) };
  globalThis.__reviewHttp = { get: request };
  globalThis.__reviewEvents = [];
});

test('fresh devices read the authenticated aggregate and stable session selection', async () => {
  const data = await loadPersonalRecords({ userId: 1, reviewId: reviewRecordId({ _session_id: 42 }), allowDimensions: true,
    request: async (url, options) => {
      assert.equal(url, '/v1/ai/personal-records/');
      assert.deepEqual(options.params, { review_id: 'session:42' });
      assert.equal(options.timeout, 8000);
      return request();
    } });
  assert.deepEqual(data, full);
  assert.equal(reviewRecordId({ _meta: { job_id: 9 } }), 'job:9');
  assert.equal(reviewRecordId({ verdict: 'Same words', headline_score: 8 }), '');
});

test('online data replaces local records; free users retain only overall in memory and storage', async () => {
  storage.set('dst_personal_bests', JSON.stringify({ framing: 10 }));
  const data = await loadPersonalRecords({ request, userId: 1 });
  assert.deepEqual(data.bests, { overall: 8 });
  assert.deepEqual(data.records, [full.records[0]]);
  assert.ok(!storage.get('dst_personal_bests:1:overall').includes('framing'));
});

test('offline fallback is account/tier scoped and never resurrects another review badge', async () => {
  await loadPersonalRecords({ request, userId: 1, reviewId: 'session:3', allowDimensions: true });
  navigator.onLine = false;
  const offlineRequest = () => assert.fail('Offline must not request');
  assert.deepEqual(await loadPersonalRecords({ request: offlineRequest, userId: 1, reviewId: 'session:3', allowDimensions: true }), full);
  assert.deepEqual((await loadPersonalRecords({ request: offlineRequest, userId: 1, reviewId: 'session:4', allowDimensions: true })).records, []);
  assert.equal(await loadPersonalRecords({ request: offlineRequest, userId: 2, allowDimensions: true }), null);
  assert.equal(await loadPersonalRecords({ request: offlineRequest, userId: 1, allowDimensions: false }), null);
  assert.equal(await loadPersonalRecords({ request: offlineRequest, userId: null }), null);
});

test('online HTTP errors, timeouts and malformed payloads never fall back to cached bests', async () => {
  await loadPersonalRecords({ request, userId: 1 });
  for (const error of [{ response: { status: 401 } }, { response: { status: 403 } }, { response: { status: 500 } }, new Error('timeout')]) {
    await assert.rejects(loadPersonalRecords({ request: async () => { throw error; }, userId: 1 }));
  }
  await assert.rejects(loadPersonalRecords({ request: async () => ({ data: {} }), userId: 1 }));
});

test('connection loss during a request may use offline cache, but a 403 still cannot', async () => {
  await loadPersonalRecords({ request, userId: 1 });
  const data = await loadPersonalRecords({ userId: 1, request: async () => { navigator.onLine = false; throw new Error('network lost'); } });
  assert.equal(data.count, 3);
  navigator.onLine = true;
  await assert.rejects(loadPersonalRecords({ userId: 1, request: async () => {
    navigator.onLine = false; throw { response: { status: 403 } };
  } }));
});

test('abort cannot write stale records; storage failures do not hide successful server results', async () => {
  const controller = new AbortController();
  await assert.rejects(loadPersonalRecords({ userId: 1, signal: controller.signal, request: async () => {
    controller.abort(); return request();
  } }), { name: 'AbortError' });
  assert.equal(storage.size, 0);
  localStorage.setItem = () => { throw new Error('private mode'); };
  assert.equal((await loadPersonalRecords({ request, userId: 1 })).count, 3);
});

const settle = () => new Promise(resolve => setImmediate(resolve));
test('hook fetches, refreshes after reconnect, and suppresses old data on account/tier/result changes', async () => {
  const props = { review: { _session_id: 3 }, allowDimensions: true };
  const mounted = mountComponent(usePersonalRecords, props);
  assert.equal(mounted.render(), null); mounted.flush(); await settle();
  assert.deepEqual(mounted.render(), full);
  props.allowDimensions = false;
  assert.equal(mounted.render(), null); mounted.flush(); await settle();
  assert.deepEqual(mounted.render().bests, { overall: 8 });
  props.review = { _session_id: 4 };
  assert.equal(mounted.render(), null); mounted.flush(); await settle();
  let calls = 0;
  __reviewHttp.get = async () => { calls++; return request(); };
  listeners.get('online')(); await settle();
  assert.equal(calls, 1);
  __reviewStore.getState = () => ({ auth: { user: { id: 2 } } });
  assert.equal(mounted.render(), null); mounted.flush(); await settle();
  mounted.unmount(); assert.equal(listeners.size, 0);
});

test('unmount aborts late results before cache or UI updates', async () => {
  let complete, signal;
  __reviewHttp.get = (_url, options) => { signal = options.signal; return new Promise(resolve => { complete = resolve; }); };
  const mounted = mountComponent(usePersonalRecords, { review: { _session_id: 3 } });
  mounted.render(); mounted.flush(); mounted.unmount();
  assert.equal(signal.aborted, true);
  complete(await request()); await settle();
  assert.equal(storage.size, 0);
});

test('a superseding review cancels the first request and ignores its late response', async () => {
  const pending = [];
  __reviewHttp.get = (_url, options) => new Promise(resolve => pending.push({ options, resolve }));
  const props = { review: { _session_id: 3 } };
  const mounted = mountComponent(usePersonalRecords, props);
  mounted.render(); mounted.flush();
  props.review = { _session_id: 4 };
  mounted.render(); mounted.flush();
  assert.equal(pending[0].options.signal.aborted, true);
  pending[1].resolve({ data: { data: { ...full, records: [] } } }); await settle();
  pending[0].resolve(await request()); await settle();
  assert.deepEqual(mounted.render().records, []);
  assert.equal(JSON.parse(storage.get('dst_personal_bests:1:overall')).reviewId, 'session:4');
  mounted.unmount();
});

test('real TapeReview renders a server-earned overall badge from a stripped free review', async () => {
  const { renderToStaticMarkup } = await import('react-dom/server');
  const state = { auth: { user: { id: 1, ai_consent_accepted_at: '2026-09-01' } },
    userSettings: { loaded: true, data: { tutorial_progress: { first_review: true } } },
    profile: { profile: { first_name: 'Alex' } },
    jericho: { tapeReviewResult: { _session_id: 3, verdict: 'Grounded', headline_score: 8 }, uploadProgress: 100 } };
  __reviewStore = { getState: () => state, dispatch: () => ({}) };
  globalThis.__native = true;
  const local = globalThis.localStorage;
  window = { ...window, innerWidth: 390, innerHeight: 844, location: { search: '' },
    sessionStorage: { getItem: () => null, setItem() {} }, localStorage: local,
    matchMedia: () => ({ matches: true, addEventListener() {}, removeEventListener() {} }),
    dispatchEvent() {} };
  globalThis.document = { visibilityState: 'visible', addEventListener() {}, removeEventListener() {} };
  const mounted = mountComponent(TapeReview);
  let tree = mounted.render(); mounted.flush(); await settle();
  // The existing reveal supports showing everything immediately.
  const find = (node, label) => {
    if (!node || typeof node !== 'object') return null;
    if (node.type === 'button' && [node.props.children].flat(Infinity).includes(label)) return node;
    for (const child of [node.props?.children].flat(Infinity)) { const match = find(child, label); if (match) return match; }
    return null;
  };
  tree = mounted.render();
  const show = find(tree, 'Show everything');
  assert.ok(show, 'Existing reveal control remains available');
  show.props.onClick(); tree = mounted.render();
  const html = renderToStaticMarkup(tree);
  assert.ok(html.includes('New personal best'));
  assert.ok(html.includes('Overall 8.0'));
  assert.ok(!html.includes('Framing 9.0'));
  mounted.unmount();
});
