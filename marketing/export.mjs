/**
 * Export App Store screenshots from marketing/screenshots.html.
 *
 * Renders screenshots.html at native scale, then takes a clip screenshot
 * of every `.screen` element. Output PNGs land in marketing/exports/ at
 * 1320 × 2868 — the iPhone 6.9" App Store screenshot spec, which covers
 * the current required slot (you can upload the same PNGs to the 6.7"
 * slot — Apple accepts a 1320×2868 image there).
 *
 * Usage (one-time setup):
 *   npm install puppeteer --no-save
 *
 * Then export:
 *   node marketing/export.mjs
 *
 * Output:
 *   marketing/exports/01-hero.png
 *   marketing/exports/02-ai-coach.png
 *   ...
 *   marketing/exports/07-privacy.png
 */
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HTML = path.join(__dirname, 'screenshots.html');
const OUT_DIR = path.join(__dirname, 'exports');

// Labels — order matches the order screens appear in the deck.
const LABELS = [
  '01-hero',
  '02-ai-coach',
  '03-selftape-studio',
  '04-find-a-reader',
  '05-tracker',
  '06-craft-journey',
  '07-privacy',
];

(async () => {
  await fs.mkdir(OUT_DIR, { recursive: true });

  // Use a viewport WIDE enough to fit the whole 9000+px deck. Without
  // this, every screen after the first is scrolled outside the viewport
  // and page.screenshot({clip}) returns the same first-screen pixels
  // for every clip. The deck is 7 screens × 1320px + 6 gaps × 24px =
  // 9384px wide; we pad it a bit for safety.
  // App Store spec is 1320 × 2868 in single-density pixels. deviceScaleFactor
  // = 1 means the exported PNG matches that 1:1 — no over-rendering, no
  // upscaling of the 1179 × 2556 source captures (your iPhone screenshots).
  const browser = await puppeteer.launch({
    headless: 'new',
    defaultViewport: { width: 9600, height: 2868, deviceScaleFactor: 1 },
  });
  const page = await browser.newPage();

  // Load the deck and disable the .deck scale transform so each panel
  // renders at native 1320×2868 dimensions. Also flatten the body
  // padding so each screen sits at predictable coordinates.
  await page.goto('file://' + HTML, { waitUntil: 'networkidle0' });
  await page.addStyleTag({ content: `
    .deck { transform: none !important; }
    body { padding: 0 !important; }
    h1.page, p.page { display: none !important; }
  ` });
  // Let custom fonts settle — the deck loads Google Fonts and they
  // can take a moment to swap in. Without this you get a brief FOUT
  // captured in the screenshot.
  await page.evaluate(() => document.fonts.ready);
  await new Promise((r) => setTimeout(r, 1500));

  const screens = await page.$$('.screen');
  if (screens.length !== LABELS.length) {
    console.warn(
      `WARN: expected ${LABELS.length} screens, found ${screens.length}. ` +
      `Naming will only cover the first ${Math.min(screens.length, LABELS.length)}.`,
    );
  }

  for (let i = 0; i < screens.length; i++) {
    const label = LABELS[i] || `screen-${String(i + 1).padStart(2, '0')}`;
    const file = path.join(OUT_DIR, `${label}.png`);
    // ElementHandle.screenshot() handles bounding box + clip internally
    // and is the only path that reliably captures the right pixels
    // from a horizontally-scrolling deck. Don't bypass it.
    await screens[i].screenshot({ path: file, type: 'png' });
    const box = await screens[i].boundingBox();
    console.log(`  ✓ ${label}.png  (${Math.round(box.width)}×${Math.round(box.height)})`);
  }

  await browser.close();
  console.log(`\n✅ ${screens.length} screenshots written to ${OUT_DIR}`);
})().catch((e) => { console.error(e); process.exit(1); });
