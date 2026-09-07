import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { configureStore } from '@reduxjs/toolkit';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadRecordingReview } from './recording-review-harness.mjs';

const { reducer, reviewTape, selectReviewRecording, clearTapeReview, TapeReview, TapeCard } = await loadRecordingReview();
const recording = { id: 42, title: 'Callback take', role_name: 'Morgan', video_url: 'https://unreachable-r2.test/video.mov' };
const notes = { verdict: 'An honest pause', headline_score: 7, whats_working: ['Listening'], adjustments: [{ note: 'Wait for the thought' }] };
const render = (component, props) => renderToStaticMarkup(createElement(component, props));
let store, requests;
beforeEach(() => {
  requests = [];
  globalThis.window = { sessionStorage: { getItem: () => null, removeItem() {} } };
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
  } });
  globalThis.__reviewStore = store;
});

test('selecting a library tape clears prior results and retains no media URL or cached notes', () => {
  store.dispatch(reviewTape.fulfilled({ verdict: 'Old private notes' }, 'old', {}));
  store.dispatch(selectReviewRecording(recording));
  const state = store.getState().jericho;
  assert.deepEqual(state.reviewRecording, { id: 42, title: 'Callback take', role: 'Morgan' });
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

test('library mode renders the real TapeReview with a ready CTA and no file picker', () => {
  store.dispatch(selectReviewRecording(recording));
  const html = render(TapeReview);
  for (const text of ['Callback take', 'no upload needed', 'Get my notes', 'Choose a different take']) assert.ok(html.includes(text), text);
  assert.ok(!html.includes('type="file"'));
  assert.ok(!html.includes('Choose a video'));
  assert.ok(!html.includes('Compare takes'));
  assert.ok(!html.includes('disabled=""'));
  assert.equal(requests.length, 0, 'opening the screen never starts a charged request');
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
  globalThis.__reviewHttp.post = async () => ({ data: { data: { job_id: 12, status: 'done', result: notes } } });
  const result = await store.dispatch(reviewTape({ recordingId: 42, idempotencyKey: 'same-action' }));
  assert.ok(reviewTape.fulfilled.match(result));
  assert.deepEqual(result.payload, notes);
  assert.ok(!('performance_dna' in store.getState().jericho.tapeReviewResult));
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
