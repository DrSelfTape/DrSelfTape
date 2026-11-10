// Audit 2026-11-09, reader lane: Live Scene Mode on the web with a working
// SpeechRecognition (Chrome), mounted the way SceneStudy mounts it — WITH an
// initialVoice. The existing reader-settings browser test mounts without one
// and without SpeechRecognition, which is why none of these paths were covered.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './browser.mjs';

const entry = `
import React from 'react';
import { createRoot } from 'react-dom/client';
import LiveSceneMode from './src/panels/Dashboard/SceneStudy/LiveSceneMode.jsx';
window.spoken = [];
window.dispatched = [];
window.recognizers = [];
window.micPrompts = 0;
// A recognizer that never recognises anything: the "cue is never heard" case.
window.SpeechRecognition = class {
  constructor() { window.recognizers.push(this); this.starts = 0; }
  start() { this.starts += 1; }
  stop() { setTimeout(() => this.onend && this.onend(), 0); }
};
Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
 getVoices: () => [{name:'Device English', voiceURI:'local', lang:'en-US', localService:true}],
 addEventListener() {}, removeEventListener() {}, cancel() {},
 speak(utterance) { window.spoken.push(utterance.text); setTimeout(() => utterance.onend && utterance.onend(), 0); }
}});
window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
const root = createRoot(document.getElementById('root'));
window.mountReader = (lines, craftSkill = '') => root.render(
  <LiveSceneMode lines={lines} userRole="ACTOR"
    characters={[...new Set(lines.map(l => l.character))]}
    initialVoice="partner_female" craftSkill={craftSkill}
    onExit={() => { window.exited = true; root.unmount(); }}/>);
`;

async function bundleReader() {
  const mocks = {
    'analytics': 'export const trackEvent = () => {}; export const Events = {};',
    'react-redux': `const dispatch = (action) => { window.dispatched.push(action); return Promise.resolve({}); };
      export const useDispatch = () => dispatch;`,
    'http': 'export default { post: async () => ({data:{}}) };',
    'constant': `export default {tts:'tts',scenePartner:'partner'};`,
    'PermissionsModal': `import React from 'react';
      export default function PermissionsModal({ isOpen, onGranted, onDenied }) {
        React.useEffect(() => { if (isOpen) window.micPrompts += 1; }, [isOpen]);
        if (!isOpen) return null;
        return React.createElement('div', { 'data-mic-modal': true },
          React.createElement('button', { onClick: () => onGranted(null) }, 'Allow mic'),
          React.createElement('button', { onClick: onDenied }, 'Not Now'));
      }`,
    'useHideMobileHeader': 'export default function useHideMobileHeader() {}',
    'purchases': 'export const isNativeIOS = () => false;',
    'audioSession': 'export const resetAudioToPlayback = async () => {};',
    '@capgo/capacitor-speech-recognition': 'export const SpeechRecognition = {stop(){},removeAllListeners(){}};',
    'jerichoSlice': `export const logSession = x => ({ type: 'logSession', payload: x });`,
    'craftJourneySlice': `export const completeCraftNode = x => ({ type: 'completeCraftNode', payload: x });
      export const fetchCraftJourney = () => ({ type: 'fetchCraftJourney' });`,
    'aiIdempotency': 'export const aiIdempotencyHeaders = (operation, body, options) => options;',
  };
  const result = await build({
    absWorkingDir: fileURLToPath(new URL('../', import.meta.url)),
    stdin: { contents: entry, resolveDir: fileURLToPath(new URL('../', import.meta.url)), loader: 'jsx' },
    bundle: true, write: false, platform: 'browser', format: 'iife', jsx: 'automatic',
    plugins: [{name:'reader-services', setup(builder) {
      builder.onResolve({filter:/.*/}, ({path}) => {
        const key = Object.keys(mocks).find(key => path === key || path.endsWith('/' + key));
        if (key) return {path:key, namespace:'mock', pluginData: {}};
      });
      builder.onLoad({filter:/.*/,namespace:'mock'}, ({path}) => ({
        contents: mocks[path], loader:'js', resolveDir: fileURLToPath(new URL('../', import.meta.url)),
      }));
    }}],
  });
  return result.outputFiles[0].text;
}

