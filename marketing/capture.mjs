/**
 * Capture fresh App Store source screenshots from the LIVE web app.
 *
 * Why this exists: the previous captures were taken by hand months apart, and
 * two of them shipped to App Store Connect with the Safari URL bar and a
 * personal email address still in frame. Two others put a real user's face,
 * name and union status on a public storefront, and one exposed a real user's
 * private AI coaching assessment. This script makes captures reproducible, and
 * it stubs the endpoints that would otherwise surface real people so the
 * storefront only ever shows sample data.
 *
 * Usage:
 *   node marketing/capture.mjs            # iphone + ipad
 *   node marketing/capture.mjs iphone     # one device only
 *
 * Output: marketing/captures/<name>.png at App Store source resolution.
 *
 * The account is the App Review demo account, so nothing here touches a real
 * customer. `demo@drselftapes.com` is seeded with sample coaching data; see
 * project_appstore_1025_cut memory for the seed + reset ritual.
 */
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, 'captures');
// Override to capture an unreleased fix from a local server:
//   CAPTURE_APP=http://localhost:4173 node marketing/capture.mjs ipad
const APP = process.env.CAPTURE_APP || 'https://drselftape.app';
const EMAIL = 'demo@drselftapes.com';
const PASSWORD = 'Demo1234!';

// A reader with NO headshot renders the app's illustrated ReaderPortrait
// instead of a photo — which is exactly what we want on a storefront. Do not
// give this sample a headshot URL, and do not use a real person's name.
const SAMPLE_READERS = [
  {
    id: 90001, name: 'Sample Reader', first_name: 'Sample', last_name: 'Reader',
    headshot: null, user_image: null,
    union: 'sag-aftra', based_in: 'Los Angeles', years_experience: 6,
    bio: 'Happy to run lines most evenings. Comedy and grounded drama.',
    genres: ['Drama', 'Comedy', 'Thriller'],
    working_on: 'Network procedural, co-star',
    is_paid_reader: false, session_rate: null,
    is_online: true, last_seen: new Date().toISOString(),
    rating: 0, review_count: 0, response_rate: 0, total_sessions: 0,
    genre_preference: 'Drama', role_type: 'Co-star',
  },
  {
    id: 90002, name: 'Second Reader', first_name: 'Second', last_name: 'Reader',
    headshot: null, user_image: null,
    union: 'non-union', based_in: 'New York', years_experience: 3,
    bio: 'Cold reads welcome.', genres: ['Indie', 'Drama'],
    working_on: '', is_paid_reader: false, session_rate: null,
    is_online: false, last_seen: new Date(Date.now() - 36e5).toISOString(),
    rating: 0, review_count: 0, response_rate: 0, total_sessions: 0,
    genre_preference: 'Drama', role_type: 'Supporting',
  },
];

// Endpoints that would otherwise render real customers. Anything not listed
// here hits the real API as the demo account.
const STUBS = [
  { match: '/v1/matching/discover/', body: { success: true, message: 'Discover results', data: SAMPLE_READERS } },
  { match: '/v1/matching/stats/', body: { success: true, message: 'ok', data: { available_count: 2, pending_likes_count: 0, matches_count: 0 } } },
];

const BLOCKED_ASSETS = ['/avatars/39/'];

const DEVICES = {
  iphone: { width: 402, height: 874, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  ipad: { width: 1032, height: 1376, deviceScaleFactor: 2, isMobile: false, hasTouch: true },
};

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function newPage(browser, device) {
  const page = await browser.newPage();
  await page.setViewport(DEVICES[device]);
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    // The App Review demo account is deliberately "Apple Reviewer" with an
    // Apple-logo avatar. That is fine inside the app and NOT fine on an App
    // Store screenshot — Apple's mark has no business in our UI chrome.
    // Block just that asset so the header falls back to initials. Blocking
    // beats editing the account: the reviewer's setup stays exactly as built.
    if (BLOCKED_ASSETS.some((b) => req.url().includes(b))) return req.abort();
    const stub = STUBS.find((s) => req.url().includes(s.match));
    if (stub && req.method() === 'GET') {
      return req.respond({
        status: 200,
        contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify(stub.body),
      });
    }
    req.continue();
  });
  return page;
}

