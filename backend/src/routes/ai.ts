import { Router } from 'express';
import { z } from 'zod';
import { auth, AuthRequest } from '../middleware/auth';
import { aiService } from '../services/ai';

const router = Router();

router.use(auth);

const generateContentSchema = z.object({
  prompt: z.string().min(1),
  type: z.enum(['post', 'comment', 'message']),
});

const generateIdeasSchema = z.object({
  topic: z.string().min(1),
  count: z.number().min(1).max(20).optional(),
});

router.post('/generate', async (req: AuthRequest, res) => {
  try {
    const { prompt, type } = generateContentSchema.parse(req.body);
    
    const content = await aiService.generateContent(prompt, type);
    
    res.json({ content });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(500).json({ error: 'Failed to generate content' });
  }
});

router.post('/ideas', async (req: AuthRequest, res) => {
  try {
    const { topic, count } = generateIdeasSchema.parse(req.body);
    
    const ideas = await aiService.generatePostIdeas(topic, count);
    
    res.json({ ideas });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(500).json({ error: 'Failed to generate ideas' });
  }
});

export default router;
