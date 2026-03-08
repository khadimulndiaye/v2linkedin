import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../services/prisma';
import { auth, AuthRequest } from '../middleware/auth';
import { linkedinService } from '../services/linkedin';

const router = Router();

router.use(auth);

const createLeadSchema = z.object({
  linkedinUrl: z.string().url(),
  name: z.string().min(1),
  headline: z.string().optional(),
  company: z.string().optional(),
  location: z.string().optional(),
  accountId: z.string(),
  campaignId: z.string().optional(),
});

router.get('/', async (req: AuthRequest, res) => {
  try {
    const { search, status, campaignId, page = '1', limit = '20' } = req.query;
    
    const where: any = { userId: req.userId };
    
    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { company: { contains: String(search), mode: 'insensitive' } },
        { headline: { contains: String(search), mode: 'insensitive' } },
      ];
    }
    
    if (status) where.status = status;
    if (campaignId) where.campaignId = campaignId;

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { 
          campaign: { select: { name: true } },
          account: { select: { email: true } },
        },
      }),
      prisma.lead.count({ where }),
    ]);

    res.json({ 
      leads, 
      total, 
      page: Number(page), 
      limit: Number(limit),
      totalPages: Math.ceil(total / take),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const lead = await prisma.lead.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: { campaign: true, account: true },
    });
    
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    
    res.json(lead);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch lead' });
  }
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    const data = createLeadSchema.parse(req.body);
    
    const account = await prisma.linkedInAccount.findFirst({
      where: { id: data.accountId, userId: req.userId },
    });
    
    if (!account) {
      return res.status(400).json({ error: 'Invalid account' });
    }
    
    const lead = await prisma.lead.create({
      data: { 
        userId: req.userId!, 
        ...data,
      },
    });
    
    res.status(201).json(lead);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(500).json({ error: 'Failed to create lead' });
  }
});

router.post('/:id/connect', async (req: AuthRequest, res) => {
  try {
    const lead = await prisma.lead.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    await linkedinService.sendConnectionRequest(lead.linkedinUrl, req.body.message);
    
    const updated = await prisma.lead.update({
      where: { id: req.params.id },
      data: { status: 'contacted' },
    });
    
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to send connection request' });
  }
});

router.post('/:id/message', async (req: AuthRequest, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    const lead = await prisma.lead.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    await linkedinService.sendMessage(lead.linkedinUrl, message);
    
    const updated = await prisma.lead.update({
      where: { id: req.params.id },
      data: { status: 'messaged' },
    });
    
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to send message' });
  }
});

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { status, notes } = req.body;
    
    const result = await prisma.lead.updateMany({
      where: { id: req.params.id, userId: req.userId },
      data: { status, notes },
    });
    
    if (result.count === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    
    const updated = await prisma.lead.findUnique({
      where: { id: req.params.id },
    });
    
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const result = await prisma.lead.deleteMany({
      where: { id: req.params.id, userId: req.userId },
    });
    
    if (result.count === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    
    res.json({ success: true, message: 'Lead deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete lead' });
  }
});

export default router;
