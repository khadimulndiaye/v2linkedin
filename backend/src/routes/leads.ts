import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../services/prisma';
import { auth } from '../middleware/auth';

const router = Router();
router.use(auth);

const createLeadSchema = z.object({
  linkedinUrl: z.string().url('Valid LinkedIn URL required'),
  name:        z.string().min(1, 'Name is required'),
  accountId:   z.string().min(1, 'Account is required'),
  campaignId:  z.string().optional(),
  headline:    z.string().optional(),
  company:     z.string().optional(),
  location:    z.string().optional(),
  notes:       z.string().optional(),
});

const updateLeadSchema = z.object({
  status:  z.enum(['new', 'contacted', 'messaged']).optional(),
  notes:   z.string().optional(),
  name:    z.string().optional(),
  headline:z.string().optional(),
  company: z.string().optional(),
  location:z.string().optional(),
});

// GET /api/leads
router.get('/', async (req: Request, res: Response) => {
  try {
    const { search, status, campaignId, page = '1', limit = '50' } = req.query as Record<string, string>;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where: any = { userId: req.userId };
    if (status)     where.status     = status;
    if (campaignId) where.campaignId = campaignId;
    if (search) {
      where.OR = [
        { name:    { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
        { headline:{ contains: search, mode: 'insensitive' } },
      ];
    }

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where, skip, take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          campaign: { select: { name: true } },
          account:  { select: { email: true } },
        },
      }),
      prisma.lead.count({ where }),
    ]);

    res.json({ leads, total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch {
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// GET /api/leads/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const lead = await prisma.lead.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: { campaign: { select: { name: true } }, account: { select: { email: true } } },
    });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    res.json(lead);
  } catch {
    res.status(500).json({ error: 'Failed to fetch lead' });
  }
});

// POST /api/leads
router.post('/', async (req: Request, res: Response) => {
  try {
    const data = createLeadSchema.parse(req.body);

    const account = await prisma.linkedInAccount.findFirst({ where: { id: data.accountId, userId: req.userId } });
    if (!account) return res.status(404).json({ error: 'Account not found' });

    if (data.campaignId) {
      const campaign = await prisma.campaign.findFirst({ where: { id: data.campaignId, userId: req.userId } });
      if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    }

    const lead = await prisma.lead.create({
      data: {
        userId:      req.userId!,
        accountId:   data.accountId,
        campaignId:  data.campaignId ?? null,
        linkedinUrl: data.linkedinUrl,
        name:        data.name,
        headline:    data.headline ?? null,
        company:     data.company  ?? null,
        location:    data.location ?? null,
        notes:       data.notes    ?? null,
        status:      'new',
      },
    });
    res.status(201).json(lead);
  } catch (error: any) {
    if (error.name === 'ZodError') return res.status(400).json({ error: error.errors[0].message });
    res.status(500).json({ error: 'Failed to create lead' });
  }
});

// PUT /api/leads/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const data = updateLeadSchema.parse(req.body);
    const result = await prisma.lead.updateMany({
      where: { id: req.params.id, userId: req.userId },
      data,
    });
    if (result.count === 0) return res.status(404).json({ error: 'Lead not found' });
    const updated = await prisma.lead.findUnique({ where: { id: req.params.id } });
    res.json(updated);
  } catch (error: any) {
    if (error.name === 'ZodError') return res.status(400).json({ error: error.errors[0].message });
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

// DELETE /api/leads/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const result = await prisma.lead.deleteMany({ where: { id: req.params.id, userId: req.userId } });
    if (result.count === 0) return res.status(404).json({ error: 'Lead not found' });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete lead' });
  }
});

export default router;
