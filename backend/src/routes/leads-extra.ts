import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../services/prisma';
import { auth, AuthRequest } from '../middleware/auth';
import { decrypt } from '../utils/encryption';
import { linkedInBrowserService } from '../services/linkedin-browser';
import { logger } from '../utils/logger';

const router = Router();
router.use(auth);

// ─── Profile scraper ──────────────────────────────────────────────────────────

async function getPuppeteer() {
  try {
    const p = await import('puppeteer');
    return p.default;
  } catch {
    throw new Error('Puppeteer not installed. Run: npm install puppeteer');
  }
}

interface ScrapedProfile {
  name:     string;
  headline: string;
  company:  string;
  location: string;
}

async function scrapeLinkedInProfile(
  cookiesJson: string,
  profileUrl: string
): Promise<ScrapedProfile> {
  const puppeteer = await getPuppeteer();

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    const cookies = JSON.parse(cookiesJson);
    await page.setCookie(...cookies);

    // Normalise URL
    const url = profileUrl.trim().replace(/\/$/, '');
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });

    // Wait for the profile name to appear
    await page.waitForSelector('h1', { timeout: 10000 }).catch(() => null);

    const profile = await page.evaluate(() => {
      const text = (sel: string) =>
        (document.querySelector(sel) as HTMLElement | null)?.innerText?.trim() ?? '';

      // Name — try multiple selectors LinkedIn uses
      const name =
        text('h1.text-heading-xlarge') ||
        text('h1[data-generated-suggestion-target]') ||
        text('.pv-top-card--list h1') ||
        text('h1');

      // Headline
      const headline =
        text('.text-body-medium.break-words') ||
        text('[data-field="headline"]') ||
        text('.pv-text-details__left-panel .text-body-medium');

      // Location
      const location =
        text('.text-body-small.inline.t-black--light.break-words') ||
        text('[data-field="location"]') ||
        text('.pv-top-card--list-bullet .text-body-small');

      // Current company — from the experience section or the top-card subtitle
      const company =
        text('.pv-text-details__right-panel .t-14.t-normal') ||
        text('.pv-top-card--experience-list .pv-entity__secondary-title') ||
        text('[aria-label*="Current company"] .t-14') ||
        '';

      return { name, headline, company, location };
    });

    logger.info(`Scraped profile: ${profile.name} @ ${profileUrl}`);
    return profile;
  } finally {
    await browser.close();
  }
}

// ─── POST /api/leads/scrape-profile ──────────────────────────────────────────
// Scrape a single LinkedIn profile URL using a browser-mode account

const scrapeSchema = z.object({
  profileUrl: z.string().url(),
  accountId:  z.string(),
});

router.post('/scrape-profile', async (req: AuthRequest, res) => {
  try {
    const { profileUrl, accountId } = scrapeSchema.parse(req.body);

    const account = await prisma.linkedInAccount.findFirst({
      where: { id: accountId, userId: req.userId },
    });
    if (!account) return res.status(404).json({ error: 'Account not found' });

    if (account.connectionMode !== 'browser' || !account.passwordEncrypted) {
      return res.status(400).json({
        error: 'Auto-fetch requires a browser-mode account with a password stored.',
      });
    }

    const password = decrypt(account.passwordEncrypted);
    const cookies  = await linkedInBrowserService.login(account.email, password);
    const profile  = await scrapeLinkedInProfile(cookies, profileUrl);

    res.json(profile);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(500).json({ error: error.message || 'Failed to scrape profile' });
  }
});

// ─── POST /api/leads/batch ───────────────────────────────────────────────────
// Create multiple leads at once (after scraping)

const batchLeadSchema = z.object({
  accountId:  z.string(),
  campaignId: z.string().optional(),
  leads: z.array(z.object({
    linkedinUrl: z.string().url(),
    name:        z.string().min(1),
    headline:    z.string().optional(),
    company:     z.string().optional(),
    location:    z.string().optional(),
  })).min(1).max(200),
});

router.post('/batch', async (req: AuthRequest, res) => {
  try {
    const { accountId, campaignId, leads } = batchLeadSchema.parse(req.body);

    // Verify account belongs to user
    const account = await prisma.linkedInAccount.findFirst({
      where: { id: accountId, userId: req.userId },
    });
    if (!account) return res.status(404).json({ error: 'Account not found' });

    // Verify campaign belongs to user (if provided)
    if (campaignId) {
      const campaign = await prisma.campaign.findFirst({
        where: { id: campaignId, userId: req.userId },
      });
      if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    }

    // Skip duplicates (same URL + account)
    const existing = await prisma.lead.findMany({
      where: {
        userId:    req.userId!,
        accountId,
        linkedinUrl: { in: leads.map((l) => l.linkedinUrl) },
      },
      select: { linkedinUrl: true },
    });
    const existingUrls = new Set(existing.map((e) => e.linkedinUrl));

    const newLeads = leads.filter((l) => !existingUrls.has(l.linkedinUrl));

    if (newLeads.length === 0) {
      return res.status(400).json({
        error: 'All provided URLs already exist for this account.',
        skipped: leads.length,
        created: 0,
      });
    }

    const created = await prisma.lead.createMany({
      data: newLeads.map((l) => ({
        userId:      req.userId!,
        accountId,
        campaignId:  campaignId ?? null,
        linkedinUrl: l.linkedinUrl,
        name:        l.name,
        headline:    l.headline  ?? null,
        company:     l.company   ?? null,
        location:    l.location  ?? null,
        status:      'new',
      })),
    });

    res.status(201).json({
      created: created.count,
      skipped: leads.length - newLeads.length,
      message: `${created.count} leads added${leads.length - newLeads.length > 0 ? `, ${leads.length - newLeads.length} duplicates skipped` : ''}`,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(500).json({ error: 'Failed to create leads' });
  }
});

export default router;
