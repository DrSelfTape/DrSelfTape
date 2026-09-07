import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { configureStore } from '@reduxjs/toolkit';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadRecordingReview, mountComponent } from './recording-review-harness.mjs';

const { reducer, reviewTape, compareTakes, selectReviewRecording, clearTapeReview, rememberRecordingAttempt, recoverLatestReview, resumeAnalysisJob, TapeReview, TapeCard, SelfTapes, DashboardLayout } = await loadRecordingReview();
const recording = { id: 42, title: 'Callback take', role_name: 'Morgan', video_url: 'https://unreachable-r2.test/video.mov' };
const notes = { verdict: 'An honest pause', headline_score: 7, whats_working: ['Listening'], adjustments: [{ note: 'Wait for the thought' }] };
const render = (component, props) => renderToStaticMarkup(createElement(component, props));
let store, requests;
beforeEach(() => {
  requests = [];
  globalThis.window = { sessionStorage: { getItem: () => null, removeItem() {} } };
  window.addEventListener = () => {}; window.removeEventListener = () => {};
  window.dispatchEvent = event => { globalThis.__navEvents.push(event); };
  window.innerWidth = 1024; window.innerHeight = 1366; window.ontouchstart = null;
  globalThis.document = { visibilityState: 'hidden', addEventListener() {}, removeEventListener() {} };
  globalThis.__navEvents = []; globalThis.__routes = []; globalThis.__native = false;
  globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
  globalThis.__reviewEvents = [];
  globalThis.__reviewHttp = {
    post: async (url, body, options) => { requests.push({ url, body, options }); return { data: { data: notes } }; },
    get: async () => { throw new Error('Unexpected GET'); },
    put: async () => { throw new Error('Unexpected R2 PUT'); },
  };
  store = configureStore({ reducer: { jericho: reducer,
    userSettings: () => ({ data: { tutorial_progress: { first_review: true } } }),
    profile: () => ({ profile: { first_name: 'Alex' } }),
    auth: () => ({ user: { ai_consent_accepted_at: '2026-09-01' } }),
  } });
  globalThis.__reviewStore = store;
});

const tick = () => new Promise(resolve => setImmediate(resolve));
function findNode(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (predicate(node)) return node;
  for (const child of [node.props?.children].flat(Infinity)) {
    const found = findNode(child, predicate); if (found) return found;
  }
  return null;
}
const button = (tree, label) => findNode(tree, n => n.type === 'button' && renderToStaticMarkup(n).includes(label));

test('uncertain submission survives unmount and reselection with exactly the same action key', async () => {
  store.dispatch(selectReviewRecording(recording));
  globalThis.__reviewHttp.get = async () => ({ data: { data: null } });
  globalThis.__reviewHttp.post = async (url, body, options) => {
    requests.push({url, body, options}); throw new Error('response lost');
  };
  const first = mountComponent(TapeReview);
  first.render(); first.flush(); await tick();
  await button(first.render(), 'Get my notes').props.onClick();
  first.unmount();
  assert.ok(store.getState().jericho.reviewRecording.idempotencyKey);
  store.dispatch(selectReviewRecording(recording));
  const second = mountComponent(TapeReview);
  second.render(); second.flush(); await tick();
  await button(second.render(), 'Get my notes').props.onClick();
  assert.equal(requests[0].options.headers['Idempotency-Key'], requests[1].options.headers['Idempotency-Key']);
  second.unmount();
});

test('selected recording checks recovery before enabling any charged attempt', async () => {
  store.dispatch(selectReviewRecording(recording));
  store.dispatch(rememberRecordingAttempt({ id: 42, idempotencyKey: 'existing-attempt' }));
  let resolve;
  globalThis.__reviewHttp.get = async url => {
    assert.equal(url, '/latest/');
    return await new Promise(r => { resolve = r; });
  };
  const mounted = mountComponent(TapeReview);
  const initial = mounted.render();
  assert.equal(button(initial, 'Get my notes').props.disabled, true);
  mounted.flush(); await tick();
  assert.equal(typeof resolve, 'function');
  await button(mounted.render(), 'Get my notes').props.onClick();
  assert.equal(requests.length, 0);
  resolve({ data: { data: null } }); await tick();
  assert.equal(button(mounted.render(), 'Get my notes').props.disabled, false);
  mounted.unmount();
});

