import { Router, Request, Response } from 'express';
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
  password:       z.string().optional(),
  cookiesJson:    z.string().optional(), // raw JSON cookies from browser
});

const updateAccountSchema = z.object({
  profileName:    z.string().optional(),
  profileUrl:     z.string().url().optional().or(z.literal('')),
  status:         z.enum(['active', 'inactive']).optional(),
  connectionMode: z.enum(['manual', 'oauth', 'browser']).optional(),
  password:       z.string().optional(),
  cookiesJson:    z.string().optional(),
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
        oauthLinkedInId: true, oauthExpiresAt: true,
        _count: { select: { campaigns: true, leads: true } },
      },
    });

    const enriched = accounts.map((a) => ({
      ...a,
      isConnected: a.connectionMode === 'oauth'
        ? !!(a.oauthLinkedInId && a.oauthExpiresAt && new Date(a.oauthExpiresAt) > new Date())
        : a.connectionMode === 'browser'
        ? true
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
    const { passwordEncrypted, cookiesEncrypted, oauthAccessToken, oauthRefreshToken, ...safe } = account as any;
    res.json(safe);
  } catch {
    res.status(500).json({ error: 'Failed to fetch account' });
  }
});

// POST /api/accounts
router.post('/', async (req: Request, res: Response) => {
  try {
    const data = createAccountSchema.parse(req.body);

    // Allow same email in different connection modes (e.g. oauth + browser with cookies)
    const existing = await prisma.linkedInAccount.findFirst({
      where: { email: data.email, userId: req.userId, connectionMode: data.connectionMode },
    });
    if (existing) return res.status(400).json({
      error: `This email already has a ${data.connectionMode} account. Use a different connection mode or delete the existing one.`,
    });

    if (data.connectionMode === 'browser') {
      if (!data.password && !data.cookiesJson) {
        return res.status(400).json({ error: 'Browser mode requires either a password or pasted cookies' });
      }
      if (!config.ENCRYPTION_KEY) {
        return res.status(400).json({ error: 'Server is missing ENCRYPTION_KEY' });
      }
    }

    // Validate cookies JSON if provided
    if (data.cookiesJson) {
      try { JSON.parse(data.cookiesJson); } catch {
        return res.status(400).json({ error: 'Cookies JSON is not valid JSON' });
      }
    }

    const passwordEncrypted = data.connectionMode === 'browser' && data.password
      ? encrypt(data.password) : null;
    const cookiesEncrypted = data.cookiesJson ? encrypt(data.cookiesJson) : null;

    const account = await (prisma.linkedInAccount.create as any)({
      data: {
        userId: req.userId!, email: data.email,
        profileName: data.profileName ?? null, profileUrl: data.profileUrl ?? null,
        connectionMode: data.connectionMode,
        passwordEncrypted, cookiesEncrypted,
        status: 'active',
      },
    });

    const { passwordEncrypted: _pw, cookiesEncrypted: _ck, oauthAccessToken: _at, oauthRefreshToken: _rt, ...safe } = account;
    res.status(201).json(safe);
  } catch (error: any) {
    if (error.name === 'ZodError') return res.status(400).json({ error: error.errors[0].message });
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

    if (data.cookiesJson) {
      try { JSON.parse(data.cookiesJson); } catch {
        return res.status(400).json({ error: 'Cookies JSON is not valid JSON' });
      }
    }

    const passwordEncrypted = data.password ? encrypt(data.password) : undefined;
    const cookiesEncrypted  = data.cookiesJson ? encrypt(data.cookiesJson) : undefined;

    const result = await (prisma.linkedInAccount.update as any)({
      where: { id: req.params.id },
      data: {
        ...(data.profileName    !== undefined && { profileName:    data.profileName }),
        ...(data.profileUrl     !== undefined && { profileUrl:     data.profileUrl || null }),
        ...(data.status         !== undefined && { status:         data.status }),
        ...(data.connectionMode !== undefined && { connectionMode: data.connectionMode }),
        ...(passwordEncrypted   !== undefined && { passwordEncrypted }),
        ...(cookiesEncrypted    !== undefined && { cookiesEncrypted }),
        ...(data.dailyLimits    !== undefined && { dailyLimits:    data.dailyLimits }),
      },
    });

    const { passwordEncrypted: _pw, cookiesEncrypted: _ck, oauthAccessToken: _at, oauthRefreshToken: _rt, ...safe } = result;
    res.json(safe);
  } catch (error: any) {
    if (error.name === 'ZodError') return res.status(400).json({ error: error.errors[0].message });
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
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// Helper for automation services
export async function getDecryptedCookies(accountId: string): Promise<string | null> {
  const account = await (prisma.linkedInAccount.findUnique as any)({
    where: { id: accountId },
    select: { cookiesEncrypted: true, passwordEncrypted: true },
  });
  if (account?.cookiesEncrypted) return decrypt(account.cookiesEncrypted);
  return null;
}

export async function getDecryptedPassword(accountId: string): Promise<string | null> {
  const account = await prisma.linkedInAccount.findUnique({
    where: { id: accountId },
    select: { passwordEncrypted: true },
  });
  if (!account?.passwordEncrypted) return null;
  return decrypt(account.passwordEncrypted);
}

export default router;
