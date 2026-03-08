import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../services/prisma';
import { auth, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(auth);

const createCampaignSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['connection', 'message', 'engagement', 'content']),
  accountId: z.string(),
  settings: z.object({}).passthrough().optional(),
});

router.get('/', async (req: AuthRequest, res) => {
  try {
    const { status, type } = req.query;
    
    const where: any = { userId: req.userId };
    if (status) where.status = status;
    if (type) where.type = type;
    
    const campaigns = await prisma.campaign.findMany({
      where,
      include: { 
        account: { select: { email: true, profileName: true } },
        _count: { select: { leads: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const campaign = await prisma.campaign.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: { 
        account: true,
        leads: { take: 10, orderBy: { createdAt: 'desc' } },
        _count: { select: { leads: true } },
      },
    });
    
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    res.json(campaign);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch campaign' });
  }
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    const data = createCampaignSchema.parse(req.body);
    
    const account = await prisma.linkedInAccount.findFirst({
      where: { id: data.accountId, userId: req.userId },
    });
    
    if (!account) {
      return res.status(400).json({ error: 'Invalid account' });
    }
    
    const campaign = await prisma.campaign.create({
      data: { 
        userId: req.userId!, 
        ...data,
        settings: data.settings || {},
      },
      include: { account: { select: { email: true } } },
    });
    
    res.status(201).json(campaign);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

router.patch('/:id/toggle', async (req: AuthRequest, res) => {
  try {
    const campaign = await prisma.campaign.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const newStatus = campaign.status === 'active' ? 'paused' : 'active';
    
    const updated = await prisma.campaign.update({
      where: { id: req.params.id },
      data: { status: newStatus },
    });
    
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle campaign' });
  }
});

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { name, settings, status } = req.body;
    
    const result = await prisma.campaign.updateMany({
      where: { id: req.params.id, userId: req.userId },
      data: { name, settings, status },
    });
    
    if (result.count === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    const updated = await prisma.campaign.findUnique({
      where: { id: req.params.id },
    });
    
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update campaign' });
  }
});

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const result = await prisma.campaign.deleteMany({
      where: { id: req.params.id, userId: req.userId },
    });
    
    if (result.count === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    res.json({ success: true, message: 'Campaign deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete campaign' });
  }
});

export default router;
