import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { auth } from '../middleware/auth';
import { aiService } from '../services/ai';

const router = Router();
router.use(auth);

const generateSchema = z.object({
  prompt: z.string().min(1),
  type:   z.enum(['post', 'comment', 'message']).default('post'),
});

const ideasSchema = z.object({
  topic: z.string().min(1),
  count: z.number().min(1).max(10).default(5),
});

// POST /api/ai/generate
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { prompt, type } = generateSchema.parse(req.body);
    const content = await aiService.generateContent(prompt, type);
    res.json({ content });
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message });
    res.status(500).json({ error: err.message || 'AI generation failed' });
  }
});

// POST /api/ai/ideas
router.post('/ideas', async (req: Request, res: Response) => {
  try {
    const { topic, count } = ideasSchema.parse(req.body);
    const ideas = await aiService.generatePostIdeas(topic, count);
    res.json({ ideas });
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message });
    res.status(500).json({ error: err.message || 'AI generation failed' });
  }
});

export default router;
