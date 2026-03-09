import { Router } from 'express';
import { z } from 'zod';
import { auth, AuthRequest } from '../middleware/auth';
import { aiService } from '../services/ai';

const router = Router();

router.use(auth);

const generateSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
  type: z.enum(['post', 'comment', 'message']),
});

const improveSchema = z.object({
  content: z.string().min(1, 'Content is required'),
  instruction: z.string().min(1, 'Instruction is required'),
});

const ideasSchema = z.object({
  topic: z.string().min(1, 'Topic is required'),
  count: z.number().int().min(1).max(20).optional().default(5),
});

// POST /api/ai/generate
router.post('/generate', async (req: AuthRequest, res) => {
  try {
    const { prompt, type } = generateSchema.parse(req.body);
    const content = await aiService.generateContent(prompt, type);
    res.json({ content });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(500).json({ error: error.message || 'Failed to generate content' });
  }
});

// POST /api/ai/improve  — combines content + instruction into a generate call
router.post('/improve', async (req: AuthRequest, res) => {
  try {
    const { content, instruction } = improveSchema.parse(req.body);
    const prompt = `${instruction}\n\nOriginal content to improve:\n${content}`;
    const improved = await aiService.generateContent(prompt, 'post');
    res.json({ content: improved });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(500).json({ error: error.message || 'Failed to improve content' });
  }
});

// POST /api/ai/ideas
router.post('/ideas', async (req: AuthRequest, res) => {
  try {
    const { topic, count } = ideasSchema.parse(req.body);
    const ideas = await aiService.generatePostIdeas(topic, count);
    res.json({ ideas });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(500).json({ error: error.message || 'Failed to generate ideas' });
  }
});

export default router;
