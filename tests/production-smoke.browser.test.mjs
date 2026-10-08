import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { preview } from 'vite';
import { launchBrowser } from './browser.mjs';

// Run against an existing production build, not a development transform or a
// mocked component bundle. Build first with the intended VITE_API_URL.
test('production app boots auth and redirects protected routes on phone and desktop', async () => {
  const server = await preview({
    root: fileURLToPath(new URL('../', import.meta.url)),
    configFile: false,
    logLevel: 'error',
    preview: { host: '127.0.0.1', port: 0, strictPort: true },
  });
  let browser;
  try {
    const address = server.httpServer.address();
    assert.ok(address && typeof address === 'object', 'Preview must listen on a TCP port');
    const origin = `http://127.0.0.1:${address.port}`;
    browser = await launchBrowser();
    const page = await browser.newPage();
    const errors = [];
    const failedAssets = [];
    const isLocal = url => new URL(url).origin === origin;
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => {
      if (!isLocal(response.url())) return;
      if (response.status() >= 400) failedAssets.push(`${response.status()} ${response.url()}`);
      // SPA fallback can disguise a missing asset as a successful HTML page.
      const type = response.request().resourceType();
      if (['script', 'stylesheet', 'image', 'font', 'media'].includes(type)
          && response.headers()['content-type']?.includes('text/html')) {
        failedAssets.push(`HTML returned for ${type}: ${response.url()}`);
      }
    });
    page.on('requestfailed', request => {
      if (isLocal(request.url()) && request.failure()?.errorText !== 'net::ERR_ABORTED') {
        failedAssets.push(`${request.failure()?.errorText} ${request.url()}`);
      }
    });
    await page.setRequestInterception(true);
    page.on('request', request => {
      const url = request.url();
      // Never contact the configured backend, analytics, or other external
      // services. This sweep is signed out and never submits a form.
      if ((isLocal(url) && ['GET', 'HEAD'].includes(request.method()))
          || url.startsWith('data:') || url.startsWith('blob:')) {
        void request.continue();
      } else {
        void request.abort();
      }
    });
    for (const width of [393, 1440]) {
      await page.setViewport({ width, height: 900 });
      for (const route of ['/login', '/signup', '/dashboard/scene-study']) {
        await page.goto(origin + route, { waitUntil: 'networkidle0' });
        const expected = route === '/signup'
          ? 'Create your account.'
          : width < 768 ? 'Your craft, in motion.' : 'Sign in to the studio.';
        try {
          await page.waitForFunction(text =>
            document.body.innerText.replace(/\s+/g, ' ').includes(text),
          { timeout: 10000 }, expected);
        } catch (error) {
          assert.fail(`${width}px ${route}: ${error.message}\n${JSON.stringify({
            url: page.url(), expected,
            body: await page.$eval('body', element => element.innerText),
            errors, failedAssets,
          })}`);
        }
        assert.equal(new URL(page.url()).pathname, route.startsWith('/dashboard') ? '/login' : route);
        assert.ok(await page.$('input[name="email"], input[type="email"]'), `${route}: email input must render`);
        assert.ok(await page.$('input[type="password"]'), `${route}: password input must render`);
        assert.deepEqual(errors, [], `${width}px ${route}: uncaught JavaScript errors`);
        assert.deepEqual(failedAssets, [], `${width}px ${route}: missing local assets`);
      }
    }
    const download = await fetch(origin + '/DrSelfTape-AutoSubmit-Kit.zip');
    assert.equal(download.status, 200, 'Public kit download must exist');
    const bytes = new Uint8Array(await download.arrayBuffer());
    assert.deepEqual([...bytes.slice(0, 4)], [0x50, 0x4b, 0x03, 0x04], 'Download must be a ZIP, not the SPA fallback');
  } finally {
    try {
      await browser?.close();
    } finally {
      await new Promise((resolve, reject) => server.httpServer.close(error => error ? reject(error) : resolve()));
    }
  }
});
