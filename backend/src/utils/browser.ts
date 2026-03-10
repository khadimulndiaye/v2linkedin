import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

/**
 * Launches Chromium via @sparticuz/chromium + puppeteer-core.
 * Works on Render, AWS Lambda, and local dev.
 *
 * Local dev: set CHROMIUM_PATH env var to your Chrome binary path:
 *   Mac:   /Applications/Google Chrome.app/Contents/MacOS/Google Chrome
 *   Linux: /usr/bin/google-chrome
 */
export async function launchBrowser(extraArgs: string[] = []) {
  const executablePath = process.env.CHROMIUM_PATH ?? await chromium.executablePath();

  return puppeteer.launch({
    args:            [...chromium.args, ...extraArgs],
    defaultViewport: chromium.defaultViewport,
    executablePath,
    headless:        true,
  });
}
