import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../services/prisma';
import { auth } from '../middleware/auth';

const router = Router();
router.use(auth);

const createSchema = z.object({
  name:      z.string().min(1),
  accountId: z.string().min(1),
  type:      z.enum(['connection', 'message', 'content', 'mixed']).default('message'),
  settings:  z.record(z.unknown()).optional(),
});

const updateSchema = z.object({
  name:      z.string().optional(),
  status:    z.enum(['draft', 'active', 'paused', 'completed']).optional(),
  settings:  z.record(z.unknown()).optional(),
});

// GET /api/campaigns
router.get('/', async (req: Request, res: Response) => {
  try {
    const { accountId, status } = req.query as Record<string, string>;
    const where: any = { userId: req.userId };
    if (accountId) where.accountId = accountId;
    if (status)    where.status    = status;

    const campaigns = await prisma.campaign.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        account: { select: { email: true, profileName: true } },
        _count:  { select: { leads: true } },
      },
    });
    res.json(campaigns);
  } catch {
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

// GET /api/campaigns/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const campaign = await prisma.campaign.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: {
        account: { select: { email: true, profileName: true, connectionMode: true } },
        leads:   { orderBy: { createdAt: 'desc' } },
        _count:  { select: { leads: true } },
      },
    });
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    res.json(campaign);
  } catch {
    res.status(500).json({ error: 'Failed to fetch campaign' });
  }
});

// POST /api/campaigns
router.post('/', async (req: Request, res: Response) => {
  try {
    const data = createSchema.parse(req.body);
    const account = await prisma.linkedInAccount.findFirst({
      where: { id: data.accountId, userId: req.userId },
    });
    if (!account) return res.status(404).json({ error: 'Account not found' });

    const campaign = await (prisma.campaign.create as any)({
      data: {
        userId:    req.userId,
        accountId: data.accountId,
        name:      data.name,
        type:      data.type,
        status:    'draft',
        settings:  data.settings ?? {},
      },
    });
    res.status(201).json(campaign);
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message });
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

// PUT /api/campaigns/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const data = updateSchema.parse(req.body);
    const result = await prisma.campaign.updateMany({
      where: { id: req.params.id, userId: req.userId },
      data,
    });
    if (result.count === 0) return res.status(404).json({ error: 'Campaign not found' });
    const updated = await prisma.campaign.findUnique({ where: { id: req.params.id } });
    res.json(updated);
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message });
    res.status(500).json({ error: 'Failed to update campaign' });
  }
});

// PATCH /api/campaigns/:id/status
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { status } = req.body as { status: string };
    const result = await prisma.campaign.updateMany({
      where: { id: req.params.id, userId: req.userId },
      data:  { status },
    });
    if (result.count === 0) return res.status(404).json({ error: 'Campaign not found' });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// DELETE /api/campaigns/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const result = await prisma.campaign.deleteMany({
      where: { id: req.params.id, userId: req.userId },
    });
    if (result.count === 0) return res.status(404).json({ error: 'Campaign not found' });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete campaign' });
  }
});

export default router;
