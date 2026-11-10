// Audit 2026-11-09: the desktop help slide-over and the palette verb that opens
// it. The real components run under the explicit hook driver; no DOM.
import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { mountComponent } from './recording-review-harness.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);

async function load(entry, mocks, hookedImporter) {
  const result = await build({
    stdin: { resolveDir: root, contents: entry },
    bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external', jsx: 'automatic',
    define: { 'import.meta.env': '{}' },
    plugins: [{ name: 'audit1109-help-mocks', setup(builder) {
      builder.onResolve({ filter: /.*/ }, ({ path, importer }) => {
        if (path === 'react' && hookedImporter.test(importer)) return { path: 'hooks', namespace: 'mock' };
        const key = Object.keys(mocks).find(name => path === name || path.endsWith('/' + name));
        if (key) return { path: key, namespace: 'mock' };
      });
      builder.onLoad({ filter: /.*/, namespace: 'mock' }, ({ path }) => ({ contents: path === 'hooks' ? `
        const h = (name) => (...a) => globalThis.__hooks[name](...a);
        export const useState = h('useState'), useEffect = h('useEffect'), useRef = h('useRef'), useCallback = h('useCallback');
        export const useMemo = (fn) => fn();
        export const lazy = () => globalThis.__LazyReport ||= function LazyReport() { return null; };
        export const Suspense = 'suspense';
      ` : mocks[path], loader: 'js' }));
    } }],
  });
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', result.outputFiles[0].text)(require, mod, mod.exports);
  return mod.exports.default;
}

const HelpSlideOver = await load(`export { default } from './src/components/HelpSlideOver.jsx';`, {
  'ReportProblemModal.jsx': 'export default function ReportProblemModal() { return null; }',
}, /HelpSlideOver\.jsx$/);
const Palette = await load(`export { default } from './src/components/ConsoleCommandPalette.jsx';`, {
  'react-router-dom': 'export const useNavigate = () => (path) => globalThis.__routes.push(path);',
  'react-redux': 'export const useSelector = () => "actor";',
  'navGroups': 'export const navGroupsForRole = () => [];',
  'consoleSurface': 'export const consoleSurfaceEnabled = () => globalThis.__consoleSurface;',
}, /ConsoleCommandPalette\.jsx$/);

const find = (node, match, hits = []) => {
  if (!node || typeof node !== 'object') return hits;
  if (Array.isArray(node)) { node.forEach(n => find(n, match, hits)); return hits; }
  if (match(node)) hits.push(node);
  return find(node.props?.children, match, hits);
};
const text = (node) => !node || typeof node === 'boolean' ? '' : typeof node !== 'object' ? String(node)
  : Array.isArray(node) ? node.map(text).join('') : text(node.props?.children);

let listeners, view;
const fire = (type, event = {}) => { [...(listeners[type] || [])].forEach(fn => fn(event)); view.render(); view.flush(); };
const key = (name, extra = {}) => {
  const event = { key: name, target: {}, prevented: false, preventDefault() { this.prevented = true; }, ...extra };
  fire('keydown', event);
  return event;
};
const mount = (Component) => { view = mountComponent(Component); view.render(); view.flush(); return view; };

beforeEach(() => {
  listeners = {};
  globalThis.__routes = [];
  globalThis.requestAnimationFrame = (fn) => fn();
  globalThis.document = { activeElement: null };
  globalThis.window = {
    innerWidth: 1440, matchMedia: () => ({ matches: true }),
    addEventListener: (type, fn) => { (listeners[type] ||= new Set()).add(fn); },
    removeEventListener: (type, fn) => { listeners[type]?.delete(fn); },
    dispatchEvent: (event) => { globalThis.__dispatched.push(event.type); },
  };
  globalThis.CustomEvent = class { constructor(type) { this.type = type; } };
  globalThis.__dispatched = [];
});

const dialog = () => find(view.render(), n => n.props?.role === 'dialog')[0];
const reportModal = () => find(view.render(), n => n.type === globalThis.__LazyReport)[0];
const openReport = () => {
  fire('drst-open-help');
  find(view.render(), n => n.type === 'button' && text(n) === 'Report a problem')[0].props.onClick();
  view.render(); view.flush();
};

test('I: Esc while writing a report does not close the panel or drop the draft', () => {
  mount(HelpSlideOver);
  openReport();
  assert.ok(dialog() && reportModal());
  key('Escape');
  assert.ok(dialog(), 'the panel stays up under the report modal');
  assert.ok(reportModal(), 'the report modal is still mounted');
});

test('I: the report modal keeps its tree position when the panel is closed', () => {
  mount(HelpSlideOver);
  openReport();
  const slot = (tree) => tree.props.children.findIndex(child => find(child, n => n.type === globalThis.__LazyReport).length > 0);
  const whileOpen = slot(view.render());
  find(view.render(), n => n.props?.['aria-label'] === 'Close help')[0].props.onClick();
  view.render(); view.flush();
  assert.equal(dialog(), undefined);
  assert.ok(reportModal(), 'closing the panel no longer unmounts the report');
  // Same slot in both states, or React would remount it and clear the draft.
  assert.equal(slot(view.render()), whileOpen);
});

test('I: Esc still closes the panel once the report is done', () => {
  mount(HelpSlideOver);
  openReport();
  reportModal().props.onClose();
  view.render(); view.flush();
  assert.equal(reportModal(), undefined);
  key('Escape');
  assert.equal(dialog(), undefined);
});

test('I: Tab is held inside the panel', () => {
  mount(HelpSlideOver);
  fire('drst-open-help');
  const control = (name) => ({ name, tabIndex: 0, offsetParent: {}, focus() { document.activeElement = this; } });
  const first = control('first'), last = control('last');
  const panel = { querySelectorAll: () => [first, last], contains: (el) => el === first || el === last || el === panel,
    focus() { document.activeElement = panel; } };
  dialog().props.ref.current = panel;

  document.activeElement = last;
  assert.equal(key('Tab').prevented, true);
  assert.equal(document.activeElement, first);

  assert.equal(key('Tab', { shiftKey: true }).prevented, true);
  assert.equal(document.activeElement, last);

  document.activeElement = { name: 'page behind the scrim' };
  key('Tab');
  assert.equal(document.activeElement, first);

  document.activeElement = first; // mid-ring: native order is left alone
  assert.equal(key('Tab').prevented, false);
});

const verbs = (query) => {
  fire('drst-open-palette');
  find(view.render(), n => n.type === 'input')[0].props.onChange({ target: { value: query } });
  view.render(); view.flush();
  return find(view.render(), n => n.type === 'button').map(text);
};

test('J: /shortcuts is offered only where the help panel is mounted', () => {
  globalThis.__consoleSurface = false;
  mount(Palette);
  const off = verbs('/');
  assert.equal(off.length, 5);
  assert.ok(!off.some(label => /Keyboard shortcuts/.test(label)));
  assert.deepEqual(verbs('/shortcuts'), []);
  assert.doesNotMatch(text(view.render()), /or \/shortcuts/);

  globalThis.__consoleSurface = true;
  mount(Palette);
  const on = verbs('/');
  assert.equal(on.length, 6);
  find(view.render(), n => n.type === 'button' && /Keyboard shortcuts/.test(text(n)))[0].props.onClick();
  assert.deepEqual(globalThis.__dispatched, ['drst-open-help']);
});
