import { logger } from '../utils/logger';

/**
 * LinkedIn Browser Automation Service (Option B)
 *
 * Uses Puppeteer to control a real Chrome browser.
 *
 * ⚠️  Requirements:
 *   npm install puppeteer
 *
 * ⚠️  Hosting note:
 *   Render free tier does NOT include Chrome. You need:
 *   - Render paid plan with custom build command to install Chrome, OR
 *   - A VPS (DigitalOcean, Hetzner), OR
 *   - Run locally
 *
 * ⚠️  ToS note:
 *   Browser automation violates LinkedIn's Terms of Service.
 *   Use responsibly with human-like delays and daily limits.
 */

// Dynamic import so the app still starts if puppeteer is not installed
async function getPuppeteer() {
  try {
    const puppeteer = await import('puppeteer');
    return puppeteer.default;
  } catch {
    throw new Error(
      'Puppeteer is not installed. Run: npm install puppeteer\n' +
      'Note: Browser automation requires a server with Chrome support.'
    );
  }
}

const LINKEDIN_BASE = 'https://www.linkedin.com';

// Human-like random delay between min and max ms
const delay = (min: number, max: number) =>
  new Promise((r) => setTimeout(r, min + Math.random() * (max - min)));

export class LinkedInBrowserService {
  /** Log in to LinkedIn with email + password and return cookies as JSON string */
  async login(email: string, password: string): Promise<string> {
    logger.info(`Browser login for ${email}`);
    const puppeteer = await getPuppeteer();

    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    try {
      const page = await browser.newPage();
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      await page.goto(`${LINKEDIN_BASE}/login`, { waitUntil: 'networkidle2' });
      await delay(1000, 2000);

      // Type email
      await page.type('#username', email, { delay: 80 });
      await delay(500, 1000);

      // Type password
      await page.type('#password', password, { delay: 80 });
      await delay(500, 1000);

      // Click sign in
      await page.click('[data-litms-control-urn="login-submit"]');
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });

      // Check for security challenge
      const url = page.url();
      if (url.includes('checkpoint') || url.includes('challenge')) {
        throw new Error(
          'LinkedIn requires email/phone verification. ' +
          'Please log in manually once to clear the security challenge, then try again.'
        );
      }

      if (url.includes('login') || url.includes('authwall')) {
        throw new Error('Login failed — check your email and password.');
      }

      const cookies = await page.cookies();
      logger.info(`Browser login successful for ${email}`);
      return JSON.stringify(cookies);
    } finally {
      await browser.close();
    }
  }

  /** Send a LinkedIn connection request */
  async sendConnectionRequest(
    cookiesJson: string,
    profileUrl: string,
    message?: string
  ): Promise<void> {
    logger.info(`Sending connection request to ${profileUrl}`);
    const puppeteer = await getPuppeteer();

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    try {
      const page = await browser.newPage();
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      // Restore session cookies
      const cookies = JSON.parse(cookiesJson);
      await page.setCookie(...cookies);

      await page.goto(profileUrl, { waitUntil: 'networkidle2' });
      await delay(2000, 3000);

      // Click "Connect" button
      const connectBtn = await page.$('button[aria-label*="Connect"]');
      if (!connectBtn) {
        // Try "More" menu first
        const moreBtn = await page.$('button[aria-label*="More actions"]');
        if (moreBtn) {
          await moreBtn.click();
          await delay(500, 1000);
          const connectOption = await page.$('[aria-label*="Connect"]');
          if (!connectOption) throw new Error('Could not find Connect button');
          await connectOption.click();
        } else {
          throw new Error('Could not find Connect button — profile may already be connected');
        }
      } else {
        await connectBtn.click();
      }

      await delay(1000, 1500);

      if (message) {
        // Click "Add a note"
        const addNoteBtn = await page.$('button[aria-label*="Add a note"]');
        if (addNoteBtn) {
          await addNoteBtn.click();
          await delay(500, 1000);
          const textarea = await page.$('textarea[name="message"]');
          if (textarea) await textarea.type(message, { delay: 60 });
          await delay(500, 1000);
        }
      }

      // Send
      const sendBtn = await page.$('button[aria-label="Send now"]') ||
                      await page.$('button[aria-label="Send invitation"]');
      if (sendBtn) {
        await sendBtn.click();
        await delay(1000, 2000);
      }

      logger.info(`Connection request sent to ${profileUrl}`);
    } finally {
      await browser.close();
    }
  }

  /** Send a direct message to a LinkedIn connection */
  async sendMessage(cookiesJson: string, profileUrl: string, message: string): Promise<void> {
    logger.info(`Sending message to ${profileUrl}`);
    const puppeteer = await getPuppeteer();

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    try {
      const page = await browser.newPage();
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      const cookies = JSON.parse(cookiesJson);
      await page.setCookie(...cookies);

      await page.goto(profileUrl, { waitUntil: 'networkidle2' });
      await delay(2000, 3000);

      // Click Message button
      const msgBtn = await page.$('button[aria-label*="Message"]');
      if (!msgBtn) throw new Error('Message button not found — not connected to this profile');

      await msgBtn.click();
      await delay(1500, 2500);

      // Type message in the compose box
      const msgBox = await page.$('.msg-form__contenteditable');
      if (!msgBox) throw new Error('Message compose box not found');

      await msgBox.type(message, { delay: 60 });
      await delay(500, 1000);

      // Send
      const submitBtn = await page.$('.msg-form__send-button');
      if (submitBtn) {
        await submitBtn.click();
        await delay(1000, 2000);
      }

      logger.info(`Message sent to ${profileUrl}`);
    } finally {
      await browser.close();
    }
  }

  /** Post content to LinkedIn feed via browser */
  async publishPost(cookiesJson: string, content: string): Promise<void> {
    logger.info('Publishing post via browser');
    const puppeteer = await getPuppeteer();

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    try {
      const page = await browser.newPage();
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      const cookies = JSON.parse(cookiesJson);
      await page.setCookie(...cookies);

      await page.goto(`${LINKEDIN_BASE}/feed/`, { waitUntil: 'networkidle2' });
      await delay(2000, 3000);

      // Click "Start a post"
      const startPostBtn = await page.$('button[aria-label*="Start a post"]') ||
                           await page.$('.share-box-feed-entry__trigger');
      if (!startPostBtn) throw new Error('Could not find "Start a post" button');

      await startPostBtn.click();
      await delay(1500, 2000);

      // Type post content
      const editor = await page.$('.ql-editor') ||
                     await page.$('[contenteditable="true"]');
      if (!editor) throw new Error('Post editor not found');

      await editor.type(content, { delay: 40 });
      await delay(1000, 2000);

      // Click Post button
      const postBtn = await page.$('button[aria-label="Post"]') ||
                      await page.$('.share-actions__primary-action');
      if (!postBtn) throw new Error('Post submit button not found');

      await postBtn.click();
      await delay(2000, 3000);

      logger.info('Post published via browser');
    } finally {
      await browser.close();
    }
  }
}

export const linkedInBrowserService = new LinkedInBrowserService();
