// Audit 2026-11-09, reader lane: four places where the screen said something
// the product does not do, or hid something the actor already had.
import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  fakeRecorder, findAll, invitePayload, loadPublicRecord, mountComponent,
} from './public-record-harness.mjs';

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('../', import.meta.url));
const source = (path) => readFileSync(root + path, 'utf8');
const tick = () => new Promise((r) => setImmediate(r));

/** Every node in a {type, props} tree that passes `match`. */
function walk(node, match, out = []) {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) { node.forEach((n) => walk(n, match, out)); return out; }
  if (match(node)) out.push(node);
  if (node.props?.children !== undefined) walk(node.props.children, match, out);
  return out;
}
const text = (node) => JSON.stringify(node.props?.children ?? '');

// ── D. The friend's thank-you screen ────────────────────────────────────────

let PublicRecord;
beforeEach(async () => {
  PublicRecord = PublicRecord || await loadPublicRecord();
  globalThis.__rdrRecorder = fakeRecorder();
  globalThis.__rdrEvents = [];
  globalThis.__rdrApi = {
    fetchReaderInvite: async () => invitePayload(),
    sendReaderClips: async (token, clips) => ({
      stored: clips.map((c) => ({ id: 1, line_id: c.lineId, audio_url: 'x' })), rejected: [],
    }),
  };
});

test('the thank-you screen promises listening, not a scene run against the friend\'s voice', async () => {
  // Returned clips only play from the actor's links list; nothing reads them
  // opposite the actor in rehearsal. The page used to say it did.
  const m = mountComponent(PublicRecord);
  m.render(); m.flush(); await tick(); m.render();
  globalThis.__rdrRecorder._seed(2, 'take');

  const send = walk(m.render(), (n) => n.type === 'button' && n.props?.onClick)
    .find((b) => /Send/.test(text(b)));
  await send.props.onClick();
  await tick();

  const [thanks] = findAll(m.render(), 'thanks');
  assert.ok(thanks, 'a stored send should reach the thanks screen');
  assert.match(thanks.props.body, /listen to your recording/);
  assert.doesNotMatch(thanks.props.body, /against your voice/);
});

// ── E. Recordings survive the link being turned off or expiring ─────────────

async function loadAskAFriend() {
  const mocks = {
    '@mui/material': 'export const CircularProgress = () => null;',
    '../../Shared': 'export const CustomModal = (props) => ({ type: "modal", props });',
    'useHideMobileHeader': 'export default function useHideMobileHeader() {}',
    'useSnackbar': 'export const useSnackbar = () => ({ toast: { success() {}, error() {} } });',
    'analytics': 'export const trackEvent = () => {};',
    'readerInvite': `
      export const createReaderInvite = (...a) => globalThis.__aafApi.create(...a);
      export const listReaderInvites = (...a) => globalThis.__aafApi.list(...a);
      export const revokeReaderInvite = (...a) => globalThis.__aafApi.revoke(...a);`,
    'react': `
      export const useState = (...a) => globalThis.__hooks.useState(...a);
      export const useEffect = (...a) => globalThis.__hooks.useEffect(...a);
      export const useCallback = (...a) => globalThis.__hooks.useCallback(...a);
      export const useMemo = (...a) => globalThis.__hooks.useMemo(...a);`,
  };
  const result = await build({
    entryPoints: [root + 'src/components/sceneStudy/AskAFriend/AskAFriendModal.jsx'],
    bundle: true, write: false, format: 'cjs', platform: 'node',
    // Same trick as public-record-harness: JSX becomes plain {type, props}.
    jsx: 'transform', jsxFactory: '__h', jsxFragment: '__Frag',
    banner: { js: `
      function __h(type, props, ...children) {
        const p = { ...(props || {}) };
        if (children.length) p.children = children.length === 1 ? children[0] : children;
        return typeof type === 'function' ? type(p) : { type, props: p };
      }
      const __Frag = '__frag';
    ` },
    plugins: [{ name: 'ask-a-friend-services', setup(builder) {
      builder.onResolve({ filter: /.*/ }, ({ path }) => {
        const key = Object.keys(mocks).find((n) => path === n || path.endsWith('/' + n));
        if (key) return { path: key, namespace: 'mock' };
      });
      builder.onLoad({ filter: /.*/, namespace: 'mock' }, ({ path }) => ({ contents: mocks[path], loader: 'js' }));
    } }],
  });
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', result.outputFiles[0].text)(require, mod, mod.exports);
  return mod.exports.default;
}