test('selected recording resumes a pending job and consumes selection on completion', async () => {
  store.dispatch(selectReviewRecording(recording));
  store.dispatch(rememberRecordingAttempt({ id: 42, idempotencyKey: 'pending-key' }));
  globalThis.localStorage.getItem = key => key === 'dst_pending_analysis' ? JSON.stringify({jobId: 12, kind: 'review', recordingId: 42, idempotencyKey: 'pending-key', startedAt: Date.now()}) : null;
  globalThis.__reviewHttp.get = async url => {
    assert.equal(url, '/jobs/12/'); return { data: { data: {status: 'done', result: notes} } };
  };
  const mounted = mountComponent(TapeReview);
  mounted.render(); mounted.flush();
  await new Promise(resolve => setTimeout(resolve, 2600));
  assert.deepEqual(store.getState().jericho.tapeReviewResult, notes);
  assert.equal(store.getState().jericho.reviewRecording, null);
  assert.equal(requests.length, 0);
  mounted.unmount();
});

test('selection is consumed on success, settled failure, reset and compare handoff', async () => {
  for (const finish of [
    () => store.dispatch(reviewTape.fulfilled(notes, 'ok', {})),
    () => store.dispatch(reviewTape.rejected(null, 'failed', {}, {message: 'settled', reuseKey: false})),
    () => store.dispatch(clearTapeReview()),
  ]) {
    store.dispatch(selectReviewRecording(recording)); finish();
    assert.equal(store.getState().jericho.reviewRecording, null);
  }
  store.dispatch(selectReviewRecording(recording));
  let removed = false;
  window.sessionStorage.getItem = key => key === 'dst_compare_takes' ? '1' : null;
  window.sessionStorage.removeItem = key => { if (key === 'dst_compare_takes') removed = true; };
  const mounted = mountComponent(TapeReview);
  assert.match(renderToStaticMarkup(mounted.render()), /Compare screen/);
  mounted.flush();
  assert.equal(removed, true);
  assert.equal(store.getState().jericho.reviewRecording, null);
  mounted.unmount();
});

test('consented arrival consumes only the shell handoff, retaining the recording for submission', async () => {
  store.dispatch(selectReviewRecording(recording));
  assert.equal(store.getState().jericho.reviewRecording.navigationPending, true);
  globalThis.__reviewHttp.get = async () => ({ data: { data: null } });
  const mounted = mountComponent(TapeReview);
  mounted.render(); mounted.flush(); await tick();
  assert.equal(store.getState().jericho.reviewRecording.navigationPending, false);
  assert.equal(store.getState().jericho.reviewRecording.id, 42);
  mounted.unmount();
});

test('native iPad library action reaches the mounted desktop receiver; phone retains its tab event', async () => {
  globalThis.__native = true;
  for (const [width, height, mobile] of [[1024, 1366, false], [390, 844, true]]) {
    window.innerWidth = width; window.innerHeight = height;
    const events = new EventTarget();
    window.addEventListener = events.addEventListener.bind(events);
    window.removeEventListener = events.removeEventListener.bind(events);
    window.dispatchEvent = event => { globalThis.__navEvents.push(event); return events.dispatchEvent(event); };
    const paths = [];
    window.history = { state: { idx: 0 }, pushState: (state, unused, path) => paths.push(path) };
    let pops = 0;
    window.addEventListener('popstate', () => { pops++; });
    globalThis.PopStateEvent = class extends Event {
      constructor(type, init) { super(type); this.state = init.state; }
    };
    const shell = mountComponent(DashboardLayout);
    shell.render(); shell.flush();
    globalThis.__reviewHttp.get = async url => ({ data: { data: url.endsWith('/quota/') ? {} : [recording] } });
    const mounted = mountComponent(SelfTapes);
    mounted.render(); mounted.flush(); await tick();
    const card = findNode(mounted.render(), node => node.type === TapeCard);
    assert.ok(card);
    card.props.onReview(recording);
    if (mobile) {
      assert.equal(globalThis.__navEvents.at(-1).detail.tab, 'tape-review');
      assert.deepEqual(paths, []);
    }
    else {
      assert.deepEqual(paths, ['/dashboard/jericho?tab=tape']);
      assert.equal(pops, 1, 'BrowserRouter receives a popstate notification');
      assert.deepEqual(globalThis.__routes, [], 'native never calls the navigate mock');
    }
    mounted.unmount();
    shell.unmount();
    const count = paths.length;
    window.dispatchEvent(new CustomEvent('drst-navigate', {detail: {tab: 'tape-review'}}));
    assert.equal(paths.length, count, 'desktop receiver cleans up on unmount');
  }
});

