import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../services/prisma';
import { auth, AuthRequest } from '../middleware/auth';
import { linkedInBrowserService } from '../services/linkedin-browser';
import { linkedInOAuthService } from '../services/linkedin-oauth';
import { decrypt } from '../utils/encryption';
import { logger } from '../utils/logger';

const router = Router();
router.use(auth);

// ─── Helpers ─────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Random delay between min–max seconds (human-like pacing)
const humanDelay = (minSec: number, maxSec: number) =>
  sleep((minSec + Math.random() * (maxSec - minSec)) * 1000);

async function getBrowserCookies(account: any): Promise<string> {
  if (!account.passwordEncrypted) {
    throw new Error(`Account "${account.email}" has no password stored. Edit the account to add a password for browser mode.`);
  }
  const password = decrypt(account.passwordEncrypted);
  return linkedInBrowserService.login(account.email, password);
}

async function refreshOAuthIfNeeded(account: any): Promise<string> {
  if (!account.oauthAccessToken) {
    throw new Error(`Account "${account.email}" is not connected via OAuth.`);
  }
  if (account.oauthExpiresAt && new Date(account.oauthExpiresAt) < new Date()) {
    if (!account.oauthRefreshToken) throw new Error('OAuth token expired. Please reconnect.');
    const refreshed = await linkedInOAuthService.refreshToken(account.oauthRefreshToken);
    await prisma.linkedInAccount.update({
      where: { id: account.id },
      data: {
        oauthAccessToken:  refreshed.accessToken,
        oauthRefreshToken: refreshed.refreshToken ?? account.oauthRefreshToken,
        oauthExpiresAt:    refreshed.expiresAt,
      },
    });
    return refreshed.accessToken;
  }
  return account.oauthAccessToken;
}

// ─── GET /api/campaigns/:id/leads — preview leads before running ──────────────

router.get('/:id/leads', async (req: AuthRequest, res) => {
  try {
    const campaign = await prisma.campaign.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: {
        account: { select: { email: true, profileName: true, connectionMode: true, status: true } },
        _count:  { select: { leads: true } },
      },
    });
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    const leads = await prisma.lead.findMany({
      where: { campaignId: req.params.id },
      orderBy: { createdAt: 'asc' },
    });

    const byStatus = leads.reduce<Record<string, number>>((acc, l) => {
      acc[l.status] = (acc[l.status] ?? 0) + 1;
      return acc;
    }, {});

    res.json({ campaign, leads, byStatus, total: leads.length });
  } catch {
    res.status(500).json({ error: 'Failed to fetch campaign leads' });
  }
});

// ─── POST /api/campaigns/:id/run — execute the campaign ──────────────────────

const runSchema = z.object({
  message:       z.string().max(300).optional(), // optional connection note / message text
  dailyLimit:    z.number().int().min(1).max(100).default(20),
  delayMinSec:   z.number().min(5).max(120).default(15),
  delayMaxSec:   z.number().min(10).max(300).default(45),
});

/**
 * POST /api/campaigns/:id/run
 *
 * Executes a campaign against all leads with status "new".
 * Streams progress via Server-Sent Events so the frontend can show a live log.
 *
 * Campaign types:
 *   connection → sendConnectionRequest (browser only)
 *   message    → sendMessage (browser only)
 *   content    → publishPost (oauth or browser)
 */
