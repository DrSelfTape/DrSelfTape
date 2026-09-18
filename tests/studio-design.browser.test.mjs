import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { loadDesktopReview } from './desktop-review-harness.mjs';
import { launchBrowser } from './browser.mjs';

const entry = `
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import TapeReview from './src/panels/Dashboard/Jericho/TapeReview.jsx';
import StudioReviewSummary from './src/panels/Dashboard/Jericho/StudioReviewSummary.jsx';
import StudioScript from './src/panels/Dashboard/SceneStudy/StudioScript.jsx';
import { StudioRehearsalHeader, StudioRehearsalControls } from './src/panels/Dashboard/SceneStudy/StudioRehearsalChrome.jsx';
window.__desktopNative = true;
window.__desktopEntitlement = { isPaid: true, loading: false, error: null, balance: 5 };
window.__desktopState = {
  auth: { user: { ai_consent_accepted_at: '2026-09-01' } },
  profile: { profile: { first_name: 'Alex' } },
  userSettings: { loaded: true, data: { tutorial_progress: { first_review: true } } },
  jericho: { tapeReviewResult: { headline_score: 5,
    verdict: 'Your commitment comes through. Keep your eyeline connected as the stakes rise.',
    the_one_thing: 'Let the thought land before the next line.',
    whats_working: [{ title: 'Listening', detail: 'The silence changes your response.' }],
    adjustments: [{ note: 'Hold your eyeline as you listen.' }],
  }, memory: { total_sessions: 3 }, memoryHasFetched: true, recentSessions: [] }
};
const lines = [
 { character:'PENNY', dialogue:'What are you doing here?' },
 { character:'ALICE', dialogue:'Looking for something I left here.' },
 { character:'PENNY', dialogue:'What would be here after 25 years?' },
 { character:'ALICE', dialogue:'Right? But you know me. Optimistic to an embarrassing fault.' },
 { character:'PENNY', dialogue:'You never learn.' },
];
const root = createRoot(document.getElementById('root'));
function Rehearsal() {
 const [paused, setPaused] = useState(false);
 const [index, setIndex] = useState(1);
 const [mode, setMode] = useState('listen');
 const onEnd = () => { window.__ended = true; };
 return <div className="dst-rehearsal fixed inset-0 flex flex-col overflow-hidden" data-started="true" data-paused={paused}>
 <StudioRehearsalHeader role="ALICE" lineIndex={index} lineCount={lines.length} onEnd={onEnd}/>
 <div className="flex-1 flex flex-col overflow-hidden"><StudioScript lines={lines} userRole="ALICE" currentLineIdx={index}/></div>
 <StudioRehearsalControls paused={paused} status={index === 1 ? 'listening' : 'playing'} actorTurn={index === 1} readerMode={mode}
 onNext={() => setIndex(i => i + 1)} onPause={() => setPaused(true)} onResume={() => setPaused(false)} onEnd={onEnd} onTimed={() => setMode('pretimed')}/>
 </div>;
}
window.mountStudio = mode => root.render(mode === 'rehearsal' ? <Rehearsal/> : <main className="studio-mobile-shell" style={{ height:'100vh', overflow:'auto' }}><div className="dst-review-page"><div style={{fontFamily:'Georgia',letterSpacing:'.18em',textAlign:'center',fontSize:13,padding:'16px 0 24px'}}>DR SELF TAPE</div><header className="studio-review-heading"><h1>Your tape review</h1><p>A fresh perspective. A stronger next take.</p></header><TapeReview/></div></main>);
window.mountStudio('review');
window.mountVideo = file => root.render(<StudioReviewSummary review={{ verdict: 'Your notes remain available.' }} file={file} />);
`;

test('Studio design preserves mobile review actions and rehearsal controls across phone sizes', async () => {
  const bundle = await loadDesktopReview({ browserEntry: entry });
  const assets = new URL('../dist/assets/', import.meta.url);
  const css = readdirSync(assets).filter(n => n.endsWith('.css')).map(n => readFileSync(new URL(n, assets), 'utf8')).join('\n');
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewport({ width: 393, height: 852, deviceScaleFactor: 2 });
    await page.setContent('<style>' + css + '</style><div id="root"></div>');
    await page.addScriptTag({ content: bundle });
    await page.waitForSelector('.studio-review-actions .studio-primary');
    assert.equal(await page.$eval('.studio-score-value', n => n.textContent), '5.0/10');
    await page.screenshot({ path: '/private/tmp/dst-studio-review.png' });
    await page.click('.studio-review-actions .studio-primary');
    await page.waitForFunction(() => document.body.textContent.includes('The silence changes your response.'));
    assert.equal(await page.$('.studio-review-actions'), null);
    for (const [width, height] of [[320, 568], [393, 852], [844, 390]]) {
      await page.setViewport({ width, height, deviceScaleFactor: 2 });
      await page.evaluate(() => window.mountStudio('rehearsal'));
      await page.waitForSelector('.studio-rehearsal-controls');
      const bounds = await page.evaluate(() => {
        const controls = document.querySelector('.studio-rehearsal-controls').getBoundingClientRect();
        const script = document.querySelector('.dst-rehearsal-script').getBoundingClientRect();
        const button = document.querySelector('.studio-primary').getBoundingClientRect();
        return { overflow: document.documentElement.scrollWidth > innerWidth, bottom: controls.bottom, height: innerHeight, scriptHeight: script.height, buttonHeight: button.height };
      });
      assert.equal(bounds.overflow, false);
      assert.ok(bounds.bottom <= bounds.height + 1, JSON.stringify(bounds));
      assert.ok(bounds.scriptHeight > 80, JSON.stringify(bounds));
      assert.ok(bounds.buttonHeight >= 44);
      if (width === 393) await page.screenshot({ path: '/private/tmp/dst-studio-rehearsal.png' });
    }
    await page.setViewport({ width: 393, height: 852 });
    await page.click('.studio-session-toolbar button:first-child');
    await page.waitForFunction(() => document.querySelector('.studio-listening h2').textContent === 'Scene paused');
    await page.click('.studio-primary');
    await page.waitForFunction(() => document.querySelector('.studio-listening h2').textContent === 'Your turn');
    await page.click('.studio-primary');
    await page.waitForFunction(() => document.querySelector('.studio-primary').disabled);
    assert.ok((await page.$eval('.studio-scene-progress', n => n.textContent)).includes('Line 3 of 5'));
    await page.click('.studio-text-button');
    assert.equal(await page.$('.studio-text-button'), null);
    await page.click('.studio-session-toolbar button:last-child');
    assert.equal(await page.evaluate(() => window.__ended), true);
    // Preview URLs must not keep an actor's local recording alive after exit.
    await page.evaluate(() => {
      window.__created = []; window.__revoked = [];
      const create = URL.createObjectURL.bind(URL), revoke = URL.revokeObjectURL.bind(URL);
      URL.createObjectURL = blob => { const url = create(blob); window.__created.push(url); return url; };
      URL.revokeObjectURL = url => { window.__revoked.push(url); revoke(url); };
      window.mountVideo(new File(['invalid test video'], 'test.webm', { type: 'video/webm' }));
    });
    await page.waitForFunction(() => window.__created.length === 1);
    await page.waitForFunction(() => document.body.textContent.includes('Video unavailable'));
    assert.ok((await page.$eval('body', n => n.textContent)).includes('Your notes remain available.'));
    await page.evaluate(() => window.mountStudio('rehearsal'));
    await page.waitForFunction(() => window.__revoked.length === 1);
    assert.deepEqual(await page.evaluate(() => window.__revoked), await page.evaluate(() => window.__created));
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