test('selected recording card inherits theme colors', () => {
  store.dispatch(selectReviewRecording(recording));
  const mounted = mountComponent(TapeReview);
  const title = findNode(mounted.render(), n => n.type === 'p' && n.props.children === recording.title);
  assert.equal(title.props.style?.color, 'var(--aurora-text)');
  const reset = button(mounted.render(), 'Choose a different take');
  assert.equal(reset.props.style?.color, 'var(--aurora-accent-deep)');
  mounted.unmount();
});

test('durable recovery uses the selected action key, preserves server trim and clears the selection', async () => {
  store.dispatch(selectReviewRecording(recording));
  store.dispatch(rememberRecordingAttempt({ id: 42, idempotencyKey: 'uncertain' }));
  globalThis.__reviewHttp.get = async (url, options) => {
    assert.equal(url, '/latest/');
    assert.deepEqual(options.params, {recording_review_key: 'uncertain'});
    return {data: {data: {id: 99, ai_feedback: notes}}};
  };
  const mounted = mountComponent(TapeReview);
  mounted.render(); mounted.flush(); await tick();
  assert.deepEqual(store.getState().jericho.tapeReviewResult, {...notes, _session_id: 99});
  assert.equal(store.getState().jericho.reviewRecording, null);
  assert.equal(requests.length, 0);
  mounted.unmount();
});

test('fresh recording ignores unrelated history and late recovery cannot erase a new selection', async () => {
  store.dispatch(selectReviewRecording(recording));
  globalThis.__reviewHttp.get = async () => ({data: {data: {id: 99, ai_feedback: notes}}});
  await store.dispatch(recoverLatestReview());
  assert.equal(store.getState().jericho.tapeReviewResult, null);
  assert.equal(store.getState().jericho.reviewRecording.id, 42);
  store.dispatch(rememberRecordingAttempt({ id: 42, idempotencyKey: 'older-attempt' }));
  let finish;
  globalThis.__reviewHttp.get = async () => await new Promise(resolve => { finish = resolve; });
  const pending = store.dispatch(recoverLatestReview());
  store.dispatch(selectReviewRecording({...recording, id: 43}));
  finish({data: {data: {id: 99, ai_feedback: notes}}});
  await pending;
  assert.equal(store.getState().jericho.tapeReviewResult, null);
  assert.equal(store.getState().jericho.reviewRecording.id, 43);
  assert.equal(store.getState().jericho.reviewRecording.idempotencyKey, null);
});

test('polling HTTP 500 preserves the pending slot and recording key for a later remount', async () => {
  const saved = new Map();
  globalThis.localStorage = {getItem: k => saved.get(k), setItem: (k, v) => saved.set(k, v), removeItem: k => saved.delete(k)};
  store.dispatch(selectReviewRecording(recording));
  globalThis.__reviewHttp.post = async () => ({data: {data: {job_id: 12, status: 'pending'}}});
  globalThis.__reviewHttp.get = async () => { throw {response: {status: 500, data: {}}}; };
  const result = await store.dispatch(reviewTape({recordingId: 42, idempotencyKey: 'poll-key'}));
  assert.equal(result.payload.reuseKey, true);
  assert.equal(store.getState().jericho.reviewRecording.idempotencyKey, 'poll-key');
  assert.equal(JSON.parse(saved.get('dst_pending_analysis')).jobId, 12);
  assert.equal(JSON.parse(saved.get('dst_pending_analysis')).recordingId, 42);
  assert.equal(JSON.parse(saved.get('dst_pending_analysis')).idempotencyKey, 'poll-key');
});

