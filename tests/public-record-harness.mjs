// Real PublicRecord component; only the recorder, the network, the router and
// analytics are replaced. No browser, no server, no microphone.
//
// All three bugs this pins lived in the component's HANDLERS, not in the
// MediaRecorder plumbing, so the recorder hook is a controllable fake — the
// cheapest seam that still runs the code that was wrong.
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('../', import.meta.url));

const mocks = {
  'react-router-dom': "export const useParams = () => ({ token: 'tok-test' });",
  'readerInvite': `
    export class ReaderInviteUnavailableError extends Error {}
    export const fetchReaderInvite = (...a) => globalThis.__rdrApi.fetchReaderInvite(...a);
    export const sendReaderClips = (...a) => globalThis.__rdrApi.sendReaderClips(...a);`,
  'analytics': 'export const trackEvent = (e, p) => globalThis.__rdrEvents.push({ event: e, props: p });',
  'useReaderRecorder': 'export const useReaderRecorder = () => globalThis.__rdrRecorder;',
  'ReaderLineCard': 'export default function ReaderLineCard(props) { return { type: "card", props }; }',
  'ReaderThanks': 'export default function ReaderThanks(props) { return { type: "thanks", props }; }',
  'publicRecord.css': 'export default {};',
};

/** The handful of DOM globals the page touches: a colour-scheme query and the
 *  noindex/no-referrer meta tags it injects. Nothing here is under test. */
export function stubDom() {
  const head = { appendChild() {}, removeChild() {} };
  globalThis.window = globalThis.window || {
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    location: { reload() {} },
  };
  globalThis.document = globalThis.document || {
    title: 'test',
    head,
    createElement: () => ({ setAttribute() {}, remove() {} }),
  };
}

export async function loadPublicRecord() {
  stubDom();
  const result = await build({
    entryPoints: [root + 'src/panels/PublicRecord/index.jsx'],
    bundle: true, write: false, format: 'cjs', platform: 'node',
    // No React at all: JSX becomes plain {type, props} nodes, which is both
    // enough for handler tests and far easier to walk than real elements.
    // Function types are INVOKED so the mocked cards return their marker nodes.
    jsx: 'transform', jsxFactory: '__h', jsxFragment: '__Frag',
    banner: { js: `
      function __h(type, props, ...children) {
        const p = { ...(props || {}) };
        if (children.length) p.children = children.length === 1 ? children[0] : children;
        return typeof type === 'function' ? type(p) : { type, props: p };
      }
      const __Frag = '__frag';
    ` },
    plugins: [{ name: 'public-record-services', setup(builder) {
      builder.onResolve({ filter: /.*/ }, ({ path, importer }) => {
        if (path === 'react' && /PublicRecord\/index\.jsx$/.test(importer)) {
          return { path: 'hooks', namespace: 'mock' };
        }
        if (path === 'react') return { path, external: true };
        const key = Object.keys(mocks).find((n) => path === n || path.endsWith('/' + n) || path.endsWith(n));
        if (key) return { path: key, namespace: 'mock' };
      });
      builder.onLoad({ filter: /.*/, namespace: 'mock' }, ({ path }) => ({
        contents: path === 'hooks' ? `
          import * as React from 'react';
          export const useState = (...a) => (globalThis.__hooks || React).useState(...a);
          export const useRef = (...a) => (globalThis.__hooks || React).useRef(...a);
          export const useEffect = (...a) => (globalThis.__hooks || React).useEffect(...a);
          export const useCallback = (...a) => (globalThis.__hooks || React).useCallback(...a);
          export const useMemo = (...a) => (globalThis.__hooks || React).useMemo(...a);
        ` : mocks[path], loader: 'js' }));
    } }],
  });
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', result.outputFiles[0].text)(require, mod, mod.exports);
  return mod.exports.default;
}

/** Minimal hook runner. Same shape as recording-review-harness, plus useMemo. */
export function mountComponent(Component, props = {}) {
  const slots = [], effects = [], cleanups = [];
  let cursor = 0;
  const hooks = {
    useState(initial) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial;
      return [slots[i], (v) => { slots[i] = typeof v === 'function' ? v(slots[i]) : v; }];
    },
    useRef(initial) { const [ref] = hooks.useState(() => ({ current: initial })); return ref; },
    useCallback(fn, deps) {
      const i = cursor++;
      if (!slots[i] || deps.some((v, j) => v !== slots[i].deps[j])) slots[i] = { fn, deps };
      return slots[i].fn;
    },
    useMemo(fn) { return fn(); },   // recompute every render: correct, just not memoised
    useEffect(fn, deps) {
      const i = cursor++;
      if (!slots[i] || !deps || deps.some((v, j) => v !== slots[i][j])) {
        effects.push(() => { cleanups[i]?.(); cleanups[i] = fn(); });
        slots[i] = deps;
      }
    },
  };
  return {
    render() {
      cursor = 0; globalThis.__hooks = hooks;
      try { return Component(props); } finally { delete globalThis.__hooks; }
    },
    flush() { effects.splice(0).forEach((run) => run()); },
    unmount() { cleanups.forEach((c) => c?.()); },
  };
}

/** A recorder whose every transition the test drives by hand. */
export function fakeRecorder() {
  const state = {
    takes: {}, activeLineId: null, isRecording: false, recordTimer: 0, micDenied: false,
    dismissMicDenied() { state.micDenied = false; },
    // Refuses while another line is recording — the real hook's behaviour
    // (startingRef / state === 'recording'), and the precondition for the
    // discard-then-fail data loss.
    async start(lineId) {
      if (state.isRecording) return false;
      state.isRecording = true; state.activeLineId = lineId; return true;
    },
    stop() {
      if (!state.isRecording) return;
      const lineId = state.activeLineId;
      state.isRecording = false; state.activeLineId = null;
      // onstop REPLACES the take (and revokes the old url), so no call site
      // needs an eager discard.
      state.takes = { ...state.takes, [lineId]: { blob: `fresh-${lineId}`, url: `u${lineId}`, durationMs: 1200 } };
    },
    discard(lineId) { const n = { ...state.takes }; delete n[lineId]; state.takes = n; },
    _seed(lineId, blob = `seed-${lineId}`) {
      state.takes = { ...state.takes, [lineId]: { blob, url: `u${lineId}`, durationMs: 1000 } };
    },
  };
  return state;
}

export function invitePayload() {
  return {
    actor_first_name: 'Mara', character: 'DETECTIVE', scene_title: 'Cold Open',
    max_takes_per_line: 3,
    lines: [
      { id: 1, character: 'MARA', text: 'Where were you?', to_record: false },
      { id: 2, character: 'DETECTIVE', text: 'Out.', to_record: true, recorded_count: 0 },
      { id: 3, character: 'MARA', text: 'All night?', to_record: false },
      { id: 4, character: 'DETECTIVE', text: 'Yes.', to_record: true, recorded_count: 0 },
    ],
  };
}

/** Walk the returned tree for the mocked card/thanks nodes. */
export function findAll(node, type, out = []) {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) { node.forEach((n) => findAll(n, type, out)); return out; }
  if (node.type === type) out.push(node);
  const kids = node.props?.children;
  if (kids !== undefined) findAll(kids, type, out);
  return out;
}