const TWO_HANDER = [
  { character: 'ACTOR', dialogue: 'Hello there.' },
  { character: 'PARTNER', dialogue: 'Come back.' },
  { character: 'ACTOR', dialogue: 'No.' },
];

let bundle;
async function openReader(browser, lines, craftSkill) {
  bundle = bundle || await bundleReader();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setContent('<div id="root"></div>');
  await page.addScriptTag({ content: bundle });
  await page.evaluate((lines, craftSkill) => window.mountReader(lines, craftSkill), lines, craftSkill);
  // Clicks anything whose own trimmed text matches — the ModePicker cards are
  // divs, so this cannot be button-only.
  const click = async (text, selector = 'button') => {
    await page.waitForFunction((text, selector) => [...document.querySelectorAll(selector)]
      .some(el => el.textContent.trim() === text), {}, text, selector);
    await page.evaluate((text, selector) => [...document.querySelectorAll(selector)]
      .find(el => el.textContent.trim() === text).click(), text, selector);
  };
  const bodyText = () => page.$eval('body', el => el.textContent);
  const currentLine = () => page.$eval('[data-current="true"]', el => el.dataset.lineIdx);
  // Device voice, so the partner's lines need no TTS round trip.
  const useBasicVoice = async () => { await page.waitForSelector('select'); await page.select('select', 'basic'); };
  return { page, errors, click, bodyText, currentLine, useBasicVoice };
}