test('unrelated upload, library and legacy pending slots never resume on a different recording', async () => {
  for (const identity of [{}, {recordingId: null, idempotencyKey: 'upload-A'},
    {recordingId: 41, idempotencyKey: 'library-A'}, {recordingId: 42, idempotencyKey: 'older-B'}]) {
    store.dispatch(selectReviewRecording(recording));
    store.dispatch(rememberRecordingAttempt({id: 42, idempotencyKey: 'current-B'}));
    const saved = JSON.stringify({jobId: 11, kind: 'review', startedAt: Date.now(), ...identity});
    globalThis.localStorage.getItem = key => key === 'dst_pending_analysis' ? saved : null;
    const gets = [];
    globalThis.__reviewHttp.get = async url => {
      gets.push(url);
      return {data: {data: url === '/latest/' ? null : {status: 'done', result: notes}}};
    };
    const mounted = mountComponent(TapeReview);
    mounted.render(); mounted.flush();
    await new Promise(resolve => setTimeout(resolve, 2600));
    assert.deepEqual(gets, ['/latest/']);
    assert.equal(store.getState().jericho.tapeReviewResult, null);
    assert.equal(store.getState().jericho.reviewRecording.id, 42);
    assert.equal(button(mounted.render(), 'Get my notes').props.disabled, false);
    mounted.unmount();
  }
});

test('late job settlement cannot apply A to B or erase the newer pending slot', async () => {
  const saved = new Map();
  globalThis.localStorage = {getItem: k => saved.get(k), setItem: (k,v) => saved.set(k,v), removeItem: k => saved.delete(k)};
  let finish;
  globalThis.__reviewHttp.get = () => new Promise(resolve => { finish = resolve; });
  const old = {jobId: 11, kind: 'review', recordingId: 41, idempotencyKey: 'A'};
  const running = store.dispatch(resumeAnalysisJob(old));
  await new Promise(resolve => setTimeout(resolve, 2600));
  // Simulate A losing its poll owner, then B being selected while a late
  // completion is still queued. Exercise the actual thunk's slot cleanup.
  store.dispatch(resumeAnalysisJob.rejected(null, 'lost-poll', old, {silent: true, reuseKey: true}));
  store.dispatch(selectReviewRecording(recording));
  store.dispatch(rememberRecordingAttempt({id: 42, idempotencyKey: 'B'}));
  saved.set('dst_pending_analysis', JSON.stringify({jobId: 12, kind: 'review', recordingId: 42, idempotencyKey: 'B'}));
  finish({data: {data: {status: 'done', result: notes}}});
  await running;
  assert.equal(store.getState().jericho.reviewRecording?.id, 42);
  assert.equal(store.getState().jericho.tapeReviewResult, null);
  assert.equal(JSON.parse(saved.get('dst_pending_analysis')).jobId, 12);
  store.dispatch(resumeAnalysisJob.rejected(null, 'old-failure', old, {reuseKey: false, message: 'A failed'}));
  assert.equal(store.getState().jericho.reviewRecording?.id, 42);
  assert.equal(store.getState().jericho.tapeReviewError, null);
});

test('ordinary upload submits while best-effort history GET remains stalled', async () => {
  let finishHistory;
  globalThis.__reviewHttp.get = () => new Promise(resolve => { finishHistory = resolve; });
  let finishPost;
  globalThis.__reviewHttp.post = async (url, body, options) => {
    requests.push({url, body, options});
    if (url === '/presign/') return {data: {data: {}}};
    return await new Promise(resolve => { finishPost = resolve; });
  };
  const mounted = mountComponent(TapeReview);
  mounted.render(); mounted.flush(); await tick();
  const picker = findNode(mounted.render(), n => n.type === 'input' && n.props.type === 'file');
  picker.props.onChange({target: {files: [new Blob(['tape'], {type: 'video/mp4'})]}});
  assert.equal(button(mounted.render(), 'Get my notes').props.disabled, false);
  const submitting = button(mounted.render(), 'Get my notes').props.onClick();
  await tick();
  assert.equal(typeof finishPost, 'function');
  finishHistory({data: {data: {id: 10, ai_feedback: {...notes, verdict: 'Old history'}}}});
  await tick();
  assert.equal(store.getState().jericho.tapeReviewResult, null, 'history cannot replace the active upload');
  finishPost({data: {data: notes}});
  await submitting;
  assert.deepEqual(store.getState().jericho.tapeReviewResult, notes);
  mounted.unmount();
});

