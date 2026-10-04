// Regression guards for the friend-reader page — the app's only unauthenticated
// surface, used by a stranger doing an actor a favour. Every test here pins a
// bug an adversarial review found on 2026-10-03, hours before the build shipped.
// All three destroyed or misreported a recording the friend had already made.
import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import {
  fakeRecorder, findAll, invitePayload, loadPublicRecord, mountComponent,
} from './public-record-harness.mjs';

let PublicRecord, recorder, sent;

const tick = () => new Promise((r) => setImmediate(r));

beforeEach(async () => {
  PublicRecord = PublicRecord || await loadPublicRecord();
  recorder = fakeRecorder();
  sent = [];
  globalThis.__rdrRecorder = recorder;
  globalThis.__rdrEvents = [];
  globalThis.__rdrApi = {
    fetchReaderInvite: async () => invitePayload(),
    sendReaderClips: async (token, clips) => {
      sent.push(clips);
      return { stored: clips.map((c) => ({ id: 1, line_id: c.lineId, audio_url: 'x' })), rejected: [] };
    },
  };
});

/** Mount, resolve the invite fetch, return the live harness. */
async function ready() {
  const m = mountComponent(PublicRecord);
  m.render(); m.flush(); await tick(); m.render();
  return m;
}

const cards = (m) => findAll(m.render(), 'card');
const cardFor = (m, lineId) => cards(m).find((c) => c.props.line.id === lineId);
const thanks = (m) => findAll(m.render(), 'thanks');

test('a take is never discarded by a retake that cannot start', async () => {
  // THE WORST ONE. onRedo used to call discard(id) unconditionally and then
  // handleRecord(id); start() refuses while another line is recording, so the
  // friend's take was deleted with nothing put in its place.
  const m = await ready();
  recorder._seed(2, 'the-good-take');

  await cardFor(m, 4).props.onRecord();        // line 4 now recording
  assert.equal(recorder.isRecording, true);

  await cardFor(m, 2).props.onRedo();          // retake line 2 — must refuse
  assert.equal(recorder.takes[2]?.blob, 'the-good-take',
    'line 2 take was destroyed by a retake that could not start');
});

test('an upload acknowledgement cannot delete a newer unsent take', async () => {
  // Completion releases takes BY LINE ID. Recording stayed possible during a
  // send, so a replacement recorded mid-flight was discarded by the ack for the
  // take it replaced. Recording is now blocked while sending.
  const m = await ready();
  recorder._seed(2, 'original');

  let release;
  globalThis.__rdrApi.sendReaderClips = (token, clips) => {
    sent.push(clips);
    return new Promise((res) => { release = () => res({
      stored: clips.map((c) => ({ id: 1, line_id: c.lineId, audio_url: 'x' })), rejected: [],
    }); });
  };

  const sending = findAll(m.render(), 'card') && m.render();
  const send = findSend(m);
  const inFlight = send.props.onClick();
  await tick(); m.render();

  // mid-send the record controls must be inert AND visibly busy
  assert.equal(cardFor(m, 2).props.busy, true, 'cards do not show the send as busy');
  await cardFor(m, 2).props.onRecord();
  assert.equal(recorder.isRecording, false, 'recording started while an upload was in flight');

  release(); await inFlight; await tick();
  assert.equal(recorder.takes[2], undefined, 'the acknowledged take should be released');
});

test('a send where nothing stored does not claim success', async () => {
  // setShowThanks(true) fired on any 2xx, and the rejection notice renders
  // AFTER the `if (showThanks)` early return — so the friend was told the actor
  // "has your takes" and never saw that none of them landed.
  const m = await ready();
  recorder._seed(2, 'original');
  globalThis.__rdrApi.sendReaderClips = async () => ({ stored: [], rejected: [{ line_id: 2 }] });

  await findSend(m).props.onClick();
  await tick();

  assert.equal(thanks(m).length, 0, 'thanks screen shown when nothing was stored');
  assert.equal(recorder.takes[2]?.blob, 'original', 'a rejected take must stay in hand');
});

test('a send that stored something still thanks the friend', async () => {
  const m = await ready();
  recorder._seed(2, 'original');

  await findSend(m).props.onClick();
  await tick();

  assert.equal(thanks(m).length, 1, 'a successful send should reach the thanks screen');
  assert.equal(recorder.takes[2], undefined, 'a stored take is released');
  assert.equal(sent.length, 1);
  assert.equal(sent[0][0].lineId, 2);
});

/** The Send control: the only button outside a card. */
function findSend(m) {
  const found = [];
  (function walk(node) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.forEach(walk);
    if (node.type === 'button' && node.props?.onClick && !node.props?.className?.includes('ghost')) {
      found.push(node);
    }
    if (node.props?.children !== undefined) walk(node.props.children);
  })(m.render());
  const send = found.find((b) => String(JSON.stringify(b.props.children)).match(/Send|Sending|Try again/));
  assert.ok(send, 'could not find the Send control');
  return send;
}