test('B: Begin offers the mode choice, and the timed reader starts without a mic prompt', async () => {
  const browser = await launchBrowser();
  try {
    const { page, errors, click, bodyText, useBasicVoice } = await openReader(browser, TWO_HANDER);
    await useBasicVoice();
    await click('Begin');
    await page.waitForFunction(() => document.body.textContent.includes('Choose Your Mode'));
    assert.equal(await page.evaluate(() => window.micPrompts), 0, 'the mic was asked for before a mode was chosen');
    await click('Pre-Timed Reader', 'h3');
    await page.waitForSelector('[data-started="true"]');
    assert.match(await bodyText(), /Pre-Timed/);
    assert.equal(await page.evaluate(() => window.micPrompts), 0, 'the timed reader asked for the mic');
    assert.equal(await page.evaluate(() => window.recognizers.length), 0);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});

test('B: declining the mic after choosing the voice reader falls back to the timed reader', async () => {
  const browser = await launchBrowser();
  try {
    const { page, errors, click, bodyText, useBasicVoice } = await openReader(browser, TWO_HANDER);
    await useBasicVoice();
    await click('Begin');
    await click('Voice-Activated Reader', 'h3');
    await page.waitForSelector('[data-mic-modal]');
    assert.equal(await page.$('[data-started="true"]'), null, 'the scene started before the mic was answered');
    await click('Not Now');
    await page.waitForSelector('[data-started="true"]');
    assert.match(await bodyText(), /Pre-Timed/);
    assert.equal(await page.evaluate(() => window.recognizers.length), 0, 'voice recognition started without a mic');
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});

test('B: the per-character voice picker is reachable when there is more than one partner', async () => {
  const browser = await launchBrowser();
  try {
    const threeHander = [...TWO_HANDER, { character: 'OTHER', dialogue: 'Wait.' }];
    const { page, errors, click, bodyText } = await openReader(browser, threeHander);
    await click('Recast voices');
    await page.waitForFunction(() => document.body.textContent.includes('Who plays opposite you?'));
    // The lead keeps the voice chosen in the role picker (Lily), not the default.
    const lead = await page.evaluate(() => [...document.querySelectorAll('button')]
      .filter(b => b.className.includes('border-[#D4A85F] '))[0]?.textContent.trim());
    assert.match(lead, /Lily/);
    await click('Cancel');
    await page.waitForFunction(() => document.body.textContent.includes('Ready to study?'));
    assert.equal(await page.evaluate(() => window.exited), undefined, 'Cancel left the reader instead of closing the picker');
    await click('Recast voices');
    await click('Start Scene');
    await page.waitForFunction(() => document.body.textContent.includes('Choose Your Mode'));
    assert.match(await bodyText(), /Voice-Activated Reader/);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});

test('A: in web voice mode "Next line" advances when the cue is never recognised', async () => {
  const browser = await launchBrowser();
  try {
    const { page, errors, click, bodyText, currentLine, useBasicVoice } = await openReader(browser, TWO_HANDER);
    await useBasicVoice();
    await click('Begin');
    await click('Voice-Activated Reader', 'h3');
    await click('Allow mic');
    await page.waitForSelector('[data-started="true"]');
    await page.waitForFunction(() => window.recognizers.length === 1 && window.recognizers[0].starts === 1);
    assert.equal(await currentLine(), '0');

    await click('Next line');
    await page.waitForFunction(() => window.spoken.length === 1);
    assert.deepEqual(await page.evaluate(() => window.spoken), ['Come back.']);
    await page.waitForFunction(() => document.querySelector('[data-current="true"]')?.dataset.lineIdx === '2');
    // A fresh recognizer listens for the next line; the abandoned one must not
    // have restarted itself from its onend handler.
    await page.waitForFunction(() => window.recognizers.length === 2);
    await new Promise(resolve => setTimeout(resolve, 300));
    assert.equal(await page.evaluate(() => window.recognizers[0].starts), 1);

    await click('Next line');
    await page.waitForFunction(() => document.body.textContent.includes('Scene complete'));
    assert.match(await bodyText(), /Finish scene/);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});

const craftCompletions = page => page.evaluate(() => window.dispatched.filter(a => a.type === 'completeCraftNode').length);
// endScene only counts a session of 15s or more.
const skipAhead = page => page.evaluate(() => { const now = Date.now; Date.now = () => now() + 20000; });

test('C: finishing a Craft Journey scene completes the node exactly once', async () => {
  const browser = await launchBrowser();
  try {
    const lines = [{ character: 'PARTNER', dialogue: 'Hi.' }, { character: 'ACTOR', dialogue: 'Bye.' }];
    const { page, errors, click, useBasicVoice } = await openReader(browser, lines, 'listening');
    await useBasicVoice();
    await click('Begin');
    await click('2s', 'span');
    await click('Pre-Timed Reader', 'h3');
    await page.waitForFunction(() => document.querySelector('[data-current="true"]')?.dataset.lineIdx === '1', { timeout: 10000 });
    await click('Next line');
    await page.waitForFunction(() => document.body.textContent.includes('Scene complete'));
    await page.waitForFunction(() => window.dispatched.some(a => a.type === 'completeCraftNode'));
    assert.equal(await craftCompletions(page), 1);

    await skipAhead(page);
    await click('Finish scene');
    await page.waitForFunction(() => window.exited === true);
    assert.equal(await craftCompletions(page), 1, 'Finish scene completed the node a second time');
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});

test('C: ending a Craft Journey scene early still completes the node once', async () => {
  const browser = await launchBrowser();
  try {
    const { page, errors, click, useBasicVoice } = await openReader(browser, TWO_HANDER, 'listening');
    await useBasicVoice();
    await click('Begin');
    await click('Pre-Timed Reader', 'h3');
    await page.waitForSelector('[data-started="true"]');
    await skipAhead(page);
    await page.evaluate(() => document.querySelector('button[aria-label="End scene"]').click());
    await page.waitForFunction(() => window.exited === true);
    assert.equal(await craftCompletions(page), 1);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