test('stalled keyed recovery times out and re-enables submission with the same attempt key', async (t) => {
  t.mock.timers.enable({apis: ['setTimeout']});
  store.dispatch(selectReviewRecording(recording));
  store.dispatch(rememberRecordingAttempt({id: 42, idempotencyKey: 'uncertain-B'}));
  let config;
  globalThis.__reviewHttp.get = (url, options) => { config = options; return new Promise(() => {}); };
  const mounted = mountComponent(TapeReview);
  mounted.render(); mounted.flush(); await tick();
  assert.equal(button(mounted.render(), 'Get my notes').props.disabled, true);
  t.mock.timers.tick(8001); await tick();
  assert.equal(button(mounted.render(), 'Get my notes').props.disabled, false);
  assert.equal(config.timeout, 8000);
  assert.equal(config.signal.aborted, true);
  await button(mounted.render(), 'Get my notes').props.onClick();
  assert.equal(requests[0].options.headers['Idempotency-Key'], 'uncertain-B');
  mounted.unmount();
});

test('selecting a library tape clears prior results and retains no media URL or cached notes', () => {
  store.dispatch(reviewTape.fulfilled({ verdict: 'Old private notes' }, 'old', {}));
  store.dispatch(selectReviewRecording(recording));
  const state = store.getState().jericho;
  assert.deepEqual(state.reviewRecording, { id: 42, title: 'Callback take', role: 'Morgan', idempotencyKey: null, navigationPending: true });
  assert.equal(state.tapeReviewResult, null);
  assert.equal(state.notesReady, false);
  store.dispatch(clearTapeReview());
  assert.equal(store.getState().jericho.reviewRecording, null);
});

test('a library handoff cannot clear a running review', () => {
  store.dispatch(reviewTape.pending('active', {}));
  store.dispatch(selectReviewRecording(recording));
  assert.equal(store.getState().jericho.reviewRecording, null);
  assert.equal(store.getState().jericho.tapeReviewLoading, true);
});

test('a library handoff cannot replace an active charged comparison', () => {
  store.dispatch(compareTakes.pending('active-comparison', {}));
  store.dispatch(selectReviewRecording(recording));
  assert.equal(store.getState().jericho.reviewRecording, null);
  assert.equal(store.getState().jericho.compareLoading, true);
  const card = render(TapeCard, { tape: recording, reviewBusy: true });
  assert.match(card, /disabled=""[^>]*>Get casting notes/);
  assert.equal(requests.length, 0);
});

test('library mode renders the real TapeReview with recovery-gated CTA and no file picker', () => {
  store.dispatch(selectReviewRecording(recording));
  const html = render(TapeReview);
  for (const text of ['Callback take', 'no upload needed', 'Get my notes', 'Choose a different take']) assert.ok(html.includes(text), text);
  assert.ok(!html.includes('type="file"'));
  assert.ok(!html.includes('Choose a video'));
  assert.ok(!html.includes('Compare takes'));
  assert.ok(html.includes('disabled=""'));
  assert.equal(requests.length, 0, 'static rendering sends no request; lifecycle test covers effects');
  store.dispatch(clearTapeReview());
  const picker = render(TapeReview);
  assert.ok(picker.includes('Choose a video'));
  assert.ok(picker.includes('disabled=""'));
});

test('each cloud card has the door while local-only tapes wait for sync', () => {
  assert.ok(render(TapeCard, { tape: recording }).includes('Get casting notes'));
  const local = render(TapeCard, { tape: { localId: 'local', title: 'Pending tape' } });
  assert.match(local, /disabled=""[^>]*>Get casting notes/);
  assert.ok(local.includes('Available after this tape syncs.'));
  assert.ok(render(TapeCard, { tape: recording, reviewBusy: true }).includes('A review is already in progress.'));
});

