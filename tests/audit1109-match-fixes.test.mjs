// 2026-11-09 audit, matching / chat / live-call lane. These modules import
// Vite-only globals (import.meta.env) and can't be loaded under node, so each
// fix is pinned at the source level; the reducer logic is exercised directly.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const meeting = read('src/panels/Meeting/MeetingRoom.jsx');
const socket = read('src/socket/socket.jsx');
const chat = read('src/panels/Dashboard/FindAReader/GreenRoomChat.jsx');
const slice = read('src/redux/features/readers/readersMatchSlice.js');
const profile = read('src/panels/Dashboard/FindAReader/ReaderProfile.jsx');

test('A: the caller gives up before the server ring TTL, not at it', () => {
  const ms = Number(meeting.match(/const NO_ANSWER_MS = (\d+);/)?.[1]);
  assert.ok(ms > 60000 && ms < 90000, `NO_ANSWER_MS=${ms} must be under the 90s ring TTL`);
  assert.match(meeting, /\}, NO_ANSWER_MS\);/);
  assert.doesNotMatch(meeting, /\}, 90000\);/);
});

test('A: every answer path joins only after a non-409 ring-ack', () => {
  // One helper owns the "answered" ack, and it maps 409 to "do not join".
  const helper = socket.match(/const ackAnswered = async[\s\S]*?\n};/)?.[0] || '';
  assert.match(helper, /status === 409\) return false/);
  assert.match(helper, /return true;/);
  const answeredPosts = socket.match(/action: 'answered'/g) || [];
  assert.equal(answeredPosts.length, 1, 'no answer path may post its own fire-and-forget ack');
  // CallKit answer, cold-launch pending answer, in-app Connect.
  assert.match(socket, /\.then\(\(ok\) => \{ if \(ok\) joinWhenVisible\(e\.roomUrl, mid\); \}\)/);
  assert.match(socket, /if \(!pmid \|\| await ackAnswered\(pmid, pending\?\.callId\)\) \{\s*joinWhenVisible\(pending\.roomUrl, pmid\);/);
  assert.match(socket, /if \(!\(await ackAnswered\(matchId, ringId\)\)\) return;/);
});

test("B: Daily's Leave before anyone joined cancels the ring and skips the rating screen", () => {
  const handler = meeting.match(/call\.on\('left-meeting', \(\) => \{[\s\S]*?\n {4}\}\);/)?.[0] || '';
  const guard = handler.indexOf('if (!reachedCallRef.current)');
  const cancel = handler.indexOf('cancelRing();');
  const ret = handler.indexOf('return;', cancel);
  const left = handler.indexOf("setStatus('left')");
  assert.ok(guard > -1 && cancel > guard, 'never-connected leave must cancel the ring');
  assert.ok(ret > cancel && left > ret, "never-connected leave must return before setStatus('left')");
  assert.match(handler, /navigate\(matchId \? `\/dashboard\/green-room\/\$\{matchId\}`/);
  // teardown()'s own leave must not navigate a second time.
  assert.match(handler, /if \(cleanupRanRef\.current\) return;/);
});

test('C: a failed chat send removes the optimistic bubble and tells the user', () => {
  assert.doesNotMatch(chat, /local msg already shown/);
  assert.match(chat, /const failSend = [\s\S]*?removeMessage\(\{ matchId, id: localId \}\)[\s\S]*?showSnackbar\(/);
  assert.equal((chat.match(/failSend\(localId, err\)/g) || []).length, 2, 'typed send and icebreaker');
});

test('C: a failed upload never posts a "Sides shared" bubble', () => {
  const fn = chat.match(/const handleSidesUpload = async[\s\S]*?\n {2}\};/)?.[0] || '';
  const catchBlock = fn.slice(fn.indexOf('} catch (err) {'), fn.indexOf('} finally {'));
  assert.ok(catchBlock.length > 0);
  assert.doesNotMatch(catchBlock, /sendLocalMsg/);
  assert.match(catchBlock, /showSnackbar\(/);
});

test('C/F: slice reducers — removeMessage drops only that bubble; stats hydrate availability', async () => {
  // Evaluate the real reducer source with the Vite-only imports stubbed out.
  const { createSlice, createAsyncThunk } = await import('@reduxjs/toolkit');
  const body = slice
    .replace(/^import .*$/gm, '')
    .replace(/export const/g, 'const')
    .replace(/export default readersMatchSlice\.reducer;/, '')
    + '\nreturn { reducer: readersMatchSlice.reducer, actions: readersMatchSlice.actions, fetchMatchingStats, toggleAvailability };';
  const mod = new Function('createSlice', 'createAsyncThunk', 'axios', 'baseURL', body)(
    createSlice, createAsyncThunk, {}, '',
  );
  const { reducer, actions, fetchMatchingStats, toggleAvailability } = mod;

  let s = reducer(undefined, { type: '@@init' });
  assert.equal(s.isAvailable, false);
  s = reducer(s, actions.appendMessage({ id: 1, matchId: '7', text: 'a' }));
  s = reducer(s, actions.appendMessage({ id: 2, matchId: '7', text: 'b' }));
  s = reducer(s, actions.removeMessage({ matchId: '7', id: 1 }));
  assert.deepEqual(s.greenRoomMessages['7'].map((m) => m.id), [2]);
  s = reducer(s, actions.removeMessage({ matchId: 'nope', id: 2 }));
  assert.equal(s.greenRoomMessages['7'].length, 1);

  s = reducer(s, fetchMatchingStats.fulfilled({ online_count: 3, is_available: true }, 'r1'));
  assert.equal(s.isAvailable, true, 'server value hydrates the toggle');
  assert.equal(s.onlineCount, 3);
  // An older BE without the field must not flip it.
  s = reducer(s, fetchMatchingStats.fulfilled({ online_count: 0 }, 'r2'));
  assert.equal(s.isAvailable, true);
  // A stats response landing mid-toggle must not undo the user's tap.
  s = reducer(s, toggleAvailability.pending('r3', false));
  s = reducer(s, fetchMatchingStats.fulfilled({ is_available: true }, 'r4'));
  s = reducer(s, toggleAvailability.fulfilled({ is_available: false }, 'r3', false));
  assert.equal(s.isAvailable, false);
});

test('G: ReaderProfile has no bare navigate() the mobile shell would swallow', () => {
  assert.doesNotMatch(profile, /onClick=\{\(\) => navigate\(-1\)\}/);
  assert.equal((profile.match(/onClick=\{handleBack\}/g) || []).length, 2);
  // Every remaining navigate() call is behind the onBack / in-shell branch.
  const calls = profile.split('\n').filter((l) => /\bnavigate\(/.test(l) && !l.trim().startsWith('//'));
  assert.deepEqual(calls.map((l) => l.trim()), ['else navigate(-1);', 'else navigate(path);']);
  assert.match(profile, /panel: 'green-room', subPanel: 'green-room-chat', matchId: String\(matchId\)/);
});

test('G: socket.jsx decides "mobile" with the same rule as useIsMobile', () => {
  const norm = (src) => src.replace(/\s+/g, ' ');
  const hook = norm(read('src/hooks/useIsMobile.js').match(/function detect\(\) \{([\s\S]*?)\n\}/)[1]);
  const sock = norm(socket.match(/const isMobile = \(\) => \{([\s\S]*?)\n\};/)[1]);
  assert.equal(sock.trim(), hook.trim());
});

test('H: the name shown to a call partner never falls back to the email', () => {
  const block = meeting.match(/const userName =[\s\S]*?;/)?.[0] || '';
  assert.ok(block.length > 0);
  assert.doesNotMatch(block, /email/);
});
