import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../services/prisma';
import { auth, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(auth);

const createAccountSchema = z.object({
  email: z.string().email('Valid email is required'),
  profileUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  profileName: z.string().optional(),
});

const updateAccountSchema = z.object({
  profileUrl: z.string().url().optional().or(z.literal('')),
  profileName: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  dailyLimits: z.object({}).passthrough().optional(),
});

// GET /api/accounts
router.get('/', async (req: AuthRequest, res) => {
  try {
    const accounts = await prisma.linkedInAccount.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(accounts);
  } catch {
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

// GET /api/accounts/:id
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const account = await prisma.linkedInAccount.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: { _count: { select: { campaigns: true, leads: true } } },
    });
    if (!account) return res.status(404).json({ error: 'Account not found' });
    res.json(account);
  } catch {
    res.status(500).json({ error: 'Failed to fetch account' });
  }
});

// POST /api/accounts
router.post('/', async (req: AuthRequest, res) => {
  try {
    const data = createAccountSchema.parse(req.body);

    const existing = await prisma.linkedInAccount.findFirst({
      where: { email: data.email, userId: req.userId },
    });
    if (existing) {
      return res.status(400).json({ error: 'This LinkedIn email is already added' });
    }

    const account = await prisma.linkedInAccount.create({
      data: {
        userId: req.userId!,
        email: data.email,
        profileUrl: data.profileUrl || null,
        profileName: data.profileName || null,
        status: 'active',
      },
    });
    res.status(201).json(account);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// PUT /api/accounts/:id
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const data = updateAccountSchema.parse(req.body);

    const result = await prisma.linkedInAccount.updateMany({
      where: { id: req.params.id, userId: req.userId },
      data: {
        ...(data.profileUrl !== undefined && { profileUrl: data.profileUrl || null }),
        ...(data.profileName !== undefined && { profileName: data.profileName }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.dailyLimits !== undefined && { dailyLimits: data.dailyLimits }),
      },
    });

    if (result.count === 0) return res.status(404).json({ error: 'Account not found' });

    const updated = await prisma.linkedInAccount.findUnique({ where: { id: req.params.id } });
    res.json(updated);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(500).json({ error: 'Failed to update account' });
  }
});

// DELETE /api/accounts/:id
router.delete('/:id', async (req: AuthRequest, res) => {
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

export default router;
