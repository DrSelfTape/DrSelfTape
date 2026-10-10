import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './browser.mjs';

// usePeerConnection and its two lifecycle tests were removed on 2026-10-10 with
// the hand-rolled WebRTC stack. The live MeetingRoom renders Daily's iframe and
// never used those hooks; this file was their only remaining consumer, which is
// why a src/-only orphan scan did not see them. The remaining two tests cover
// hooks that ARE live: useLatestCallback and useScriptAudioPlayer.
let browser, bundle;
before(async () => {
  const result = await build({
    stdin: { resolveDir: fileURLToPath(new URL('../', import.meta.url)), loader: 'jsx', contents: `
      import React, {useEffect} from 'react';
      import {createRoot} from 'react-dom/client';
      import {flushSync} from 'react-dom';
      import {useLatestCallback} from './src/hooks/useLatestCallback';
      import {useScriptAudioPlayer} from './src/hooks/useScriptAudioPlayer';
      const root = createRoot(document.getElementById('root'));
      const noop = () => {};
      const ref = current => ({current});
      window.effects = 0; window.cleanups = [];
      window.state = {sceneStudyScripts: {audioData: null}};
      function Latest({value}) {
        const callback = useLatestCallback(() => value);
        window.latest = callback;
        useEffect(() => {window.effects++; return () => window.cleanups.push(callback());}, [callback]);
        return null;
      }
      const audioOptions = {scriptLines: [{lineId: 7}], recordings: [], autoAdvance: false};
      function Audio() {window.player = useScriptAudioPlayer(audioOptions); return null;}
      window.render = (kind, props = {}) => flushSync(() => root.render(
        kind === 'latest' ? <Latest {...props}/> : <Audio/>
      ));
      window.unmount = () => flushSync(() => root.unmount());
    ` },
    bundle: true, write: false, jsx: 'automatic',
    plugins: [{name: 'isolated-platform', setup(b) {
      b.onResolve({filter: /^react-redux$/}, ({path}) => ({path, namespace: 'mock'}));
      b.onResolve({filter: /utils\/meeting$/}, () => ({path: 'meeting', namespace: 'mock'}));
      b.onLoad({filter: /.*/, namespace: 'mock'}, ({path}) => ({loader: 'js', contents:
        path === 'react-redux' ? 'export const useSelector = selector => selector(window.state);' :
        'export const clearMeetingHostFlag = () => {};'
      }));
    }}],
  });
  bundle = result.outputFiles[0].text;
  browser = await launchBrowser();
});
after(async () => browser?.close());

async function open(t) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setContent('<div id="root"></div>');
  await page.addScriptTag({content: bundle});
  t.after(async () => {await page.close(); assert.deepEqual(errors, []);});
  return page;
}

test('one-shot subscriptions keep their identity but read the latest callback on cleanup', async t => {
  const page = await open(t);
  assert.deepEqual(await page.evaluate(() => {
    render('latest', {value: 'first'});
    const first = latest;
    render('latest', {value: 'second'});
    const result = {same: first === latest, value: first(), effects};
    unmount();
    return {...result, cleanups};
  }), {same: true, value: 'second', effects: 1, cleanups: ['second']});
});

test('completed audio arriving from Redux is available without changing lines or tone', async t => {
  const page = await open(t);
  assert.deepEqual(await page.evaluate(() => {
    render('audio');
    const before = player.getAudioUrlForLine(0);
    state = {sceneStudyScripts: {audioData: {clips: [{line_id:7, status:'completed', audio_url:'https://audio.test/new.mp3', tone:'neutral'}]}}};
    render('audio');
    return [before, player.getAudioUrlForLine(0)];
  }), [null, 'https://audio.test/new.mp3']);
});