async function login(page) {
  await page.goto(`${APP}/login`, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.waitForSelector('input[type="email"]', { timeout: 30000 });
  await page.type('input[type="email"]', EMAIL, { delay: 10 });
  await page.type('input[type="password"]', PASSWORD, { delay: 10 });
  await page.click('button[type="submit"]').catch(() => page.keyboard.press('Enter'));
  await wait(9000);
  // The What's-New modal fires on first load after a release and would sit on
  // top of every capture.
  await dismissOverlays(page);
  if (page.url().includes('/login')) throw new Error(`login failed, still at ${page.url()}`);
}

// First-run overlays stack: What's New, the AI-consent gate, and the swipe
// tutorial can all be up at once. Match on the AFFIRMATIVE label only — there
// is a "Decline" sitting next to "I Agree & Continue" and clicking it would
// lock the AI features we are trying to photograph.
const ACCEPT = [
  'i agree & continue', 'got it. start swiping', 'start swiping',
  'got it', 'continue', 'close', 'done',
];
async function dismissOverlays(page) {
  for (let i = 0; i < 6; i++) {
    const clicked = await page.evaluate((labels) => {
      const btns = [...document.querySelectorAll('button, [role="button"]')];
      const visible = (el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
      };
      for (const label of labels) {
        const hit = btns.find((b) => visible(b) && (b.textContent || '').trim().toLowerCase().startsWith(label));
        if (hit) { hit.click(); return hit.textContent.trim().slice(0, 40); }
      }
      // No bare "✕" fallback. The swipe card's own PASS control is a "✕"
      // button, and clicking it swipes past the sample reader we came to
      // photograph (and fires an error toast into the frame). The named
      // labels above already clear every first-run overlay.
      return null;
    }, ACCEPT);
    if (!clicked) break;
    console.log(`     dismissed: ${clicked}`);
    await wait(1400);
  }
  await wait(600);
}

async function shoot(page, name) {
  // The desktop sidebar footer prints the signed-in account's email. That is
  // correct in-app and must never reach a storefront — the previous iPad set
  // shipped with a personal Gmail address visible in exactly this spot.
  await page.evaluate(() => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    document.querySelectorAll('div,span,p,small,a').forEach((el) => {
      if (el.children.length === 0 && re.test((el.textContent || '').trim())) {
        el.style.visibility = 'hidden';
      }
    });
  });
  await page.evaluate(() => document.fonts.ready);
  // Long enough for any transient toast to expire — the swipe payoff chip and
  // error snackbar both live ~1.5s and would otherwise land in the frame.
  await wait(2600);
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file });
  const { width, height } = await page.evaluate(() => ({ width: innerWidth, height: innerHeight }));
  console.log(`  ✓ ${name}.png  (viewport ${width}×${height})`);
}

async function goPanel(page, panel, route) {
  // Mobile shell is one React tree driven by a custom event; react-router
  // navigate() no-ops inside it. Desktop uses real routes.
  const mobile = await page.evaluate(() => innerWidth < 768);
  if (mobile) {
    await page.evaluate((p) => {
      window.dispatchEvent(new CustomEvent('drst-navigate', { detail: { panel: p } }));
    }, panel);
  } else {
    await page.goto(`${APP}${route}`, { waitUntil: 'networkidle2', timeout: 60000 });
  }
  await wait(3500);
  await dismissOverlays(page);
}

const targets = process.argv[2] ? [process.argv[2]] : ['iphone', 'ipad'];
await fs.mkdir(OUT, { recursive: true });
const browser = await puppeteer.launch({ headless: 'new' });

for (const device of targets) {
  console.log(`\n── ${device}`);
  const page = await newPage(browser, device);
  await login(page);
  const p = device === 'iphone' ? '' : 'ipad-';

  await goPanel(page, 'jericho', '/dashboard/jericho');
  await shoot(page, `${p}jericho-growth`);

  // Go to the REDIRECT TARGET, not /dashboard/find-a-reader. That path is a
  // <Navigate> to /dashboard/readers?filter=browse, and capturing mid-redirect
  // caught the Readers empty state before the deck had fetched.
  await goPanel(page, 'find-a-reader', '/dashboard/readers?filter=browse');
  await wait(3000);
  await shoot(page, `${p}find-a-reader`);

  if (device === 'ipad') {
    for (const [panel, route, name] of [
      ['dash-home', '/dashboard', 'ipad-home'],
      ['auditions', '/dashboard/auditions', 'ipad-tracker'],
      ['scene-study', '/dashboard/scene-study', 'ipad-scene-study'],
    ]) {
      await goPanel(page, panel, route);
      await shoot(page, name);
    }
  }
  await page.close();
}

await browser.close();
console.log(`\n✅ captures written to ${OUT}`);
