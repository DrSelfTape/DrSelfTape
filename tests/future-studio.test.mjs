import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const result = await build({
  stdin: { contents: `export {default as Home} from './src/components/FutureStudio/StudioHomeHero.jsx';
    export {default as Loading} from './src/components/FutureStudio/StudioReviewLoading.jsx';
    export {default as Boot} from './src/components/Shared/BootSplash.jsx';
    export {default as Intro} from './src/components/FutureStudio/NativeLaunchIntro.jsx';`, resolveDir: process.cwd(), loader: 'jsx' },
  bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external', jsx: 'automatic', loader: { '.css': 'empty' },
  plugins: [{ name: 'native-launch-fixture', setup(builder) {
    builder.onResolve({ filter: /^@capacitor\/core$/ }, () => ({ path: 'capacitor', namespace: 'launch-fixture' }));
    builder.onLoad({ filter: /.*/, namespace: 'launch-fixture' }, () => ({ contents: 'export const Capacitor = { isNativePlatform: () => Boolean(globalThis.__futureNative) };', loader: 'js' }));
  } }],
});
const module = { exports: {} };
new Function('require', 'module', 'exports', result.outputFiles[0].text)(createRequire(import.meta.url), module, module.exports);
const { Home, Loading, Boot, Intro } = module.exports;
const render = (component, props = {}) => renderToStaticMarkup(createElement(component, props));

test('home distinguishes unknown, exhausted and unlimited balances without promising a grant', () => {
  const props = { onMembership() {} };
  assert.match(render(Home, { ...props, balance: 0 }), /0 AI tokens available/);
  assert.match(render(Home, { ...props, balance: 90, balanceError: true }), /View your AI plan/);
  assert.doesNotMatch(render(Home, { ...props, balance: 90, balanceError: true }), /90 AI tokens/);
  assert.match(render(Home, { ...props, balance: 0, unlimited: true }), /Unlimited AI/);
  assert.match(render(Home, { ...props, balance: 0, balanceLoading: true }), /Checking AI balance/);
  assert.doesNotMatch(render(Home, { firstReview: true }), /review is free/i);
});
test('upload uses bounded measured progress and requests the app remain open', () => {
  const html = render(Loading, { uploading: true, progress: 44 });
  assert.match(html, /value="44"/);
  assert.match(html, /src="\/brand\/dr-self-tape-logo.png"/);
  assert.match(html, /Keep the app open/);
  assert.match(render(Loading, { uploading: true, progress: 130 }), /value="100"/);
  assert.match(render(Loading, { uploading: true, progress: -3 }), /value="0"/);
});
test('provider processing is indeterminate and makes no guaranteed push or completion claim', () => {
  const html = render(Loading, { uploading: false, progress: 100 });
  assert.doesNotMatch(html, /<progress|Writing your casting notes|Your review is ready/);
  assert.match(html, /Notification delivery depends/);
  assert.match(html, /Pause animation/);
});
test('boot shows loading state without a fake enter-studio gate', () => {
  const html = render(Boot);
  assert.match(html, /role="status"/);
  assert.match(html, /Opening your studio/);
  assert.match(html, /src="\/brand\/dr-self-tape-logo.png"/);
  assert.match(html, /alt="Dr Self Tape"/);
  assert.doesNotMatch(html, /Enter your studio|Skip intro/);
});
test('native intro mounts the real app underneath the branded reveal', () => {
  globalThis.__futureNative = true;
  try {
    const html = render(Intro, { children: createElement('main', null, 'Real app content') });
    assert.match(html, /Real app content/);
    assert.match(html, /future-native-intro/);
    assert.match(html, /alt="Dr Self Tape"/);
  } finally { delete globalThis.__futureNative; }
});
test('web startup does not add a timed native intro', () => {
  const html = render(Intro, { children: createElement('main', null, 'Real app content') });
  assert.match(html, /Real app content/);
  assert.doesNotMatch(html, /future-native-intro|Opening your studio/);
});
