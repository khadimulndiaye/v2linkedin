import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../services/prisma';
import { auth } from '../middleware/auth';
import { linkedInOAuthService } from '../services/linkedin-oauth';
import { linkedInBrowserService } from '../services/linkedin-browser';
import { decrypt } from '../utils/encryption';
import { logger } from '../utils/logger';

const router = Router();
router.use(auth);

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getAccountForUser(accountId: string, userId: string) {
  const account = await prisma.linkedInAccount.findFirst({
    where: { id: accountId, userId },
  });
  if (!account) throw new Error('Account not found');
  return account;
}

async function ensureValidOAuthToken(account: any) {
  if (!account.oauthAccessToken) {
    throw new Error('This account is not connected via OAuth. Use the Connect button on the Accounts page.');
  }

  // Auto-refresh if expired
  if (account.oauthExpiresAt && new Date(account.oauthExpiresAt) < new Date()) {
    if (!account.oauthRefreshToken) {
      throw new Error('OAuth token expired and no refresh token available. Please reconnect this account.');
    }
    const refreshed = await linkedInOAuthService.refreshToken(account.oauthRefreshToken);
    await prisma.linkedInAccount.update({
      where: { id: account.id },
      data: {
        oauthAccessToken:  refreshed.accessToken,
        oauthRefreshToken: refreshed.refreshToken ?? account.oauthRefreshToken,
        oauthExpiresAt:    refreshed.expiresAt,
      },
    });
    account.oauthAccessToken = refreshed.accessToken;
  }

  return account.oauthAccessToken as string;
}

async function getBrowserSession(account: any): Promise<string> {
  if (!account.passwordEncrypted) {
    throw new Error('No password stored for browser automation. Edit the account to add a password.');
  }
  const password = decrypt(account.passwordEncrypted);

  // Log in and get fresh session cookies
  const cookies = await linkedInBrowserService.login(account.email, password);
  return cookies;
}

// ─── Publish Post ─────────────────────────────────────────────────────────────

const publishPostSchema = z.object({
  content:     z.string().min(1).max(3000),
  accountId:   z.string(),
  scheduledAt: z.string().datetime().optional(), // ISO string
});

/**
 * POST /api/linkedin/post
 * Publish immediately or schedule a post.
 */
router.post('/post', async (req: Request, res: Response) => {
  try {
    const { content, accountId, scheduledAt } = publishPostSchema.parse(req.body);
    const account = await getAccountForUser(accountId, req.userId!);

    // If scheduling for the future, just save to DB
    if (scheduledAt && new Date(scheduledAt) > new Date()) {
      const post = await prisma.scheduledPost.create({
        data: {
          accountId,
          content,
          status:      'scheduled',
          scheduledAt: new Date(scheduledAt),
        },
      });
      return res.json({ success: true, postId: post.id, status: 'scheduled', scheduledAt });
    }

    // Publish now
    let linkedinPostId: string | undefined;

    if (account.connectionMode === 'oauth') {
      const token = await ensureValidOAuthToken(account);
      linkedinPostId = await linkedInOAuthService.publishPost(token, account.oauthLinkedInId!, content);
    } else if (account.connectionMode === 'browser') {
      const cookies = await getBrowserSession(account);
      await linkedInBrowserService.publishPost(cookies, content);
    } else {
      return res.status(400).json({
        error: 'Account has no active connection. Connect via OAuth or Browser mode first.',
      });
    }

    // Save record
    const post = await prisma.scheduledPost.create({
      data: {
        accountId,
        content,
        status:        'published',
        publishedAt:   new Date(),
        linkedinPostId: linkedinPostId ?? null,
      },
    });

    logger.info(`Post published for account ${accountId}`);
    res.json({ success: true, postId: post.id, status: 'published', linkedinPostId });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(500).json({ error: error.message || 'Failed to publish post' });
  }
});

// ─── Get Posts ────────────────────────────────────────────────────────────────

router.get('/posts', async (req: Request, res: Response) => {
  try {
    const { accountId } = req.query as { accountId?: string };

    // Verify account belongs to user
    if (accountId) {
      const account = await prisma.linkedInAccount.findFirst({
        where: { id: accountId, userId: req.userId },
      });
      if (!account) return res.status(404).json({ error: 'Account not found' });
    }

    const posts = await prisma.scheduledPost.findMany({
      where: {
        account: { userId: req.userId },
        ...(accountId && { accountId }),
      },
      orderBy: { createdAt: 'desc' },
      include: { account: { select: { email: true, profileName: true } } },
    });

    res.json(posts);
  } catch {
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// ─── Delete Post ──────────────────────────────────────────────────────────────

router.delete('/posts/:id', async (req: Request, res: Response) => {
  try {
    const post = await prisma.scheduledPost.findFirst({
      where: { id: req.params.id, account: { userId: req.userId } },
    });
    if (!post) return res.status(404).json({ error: 'Post not found' });

    await prisma.scheduledPost.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// ─── Send Connection Request ──────────────────────────────────────────────────

const connectSchema = z.object({
  leadId:  z.string(),
  message: z.string().max(300).optional(),
});

/**
 * POST /api/linkedin/connect
 * Send a connection request to a lead (browser mode only).
 */
router.post('/connect', async (req: Request, res: Response) => {
  try {
    const { leadId, message } = connectSchema.parse(req.body);

    const lead = await prisma.lead.findFirst({
      where: { id: leadId, userId: req.userId },
      include: { account: true },
    });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    if (lead.account.connectionMode !== 'browser') {
      return res.status(400).json({
        error: 'Connection requests require browser mode. Switch the account to browser mode.',
      });
    }

    const cookies = await getBrowserSession(lead.account);
    await linkedInBrowserService.sendConnectionRequest(cookies, lead.linkedinUrl, message);

    await prisma.lead.update({
      where: { id: leadId },
      data: { status: 'contacted' },
    });

    res.json({ success: true });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(500).json({ error: error.message || 'Failed to send connection request' });
  }
});

// ─── Send Message ─────────────────────────────────────────────────────────────

const messageSchema = z.object({
  leadId:  z.string(),
  message: z.string().min(1).max(2000),
});

/**
 * POST /api/linkedin/message
 * Send a direct message to a lead (browser mode only).
 */
router.post('/message', async (req: Request, res: Response) => {
  try {
    const { leadId, message } = messageSchema.parse(req.body);

    const lead = await prisma.lead.findFirst({
      where: { id: leadId, userId: req.userId },
      include: { account: true },
    });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    if (lead.account.connectionMode !== 'browser') {
      return res.status(400).json({
        error: 'Direct messages require browser mode.',
      });
    }

    const cookies = await getBrowserSession(lead.account);
    await linkedInBrowserService.sendMessage(cookies, lead.linkedinUrl, message);

    await prisma.lead.update({
      where: { id: leadId },
      data: { status: 'messaged' },
    });

    res.json({ success: true });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(500).json({ error: error.message || 'Failed to send message' });
  }
});

export default router;
