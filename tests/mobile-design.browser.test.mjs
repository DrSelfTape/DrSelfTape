import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadDesktopReview, setupReviewRender } from './desktop-review-harness.mjs';
import { launchBrowser } from './browser.mjs';

test('production mobile spacing survives the shell reset at narrow phone widths', async () => {
  const { TapeReview } = await loadDesktopReview();
  setupReviewRender({ mobile: true, native: true, review: {
    headline_score: 5, verdict: 'A committed scene with real craft. Let the thought arrive before the next line, and keep your eyeline connected to your scene partner.',
    tone_tags: ['Grounded', 'Controlled'], whats_working: ['You listen before answering.'],
  } });
  const html = renderToStaticMarkup(createElement(TapeReview));
  const shell = readFileSync(new URL('../src/panels/Mobile/MobileApp.jsx', import.meta.url), 'utf8');
  const injected = shell.match(/<style>\{`([\s\S]*?)`\}<\/style>/)?.[1];
  assert.ok(injected, 'exercise the actual mobile shell style');
  const assets = new URL('../dist/assets/', import.meta.url);
  const css = readdirSync(assets).filter(name => name.endsWith('.css')).map(name => readFileSync(new URL(name, assets), 'utf8')).join('\n');
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    for (const width of [320, 393]) {
      await page.setViewport({ width, height: 852, deviceScaleFactor: 2 });
      await page.setContent(`<style>${css}</style><style>${injected}</style><main style="height:100vh;overflow:auto;padding:24px 20px"><h1 style="font-size:30px;font-weight:600;margin-bottom:8px">Tape Review</h1><p style="font-size:14px;color:#65655f;margin-bottom:24px">A fresh perspective on your performance.<br>Clear notes for your next take.</p>${html}</main>`);
      await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
      const metrics = await page.evaluate(() => {
        const hero = document.querySelector('.studio-score');
        const note = document.querySelector('.studio-quick-read');
        return { padding: parseFloat(getComputedStyle(hero).paddingLeft), gap: note.getBoundingClientRect().top - hero.getBoundingClientRect().bottom, overflow: document.documentElement.scrollWidth > innerWidth };
      });
      assert.ok(metrics.padding >= 16, JSON.stringify(metrics));
      assert.ok(metrics.gap >= 12, JSON.stringify(metrics));
      assert.equal(metrics.overflow, false);
      if (width === 393) await page.screenshot({ path: '/private/tmp/dst-review-redesign.png', fullPage: true });
    }
  } finally { await browser.close(); }
});
