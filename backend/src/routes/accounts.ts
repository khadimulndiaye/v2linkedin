import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../services/prisma';
import { auth, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(auth);

const createAccountSchema = z.object({
  email: z.string().email(),
  profileUrl: z.string().url().optional(),
  profileName: z.string().optional(),
});

router.get('/', async (req: AuthRequest, res) => {
  try {
    const accounts = await prisma.linkedInAccount.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const account = await prisma.linkedInAccount.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: {
        _count: { select: { campaigns: true, leads: true } },
      },
    });
    
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }
    
    res.json(account);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch account' });
  }
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    const data = createAccountSchema.parse(req.body);
    
    const account = await prisma.linkedInAccount.create({
      data: { 
        userId: req.userId!, 
        ...data,
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

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { profileUrl, profileName, status, dailyLimits } = req.body;
    
    const account = await prisma.linkedInAccount.updateMany({
      where: { id: req.params.id, userId: req.userId },
      data: { profileUrl, profileName, status, dailyLimits },
    });
    
    if (account.count === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }
    
    const updated = await prisma.linkedInAccount.findUnique({
      where: { id: req.params.id },
    });
    
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update account' });
  }
});

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const result = await prisma.linkedInAccount.deleteMany({
      where: { id: req.params.id, userId: req.userId },
    });
    
    if (result.count === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }
    
    res.json({ success: true, message: 'Account deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

export default router;
