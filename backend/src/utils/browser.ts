/**
 * Cross-environment browser launcher.
 * Uses @sparticuz/chromium on cloud/serverless (Render, Lambda, etc.)
 * Falls back to regular puppeteer for local development.
 */

export async function launchBrowser(extraArgs: string[] = []) {
  const isCloud = !!(
    process.env.RENDER ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.VERCEL ||
    process.env.RAILWAY_ENVIRONMENT
  );

  if (isCloud) {
    // Cloud: use @sparticuz/chromium which bundles its own Chromium binary
    try {
      const chromium = (await import('@sparticuz/chromium')).default;
      const puppeteer = (await import('puppeteer-core')).default;

      return puppeteer.launch({
        args:            [...chromium.args, ...extraArgs],
        defaultViewport: chromium.defaultViewport,
        executablePath:  await chromium.executablePath(),
        headless:        true,
      });
    } catch (e: any) {
      throw new Error(
        'Cloud browser launch failed. Run: npm install @sparticuz/chromium puppeteer-core\n' +
        `Original error: ${e.message}`
      );
    }
  } else {
    // Local dev: use regular puppeteer (includes bundled Chromium)
    try {
      const puppeteer = (await import('puppeteer')).default;
      return puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          ...extraArgs,
        ],
      });
    } catch (e: any) {
      throw new Error(
        'Local browser launch failed. Run: npm install puppeteer\n' +
        `Original error: ${e.message}`
      );
    }
  }
}
