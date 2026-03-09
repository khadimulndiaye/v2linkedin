import { Router } from 'express';
import crypto from 'crypto';
import { prisma } from '../services/prisma';
import { auth, AuthRequest } from '../middleware/auth';
import { linkedInOAuthService } from '../services/linkedin-oauth';
import { config } from '../config';

const router = Router();

// In-memory state store (use Redis in production)
const pendingStates = new Map<string, { userId: string; accountId: string; expiresAt: number }>();

/**
 * GET /api/oauth/linkedin/url/:accountId
 * Returns the LinkedIn authorization URL for the given account.
 * Frontend opens this URL in a popup or redirect.
 */
router.get('/linkedin/url/:accountId', auth, async (req: AuthRequest, res) => {
  try {
    if (!linkedInOAuthService.isConfigured()) {
      return res.status(400).json({
        error: 'LinkedIn OAuth is not configured on this server.',
        setup: 'Set LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET, and LINKEDIN_REDIRECT_URI in environment variables.',
      });
    }

    const account = await prisma.linkedInAccount.findFirst({
      where: { id: req.params.accountId, userId: req.userId },
    });
    if (!account) return res.status(404).json({ error: 'Account not found' });

    const state = crypto.randomBytes(16).toString('hex');
    pendingStates.set(state, {
      userId:    req.userId!,
      accountId: account.id,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 min
    });

    const url = linkedInOAuthService.getAuthUrl(state);
    res.json({ url });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/oauth/linkedin/callback
 * LinkedIn redirects here after user grants permission.
 * Exchanges the code for tokens and saves them.
 */
router.get('/linkedin/callback', async (req, res) => {
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
        connectionMode:   'oauth',
        profileName:      tokens.profileName,
        profileUrl:       tokens.profileUrl,
        oauthAccessToken:  tokens.accessToken,
        oauthRefreshToken: tokens.refreshToken,
        oauthExpiresAt:    tokens.expiresAt,
        oauthLinkedInId:   tokens.linkedInId,
        status:           'active',
      },
    });

    res.redirect(`${config.FRONTEND_URL}/accounts?oauth=success&accountId=${pending.accountId}`);
  } catch (err: any) {
    res.redirect(`${config.FRONTEND_URL}/accounts?oauth=error&reason=${encodeURIComponent(err.message)}`);
  }
});

/**
 * POST /api/oauth/linkedin/disconnect/:accountId
 * Clears OAuth tokens (doesn't revoke at LinkedIn).
 */
router.post('/linkedin/disconnect/:accountId', auth, async (req: AuthRequest, res) => {
  try {
    const account = await prisma.linkedInAccount.findFirst({
      where: { id: req.params.accountId, userId: req.userId },
    });
    if (!account) return res.status(404).json({ error: 'Account not found' });

    await prisma.linkedInAccount.update({
      where: { id: req.params.accountId },
      data: {
        connectionMode:    'manual',
        oauthAccessToken:  null,
        oauthRefreshToken: null,
        oauthExpiresAt:    null,
        oauthLinkedInId:   null,
      },
    });

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to disconnect' });
  }
});

export default router;