router.post('/:id/run', async (req: AuthRequest, res) => {
  // Set up SSE headers
  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.flushHeaders();

  // Helper to push a progress event to the client
  const emit = (data: object) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const opts = runSchema.parse(req.body);

    // Load campaign + account
    const campaign = await prisma.campaign.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: { account: true },
    });

    if (!campaign) {
      emit({ type: 'error', message: 'Campaign not found' });
      return res.end();
    }

    if (campaign.account.status !== 'active') {
      emit({ type: 'error', message: `Account "${campaign.account.email}" is inactive.` });
      return res.end();
    }

    // Validate mode vs campaign type
    const mode = campaign.account.connectionMode;
    if (campaign.type !== 'content' && mode !== 'browser') {
      emit({
        type: 'error',
        message: `Campaign type "${campaign.type}" requires browser mode. ` +
                 `Account "${campaign.account.email}" is set to "${mode}". ` +
                 `Switch the account to Browser mode and add a LinkedIn password.`,
      });
      return res.end();
    }

    // Load pending leads
    const leads = await prisma.lead.findMany({
      where: { campaignId: campaign.id, status: 'new' },
      orderBy: { createdAt: 'asc' },
      take: opts.dailyLimit,
    });

    if (leads.length === 0) {
      emit({ type: 'done', message: 'No pending leads found (all have been processed already).', sent: 0, failed: 0, skipped: 0 });
      return res.end();
    }

    emit({
      type: 'start',
      message: `Starting "${campaign.name}" — ${leads.length} leads to process (daily limit: ${opts.dailyLimit})`,
      total: leads.length,
    });

    // One-time browser login (reuse cookies for all leads)
    let cookies: string | null = null;
    let oauthToken: string | null = null;

    if (mode === 'browser') {
      emit({ type: 'log', message: `🔐 Logging in to LinkedIn as ${campaign.account.email}...` });
      try {
        cookies = await getBrowserCookies(campaign.account);
        emit({ type: 'log', message: '✅ Login successful' });
      } catch (err: any) {
        emit({ type: 'error', message: `Login failed: ${err.message}` });
        return res.end();
      }
    } else if (mode === 'oauth') {
      oauthToken = await refreshOAuthIfNeeded(campaign.account);
    }

    let sent = 0, failed = 0, skipped = 0;

    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i];

      // Check if client disconnected
      if (res.writableEnded) break;

      emit({
        type: 'progress',
        current: i + 1,
        total:   leads.length,
        lead:    { id: lead.id, name: lead.name, url: lead.linkedinUrl },
      });

      try {
        if (campaign.type === 'connection') {
          await linkedInBrowserService.sendConnectionRequest(cookies!, lead.linkedinUrl, opts.message);
          await prisma.lead.update({ where: { id: lead.id }, data: { status: 'contacted' } });
          sent++;
          emit({ type: 'log', message: `✅ [${i + 1}/${leads.length}] Connection request sent to ${lead.name}` });

        } else if (campaign.type === 'message') {
          if (!opts.message) {
            emit({ type: 'log', message: `⚠️  [${i + 1}/${leads.length}] Skipped ${lead.name} — no message text provided` });
            skipped++;
            continue;
          }
          await linkedInBrowserService.sendMessage(cookies!, lead.linkedinUrl, opts.message);
          await prisma.lead.update({ where: { id: lead.id }, data: { status: 'messaged' } });
          sent++;
          emit({ type: 'log', message: `✅ [${i + 1}/${leads.length}] Message sent to ${lead.name}` });

        } else if (campaign.type === 'content') {
          if (!opts.message) {
            emit({ type: 'log', message: `⚠️  [${i + 1}/${leads.length}] Skipped ${lead.name} — no post content provided` });
            skipped++;
            continue;
          }
          if (mode === 'oauth') {
            await linkedInOAuthService.publishPost(oauthToken!, campaign.account.oauthLinkedInId!, opts.message);
          } else {
            await linkedInBrowserService.publishPost(cookies!, opts.message);
          }
          await prisma.lead.update({ where: { id: lead.id }, data: { status: 'contacted' } });
          sent++;
          emit({ type: 'log', message: `✅ [${i + 1}/${leads.length}] Post published (lead: ${lead.name})` });
        }
      } catch (err: any) {
        failed++;
        logger.error(`Campaign run error for lead ${lead.id}: ${err.message}`);
        emit({ type: 'log', message: `❌ [${i + 1}/${leads.length}] Failed for ${lead.name}: ${err.message}` });
      }

      // Human-like delay between actions (skip after last lead)
      if (i < leads.length - 1 && !res.writableEnded) {
        const delaySec = opts.delayMinSec + Math.random() * (opts.delayMaxSec - opts.delayMinSec);
        emit({ type: 'log', message: `⏱  Waiting ${Math.round(delaySec)}s before next action...` });
        await humanDelay(opts.delayMinSec, opts.delayMaxSec);
      }
    }

    // Update campaign status to active if it was draft
    if (campaign.status === 'draft') {
      await prisma.campaign.update({ where: { id: campaign.id }, data: { status: 'active' } });
    }

    emit({
      type:    'done',
      message: `Campaign complete — ${sent} sent, ${failed} failed, ${skipped} skipped`,
      sent, failed, skipped,
    });

  } catch (err: any) {
    emit({ type: 'error', message: err.message || 'Unexpected error' });
  } finally {
    res.end();
  }
});

// ─── GET /api/campaigns/:id/status — quick stats ─────────────────────────────

router.get('/:id/status', async (req: AuthRequest, res) => {
  try {
    const campaign = await prisma.campaign.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    const leads = await prisma.lead.groupBy({
      by: ['status'],
      where: { campaignId: req.params.id },
      _count: { id: true },
    });

    const stats = leads.reduce<Record<string, number>>((acc, g) => {
      acc[g.status] = g._count.id;
      return acc;
    }, {});

    res.json({ campaign, stats });
  } catch {
    res.status(500).json({ error: 'Failed to fetch status' });
  }
});

export default router;
