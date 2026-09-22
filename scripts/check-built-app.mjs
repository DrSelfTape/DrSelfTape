// Run after a production-configured build. Serves dist entirely through
// browser interception; no API, analytics, email, or push request leaves Chrome.
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import puppeteer from 'puppeteer-core';

const root = resolve('dist');
const origin = 'https://dst-build.test';
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true, pipe: true,
});
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setRequestInterception(true);
  page.on('request', async request => {
    const url = new URL(request.url());
    if (url.origin !== origin) {
      await request.respond({ status: 200, contentType: request.resourceType() === 'script' ? 'application/javascript' : 'application/json', body: request.resourceType() === 'script' ? '' : '{}' });
      return;
    }
    const candidate = resolve(root, '.' + decodeURIComponent(url.pathname));
    try {
      const file = candidate.startsWith(root + '/') && (await stat(candidate)).isFile() ? candidate : resolve(root, 'index.html');
      const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };
      await request.respond({ status: 200, contentType: types[extname(file)] || 'application/octet-stream', body: await readFile(file) });
    } catch {
      if (request.resourceType() === 'document') await request.respond({ status: 200, contentType: 'text/html', body: await readFile(resolve(root, 'index.html')) });
      else await request.respond({ status: 404, body: '' });
    }
  });
  await page.goto(origin + '/login', { waitUntil: 'networkidle0' });
  await page.waitForSelector('input[type="email"]', { timeout: 20000 });
  assert.ok(await page.$('input[type="password"]'), 'Built app must render its real sign-in form');
  assert.deepEqual(errors, [], 'Built app must boot without JavaScript exceptions');
  console.log('PASS: configured dist boots and renders sign-in; all external requests intercepted.');
} finally {
  await browser.close();
}
