import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { readFileSync, readdirSync } from 'node:fs';
import { launchBrowser } from './browser.mjs';

const entry = `
import React from 'react';
import { createRoot } from 'react-dom/client';
import LiveSceneMode from './src/panels/Dashboard/SceneStudy/LiveSceneMode.jsx';
window.requests = [];
window.failVoice = true;
window.spoken = [];
window.SpeechRecognition = undefined;
window.webkitSpeechRecognition = undefined;
Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
 getVoices: () => [{name:'Device English', voiceURI:'local', lang:'en-US', localService:true}],
 addEventListener() {}, removeEventListener() {}, cancel() {},
 speak(utterance) { window.spoken.push(utterance.text); window.utterance = utterance; }
}});
window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
const root = createRoot(document.getElementById('root'));
window.mountReader = () => root.render(<LiveSceneMode lines={[
 {character:'PARTNER',dialogue:'(quietly) Stay here.'},
 {character:'ACTOR',dialogue:'(turning) I remember.'},
 {character:'PARTNER',dialogue:'Come back.'},
]} userRole="ACTOR" characters={['ACTOR','PARTNER']} onExit={() => root.unmount()}/>);
window.mountReader();
`;

async function bundleReader() {
  const mocks = {
    'analytics': 'export const trackEvent = () => {}; export const Events = {};',
    'react-redux': 'const dispatch = () => Promise.resolve({}); export const useDispatch = () => dispatch;',
    'http': `export default { post: async (url, body, options) => {
      window.requests.push({url, body});
      if (url === 'tts') {
        if (window.failVoice) throw new Error('Voice service unavailable');
        return new Promise((resolve, reject) => {
          options.signal.addEventListener('abort', () => {
            window.abortedRequests = (window.abortedRequests || 0) + 1;
            reject(new Error('Aborted'));
          });
        });
      }
      return {data:{}};
    } };`,
    'constant': `export default {tts:'tts',scenePartner:'partner'};`,
    'PermissionsModal': 'export default function PermissionsModal() { return null; }',
    'useHideMobileHeader': 'export default function useHideMobileHeader() {}',
    'purchases': 'export const isNativeIOS = () => false;',
    'audioSession': 'export const resetAudioToPlayback = async () => {};',
    '@capgo/capacitor-speech-recognition': 'export const SpeechRecognition = {stop(){},removeAllListeners(){}};',
    'jerichoSlice': 'export const logSession = x => x;',
    'craftJourneySlice': 'export const completeCraftNode = x => x; export const fetchCraftJourney = () => ({});',
    'aiIdempotency': 'export const aiIdempotencyHeaders = (operation, body, options) => options;',
  };
  const result = await build({
    absWorkingDir: fileURLToPath(new URL('../', import.meta.url)),
    stdin: { contents: entry, resolveDir: fileURLToPath(new URL('../', import.meta.url)), loader: 'jsx' },
    bundle: true, write: false, platform: 'browser', format: 'iife', jsx: 'automatic',
    plugins: [{name:'reader-services', setup(builder) {
      builder.onResolve({filter:/.*/}, ({path}) => {
        const key = Object.keys(mocks).find(key => path === key || path.endsWith('/' + key));
        if (key) return {path:key, namespace:'mock'};
      });
      builder.onLoad({filter:/.*/,namespace:'mock'}, ({path}) => ({contents:mocks[path],loader:'js'}));
    }}],
  });
  return result.outputFiles[0].text;
}

test('a failed premium line stays in place; explicit Basic retry speaks it without new TTS requests', async () => {
  const bundle = await bundleReader();
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewport({width:393,height:852});
    const assets = new URL('../dist/assets/', import.meta.url);
    const css = readdirSync(assets).filter(name => name.endsWith('.css')).map(name => readFileSync(new URL(name, assets), 'utf8')).join('\n');
    await page.setContent('<style>' + css + '</style><div id="root"></div>');
    await page.addScriptTag({content:bundle});
    const clickText = async text => {
      const button = await page.evaluateHandle(text => [...document.querySelectorAll('button')].find(button => button.textContent.trim() === text && button.getBoundingClientRect().height > 0), text);
      assert.ok(button.asElement(), 'Missing visible button: ' + text);
      await button.asElement().click();
    };
    await clickText('Rehearse from memory');
    await clickText('Start Scene');
    await page.waitForSelector('[data-paused="true"]');
    assert.match(await page.$eval('body', el => el.textContent), /Your place is saved/);
    assert.equal(await page.$eval('[data-current="true"]', el => el.dataset.lineIdx), '0');
    assert.equal(await page.$eval('body', el => el.textContent.includes('I remember.')), false);
    const before = await page.evaluate(() => window.requests.length);
    await page.select('select', 'basic');
    const settings = await page.$$('fieldset input[type="checkbox"]');
    await settings[0].click();
    await settings[1].click();
    assert.equal(await page.$eval('[data-current="true"]', el => el.textContent.includes('quietly')), false);
    await clickText('Resume');
    await page.waitForFunction(() => window.spoken.length === 1);
    assert.deepEqual(await page.evaluate(() => window.spoken), ['(quietly) Stay here.']);
    assert.equal(await page.evaluate(() => window.requests.length), before);
    await page.evaluate(() => window.utterance.onend());
    await page.waitForFunction(() => document.querySelector('[data-current="true"]')?.dataset.lineIdx === '1');
    // Memory rehearsal must wait for the actor even past the study timer.
    await new Promise(resolve => setTimeout(resolve, 6500));
    assert.equal(await page.$eval('[data-current="true"]', el => el.dataset.lineIdx), '1');
    assert.equal(await page.$eval('body', el => el.textContent.includes('I remember.')), false);
    await clickText('Reveal my line');
    assert.equal(await page.$eval('body', el => el.textContent.includes('I remember.')), true);
    await clickText('Next line');
    await page.waitForFunction(() => window.spoken.length === 2);
    assert.equal(await page.$eval('body', el => el.textContent.includes('I remember.')), false);
    await clickText('Pause');
    await clickText('Resume');
    await page.waitForFunction(() => window.spoken.length === 3);
    assert.deepEqual(await page.evaluate(() => window.spoken), ['(quietly) Stay here.', 'Come back.', 'Come back.']);
    assert.equal(await page.$eval('[data-current="true"]', el => el.dataset.lineIdx), '2');
    assert.equal(await page.evaluate(() => window.requests.length), before);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});

test('premium direction playback survives casting setup and is canceled when the scene ends', async () => {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.setContent('<div id="root"></div>');
    await page.addScriptTag({content: await bundleReader()});
    await page.evaluate(() => { window.failVoice = false; });
    await page.waitForSelector('fieldset');
    await page.evaluate(() => {
      document.querySelectorAll('fieldset input[type="checkbox"]')[1].click();
    });
    await page.evaluate(() => [...document.querySelectorAll('button')].find(button => button.textContent.trim() === 'Start Scene').click());
    await page.waitForFunction(() => window.requests.some(request => request.body.text === '(quietly) Stay here.'));
    // Let React finish the casting effects that prune stale prefetches.
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.equal(await page.evaluate(() => window.abortedRequests || 0), 0);
    assert.equal(await page.$eval('[data-current="true"]', el => el.dataset.lineIdx), '0');
    await page.evaluate(() => document.querySelector('button[aria-label="End scene"]').click());
    await page.waitForFunction(() => (window.abortedRequests || 0) > 0);
  } finally { await browser.close(); }
});
