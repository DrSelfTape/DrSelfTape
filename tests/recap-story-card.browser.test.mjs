// Mounted browser tests for the V-02 RecapStoryCard (real component, real CSS,
// portaled out of a .noir-review parent). Local Puppeteer + Chrome only.
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { startHarness } from './recap-story-card-harness.mjs';

let puppeteer = null;
try { ({ default: puppeteer } = await import('puppeteer')); } catch { /* not installed */ }

let harness; let browser; let page; const errors = [];
before(async () => {
  if (!puppeteer) return;
  harness = await startHarness();
  browser = await puppeteer.launch({ headless: true });
  page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  page.on('pageerror', (error) => errors.push(error.message));
});
after(async () => { await browser?.close(); await harness?.close(); });
const btest = (name, fn) => test(name, async (t) => (puppeteer ? fn(t) : t.skip('puppeteer not installed')));

const band = { label: 'Book It', color: '#22c55e' };
const review = {
  verdict: 'You let the silence do the work.',
  tone_tags: ['Grounded', 'Wry'],
  whats_working: [{ title: 'Listening', detail: 'You hear her before you answer.' }, { title: 'Frame', detail: 'Chest up, room to breathe.' }],
  adjustments: [{ title: 'Pace', note: 'Slow the last line.', why: 'It reads rushed.' }],
  the_one_thing: 'Breathe before the last line.',
};
async function mount(props = {}) {
  errors.length = 0;
  await page.goto(harness.url);
  await page.evaluate((p) => window.mountRecap(p), { review, band, avg: 8.24, firstName: 'Sam', ...props });
  await page.waitForSelector('[role="dialog"]');
}

btest('the card portals out of .noir-review and its tap zones stay invisible', async () => {
  await mount();
  const facts = await page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"]');
    const zone = document.querySelector('.dst-recap-zone-next');
    const cs = getComputedStyle(zone);
    return {
      insideReview: !!dialog.closest('.noir-review'),
      parentIsBody: dialog.parentElement.parentElement === document.body,
      zoneBg: cs.backgroundColor, zoneBorder: cs.borderStyle, zonePadding: cs.paddingTop,
      titleFamily: getComputedStyle(document.querySelector('.dst-recap-title')).fontWeight,
      focused: document.activeElement === dialog,
    };
  });
  assert.equal(facts.insideReview, false);
  assert.equal(facts.parentIsBody, true);
  assert.equal(facts.zoneBg, 'rgba(0, 0, 0, 0)');
  assert.equal(facts.zoneBorder, 'none');
  assert.equal(facts.zonePadding, '0px');
  assert.equal(facts.titleFamily, '800', 'the recap hero keeps its own type, not .noir-review h2');
  assert.equal(facts.focused, true);
  assert.deepEqual(errors, []);
});

btest('arrows page inside the dialog only; an input behind it keeps its own keys', async () => {
  await mount();
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.$eval('[role="tab"][aria-selected="true"]', (el) => el.getAttribute('aria-label')), 'Page 2 of 3');
  await page.$eval('#outside', (el) => { el.focus(); el.setSelectionRange(1, 1); });
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.$eval('[role="tab"][aria-selected="true"]', (el) => el.getAttribute('aria-label')), 'Page 2 of 3', 'the recap did not page');
  assert.equal(await page.$eval('#outside', (el) => el.selectionStart), 2, 'the caret moved instead');
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(() => window.__closed), 0, 'Escape outside the dialog does not close it');
  await page.$eval('[role="dialog"]', (el) => el.focus());
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(() => window.__closed), 1);
});

btest('the last page closes into the notes; share calls the story exporter', async () => {
  await mount();
  await page.click('.dst-recap-primary');
  await page.click('.dst-recap-primary');
  assert.equal(await page.$eval('.dst-recap-primary', (el) => el.textContent), 'See the full notes');
  assert.ok((await page.$eval('.dst-recap-body', (el) => el.textContent)).includes('Breathe before the last line.'));
  await page.click('.dst-recap-share');
  assert.deepEqual(await page.evaluate(() => window.__shared), ['story']);
  await page.click('.dst-recap-primary');
  assert.equal(await page.evaluate(() => window.__closed), 1);
  assert.deepEqual(errors, []);
});

btest('a string-shaped whats_working and a trimmed result mount without throwing', async () => {
  await mount({ review: { verdict: 'Only the headline', whats_working: 'One strength as a string' } });
  assert.equal((await page.$$('[role="tab"]')).length, 2);
  await mount({ review: { verdict: 'Only the headline' }, band: null, avg: undefined });
  assert.equal((await page.$$('[role="tab"]')).length, 1);
  assert.equal(await page.$('.dst-recap-score'), null, 'no score means no number');
  assert.deepEqual(errors, []);
});

btest('every Tab transition stays inside the dialog and the backdrop click closes', async () => {
  await mount();
  const inside = () => page.evaluate(() => !!document.activeElement.closest('[role="dialog"]'));
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab');
    assert.equal(await inside(), true, `Tab #${i + 1} left the dialog`);
  }
  for (let i = 0; i < 12; i++) {
    await page.keyboard.down('Shift'); await page.keyboard.press('Tab'); await page.keyboard.up('Shift');
    assert.equal(await inside(), true, `Shift+Tab #${i + 1} left the dialog`);
  }
  await page.mouse.click(40, 40);
  assert.equal(await page.evaluate(() => window.__closed), 1);
});

btest('focus comes back to the dialog when a control blurs to <body> — unless an overlay is on top', async () => {
  await mount();
  await page.$eval('#outside', (el) => el.focus());
  assert.equal(await page.evaluate(() => document.activeElement.id), 'outside', 'a real target is never stolen');
  await page.$eval('#outside', (el) => el.blur()); // what an unmounting ⌘K input does
  await page.waitForFunction(() => document.activeElement?.getAttribute('role') === 'dialog');
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.$eval('[role="tab"][aria-selected="true"]', (el) => el.getAttribute('aria-label')), 'Page 2 of 3');
  // An overlay on top (the ⌘K palette marks itself data-dst-overlay) owns focus.
  await page.evaluate(() => { const o = document.createElement('div'); o.setAttribute('data-dst-overlay', 'palette'); document.body.appendChild(o); });
  await page.$eval('#outside', (el) => { el.focus(); el.blur(); });
  await new Promise((r) => setTimeout(r, 80));
  assert.equal(await page.evaluate(() => document.activeElement === document.body), true, 'the recap did not steal focus from under the overlay');
});

btest('an uploaded take renders its poster from the File; a library take from its URL', async () => {
  await mount({ withFile: true });
  const src = await page.$eval('.dst-recap-thumb', (el) => el.getAttribute('src'));
  assert.ok(src.startsWith('blob:'), src);
  await mount({ thumbnailUrl: 'https://cdn.example/take.mp4' });
  assert.equal(await page.$eval('.dst-recap-thumb', (el) => el.getAttribute('src')), 'https://cdn.example/take.mp4');
  await mount();
  assert.equal(await page.$('.dst-recap-thumb'), null, 'no take, no poster');
  assert.deepEqual(errors, []);
});
