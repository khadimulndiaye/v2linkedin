import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { prisma } from '../services/prisma';
import { auth } from '../middleware/auth';
import { linkedInOAuthService } from '../services/linkedin-oauth';
import { config } from '../config';

const router = Router();
const pendingStates = new Map<string, { userId: string; accountId: string; expiresAt: number }>();

// GET /api/oauth/linkedin/url/:accountId
router.get('/linkedin/url/:accountId', auth, async (req: Request, res: Response) => {
  try {
    if (!linkedInOAuthService.isConfigured()) {
      return res.status(400).json({
        error: 'LinkedIn OAuth is not configured.',
        setup: 'Set LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET, and LINKEDIN_REDIRECT_URI.',
      });
    }
    const account = await prisma.linkedInAccount.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!account) return res.status(404).json({ error: 'Account not found' });

    const state = crypto.randomBytes(16).toString('hex');
    pendingStates.set(state, { userId: req.userId!, accountId: account.id, expiresAt: Date.now() + 10 * 60 * 1000 });

    res.json({ url: linkedInOAuthService.getAuthUrl(state) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/oauth/linkedin/callback
router.get('/linkedin/callback', async (req: Request, res: Response) => {
  const { code, state, error: oauthError } = req.query as Record<string, string>;

  if (oauthError) {
    return res.redirect(`${config.FRONTEND_URL}/accounts?oauth=error&reason=${encodeURIComponent(oauthError)}`);
  }

  const pending = pendingStates.get(state);
  if (!pending || Date.now() > pending.expiresAt) {
    return res.redirect(`${config.FRONTEND_URL}/accounts?oauth=error&reason=invalid_state`);
  }
  pendingStates.delete(state);

  try {
    const tokens = await linkedInOAuthService.exchangeCode(code);
    await prisma.linkedInAccount.update({
      where: { id: pending.accountId },
      data: {
        connectionMode:    'oauth',
        profileName:       tokens.profileName,
        profileUrl:        tokens.profileUrl,
        oauthAccessToken:  tokens.accessToken,
        oauthRefreshToken: tokens.refreshToken,
        oauthExpiresAt:    tokens.expiresAt,
        oauthLinkedInId:   tokens.linkedInId,
        status:            'active',
      },
    });
    res.redirect(`${config.FRONTEND_URL}/accounts?oauth=success&accountId=${pending.accountId}`);
  } catch (err: any) {
    res.redirect(`${config.FRONTEND_URL}/accounts?oauth=error&reason=${encodeURIComponent(err.message)}`);
  }
});

// POST /api/oauth/linkedin/disconnect/:accountId
router.post('/linkedin/disconnect/:accountId', auth, async (req: Request, res: Response) => {
  try {
    const account = await prisma.linkedInAccount.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!account) return res.status(404).json({ error: 'Account not found' });

    await prisma.linkedInAccount.update({
      where: { id: req.params.id },
      data: { connectionMode: 'manual', oauthAccessToken: null, oauthRefreshToken: null, oauthExpiresAt: null, oauthLinkedInId: null },
    });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to disconnect' });
  }
});

export default router;
