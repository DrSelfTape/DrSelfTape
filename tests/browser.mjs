import puppeteer from 'puppeteer-core';

export function launchBrowser(options = {}) {
  return puppeteer.launch({
    headless: true,
    pipe: true,
    executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    ...options,
  });
}