const clip = (id) => ({ id, line_id: id, audio_url: `https://cdn.test/${id}.webm` });
const invite = (id, over = {}) => ({
  id, character: 'DETECTIVE', friend_name: `Friend${id}`, revoked: false, expired: false,
  open_count: 1, clips: [], ...over,
});

test('a revoked or expired link that came back with takes stays listed and playable', async () => {
  const AskAFriendModal = await loadAskAFriend();
  globalThis.__aafApi = {
    list: async () => [
      invite(1, { clips: [clip(11)] }),                  // live, with a take
      invite(2, { revoked: true, clips: [clip(21)] }),   // turned off, with a take
      invite(3, { expired: true, clips: [clip(31)] }),   // past 14 days, with a take
      invite(4, { revoked: true }),                      // turned off, nothing back
      invite(5, { expired: true }),                      // expired, nothing back
    ],
  };
  const scenes = [{ id: 7, title: 'Cold Open', characters: ['MARA', 'DETECTIVE'] }];
  const m = mountComponent(AskAFriendModal, { open: true, onClose() {}, scenes, myCharacter: 'MARA' });
  m.render(); m.flush(); await tick(); await tick();

  const tree = m.render();
  const names = walk(tree, (n) => n.type === 'p' && /Friend\d/.test(text(n))).map((n) => text(n).match(/Friend\d/)[0]);
  assert.deepEqual(names, ['Friend1', 'Friend2', 'Friend3'],
    'dead links with recordings must stay listed; dead links with none must not');

  // Each listed invite still offers its recordings…
  const listen = walk(tree, (n) => n.type === 'button' && /listen/.test(text(n)));
  assert.equal(listen.length, 3);
  // …but only the live one is offered as a link that can still be turned off.
  assert.equal(walk(tree, (n) => n.type === 'button' && /Turn off/.test(text(n))).length, 1);
  assert.equal(walk(tree, (n) => n.type === 'span' && /Link off/.test(text(n))).length, 1);
  assert.equal(walk(tree, (n) => n.type === 'span' && /Link expired/.test(text(n))).length, 1);

  // And the audio is really reachable for the revoked one.
  listen[1].props.onClick();
  const audio = walk(m.render(), (n) => n.type === 'audio');
  assert.deepEqual(audio.map((a) => a.props.src), ['https://cdn.test/21.webm']);
});

// ── F. CD coach progress stages (copy only: source-level) ───────────────────

test('the CD coach progress stages do not claim transcription or a word diff', () => {
  const src = source('src/panels/Dashboard/CDSim/index.jsx');
  // What the request really is: script text + role, nothing recorded.
  assert.match(src, /const payload = \{ script: scriptText, role: selectedRole, voice: selectedVoice \};/);
  const stages = src.slice(src.indexOf('const stages = ['), src.indexOf('];', src.indexOf('const stages = [')));
  assert.equal((stages.match(/\{ k: \d/g) || []).length, 3);
  assert.doesNotMatch(stages, /label: [^\n]*(Transcrib|Comparing|listening)/i);
  assert.doesNotMatch(stages, /detail: [^\n]*(SPEECH-TO-TEXT|kHz|DIFF)/i);
});

// ── G. Selected warm-up card contrast (style only: source-level) ────────────

test('the selected warm-up card puts on-fill ink on the ink fill', () => {
  const css = source('src/tokens.css');
  // The pair must exist in every theme block that defines the fill.
  assert.equal((css.match(/--dst-fill-ink:/g) || []).length, (css.match(/--dst-on-fill-ink:/g) || []).length);
  assert.ok((css.match(/--dst-on-fill-ink:/g) || []).length >= 2);

  const src = source('src/panels/Dashboard/CDSim/SidesUpload.jsx');
  const card = src.slice(src.indexOf('{WARMUPS.map((m) => {'), src.indexOf('TAKE LENGTH'));
  assert.match(card, /background: on\s*\? 'var\(--dst-fill-ink\)'/);
  // Label, check mark and description: none may hard-code near-black any more.
  assert.equal((card.match(/var\(--dst-on-fill-ink\)/g) || []).length, 3);
  assert.doesNotMatch(card, /color: on \? '#0E0D0A'/);
  assert.doesNotMatch(card, /color: '#0E0D0A'/);
  assert.doesNotMatch(card, /rgba\(14,13,10/);
});
