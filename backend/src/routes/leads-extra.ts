import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../services/prisma';
import { auth } from '../middleware/auth';
import { decrypt } from '../utils/encryption';
import { linkedInBrowserService } from '../services/linkedin-browser';
import { logger } from '../utils/logger';

const router = Router();
router.use(auth);

interface ScrapedProfile {
  name: string; headline: string; company: string; location: string;
}

async function scrapeLinkedInProfile(cookiesJson: string, profileUrl: string): Promise<ScrapedProfile> {
  const { launchBrowser } = await import('../utils/browser');
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setCookie(...JSON.parse(cookiesJson));

    // Use domcontentloaded (faster) with a longer timeout
    await page.goto(profileUrl.trim().replace(/\/$/, ''), {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    // Wait for h1 but don't fail if it doesn't appear
    await page.waitForSelector('h1', { timeout: 8000 }).catch(() => null);

    const evalScript = `(() => {
      const t = s => ((document.querySelector(s) || {}).innerText || '').trim();
      return {
        name:     t('h1.text-heading-xlarge') || t('h1') || '',
        headline: t('.text-body-medium.break-words') || t('[data-field="headline"]') || '',
        location: t('.text-body-small.inline.t-black--light.break-words') || '',
        company:  t('.pv-text-details__right-panel .t-14.t-normal') || '',
      };
    })()`;
    const profile = await (page as any).evaluate(evalScript) as ScrapedProfile;
    logger.info(`Scraped: ${profile.name} @ ${profileUrl}`);
    return profile;
  } finally {
    await browser.close();
  }
}

const scrapeSchema = z.object({ profileUrl: z.string().url(), accountId: z.string() });

router.post('/scrape-profile', async (req: Request, res: Response) => {
  try {
    const { profileUrl, accountId } = scrapeSchema.parse(req.body);

    const account = await (prisma.linkedInAccount.findFirst as any)({
      where: { id: accountId, userId: req.userId },
      select: {
        id: true, email: true, connectionMode: true,
        passwordEncrypted: true, cookiesEncrypted: true,
      },
    });

    if (!account) return res.status(404).json({ error: 'Account not found' });

    if (account.connectionMode !== 'browser') {
      return res.status(400).json({
        error: 'Auto-fetch requires a browser-mode account. Switch this account to Browser mode in Accounts settings.',
      });
    }

    if (!account.passwordEncrypted && !account.cookiesEncrypted) {
      return res.status(400).json({
        error: 'Auto-fetch requires either a password or saved cookies on this account. Edit the account and add credentials.',
      });
    }

    // Get cookies — prefer stored cookies, fall back to password login
    const storedCookies  = account.cookiesEncrypted  ? decrypt(account.cookiesEncrypted)  : null;
    const password       = account.passwordEncrypted ? decrypt(account.passwordEncrypted) : null;
    const cookies = await linkedInBrowserService.getCookies(account.email, password, storedCookies);

    const profile = await scrapeLinkedInProfile(cookies, profileUrl);
    res.json(profile);
  } catch (error: any) {
    if (error.name === 'ZodError') return res.status(400).json({ error: error.errors[0].message });

    // Friendly error messages for common failures
    let msg = error.message || 'Failed to scrape profile';
    if (msg.includes('timeout') || msg.includes('Navigation')) {
      msg = 'Page took too long to load. LinkedIn may be blocking automated access. Try pasting fresh cookies in Account settings.';
    } else if (msg.includes('login') || msg.includes('authwall') || msg.includes('checkpoint')) {
      msg = 'LinkedIn session expired. Please paste fresh cookies from your browser in Account settings.';
    }
    res.status(500).json({ error: msg });
  }
});

// ─── POST /api/leads/batch ────────────────────────────────────────────────────

const batchLeadSchema = z.object({
  accountId:  z.string(),
  campaignId: z.string().optional(),
  leads: z.array(z.object({
    linkedinUrl: z.string().url(), name: z.string().min(1),
    headline: z.string().optional(), company: z.string().optional(), location: z.string().optional(),
  })).min(1).max(200),
});

router.post('/batch', async (req: Request, res: Response) => {
  try {
    const { accountId, campaignId, leads } = batchLeadSchema.parse(req.body);
    const account = await prisma.linkedInAccount.findFirst({ where: { id: accountId, userId: req.userId } });
    if (!account) return res.status(404).json({ error: 'Account not found' });
    if (campaignId) {
      const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, userId: req.userId } });
      if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    }
    const existing = await prisma.lead.findMany({
      where: { userId: req.userId!, accountId, linkedinUrl: { in: leads.map((l) => l.linkedinUrl) } },
      select: { linkedinUrl: true },
    });
    const existingUrls = new Set(existing.map((e) => e.linkedinUrl));
    const newLeads = leads.filter((l) => !existingUrls.has(l.linkedinUrl));
    if (newLeads.length === 0)
      return res.status(400).json({ error: 'All URLs already exist.', skipped: leads.length, created: 0 });

    const created = await prisma.lead.createMany({
      data: newLeads.map((l) => ({
        userId: req.userId!, accountId, campaignId: campaignId ?? null,
        linkedinUrl: l.linkedinUrl, name: l.name,
        headline: l.headline ?? null, company: l.company ?? null,
        location: l.location ?? null, status: 'new',
      })),
    });
    res.status(201).json({
      created: created.count,
      skipped: leads.length - newLeads.length,
      message: `${created.count} leads added${leads.length - newLeads.length > 0 ? `, ${leads.length - newLeads.length} duplicates skipped` : ''}`,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') return res.status(400).json({ error: error.errors[0].message });
    res.status(500).json({ error: 'Failed to create leads' });
  }
});

export default router;