test('the real thunk sends only id/context and stable key, never fetches or uploads the library URL', async () => {
  const args = { recordingId: 42, role: 'Morgan', tone: 'Warm', sides: 'Hello', idempotencyKey: 'random-action-key' };
  const result = await store.dispatch(reviewTape(args));
  assert.ok(reviewTape.fulfilled.match(result));
  assert.deepEqual(result.payload, notes);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, '/v1/ai/jericho/review-recording/');
  assert.deepEqual(requests[0].body, { recording_id: 42, role: 'Morgan', tone: 'Warm', sides: 'Hello' });
  assert.equal(requests[0].options.headers['Idempotency-Key'], 'random-action-key');
  assert.equal(globalThis.__reviewEvents[0].props.via, 'library');
});

test('completed async replay unwraps the server-trimmed notes without polling', async () => {
  const removed = [];
  globalThis.localStorage.getItem = key => key === 'dst_pending_analysis' ? JSON.stringify({jobId: 12}) : null;
  globalThis.localStorage.removeItem = key => removed.push(key);
  globalThis.__reviewHttp.post = async () => ({ data: { data: { job_id: 12, status: 'done', result: notes } } });
  const result = await store.dispatch(reviewTape({ recordingId: 42, idempotencyKey: 'same-action' }));
  assert.ok(reviewTape.fulfilled.match(result));
  assert.deepEqual(result.payload, notes);
  assert.ok(!('performance_dna' in store.getState().jericho.tapeReviewResult));
  assert.ok(removed.includes('dst_pending_analysis'));
});

test('pending async recording uses existing polling and restores the final trimmed result', async () => {
  globalThis.__reviewHttp.post = async () => ({ data: { data: { job_id: 12, status: 'pending' } } });
  globalThis.__reviewHttp.get = async url => {
    assert.equal(url, '/jobs/12/');
    return { data: { data: { status: 'done', result: notes } } };
  };
  const result = await store.dispatch(reviewTape({ recordingId: 42, idempotencyKey: 'pending-action' }));
  assert.ok(reviewTape.fulfilled.match(result));
  assert.deepEqual(result.payload, notes);
});

test('network errors and a starting duplicate preserve the action key; definitive errors retire it', async () => {
  for (const [error, reuseKey] of [
    [new Error('offline'), true],
    [{ response: { status: 409, data: { code: 'review_in_progress', message: 'Still starting' } } }, true],
    [{ response: { status: 409, data: { code: 'retry_new_key', message: 'Settled' } } }, false],
    [{ response: { status: 404, data: { message: 'Self-tape not found.' } } }, false],
    [{ response: { status: 402, data: {} } }, false],
  ]) {
    globalThis.__reviewHttp.post = async () => { throw error; };
    const result = await store.dispatch(reviewTape({ recordingId: 42, idempotencyKey: 'retry-action' }));
    assert.ok(reviewTape.rejected.match(result));
    assert.equal(result.payload.reuseKey, reuseKey);
    assert.equal(store.getState().jericho.tapeReviewLoading, false);
  }
});

test('failed async replay rejects instead of rendering a hollow result', async () => {
  globalThis.__reviewHttp.post = async () => ({ data: { data: { job_id: 12, status: 'failed', error: 'Video unreadable' } } });
  const result = await store.dispatch(reviewTape({ recordingId: 42, idempotencyKey: 'failed-action' }));
  assert.ok(reviewTape.rejected.match(result));
  assert.equal(result.payload.message, 'Video unreadable');
  assert.equal(result.payload.reuseKey, false);
});

test('ordinary uploads still use presign/PUT then the original endpoint', async () => {
  let uploaded = false;
  const video = new Blob(['video'], { type: 'video/mp4' });
  globalThis.__reviewHttp.put = async (url, file) => { assert.equal(file, video); uploaded = true; };
  globalThis.__reviewHttp.post = async (url, body, options) => {
    requests.push({url, body, options});
    if (url === '/presign/') return { data: { data: { upload_url: 'https://storage.test/put', key: 'tmp/tape-review/1/random.mp4' } } };
    return { data: { data: notes } };
  };
  const result = await store.dispatch(reviewTape({ video, idempotencyKey: 'upload-action' }));
  assert.ok(reviewTape.fulfilled.match(result));
  assert.equal(uploaded, true);
  assert.equal(requests[1].url, '/v1/ai/jericho/tape-review/');
  assert.equal(requests[1].body.get('r2_key'), 'tmp/tape-review/1/random.mp4');
});
