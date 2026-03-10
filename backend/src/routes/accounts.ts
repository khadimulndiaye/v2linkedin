import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../services/prisma';
import { auth } from '../middleware/auth';
import { encrypt, decrypt } from '../utils/encryption';
import { config } from '../config';

const router = Router();
router.use(auth);

const createAccountSchema = z.object({
  email:          z.string().email('Valid email is required'),
  profileName:    z.string().optional(),
  profileUrl:     z.string().url().optional().or(z.literal('')),
  connectionMode: z.enum(['manual', 'oauth', 'browser']).default('manual'),
  password:       z.string().optional(), // only for browser mode
});

const updateAccountSchema = z.object({
  profileName:    z.string().optional(),
  profileUrl:     z.string().url().optional().or(z.literal('')),
  status:         z.enum(['active', 'inactive']).optional(),
  connectionMode: z.enum(['manual', 'oauth', 'browser']).optional(),
  password:       z.string().optional(),
  dailyLimits:    z.object({}).passthrough().optional(),
});

// GET /api/accounts
router.get('/', async (req: Request, res: Response) => {
  try {
    const accounts = await prisma.linkedInAccount.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, email: true, profileName: true, profileUrl: true,
        status: true, connectionMode: true, dailyLimits: true,
        createdAt: true, updatedAt: true,
        // Never send encrypted password or tokens to frontend
        oauthLinkedInId: true, oauthExpiresAt: true,
        _count: { select: { campaigns: true, leads: true } },
      },
    });

    // Add a derived `isConnected` flag
    const enriched = accounts.map((a) => ({
      ...a,
      isConnected: a.connectionMode === 'oauth'
        ? !!(a.oauthLinkedInId && a.oauthExpiresAt && new Date(a.oauthExpiresAt) > new Date())
        : a.connectionMode === 'browser'
        ? true  // assume connected if browser mode is set (password was validated at save)
        : false,
    }));

    res.json(enriched);
  } catch {
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

// GET /api/accounts/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const account = await prisma.linkedInAccount.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: { _count: { select: { campaigns: true, leads: true } } },
    });
    if (!account) return res.status(404).json({ error: 'Account not found' });

    // Strip sensitive fields
    const { passwordEncrypted, oauthAccessToken, oauthRefreshToken, ...safe } = account;
    res.json(safe);
  } catch {
    res.status(500).json({ error: 'Failed to fetch account' });
  }
});

// POST /api/accounts
router.post('/', async (req: Request, res: Response) => {
  try {
    const data = createAccountSchema.parse(req.body);

    // Check for duplicate email under this user
    const existing = await prisma.linkedInAccount.findFirst({
      where: { email: data.email, userId: req.userId },
    });
    if (existing) {
      return res.status(400).json({ error: 'This LinkedIn email is already added to your account' });
    }

    // Validate browser mode requires password
    if (data.connectionMode === 'browser') {
      if (!data.password) {
        return res.status(400).json({ error: 'Password is required for browser automation mode' });
      }
      if (!config.ENCRYPTION_KEY) {
        return res.status(400).json({
          error: 'Server is missing ENCRYPTION_KEY environment variable. Contact your administrator.',
        });
      }
    }

    const passwordEncrypted = data.connectionMode === 'browser' && data.password
      ? encrypt(data.password)
      : null;

    const account = await prisma.linkedInAccount.create({
      data: {
        userId:            req.userId!,
        email:             data.email,
        profileName:       data.profileName ?? null,
        profileUrl:        data.profileUrl  ?? null,
        connectionMode:    data.connectionMode,
        passwordEncrypted,
        status:            'active',
      },
    });

    const { passwordEncrypted: _pw, oauthAccessToken: _at, oauthRefreshToken: _rt, ...safe } = account;
    res.status(201).json(safe);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// PUT /api/accounts/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const data = updateAccountSchema.parse(req.body);

    const existing = await prisma.linkedInAccount.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!existing) return res.status(404).json({ error: 'Account not found' });

    const passwordEncrypted = data.password
      ? encrypt(data.password)
      : undefined;

    const result = await prisma.linkedInAccount.update({
      where: { id: req.params.id },
      data: {
        ...(data.profileName    !== undefined && { profileName:    data.profileName }),
        ...(data.profileUrl     !== undefined && { profileUrl:     data.profileUrl || null }),
        ...(data.status         !== undefined && { status:         data.status }),
        ...(data.connectionMode !== undefined && { connectionMode: data.connectionMode }),
        ...(passwordEncrypted   !== undefined && { passwordEncrypted }),
        ...(data.dailyLimits    !== undefined && { dailyLimits:    data.dailyLimits }),
      },
    });

    const { passwordEncrypted: _pw, oauthAccessToken: _at, oauthRefreshToken: _rt, ...safe } = result;
    res.json(safe);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(500).json({ error: 'Failed to update account' });
  }
});

// DELETE /api/accounts/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const result = await prisma.linkedInAccount.deleteMany({
      where: { id: req.params.id, userId: req.userId },
    });
    if (result.count === 0) return res.status(404).json({ error: 'Account not found' });
    res.json({ success: true, message: 'Account deleted' });
  } catch {
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// GET /api/accounts/:id/decrypt-password  — backend only, for automation tasks
export async function getDecryptedPassword(accountId: string): Promise<string | null> {
  const account = await prisma.linkedInAccount.findUnique({
    where: { id: accountId },
    select: { passwordEncrypted: true },
  });
  if (!account?.passwordEncrypted) return null;
  return decrypt(account.passwordEncrypted);
}

export default router;
