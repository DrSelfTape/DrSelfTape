import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);

async function load() {
  const result = await build({
    stdin: {
      contents: `export { default as RecapStoryCard } from './src/panels/Dashboard/Jericho/RecapStoryCard.jsx';
        export { buildRecapPages } from './src/panels/Dashboard/Jericho/recapPages.js';`,
      resolveDir: root,
    },
    bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external', jsx: 'automatic',
    loader: { '.css': 'empty' },
    plugins: [{
      name: 'mock-mobile-header',
      setup(b) {
        b.onResolve({ filter: /useHideMobileHeader$/ }, () => ({ path: 'useHideMobileHeader', namespace: 'mock' }));
        b.onLoad({ filter: /.*/, namespace: 'mock' }, () => ({ contents: 'export default function useHideMobileHeader() {}', loader: 'js' }));
      },
    }],
  });
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', result.outputFiles[0].text)(require, mod, mod.exports);
  return mod.exports;
}

const { RecapStoryCard, buildRecapPages } = await load();
const band = { label: 'Book It', color: '#22c55e' };
const full = {
  verdict: 'You let the silence do the work.',
  tone_tags: ['Grounded', 'Wry', 'Still', 'Extra'],
  whats_working: ['Eyeline held through the beat', { text: 'Clean slate' }, { note: 'Framing at chest' }, 'Fourth is dropped'],
  adjustments: [{ note: 'Land the last line a half-beat later' }, 'Second fix ignored'],
};
const render = (props) => renderToStaticMarkup(createElement(RecapStoryCard, { review: full, band, avg: 8.24, firstName: 'Sam', onClose() {}, ...props }));

test('a full review yields read → working → one thing, capped and real', () => {
  const pages = buildRecapPages(full, { band, avg: 8.24, firstName: 'Sam' });
  assert.deepEqual(pages.map((p) => p.key), ['read', 'working', 'one-thing']);
  assert.equal(pages[0].title, 'Book It');
  assert.equal(pages[0].score, 8.2);
  assert.equal(pages[0].kicker, 'Sam, the read');
  assert.deepEqual(pages[0].tags, ['Grounded', 'Wry', 'Still']);
  assert.deepEqual(pages[1].body, ['Eyeline held through the beat', 'Clean slate', 'Framing at chest']);
  assert.equal(pages[2].body, 'Land the last line a half-beat later');
});

test('the shapes the BE actually emits all read: {title,detail}, bare string, the_one_thing', () => {
  const pages = buildRecapPages({
    verdict: 'v', whats_working: [{ title: 'Listening', detail: 'You hear her.' }],
    adjustments: [{ title: 'Pace', note: 'Slow the last line.', why: 'w' }], the_one_thing: 'Breathe before the last line.',
  }, { band, avg: 7 });
  assert.deepEqual(pages[1].body, ['Listening — You hear her.']);
  assert.equal(pages[2].body, 'Breathe before the last line.', 'the_one_thing wins over adjustments[0]');
  const stringShaped = buildRecapPages({ verdict: 'v', whats_working: 'One strength as a string' }, {});
  assert.deepEqual(stringShaped[1].body, ['One strength as a string']);
  assert.equal(buildRecapPages({ verdict: 'v', whats_working: 42, tone_tags: 'nope' }, {}).length, 1, 'malformed fields are ignored, never thrown');
});

test('a trimmed free result yields only the read; nothing is invented', () => {
  const pages = buildRecapPages({ verdict: 'Free headline' }, { band: null, avg: undefined });
  assert.equal(pages.length, 1);
  assert.equal(pages[0].title, 'Your read');
  assert.equal(pages[0].score, null, 'no number when there is no score');
  assert.deepEqual(buildRecapPages(null), []);
  assert.deepEqual(buildRecapPages({}), []);
});

test('the card renders as a dialog with one dot per page and the band as the hero', () => {
  const html = render({});
  assert.ok(html.includes('role="dialog"'));
  assert.ok(html.includes('aria-modal="true"'));
  assert.equal((html.match(/role="tab"/g) || []).length, 3);
  assert.ok(html.includes('aria-label="Page 1 of 3"'));
  assert.ok(html.includes('aria-selected="true"'));
  assert.ok(html.includes('Book It'));
  assert.ok(html.includes('8.2</span>/10'));
  assert.ok(html.includes('You let the silence do the work.'));
  assert.ok(html.includes('--recap-accent:#22c55e'));
  assert.match(html, /class="dst-recap-primary">Next</, 'the primary CTA advances on the first page');
  assert.ok(!html.includes('Share to Story'), 'no share button without a share handler');
});

test('a share handler adds the story CTA and an empty review renders nothing', () => {
  assert.ok(render({ onShare() {} }).includes('Share to Story'));
  assert.ok(render({ onShare() {}, sharing: true }).includes('Preparing…'));
  assert.equal(renderToStaticMarkup(createElement(RecapStoryCard, { review: {}, onClose() {} })), '');
});
