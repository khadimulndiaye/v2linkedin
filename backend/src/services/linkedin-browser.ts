import { launchBrowser } from '../utils/browser';
import { logger } from '../utils/logger';

const LINKEDIN_BASE = 'https://www.linkedin.com';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const delay = (min: number, max: number) =>
  new Promise((r) => setTimeout(r, (min + Math.random() * (max - min)) * 1000));

export class LinkedInBrowserService {

  /**
   * Returns a ready cookies JSON string.
   * If stored cookies exist → use them directly (no validation, no Chrome needed).
   * Falls back to password login only when no cookies stored.
   */
  async getCookies(
    email: string,
    password?: string | null,
    storedCookies?: string | null
  ): Promise<string> {
    if (storedCookies) {
      logger.info(`Using stored cookies for ${email} (skipping login)`);
      return storedCookies; // trust the cookies, let the action fail if expired
    }
    if (!password) {
      throw new Error(
        'No cookies or password found for this account. ' +
        'Edit the account and paste fresh cookies from your browser.'
      );
    }
    return this.login(email, password);
  }

  async login(email: string, password: string): Promise<string> {
    logger.info(`Browser login for ${email}`);
    const browser = await launchBrowser();
    try {
      const page = await browser.newPage();
      await page.setUserAgent(UA);
      await page.goto(`${LINKEDIN_BASE}/login`, { waitUntil: 'networkidle2', timeout: 25000 });
      await delay(1, 2);
      await page.type('#username', email, { delay: 80 });
      await delay(0.3, 0.8);
      await page.type('#password', password, { delay: 80 });
      await delay(0.3, 0.8);
      await page.click('[data-litms-control-urn="login-submit"]');
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 25000 });
      const url = page.url();
      if (url.includes('checkpoint') || url.includes('challenge') || url.includes('verify')) {
        throw new Error(
          'LinkedIn requires phone verification. ' +
          'Log in manually in Chrome, then paste cookies via the 🍪 Cookies tab in Account settings.'
        );
      }
      if (url.includes('login') || url.includes('authwall')) {
        throw new Error('Login failed — incorrect email or password.');
      }
      const cookies = await page.cookies();
      logger.info(`Login successful for ${email}`);
      return JSON.stringify(cookies);
    } finally {
      await browser.close();
    }
  }

  async sendConnectionRequest(cookiesJson: string, profileUrl: string, message?: string): Promise<void> {
    const browser = await launchBrowser();
    try {
      const page = await browser.newPage();
      await page.setUserAgent(UA);
      await page.setCookie(...JSON.parse(cookiesJson));
      await page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await delay(2, 3);
      let connectBtn = await page.$('button[aria-label*="Connect"]');
      if (!connectBtn) {
        const moreBtn = await page.$('button[aria-label*="More actions"]');
        if (moreBtn) { await moreBtn.click(); await delay(0.5, 1); }
        connectBtn = await page.$('[aria-label*="Connect"]');
        if (!connectBtn) throw new Error('Connect button not found — may already be connected');
      }
      await connectBtn.click();
      await delay(1, 1.5);
      if (message) {
        const addNoteBtn = await page.$('button[aria-label*="Add a note"]');
        if (addNoteBtn) {
          await addNoteBtn.click(); await delay(0.5, 1);
          const textarea = await page.$('textarea[name="message"]');
          if (textarea) await textarea.type(message, { delay: 60 });
          await delay(0.5, 1);
        }
      }
      const sendBtn = await page.$('button[aria-label="Send now"]') ?? await page.$('button[aria-label="Send invitation"]');
      if (sendBtn) { await sendBtn.click(); await delay(1, 2); }
    } finally { await browser.close(); }
  }

  async sendMessage(cookiesJson: string, profileUrl: string, message: string): Promise<void> {
    const browser = await launchBrowser();
    try {
      const page = await browser.newPage();
      await page.setUserAgent(UA);
      await page.setCookie(...JSON.parse(cookiesJson));
      await page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await delay(2, 3);
      const msgBtn = await page.$('button[aria-label*="Message"]');
      if (!msgBtn) throw new Error('Message button not found — not connected yet');
      await msgBtn.click(); await delay(1.5, 2.5);
      const msgBox = await page.$('.msg-form__contenteditable');
      if (!msgBox) throw new Error('Message compose box not found');
      await msgBox.type(message, { delay: 60 }); await delay(0.5, 1);
      const submitBtn = await page.$('.msg-form__send-button');
      if (submitBtn) { await submitBtn.click(); await delay(1, 2); }
    } finally { await browser.close(); }
  }

  async publishPost(cookiesJson: string, content: string): Promise<void> {
    const browser = await launchBrowser();
    try {
      const page = await browser.newPage();
      await page.setUserAgent(UA);
      await page.setCookie(...JSON.parse(cookiesJson));
      await page.goto(`${LINKEDIN_BASE}/feed/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await delay(2, 3);
      const startBtn = await page.$('button[aria-label*="Start a post"]') ?? await page.$('.share-box-feed-entry__trigger');
      if (!startBtn) throw new Error('Could not find "Start a post" button');
      await startBtn.click(); await delay(1.5, 2);
      const editor = await page.$('.ql-editor') ?? await page.$('[contenteditable="true"]');
      if (!editor) throw new Error('Post editor not found');
      await editor.type(content, { delay: 40 }); await delay(1, 2);
      const postBtn = await page.$('button[aria-label="Post"]') ?? await page.$('.share-actions__primary-action');
      if (!postBtn) throw new Error('Post submit button not found');
      await postBtn.click(); await delay(2, 3);
    } finally { await browser.close(); }
  }
}

export const linkedInBrowserService = new LinkedInBrowserService();
