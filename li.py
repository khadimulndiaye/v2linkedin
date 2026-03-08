<<<<<<< Updated upstream
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
LinkedIn Manager Project Generator
Creates the complete project structure from embedded templates.

Usage:
    python create_project.py [target_directory]
    
Example:
    python create_project.py linkedin-manager
"""

import os
import sys


PROJECT_FILES = {
    # ============================================================
    # BACKEND FILES
    # ============================================================
    
    "backend/package.json": """{
  "name": "linkedin-manager-backend",
  "version": "1.0.0",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "db:push": "prisma db push",
    "db:generate": "prisma generate"
  },
  "dependencies": {
    "@prisma/client": "^5.10.0",
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "express": "^4.18.2",
    "jsonwebtoken": "^9.0.2",
    "winston": "^3.11.0",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/jsonwebtoken": "^9.0.5",
    "@types/node": "^20.11.0",
    "prisma": "^5.10.0",
    "tsx": "^4.7.0",
    "typescript": "^5.3.3"
  }
}""",

    "backend/tsconfig.json": """{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}""",

    "backend/.env.example": """DATABASE_URL="postgresql://postgres:postgres@localhost:5432/linkedin_manager"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
PORT=3001
FRONTEND_URL="http://localhost:5173"
OPENAI_API_KEY=""
GEMINI_API_KEY=""
DEEPSEEK_API_KEY=""
""",

    "backend/prisma/schema.prisma": """generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  accounts  LinkedInAccount[]
  campaigns Campaign[]
  leads     Lead[]
}

model LinkedInAccount {
  id           String   @id @default(cuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  email        String
  profileUrl   String?
  profileName  String?
  status       String   @default("active")
  dailyLimits  Json     @default("{}")
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  campaigns Campaign[]
  leads     Lead[]
}

model Campaign {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  accountId   String
  account     LinkedInAccount @relation(fields: [accountId], references: [id], onDelete: Cascade)
  name        String
  type        String
  status      String   @default("draft")
  settings    Json     @default("{}")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  leads Lead[]
}

model Lead {
  id           String   @id @default(cuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  accountId    String
  account      LinkedInAccount @relation(fields: [accountId], references: [id], onDelete: Cascade)
  campaignId   String?
  campaign     Campaign? @relation(fields: [campaignId], references: [id], onDelete: SetNull)
  linkedinUrl  String
  name         String
  headline     String?
  company      String?
  location     String?
  status       String   @default("new")
  notes        String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
""",

    "backend/src/config/index.ts": """import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string(),
  PORT: z.string().default('3001'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  OPENAI_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  DEEPSEEK_API_KEY: z.string().optional(),
});

export const config = envSchema.parse(process.env);
""",

    "backend/src/utils/logger.ts": """import winston from 'winston';

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});
""",

    "backend/src/services/prisma.ts": """import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
""",

    "backend/src/services/linkedin.ts": """import { logger } from '../utils/logger';

export class LinkedInService {
  async sendConnectionRequest(profileUrl: string, message?: string) {
    logger.info('Sending connection request to ' + profileUrl);
    return { success: true, profileUrl };
  }

  async sendMessage(profileUrl: string, message: string) {
    logger.info('Sending message to ' + profileUrl);
    return { success: true, profileUrl };
  }

  async searchProfiles(query: string, limit: number = 25) {
    logger.info('Searching profiles: ' + query);
    return [];
  }

  async likePost(postUrl: string) {
    logger.info('Liking post: ' + postUrl);
    return { success: true, postUrl };
  }

  async commentOnPost(postUrl: string, comment: string) {
    logger.info('Commenting on post: ' + postUrl);
    return { success: true, postUrl, comment };
  }
}

export const linkedinService = new LinkedInService();
""",

    "backend/src/services/ai.ts": """import { config } from '../config';
import { logger } from '../utils/logger';

export class AIService {
  private provider: 'openai' | 'gemini' | 'deepseek';

  constructor() {
    if (config.OPENAI_API_KEY) {
      this.provider = 'openai';
    } else if (config.GEMINI_API_KEY) {
      this.provider = 'gemini';
    } else if (config.DEEPSEEK_API_KEY) {
      this.provider = 'deepseek';
    } else {
      this.provider = 'openai';
    }
    logger.info('AI Service initialized with provider: ' + this.provider);
  }

  async generateContent(prompt: string, type: 'post' | 'comment' | 'message'): Promise<string> {
    logger.info('Generating ' + type + ' content with ' + this.provider);
    
    const templates: Record<string, string> = {
      post: 'Here is an engaging LinkedIn post about: ' + prompt,
      comment: 'Great insight! ' + prompt,
      message: 'Hi! I noticed ' + prompt + '. Would love to connect!',
    };

    return templates[type];
  }

  async generatePostIdeas(topic: string, count: number = 5): Promise<string[]> {
    logger.info('Generating ' + count + ' post ideas about: ' + topic);
    return Array(count).fill(null).map((_, i) => 'Post idea ' + (i + 1) + ' about ' + topic);
  }
}

export const aiService = new AIService();
""",

    "backend/src/middleware/auth.ts": """import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface AuthRequest extends Request {
  userId?: string;
}

export const auth = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as { userId: string };
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
""",

    "backend/src/middleware/errorHandler.ts": """import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error(err.message, { stack: err.stack, path: req.path });
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }
  
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  res.status(500).json({ error: 'Internal server error' });
};
""",

    "backend/src/middleware/rateLimit.ts": """import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

const requestCounts = new Map<string, { count: number; resetTime: number }>();

export const rateLimit = (maxRequests: number = 100, windowMs: number = 60000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    
    const record = requestCounts.get(key);
    
    if (!record || now > record.resetTime) {
      requestCounts.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    if (record.count >= maxRequests) {
      logger.warn('Rate limit exceeded for ' + key);
      return res.status(429).json({ error: 'Too many requests' });
    }
    
    record.count++;
    next();
  };
};
""",

    "backend/src/routes/auth.ts": """import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../services/prisma';
import { config } from '../config';
import { auth, AuthRequest } from '../middleware/auth';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = registerSchema.parse(req.body);
    
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 12);
    
    const user = await prisma.user.create({
      data: { email, password: hashedPassword, name },
    });

    const token = jwt.sign({ userId: user.id }, config.JWT_SECRET, { expiresIn: '7d' });
    
    res.status(201).json({ 
      token, 
      user: { id: user.id, email: user.email, name: user.name } 
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id }, config.JWT_SECRET, { expiresIn: '7d' });
    
    res.json({ 
      token, 
      user: { id: user.id, email: user.email, name: user.name } 
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/me', auth, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, email: true, name: true, createdAt: true },
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

router.put('/me', auth, async (req: AuthRequest, res) => {
  try {
    const { name } = req.body;
    
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { name },
      select: { id: true, email: true, name: true },
    });
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

export default router;
""",

    "backend/src/routes/accounts.ts": """import { Router } from 'express';
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
""",

    "backend/src/routes/campaigns.ts": """import { Router } from 'express';
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
""",

    "backend/src/routes/leads.ts": """import { Router } from 'express';
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
""",

    "backend/src/routes/ai.ts": """import { Router } from 'express';
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
""",

    "backend/src/index.ts": """import express from 'express';
import cors from 'cors';
import { config } from './config';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { rateLimit } from './middleware/rateLimit';
import authRoutes from './routes/auth';
import accountRoutes from './routes/accounts';
import campaignRoutes from './routes/campaigns';
import leadRoutes from './routes/leads';
import aiRoutes from './routes/ai';

const app = express();

app.use(cors({ 
  origin: config.FRONTEND_URL, 
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(rateLimit(100, 60000));

app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/ai', aiRoutes);

app.get('/health', (_, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

app.use(errorHandler);

const PORT = parseInt(config.PORT, 10);
app.listen(PORT, '0.0.0.0', () => {
  logger.info('Server running on port ' + PORT);
  logger.info('Health check: http://localhost:' + PORT + '/health');
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});
""",

    "backend/Dockerfile": """FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY prisma ./prisma
RUN npx prisma generate

COPY dist ./dist

EXPOSE 3001

CMD ["node", "dist/index.js"]
""",

    # ============================================================
    # FRONTEND FILES
    # ============================================================

    "frontend/package.json": """{
  "name": "linkedin-manager-frontend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "axios": "^1.6.7",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.22.0",
    "zustand": "^4.5.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.55",
    "@types/react-dom": "^18.2.19",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.17",
    "postcss": "^8.4.35",
    "tailwindcss": "^3.4.1",
    "typescript": "^5.3.3",
    "vite": "^5.1.0"
  }
}""",

    "frontend/vite.config.ts": """import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
""",

    "frontend/tsconfig.json": """{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}""",

    "frontend/tsconfig.node.json": """{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}""",

    "frontend/tailwind.config.js": """/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        linkedin: {
          50: '#f0f7ff',
          100: '#e0effe',
          500: '#0a66c2',
          600: '#004182',
          700: '#00325e',
        },
      },
    },
  },
  plugins: [],
};
""",

    "frontend/postcss.config.js": """export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
""",

    "frontend/index.html": """<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>LinkedIn Manager</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>""",

    "frontend/src/main.tsx": """import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
""",

    "frontend/src/index.css": """@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  @apply bg-gray-50 text-gray-900 antialiased;
}

::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  @apply bg-gray-100;
}

::-webkit-scrollbar-thumb {
  @apply bg-gray-300 rounded-full;
}

::-webkit-scrollbar-thumb:hover {
  @apply bg-gray-400;
}
""",

    "frontend/src/App.tsx": """import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Accounts from './pages/Accounts';
import Campaigns from './pages/Campaigns';
import Leads from './pages/Leads';
import AIContent from './pages/AIContent';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/accounts" element={<Accounts />} />
                  <Route path="/campaigns" element={<Campaigns />} />
                  <Route path="/leads" element={<Leads />} />
                  <Route path="/ai" element={<AIContent />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
""",

    "frontend/src/lib/api.ts": """import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = 'Bearer ' + token;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

export const authApi = {
  login: (email: string, password: string) => 
    api.post('/auth/login', { email, password }),
  register: (email: string, password: string, name?: string) => 
    api.post('/auth/register', { email, password, name }),
  me: () => api.get('/auth/me'),
};

export const accountsApi = {
  list: () => api.get('/accounts'),
  get: (id: string) => api.get('/accounts/' + id),
  create: (data: { email: string; profileUrl?: string; profileName?: string }) => 
    api.post('/accounts', data),
  update: (id: string, data: any) => api.put('/accounts/' + id, data),
  delete: (id: string) => api.delete('/accounts/' + id),
};

export const campaignsApi = {
  list: (params?: { status?: string; type?: string }) => 
    api.get('/campaigns', { params }),
  get: (id: string) => api.get('/campaigns/' + id),
  create: (data: { name: string; type: string; accountId: string; settings?: any }) => 
    api.post('/campaigns', data),
  update: (id: string, data: any) => api.put('/campaigns/' + id, data),
  toggle: (id: string) => api.patch('/campaigns/' + id + '/toggle'),
  delete: (id: string) => api.delete('/campaigns/' + id),
};

export const leadsApi = {
  list: (params?: { search?: string; status?: string; page?: number; limit?: number }) => 
    api.get('/leads', { params }),
  get: (id: string) => api.get('/leads/' + id),
  create: (data: any) => api.post('/leads', data),
  update: (id: string, data: any) => api.put('/leads/' + id, data),
  connect: (id: string, message?: string) => api.post('/leads/' + id + '/connect', { message }),
  message: (id: string, message: string) => api.post('/leads/' + id + '/message', { message }),
  delete: (id: string) => api.delete('/leads/' + id),
};

export const aiApi = {
  generate: (prompt: string, type: 'post' | 'comment' | 'message') => 
    api.post('/ai/generate', { prompt, type }),
  ideas: (topic: string, count?: number) => 
    api.post('/ai/ideas', { topic, count }),
};
""",

    "frontend/src/store/authStore.ts": """import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  name?: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
      updateUser: (updates) => set((state) => ({
        user: state.user ? { ...state.user, ...updates } : null,
      })),
    }),
    { 
      name: 'linkedin-manager-auth',
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
);
""",

    "frontend/src/components/Layout.tsx": """import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const navItems = [
  { path: '/', label: 'Dashboard', icon: '📊' },
  { path: '/accounts', label: 'Accounts', icon: '👤' },
  { path: '/campaigns', label: 'Campaigns', icon: '📢' },
  { path: '/leads', label: 'Leads', icon: '🎯' },
  { path: '/ai', label: 'AI Content', icon: '🤖' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <span className="text-xl font-bold text-linkedin-500">
                  LinkedIn Manager
                </span>
              </div>
              <div className="hidden sm:ml-8 sm:flex sm:space-x-4">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={'inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ' +
                      (location.pathname === item.path
                        ? 'text-linkedin-500 bg-linkedin-50'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50')
                    }
                  >
                    <span className="mr-2">{item.icon}</span>
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">{user?.email}</span>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-500 hover:text-gray-700 font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="sm:hidden bg-white border-b border-gray-200 px-4 py-2 flex space-x-2 overflow-x-auto">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={'flex-shrink-0 px-3 py-2 text-sm font-medium rounded-md ' +
              (location.pathname === item.path
                ? 'text-linkedin-500 bg-linkedin-50'
                : 'text-gray-600')
            }
          >
            {item.icon} {item.label}
          </Link>
        ))}
      </div>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
""",

    "frontend/src/components/Card.tsx": """interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={'bg-white rounded-lg shadow-sm border border-gray-200 ' + className}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }: CardProps) {
  return (
    <div className={'px-6 py-4 border-b border-gray-200 ' + className}>
      {children}
    </div>
  );
}

export function CardContent({ children, className = '' }: CardProps) {
  return (
    <div className={'px-6 py-4 ' + className}>
      {children}
    </div>
  );
}
""",

    "frontend/src/components/Button.tsx": """interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants: Record<string, string> = {
    primary: 'bg-linkedin-500 text-white hover:bg-linkedin-600 focus:ring-linkedin-500',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500',
    danger: 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500',
    ghost: 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:ring-gray-500',
  };
  
  const sizes: Record<string, string> = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      className={baseStyles + ' ' + variants[variant] + ' ' + sizes[size] + ' ' + className}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
}
""",

    "frontend/src/components/Input.tsx": """import { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && (
          <label className="block text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={'block w-full px-3 py-2 border rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-linkedin-500 focus:border-linkedin-500 sm:text-sm ' +
            (error ? 'border-red-300' : 'border-gray-300') + ' ' + className}
          {...props}
        />
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
""",

    "frontend/src/pages/Login.tsx": """import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../lib/api';
import { useAuthStore } from '../store/authStore';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = isRegister 
        ? await authApi.register(email, password, name)
        : await authApi.login(email, password);
      
      setAuth(data.token, data.user);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-linkedin-50 to-blue-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">LinkedIn Manager</h1>
            <p className="mt-2 text-gray-600">
              {isRegister ? 'Create your account' : 'Sign in to your account'}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-linkedin-500 focus:border-transparent"
                />
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-linkedin-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                required
                minLength={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-linkedin-500 focus:border-transparent"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-linkedin-500 text-white font-medium rounded-lg hover:bg-linkedin-600 focus:outline-none focus:ring-2 focus:ring-linkedin-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Please wait...' : isRegister ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsRegister(!isRegister);
                setError('');
              }}
              className="text-linkedin-500 hover:text-linkedin-600 font-medium"
            >
              {isRegister 
                ? 'Already have an account? Sign in' 
                : 'Need an account? Register'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
""",

    "frontend/src/pages/Dashboard.tsx": """import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { accountsApi, campaignsApi, leadsApi } from '../lib/api';
import { Card, CardContent } from '../components/Card';

interface Stats {
  accounts: number;
  campaigns: number;
  activeCampaigns: number;
  leads: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    accounts: 0,
    campaigns: 0,
    activeCampaigns: 0,
    leads: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [accountsRes, campaignsRes, leadsRes] = await Promise.all([
          accountsApi.list(),
          campaignsApi.list(),
          leadsApi.list({ limit: 1 }),
        ]);

        setStats({
          accounts: accountsRes.data.length,
          campaigns: campaignsRes.data.length,
          activeCampaigns: campaignsRes.data.filter((c: any) => c.status === 'active').length,
          leads: leadsRes.data.total || 0,
        });
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    { title: 'LinkedIn Accounts', value: stats.accounts, icon: '👤', color: 'bg-blue-500', link: '/accounts' },
    { title: 'Total Campaigns', value: stats.campaigns, icon: '📢', color: 'bg-purple-500', link: '/campaigns' },
    { title: 'Active Campaigns', value: stats.activeCampaigns, icon: '🚀', color: 'bg-green-500', link: '/campaigns' },
    { title: 'Total Leads', value: stats.leads, icon: '🎯', color: 'bg-orange-500', link: '/leads' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-linkedin-500"></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card) => (
          <Link key={card.title} to={card.link}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent>
                <div className="flex items-center">
                  <div className={card.color + ' w-12 h-12 rounded-lg flex items-center justify-center text-2xl'}>
                    {card.icon}
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">{card.title}</p>
                    <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardContent>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link to="/accounts" className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <span className="text-2xl">➕</span>
              <p className="mt-2 font-medium text-gray-900">Add Account</p>
              <p className="text-sm text-gray-500">Connect a LinkedIn account</p>
            </Link>
            <Link to="/campaigns" className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <span className="text-2xl">📢</span>
              <p className="mt-2 font-medium text-gray-900">Create Campaign</p>
              <p className="text-sm text-gray-500">Start a new outreach campaign</p>
            </Link>
            <Link to="/ai" className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <span className="text-2xl">🤖</span>
              <p className="mt-2 font-medium text-gray-900">Generate Content</p>
              <p className="text-sm text-gray-500">Create posts with AI</p>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
""",

    "frontend/src/pages/Accounts.tsx": """import { useEffect, useState } from 'react';
import { accountsApi } from '../lib/api';
import { Card, CardHeader, CardContent } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';

interface Account {
  id: string;
  email: string;
  profileUrl?: string;
  profileName?: string;
  status: string;
  createdAt: string;
}

export default function Accounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ email: '', profileUrl: '', profileName: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const { data } = await accountsApi.list();
      setAccounts(data);
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await accountsApi.create(formData);
      setAccounts([data, ...accounts]);
      setFormData({ email: '', profileUrl: '', profileName: '' });
      setShowForm(false);
    } catch (error) {
      console.error('Failed to create account:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this account?')) return;
    try {
      await accountsApi.delete(id);
      setAccounts(accounts.filter((a) => a.id !== id));
    } catch (error) {
      console.error('Failed to delete account:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-linkedin-500"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">LinkedIn Accounts</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Add Account'}
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-lg font-semibold">Add New Account</h2>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="LinkedIn Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
              <Input
                label="Profile URL (optional)"
                type="url"
                value={formData.profileUrl}
                onChange={(e) => setFormData({ ...formData, profileUrl: e.target.value })}
                placeholder="https://linkedin.com/in/username"
              />
              <Input
                label="Profile Name (optional)"
                value={formData.profileName}
                onChange={(e) => setFormData({ ...formData, profileName: e.target.value })}
              />
              <Button type="submit" loading={saving}>
                Add Account
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {accounts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    No accounts yet. Add your first LinkedIn account to get started.
                  </td>
                </tr>
              ) : (
                accounts.map((account) => (
                  <tr key={account.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{account.profileName || account.email}</div>
                        <div className="text-sm text-gray-500">{account.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={'inline-flex px-2 py-1 text-xs font-semibold rounded-full ' +
                        (account.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800')
                      }>
                        {account.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(account.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="danger" size="sm" onClick={() => handleDelete(account.id)}>
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
""",

    "frontend/src/pages/Campaigns.tsx": """import { useEffect, useState } from 'react';
import { campaignsApi, accountsApi } from '../lib/api';
import { Card, CardHeader, CardContent } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';

interface Campaign {
  id: string;
  name: string;
  type: string;
  status: string;
  account: { email: string; profileName?: string };
  _count: { leads: number };
  createdAt: string;
}

interface Account {
  id: string;
  email: string;
  profileName?: string;
}

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', type: 'connection', accountId: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([campaignsApi.list(), accountsApi.list()])
      .then(([campaignsRes, accountsRes]) => {
        setCampaigns(campaignsRes.data);
        setAccounts(accountsRes.data);
        if (accountsRes.data.length > 0) {
          setFormData((f) => ({ ...f, accountId: accountsRes.data[0].id }));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await campaignsApi.create(formData);
      setCampaigns([data, ...campaigns]);
      setFormData({ name: '', type: 'connection', accountId: accounts[0]?.id || '' });
      setShowForm(false);
    } catch (error) {
      console.error('Failed to create campaign:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      const { data } = await campaignsApi.toggle(id);
      setCampaigns(campaigns.map((c) => c.id === id ? { ...c, status: data.status } : c));
    } catch (error) {
      console.error('Failed to toggle campaign:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;
    try {
      await campaignsApi.delete(id);
      setCampaigns(campaigns.filter((c) => c.id !== id));
    } catch (error) {
      console.error('Failed to delete campaign:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-linkedin-500"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
        <Button onClick={() => setShowForm(!showForm)} disabled={accounts.length === 0}>
          {showForm ? 'Cancel' : '+ New Campaign'}
        </Button>
      </div>

      {accounts.length === 0 && (
        <Card className="mb-6">
          <CardContent>
            <p className="text-gray-500 text-center py-4">
              Please add a LinkedIn account first before creating campaigns.
            </p>
          </CardContent>
        </Card>
      )}

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-lg font-semibold">Create New Campaign</h2>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Campaign Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-linkedin-500"
                >
                  <option value="connection">Connection Requests</option>
                  <option value="message">Direct Messages</option>
                  <option value="engagement">Post Engagement</option>
                  <option value="content">Content Publishing</option>
                </select>
              </div>
              <div>
<label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn Account</label>
                <select
                  value={formData.accountId}
                  onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-linkedin-500"
                >
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.profileName || account.email}
                    </option>
                  ))}
                </select>
              </div>
              <Button type="submit" loading={saving}>Create Campaign</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Account</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Leads</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {campaigns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No campaigns yet. Create your first campaign to get started.
                  </td>
                </tr>
              ) : (
                campaigns.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{campaign.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 capitalize">{campaign.type}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {campaign.account?.profileName || campaign.account?.email}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{campaign._count?.leads || 0}</td>
                    <td className="px-6 py-4">
                      <span className={'inline-flex px-2 py-1 text-xs font-semibold rounded-full ' +
                        (campaign.status === 'active' ? 'bg-green-100 text-green-800' :
                         campaign.status === 'paused' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800')
                      }>
                        {campaign.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => handleToggle(campaign.id)}>
                        {campaign.status === 'active' ? 'Pause' : 'Start'}
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => handleDelete(campaign.id)}>
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
""",

    "frontend/src/pages/Leads.tsx": """import { useEffect, useState } from 'react';
import { leadsApi } from '../lib/api';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';

interface Lead {
  id: string;
  name: string;
  headline?: string;
  company?: string;
  location?: string;
  linkedinUrl: string;
  status: string;
  campaign?: { name: string };
  createdAt: string;
}

export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const limit = 20;

  useEffect(() => {
    fetchLeads();
  }, [search, page]);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const { data } = await leadsApi.list({ search, page, limit });
      setLeads(data.leads);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error('Failed to fetch leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (id: string) => {
    try {
      const { data } = await leadsApi.connect(id);
      setLeads(leads.map((l) => (l.id === id ? { ...l, status: data.status } : l)));
    } catch (error) {
      console.error('Failed to send connection:', error);
    }
  };

  const statusColors: Record<string, string> = {
    new: 'bg-blue-100 text-blue-800',
    contacted: 'bg-yellow-100 text-yellow-800',
    connected: 'bg-green-100 text-green-800',
    messaged: 'bg-purple-100 text-purple-800',
    replied: 'bg-teal-100 text-teal-800',
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
        <span className="text-sm text-gray-500">{total} total leads</span>
      </div>

      <div className="mb-6">
        <Input
          placeholder="Search by name, company, or headline..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lead</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Campaign</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-linkedin-500 mx-auto"></div>
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    {search ? 'No leads found matching your search.' : 'No leads yet.'}
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <a href={lead.linkedinUrl} target="_blank" rel="noopener noreferrer"
                          className="font-medium text-linkedin-500 hover:underline">{lead.name}</a>
                        {lead.headline && (
                          <div className="text-sm text-gray-500 truncate max-w-xs">{lead.headline}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{lead.company || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{lead.campaign?.name || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={'inline-flex px-2 py-1 text-xs font-semibold rounded-full ' +
                        (statusColors[lead.status] || 'bg-gray-100 text-gray-800')}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {lead.status === 'new' && (
                        <Button size="sm" onClick={() => handleConnect(lead.id)}>Connect</Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
              Previous
            </Button>
            <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
            <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              Next
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
""",

    "frontend/src/pages/AIContent.tsx": """import { useState } from 'react';
import { aiApi } from '../lib/api';
import { Card, CardHeader, CardContent } from '../components/Card';
import { Button } from '../components/Button';

export default function AIContent() {
  const [activeTab, setActiveTab] = useState<'generate' | 'ideas'>('generate');
  const [prompt, setPrompt] = useState('');
  const [contentType, setContentType] = useState<'post' | 'comment' | 'message'>('post');
  const [generatedContent, setGeneratedContent] = useState('');
  const [generating, setGenerating] = useState(false);
  const [topic, setTopic] = useState('');
  const [ideas, setIdeas] = useState<string[]>([]);
  const [generatingIdeas, setGeneratingIdeas] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    try {
      const { data } = await aiApi.generate(prompt, contentType);
      setGeneratedContent(data.content);
    } catch (error) {
      console.error('Failed to generate content:', error);
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateIdeas = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneratingIdeas(true);
    try {
      const { data } = await aiApi.ideas(topic, 5);
      setIdeas(data.ideas);
    } catch (error) {
      console.error('Failed to generate ideas:', error);
    } finally {
      setGeneratingIdeas(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">AI Content Generator</h1>

      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setActiveTab('generate')}
          className={'px-4 py-2 rounded-lg font-medium transition-colors ' +
            (activeTab === 'generate' ? 'bg-linkedin-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200')
          }
        >
          Generate Content
        </button>
        <button
          onClick={() => setActiveTab('ideas')}
          className={'px-4 py-2 rounded-lg font-medium transition-colors ' +
            (activeTab === 'ideas' ? 'bg-linkedin-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200')
          }
        >
          Post Ideas
        </button>
      </div>

      {activeTab === 'generate' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Create Content</h2>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleGenerate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Content Type</label>
                  <select
                    value={contentType}
                    onChange={(e) => setContentType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-linkedin-500"
                  >
                    <option value="post">LinkedIn Post</option>
                    <option value="comment">Comment Reply</option>
                    <option value="message">Direct Message</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prompt / Topic</label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={4}
                    placeholder="Describe what you want to write about..."
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-linkedin-500"
                  />
                </div>
                <Button type="submit" loading={generating} className="w-full">Generate Content</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Generated Content</h2>
                {generatedContent && (
                  <Button variant="secondary" size="sm" onClick={() => copyToClipboard(generatedContent)}>Copy</Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {generatedContent ? (
                <div className="whitespace-pre-wrap text-gray-700 bg-gray-50 p-4 rounded-lg min-h-[200px]">
                  {generatedContent}
                </div>
              ) : (
                <div className="text-gray-400 text-center py-12">Generated content will appear here</div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Generate Post Ideas</h2>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleGenerateIdeas} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Topic or Industry</label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g., SaaS, Marketing, Leadership..."
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-linkedin-500"
                  />
                </div>
                <Button type="submit" loading={generatingIdeas} className="w-full">Generate 5 Ideas</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Post Ideas</h2>
            </CardHeader>
            <CardContent>
              {ideas.length > 0 ? (
                <ul className="space-y-3">
                  {ideas.map((idea, index) => (
                    <li key={index} className="p-3 bg-gray-50 rounded-lg flex justify-between items-start group">
                      <span className="text-gray-700">{idea}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setPrompt(idea); setActiveTab('generate'); }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Use
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-gray-400 text-center py-12">Post ideas will appear here</div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
""",

    "frontend/Dockerfile": """FROM node:20-alpine as builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
""",

    "frontend/nginx.conf": """server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://backend:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
""",

    # ============================================================
    # ROOT FILES
    # ============================================================

    "docker-compose.yml": """version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: linkedin-manager-db
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: linkedin_manager
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  backend:
    build: ./backend
    container_name: linkedin-manager-backend
    ports:
      - "3001:3001"
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/linkedin_manager
      JWT_SECRET: your-super-secret-jwt-key-change-in-production
      PORT: "3001"
      FRONTEND_URL: http://localhost:5173
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

  frontend:
    build: ./frontend
    container_name: linkedin-manager-frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  postgres_data:
""",

    "README.md": """# LinkedIn Manager

A full-stack LinkedIn automation and management tool.

## Features

- Multi-Account Management
- Campaign Automation
- Lead Database
- AI Content Generation
- Analytics Dashboard

## Tech Stack

**Backend:** Node.js, Express, TypeScript, Prisma, PostgreSQL
**Frontend:** React, Vite, TypeScript, Tailwind CSS, Zustand

## Quick Start

### Docker (Recommended)

```bash
docker-compose up -d
Manual Setup
Backend:
cd backend
cp .env.example .env
npm install
npx prisma db push
npm run dev
Frontend:
cd frontend
npm install
npm run dev
Access
Frontend: http://localhost:5173
Backend: http://localhost:3001
Health: http://localhost:3001/health
Environment Variables
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/linkedin_manager
JWT_SECRET=your-secret-key
PORT=3001
FRONTEND_URL=http://localhost:5173
OPENAI_API_KEY=
GEMINI_API_KEY=
DEEPSEEK_API_KEY=
License
MIT
""",
".gitignore": """node_modules/
dist/
build/
.env
.env.local
.env.*.local
.log
npm-debug.log
.DS_Store
Thumbs.db
.idea/
.vscode/
*.swp
*.swo
coverage/
*.tgz
.cache/
""",
".env.example": """DATABASE_URL="postgresql://postgres:postgres@localhost:5432/linkedin_manager"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
PORT=3001
FRONTEND_URL="http://localhost:5173"
OPENAI_API_KEY=""
GEMINI_API_KEY=""
DEEPSEEK_API_KEY=""
""",
}

def create_project(base_path: str = "linkedin-manager") -> bool:
    """Create the entire LinkedIn Manager project structure."""
    if not base_path or not base_path.strip():
        print("Error: Invalid directory name")
        return False
    
    base_path = os.path.normpath(base_path)
    
    if os.path.exists(base_path):
        response = input("Directory '" + base_path + "' already exists. Overwrite? (y/N): ")
        if response.lower() != 'y':
            print("Operation cancelled.")
            return False
    
    print("\nCreating LinkedIn Manager project in: " + base_path + "\n")
    print("=" * 50)
    
    created_dirs = set()
    file_count = 0
    
    try:
        for file_path, content in PROJECT_FILES.items():
            full_path = os.path.join(base_path, file_path)
            
            dir_path = os.path.dirname(full_path)
            if dir_path and dir_path not in created_dirs:
                os.makedirs(dir_path, exist_ok=True)
                created_dirs.add(dir_path)
            
            with open(full_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            file_count += 1
            print("  + " + file_path)
        
        print("=" * 50)
        print("\nProject created successfully!")
        print("  Directories: " + str(len(created_dirs)))
        print("  Files: " + str(file_count))
        
        print("\nNext Steps:")
        print("  1. cd " + base_path)
        print("  2. docker-compose up -d")
        print("     OR")
        print("  2. cd backend && npm install && npx prisma db push && npm run dev")
        print("  3. cd frontend && npm install && npm run dev")
        print("\nAccess the app at: http://localhost:5173")
        
        return True
        
    except PermissionError as e:
        print("\nPermission denied: " + str(e))
        return False
    except OSError as e:
        print("\nError creating project: " + str(e))
        return False
    except Exception as e:
        print("\nUnexpected error: " + str(e))
        return False


def main():
    """Main entry point."""
    print("\n" + "=" * 50)
    print("  LinkedIn Manager - Project Generator")
    print("=" * 50)
    
    if len(sys.argv) > 1:
        target_dir = sys.argv[1]
    else:
        target_dir = "linkedin-manager"
    
    success = create_project(target_dir)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
=======
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
LinkedIn Manager Project Generator
Creates the complete project structure from embedded templates.

Usage:
    python create_project.py [target_directory]
    
Example:
    python create_project.py linkedin-manager
"""

import os
import sys


PROJECT_FILES = {
    # ============================================================
    # BACKEND FILES
    # ============================================================
    
    "backend/package.json": """{
  "name": "linkedin-manager-backend",
  "version": "1.0.0",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "db:push": "prisma db push",
    "db:generate": "prisma generate"
  },
  "dependencies": {
    "@prisma/client": "^5.10.0",
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "express": "^4.18.2",
    "jsonwebtoken": "^9.0.2",
    "winston": "^3.11.0",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/jsonwebtoken": "^9.0.5",
    "@types/node": "^20.11.0",
    "prisma": "^5.10.0",
    "tsx": "^4.7.0",
    "typescript": "^5.3.3"
  }
}""",

    "backend/tsconfig.json": """{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}""",

    "backend/.env.example": """DATABASE_URL="postgresql://postgres:postgres@localhost:5432/linkedin_manager"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
PORT=3001
FRONTEND_URL="http://localhost:5173"
OPENAI_API_KEY=""
GEMINI_API_KEY=""
DEEPSEEK_API_KEY=""
""",

    "backend/prisma/schema.prisma": """generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  accounts  LinkedInAccount[]
  campaigns Campaign[]
  leads     Lead[]
}

model LinkedInAccount {
  id           String   @id @default(cuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  email        String
  profileUrl   String?
  profileName  String?
  status       String   @default("active")
  dailyLimits  Json     @default("{}")
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  campaigns Campaign[]
  leads     Lead[]
}

model Campaign {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  accountId   String
  account     LinkedInAccount @relation(fields: [accountId], references: [id], onDelete: Cascade)
  name        String
  type        String
  status      String   @default("draft")
  settings    Json     @default("{}")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  leads Lead[]
}

model Lead {
  id           String   @id @default(cuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  accountId    String
  account      LinkedInAccount @relation(fields: [accountId], references: [id], onDelete: Cascade)
  campaignId   String?
  campaign     Campaign? @relation(fields: [campaignId], references: [id], onDelete: SetNull)
  linkedinUrl  String
  name         String
  headline     String?
  company      String?
  location     String?
  status       String   @default("new")
  notes        String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
""",

    "backend/src/config/index.ts": """import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string(),
  PORT: z.string().default('3001'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  OPENAI_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  DEEPSEEK_API_KEY: z.string().optional(),
});

export const config = envSchema.parse(process.env);
""",

    "backend/src/utils/logger.ts": """import winston from 'winston';

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});
""",

    "backend/src/services/prisma.ts": """import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
""",

    "backend/src/services/linkedin.ts": """import { logger } from '../utils/logger';

export class LinkedInService {
  async sendConnectionRequest(profileUrl: string, message?: string) {
    logger.info('Sending connection request to ' + profileUrl);
    return { success: true, profileUrl };
  }

  async sendMessage(profileUrl: string, message: string) {
    logger.info('Sending message to ' + profileUrl);
    return { success: true, profileUrl };
  }

  async searchProfiles(query: string, limit: number = 25) {
    logger.info('Searching profiles: ' + query);
    return [];
  }

  async likePost(postUrl: string) {
    logger.info('Liking post: ' + postUrl);
    return { success: true, postUrl };
  }

  async commentOnPost(postUrl: string, comment: string) {
    logger.info('Commenting on post: ' + postUrl);
    return { success: true, postUrl, comment };
  }
}

export const linkedinService = new LinkedInService();
""",

    "backend/src/services/ai.ts": """import { config } from '../config';
import { logger } from '../utils/logger';

export class AIService {
  private provider: 'openai' | 'gemini' | 'deepseek';

  constructor() {
    if (config.OPENAI_API_KEY) {
      this.provider = 'openai';
    } else if (config.GEMINI_API_KEY) {
      this.provider = 'gemini';
    } else if (config.DEEPSEEK_API_KEY) {
      this.provider = 'deepseek';
    } else {
      this.provider = 'openai';
    }
    logger.info('AI Service initialized with provider: ' + this.provider);
  }

  async generateContent(prompt: string, type: 'post' | 'comment' | 'message'): Promise<string> {
    logger.info('Generating ' + type + ' content with ' + this.provider);
    
    const templates: Record<string, string> = {
      post: 'Here is an engaging LinkedIn post about: ' + prompt,
      comment: 'Great insight! ' + prompt,
      message: 'Hi! I noticed ' + prompt + '. Would love to connect!',
    };

    return templates[type];
  }

  async generatePostIdeas(topic: string, count: number = 5): Promise<string[]> {
    logger.info('Generating ' + count + ' post ideas about: ' + topic);
    return Array(count).fill(null).map((_, i) => 'Post idea ' + (i + 1) + ' about ' + topic);
  }
}

export const aiService = new AIService();
""",

    "backend/src/middleware/auth.ts": """import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface AuthRequest extends Request {
  userId?: string;
}

export const auth = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as { userId: string };
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
""",

    "backend/src/middleware/errorHandler.ts": """import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error(err.message, { stack: err.stack, path: req.path });
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }
  
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  res.status(500).json({ error: 'Internal server error' });
};
""",

    "backend/src/middleware/rateLimit.ts": """import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

const requestCounts = new Map<string, { count: number; resetTime: number }>();

export const rateLimit = (maxRequests: number = 100, windowMs: number = 60000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    
    const record = requestCounts.get(key);
    
    if (!record || now > record.resetTime) {
      requestCounts.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    if (record.count >= maxRequests) {
      logger.warn('Rate limit exceeded for ' + key);
      return res.status(429).json({ error: 'Too many requests' });
    }
    
    record.count++;
    next();
  };
};
""",

    "backend/src/routes/auth.ts": """import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../services/prisma';
import { config } from '../config';
import { auth, AuthRequest } from '../middleware/auth';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = registerSchema.parse(req.body);
    
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 12);
    
    const user = await prisma.user.create({
      data: { email, password: hashedPassword, name },
    });

    const token = jwt.sign({ userId: user.id }, config.JWT_SECRET, { expiresIn: '7d' });
    
    res.status(201).json({ 
      token, 
      user: { id: user.id, email: user.email, name: user.name } 
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id }, config.JWT_SECRET, { expiresIn: '7d' });
    
    res.json({ 
      token, 
      user: { id: user.id, email: user.email, name: user.name } 
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/me', auth, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, email: true, name: true, createdAt: true },
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

router.put('/me', auth, async (req: AuthRequest, res) => {
  try {
    const { name } = req.body;
    
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { name },
      select: { id: true, email: true, name: true },
    });
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

export default router;
""",

    "backend/src/routes/accounts.ts": """import { Router } from 'express';
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
""",

    "backend/src/routes/campaigns.ts": """import { Router } from 'express';
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
""",

    "backend/src/routes/leads.ts": """import { Router } from 'express';
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
""",

    "backend/src/routes/ai.ts": """import { Router } from 'express';
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
""",

    "backend/src/index.ts": """import express from 'express';
import cors from 'cors';
import { config } from './config';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { rateLimit } from './middleware/rateLimit';
import authRoutes from './routes/auth';
import accountRoutes from './routes/accounts';
import campaignRoutes from './routes/campaigns';
import leadRoutes from './routes/leads';
import aiRoutes from './routes/ai';

const app = express();

app.use(cors({ 
  origin: config.FRONTEND_URL, 
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(rateLimit(100, 60000));

app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/ai', aiRoutes);

app.get('/health', (_, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

app.use(errorHandler);

const PORT = parseInt(config.PORT, 10);
app.listen(PORT, '0.0.0.0', () => {
  logger.info('Server running on port ' + PORT);
  logger.info('Health check: http://localhost:' + PORT + '/health');
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});
""",

    "backend/Dockerfile": """FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY prisma ./prisma
RUN npx prisma generate

COPY dist ./dist

EXPOSE 3001

CMD ["node", "dist/index.js"]
""",

    # ============================================================
    # FRONTEND FILES
    # ============================================================

    "frontend/package.json": """{
  "name": "linkedin-manager-frontend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "axios": "^1.6.7",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.22.0",
    "zustand": "^4.5.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.55",
    "@types/react-dom": "^18.2.19",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.17",
    "postcss": "^8.4.35",
    "tailwindcss": "^3.4.1",
    "typescript": "^5.3.3",
    "vite": "^5.1.0"
  }
}""",

    "frontend/vite.config.ts": """import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
""",

    "frontend/tsconfig.json": """{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}""",

    "frontend/tsconfig.node.json": """{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}""",

    "frontend/tailwind.config.js": """/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        linkedin: {
          50: '#f0f7ff',
          100: '#e0effe',
          500: '#0a66c2',
          600: '#004182',
          700: '#00325e',
        },
      },
    },
  },
  plugins: [],
};
""",

    "frontend/postcss.config.js": """export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
""",

    "frontend/index.html": """<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>LinkedIn Manager</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>""",

    "frontend/src/main.tsx": """import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
""",

    "frontend/src/index.css": """@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  @apply bg-gray-50 text-gray-900 antialiased;
}

::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  @apply bg-gray-100;
}

::-webkit-scrollbar-thumb {
  @apply bg-gray-300 rounded-full;
}

::-webkit-scrollbar-thumb:hover {
  @apply bg-gray-400;
}
""",

    "frontend/src/App.tsx": """import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Accounts from './pages/Accounts';
import Campaigns from './pages/Campaigns';
import Leads from './pages/Leads';
import AIContent from './pages/AIContent';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/accounts" element={<Accounts />} />
                  <Route path="/campaigns" element={<Campaigns />} />
                  <Route path="/leads" element={<Leads />} />
                  <Route path="/ai" element={<AIContent />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
""",

    "frontend/src/lib/api.ts": """import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = 'Bearer ' + token;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

export const authApi = {
  login: (email: string, password: string) => 
    api.post('/auth/login', { email, password }),
  register: (email: string, password: string, name?: string) => 
    api.post('/auth/register', { email, password, name }),
  me: () => api.get('/auth/me'),
};

export const accountsApi = {
  list: () => api.get('/accounts'),
  get: (id: string) => api.get('/accounts/' + id),
  create: (data: { email: string; profileUrl?: string; profileName?: string }) => 
    api.post('/accounts', data),
  update: (id: string, data: any) => api.put('/accounts/' + id, data),
  delete: (id: string) => api.delete('/accounts/' + id),
};

export const campaignsApi = {
  list: (params?: { status?: string; type?: string }) => 
    api.get('/campaigns', { params }),
  get: (id: string) => api.get('/campaigns/' + id),
  create: (data: { name: string; type: string; accountId: string; settings?: any }) => 
    api.post('/campaigns', data),
  update: (id: string, data: any) => api.put('/campaigns/' + id, data),
  toggle: (id: string) => api.patch('/campaigns/' + id + '/toggle'),
  delete: (id: string) => api.delete('/campaigns/' + id),
};

export const leadsApi = {
  list: (params?: { search?: string; status?: string; page?: number; limit?: number }) => 
    api.get('/leads', { params }),
  get: (id: string) => api.get('/leads/' + id),
  create: (data: any) => api.post('/leads', data),
  update: (id: string, data: any) => api.put('/leads/' + id, data),
  connect: (id: string, message?: string) => api.post('/leads/' + id + '/connect', { message }),
  message: (id: string, message: string) => api.post('/leads/' + id + '/message', { message }),
  delete: (id: string) => api.delete('/leads/' + id),
};

export const aiApi = {
  generate: (prompt: string, type: 'post' | 'comment' | 'message') => 
    api.post('/ai/generate', { prompt, type }),
  ideas: (topic: string, count?: number) => 
    api.post('/ai/ideas', { topic, count }),
};
""",

    "frontend/src/store/authStore.ts": """import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  name?: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
      updateUser: (updates) => set((state) => ({
        user: state.user ? { ...state.user, ...updates } : null,
      })),
    }),
    { 
      name: 'linkedin-manager-auth',
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
);
""",

    "frontend/src/components/Layout.tsx": """import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const navItems = [
  { path: '/', label: 'Dashboard', icon: '📊' },
  { path: '/accounts', label: 'Accounts', icon: '👤' },
  { path: '/campaigns', label: 'Campaigns', icon: '📢' },
  { path: '/leads', label: 'Leads', icon: '🎯' },
  { path: '/ai', label: 'AI Content', icon: '🤖' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <span className="text-xl font-bold text-linkedin-500">
                  LinkedIn Manager
                </span>
              </div>
              <div className="hidden sm:ml-8 sm:flex sm:space-x-4">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={'inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ' +
                      (location.pathname === item.path
                        ? 'text-linkedin-500 bg-linkedin-50'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50')
                    }
                  >
                    <span className="mr-2">{item.icon}</span>
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">{user?.email}</span>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-500 hover:text-gray-700 font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="sm:hidden bg-white border-b border-gray-200 px-4 py-2 flex space-x-2 overflow-x-auto">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={'flex-shrink-0 px-3 py-2 text-sm font-medium rounded-md ' +
              (location.pathname === item.path
                ? 'text-linkedin-500 bg-linkedin-50'
                : 'text-gray-600')
            }
          >
            {item.icon} {item.label}
          </Link>
        ))}
      </div>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
""",

    "frontend/src/components/Card.tsx": """interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={'bg-white rounded-lg shadow-sm border border-gray-200 ' + className}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }: CardProps) {
  return (
    <div className={'px-6 py-4 border-b border-gray-200 ' + className}>
      {children}
    </div>
  );
}

export function CardContent({ children, className = '' }: CardProps) {
  return (
    <div className={'px-6 py-4 ' + className}>
      {children}
    </div>
  );
}
""",

    "frontend/src/components/Button.tsx": """interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants: Record<string, string> = {
    primary: 'bg-linkedin-500 text-white hover:bg-linkedin-600 focus:ring-linkedin-500',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500',
    danger: 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500',
    ghost: 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:ring-gray-500',
  };
  
  const sizes: Record<string, string> = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      className={baseStyles + ' ' + variants[variant] + ' ' + sizes[size] + ' ' + className}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
}
""",

    "frontend/src/components/Input.tsx": """import { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && (
          <label className="block text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={'block w-full px-3 py-2 border rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-linkedin-500 focus:border-linkedin-500 sm:text-sm ' +
            (error ? 'border-red-300' : 'border-gray-300') + ' ' + className}
          {...props}
        />
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
""",

    "frontend/src/pages/Login.tsx": """import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../lib/api';
import { useAuthStore } from '../store/authStore';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = isRegister 
        ? await authApi.register(email, password, name)
        : await authApi.login(email, password);
      
      setAuth(data.token, data.user);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-linkedin-50 to-blue-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">LinkedIn Manager</h1>
            <p className="mt-2 text-gray-600">
              {isRegister ? 'Create your account' : 'Sign in to your account'}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-linkedin-500 focus:border-transparent"
                />
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-linkedin-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                required
                minLength={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-linkedin-500 focus:border-transparent"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-linkedin-500 text-white font-medium rounded-lg hover:bg-linkedin-600 focus:outline-none focus:ring-2 focus:ring-linkedin-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Please wait...' : isRegister ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsRegister(!isRegister);
                setError('');
              }}
              className="text-linkedin-500 hover:text-linkedin-600 font-medium"
            >
              {isRegister 
                ? 'Already have an account? Sign in' 
                : 'Need an account? Register'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
""",

    "frontend/src/pages/Dashboard.tsx": """import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { accountsApi, campaignsApi, leadsApi } from '../lib/api';
import { Card, CardContent } from '../components/Card';

interface Stats {
  accounts: number;
  campaigns: number;
  activeCampaigns: number;
  leads: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    accounts: 0,
    campaigns: 0,
    activeCampaigns: 0,
    leads: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [accountsRes, campaignsRes, leadsRes] = await Promise.all([
          accountsApi.list(),
          campaignsApi.list(),
          leadsApi.list({ limit: 1 }),
        ]);

        setStats({
          accounts: accountsRes.data.length,
          campaigns: campaignsRes.data.length,
          activeCampaigns: campaignsRes.data.filter((c: any) => c.status === 'active').length,
          leads: leadsRes.data.total || 0,
        });
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    { title: 'LinkedIn Accounts', value: stats.accounts, icon: '👤', color: 'bg-blue-500', link: '/accounts' },
    { title: 'Total Campaigns', value: stats.campaigns, icon: '📢', color: 'bg-purple-500', link: '/campaigns' },
    { title: 'Active Campaigns', value: stats.activeCampaigns, icon: '🚀', color: 'bg-green-500', link: '/campaigns' },
    { title: 'Total Leads', value: stats.leads, icon: '🎯', color: 'bg-orange-500', link: '/leads' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-linkedin-500"></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card) => (
          <Link key={card.title} to={card.link}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent>
                <div className="flex items-center">
                  <div className={card.color + ' w-12 h-12 rounded-lg flex items-center justify-center text-2xl'}>
                    {card.icon}
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">{card.title}</p>
                    <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardContent>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link to="/accounts" className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <span className="text-2xl">➕</span>
              <p className="mt-2 font-medium text-gray-900">Add Account</p>
              <p className="text-sm text-gray-500">Connect a LinkedIn account</p>
            </Link>
            <Link to="/campaigns" className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <span className="text-2xl">📢</span>
              <p className="mt-2 font-medium text-gray-900">Create Campaign</p>
              <p className="text-sm text-gray-500">Start a new outreach campaign</p>
            </Link>
            <Link to="/ai" className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <span className="text-2xl">🤖</span>
              <p className="mt-2 font-medium text-gray-900">Generate Content</p>
              <p className="text-sm text-gray-500">Create posts with AI</p>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
""",

    "frontend/src/pages/Accounts.tsx": """import { useEffect, useState } from 'react';
import { accountsApi } from '../lib/api';
import { Card, CardHeader, CardContent } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';

interface Account {
  id: string;
  email: string;
  profileUrl?: string;
  profileName?: string;
  status: string;
  createdAt: string;
}

export default function Accounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ email: '', profileUrl: '', profileName: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const { data } = await accountsApi.list();
      setAccounts(data);
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await accountsApi.create(formData);
      setAccounts([data, ...accounts]);
      setFormData({ email: '', profileUrl: '', profileName: '' });
      setShowForm(false);
    } catch (error) {
      console.error('Failed to create account:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this account?')) return;
    try {
      await accountsApi.delete(id);
      setAccounts(accounts.filter((a) => a.id !== id));
    } catch (error) {
      console.error('Failed to delete account:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-linkedin-500"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">LinkedIn Accounts</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Add Account'}
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-lg font-semibold">Add New Account</h2>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="LinkedIn Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
              <Input
                label="Profile URL (optional)"
                type="url"
                value={formData.profileUrl}
                onChange={(e) => setFormData({ ...formData, profileUrl: e.target.value })}
                placeholder="https://linkedin.com/in/username"
              />
              <Input
                label="Profile Name (optional)"
                value={formData.profileName}
                onChange={(e) => setFormData({ ...formData, profileName: e.target.value })}
              />
              <Button type="submit" loading={saving}>
                Add Account
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {accounts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    No accounts yet. Add your first LinkedIn account to get started.
                  </td>
                </tr>
              ) : (
                accounts.map((account) => (
                  <tr key={account.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{account.profileName || account.email}</div>
                        <div className="text-sm text-gray-500">{account.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={'inline-flex px-2 py-1 text-xs font-semibold rounded-full ' +
                        (account.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800')
                      }>
                        {account.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(account.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="danger" size="sm" onClick={() => handleDelete(account.id)}>
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
""",

    "frontend/src/pages/Campaigns.tsx": """import { useEffect, useState } from 'react';
import { campaignsApi, accountsApi } from '../lib/api';
import { Card, CardHeader, CardContent } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';

interface Campaign {
  id: string;
  name: string;
  type: string;
  status: string;
  account: { email: string; profileName?: string };
  _count: { leads: number };
  createdAt: string;
}

interface Account {
  id: string;
  email: string;
  profileName?: string;
}

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', type: 'connection', accountId: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([campaignsApi.list(), accountsApi.list()])
      .then(([campaignsRes, accountsRes]) => {
        setCampaigns(campaignsRes.data);
        setAccounts(accountsRes.data);
        if (accountsRes.data.length > 0) {
          setFormData((f) => ({ ...f, accountId: accountsRes.data[0].id }));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await campaignsApi.create(formData);
      setCampaigns([data, ...campaigns]);
      setFormData({ name: '', type: 'connection', accountId: accounts[0]?.id || '' });
      setShowForm(false);
    } catch (error) {
      console.error('Failed to create campaign:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      const { data } = await campaignsApi.toggle(id);
      setCampaigns(campaigns.map((c) => c.id === id ? { ...c, status: data.status } : c));
    } catch (error) {
      console.error('Failed to toggle campaign:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;
    try {
      await campaignsApi.delete(id);
      setCampaigns(campaigns.filter((c) => c.id !== id));
    } catch (error) {
      console.error('Failed to delete campaign:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-linkedin-500"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
        <Button onClick={() => setShowForm(!showForm)} disabled={accounts.length === 0}>
          {showForm ? 'Cancel' : '+ New Campaign'}
        </Button>
      </div>

      {accounts.length === 0 && (
        <Card className="mb-6">
          <CardContent>
            <p className="text-gray-500 text-center py-4">
              Please add a LinkedIn account first before creating campaigns.
            </p>
          </CardContent>
        </Card>
      )}

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-lg font-semibold">Create New Campaign</h2>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Campaign Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-linkedin-500"
                >
                  <option value="connection">Connection Requests</option>
                  <option value="message">Direct Messages</option>
                  <option value="engagement">Post Engagement</option>
                  <option value="content">Content Publishing</option>
                </select>
              </div>
              <div>
<label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn Account</label>
                <select
                  value={formData.accountId}
                  onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-linkedin-500"
                >
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.profileName || account.email}
                    </option>
                  ))}
                </select>
              </div>
              <Button type="submit" loading={saving}>Create Campaign</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Account</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Leads</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {campaigns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No campaigns yet. Create your first campaign to get started.
                  </td>
                </tr>
              ) : (
                campaigns.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{campaign.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 capitalize">{campaign.type}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {campaign.account?.profileName || campaign.account?.email}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{campaign._count?.leads || 0}</td>
                    <td className="px-6 py-4">
                      <span className={'inline-flex px-2 py-1 text-xs font-semibold rounded-full ' +
                        (campaign.status === 'active' ? 'bg-green-100 text-green-800' :
                         campaign.status === 'paused' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800')
                      }>
                        {campaign.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => handleToggle(campaign.id)}>
                        {campaign.status === 'active' ? 'Pause' : 'Start'}
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => handleDelete(campaign.id)}>
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
""",

    "frontend/src/pages/Leads.tsx": """import { useEffect, useState } from 'react';
import { leadsApi } from '../lib/api';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';

interface Lead {
  id: string;
  name: string;
  headline?: string;
  company?: string;
  location?: string;
  linkedinUrl: string;
  status: string;
  campaign?: { name: string };
  createdAt: string;
}

export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const limit = 20;

  useEffect(() => {
    fetchLeads();
  }, [search, page]);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const { data } = await leadsApi.list({ search, page, limit });
      setLeads(data.leads);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error('Failed to fetch leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (id: string) => {
    try {
      const { data } = await leadsApi.connect(id);
      setLeads(leads.map((l) => (l.id === id ? { ...l, status: data.status } : l)));
    } catch (error) {
      console.error('Failed to send connection:', error);
    }
  };

  const statusColors: Record<string, string> = {
    new: 'bg-blue-100 text-blue-800',
    contacted: 'bg-yellow-100 text-yellow-800',
    connected: 'bg-green-100 text-green-800',
    messaged: 'bg-purple-100 text-purple-800',
    replied: 'bg-teal-100 text-teal-800',
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
        <span className="text-sm text-gray-500">{total} total leads</span>
      </div>

      <div className="mb-6">
        <Input
          placeholder="Search by name, company, or headline..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lead</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Campaign</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-linkedin-500 mx-auto"></div>
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    {search ? 'No leads found matching your search.' : 'No leads yet.'}
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <a href={lead.linkedinUrl} target="_blank" rel="noopener noreferrer"
                          className="font-medium text-linkedin-500 hover:underline">{lead.name}</a>
                        {lead.headline && (
                          <div className="text-sm text-gray-500 truncate max-w-xs">{lead.headline}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{lead.company || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{lead.campaign?.name || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={'inline-flex px-2 py-1 text-xs font-semibold rounded-full ' +
                        (statusColors[lead.status] || 'bg-gray-100 text-gray-800')}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {lead.status === 'new' && (
                        <Button size="sm" onClick={() => handleConnect(lead.id)}>Connect</Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
              Previous
            </Button>
            <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
            <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              Next
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
""",

    "frontend/src/pages/AIContent.tsx": """import { useState } from 'react';
import { aiApi } from '../lib/api';
import { Card, CardHeader, CardContent } from '../components/Card';
import { Button } from '../components/Button';

export default function AIContent() {
  const [activeTab, setActiveTab] = useState<'generate' | 'ideas'>('generate');
  const [prompt, setPrompt] = useState('');
  const [contentType, setContentType] = useState<'post' | 'comment' | 'message'>('post');
  const [generatedContent, setGeneratedContent] = useState('');
  const [generating, setGenerating] = useState(false);
  const [topic, setTopic] = useState('');
  const [ideas, setIdeas] = useState<string[]>([]);
  const [generatingIdeas, setGeneratingIdeas] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    try {
      const { data } = await aiApi.generate(prompt, contentType);
      setGeneratedContent(data.content);
    } catch (error) {
      console.error('Failed to generate content:', error);
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateIdeas = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneratingIdeas(true);
    try {
      const { data } = await aiApi.ideas(topic, 5);
      setIdeas(data.ideas);
    } catch (error) {
      console.error('Failed to generate ideas:', error);
    } finally {
      setGeneratingIdeas(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">AI Content Generator</h1>

      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setActiveTab('generate')}
          className={'px-4 py-2 rounded-lg font-medium transition-colors ' +
            (activeTab === 'generate' ? 'bg-linkedin-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200')
          }
        >
          Generate Content
        </button>
        <button
          onClick={() => setActiveTab('ideas')}
          className={'px-4 py-2 rounded-lg font-medium transition-colors ' +
            (activeTab === 'ideas' ? 'bg-linkedin-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200')
          }
        >
          Post Ideas
        </button>
      </div>

      {activeTab === 'generate' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Create Content</h2>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleGenerate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Content Type</label>
                  <select
                    value={contentType}
                    onChange={(e) => setContentType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-linkedin-500"
                  >
                    <option value="post">LinkedIn Post</option>
                    <option value="comment">Comment Reply</option>
                    <option value="message">Direct Message</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prompt / Topic</label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={4}
                    placeholder="Describe what you want to write about..."
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-linkedin-500"
                  />
                </div>
                <Button type="submit" loading={generating} className="w-full">Generate Content</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Generated Content</h2>
                {generatedContent && (
                  <Button variant="secondary" size="sm" onClick={() => copyToClipboard(generatedContent)}>Copy</Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {generatedContent ? (
                <div className="whitespace-pre-wrap text-gray-700 bg-gray-50 p-4 rounded-lg min-h-[200px]">
                  {generatedContent}
                </div>
              ) : (
                <div className="text-gray-400 text-center py-12">Generated content will appear here</div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Generate Post Ideas</h2>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleGenerateIdeas} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Topic or Industry</label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g., SaaS, Marketing, Leadership..."
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-linkedin-500"
                  />
                </div>
                <Button type="submit" loading={generatingIdeas} className="w-full">Generate 5 Ideas</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Post Ideas</h2>
            </CardHeader>
            <CardContent>
              {ideas.length > 0 ? (
                <ul className="space-y-3">
                  {ideas.map((idea, index) => (
                    <li key={index} className="p-3 bg-gray-50 rounded-lg flex justify-between items-start group">
                      <span className="text-gray-700">{idea}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setPrompt(idea); setActiveTab('generate'); }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Use
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-gray-400 text-center py-12">Post ideas will appear here</div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
""",

    "frontend/Dockerfile": """FROM node:20-alpine as builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
""",

    "frontend/nginx.conf": """server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://backend:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
""",

    # ============================================================
    # ROOT FILES
    # ============================================================

    "docker-compose.yml": """version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: linkedin-manager-db
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: linkedin_manager
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  backend:
    build: ./backend
    container_name: linkedin-manager-backend
    ports:
      - "3001:3001"
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/linkedin_manager
      JWT_SECRET: your-super-secret-jwt-key-change-in-production
      PORT: "3001"
      FRONTEND_URL: http://localhost:5173
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

  frontend:
    build: ./frontend
    container_name: linkedin-manager-frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  postgres_data:
""",

    "README.md": """# LinkedIn Manager

A full-stack LinkedIn automation and management tool.

## Features

- Multi-Account Management
- Campaign Automation
- Lead Database
- AI Content Generation
- Analytics Dashboard

## Tech Stack

**Backend:** Node.js, Express, TypeScript, Prisma, PostgreSQL
**Frontend:** React, Vite, TypeScript, Tailwind CSS, Zustand

## Quick Start

### Docker (Recommended)

```bash
docker-compose up -d
Manual Setup
Backend:
cd backend
cp .env.example .env
npm install
npx prisma db push
npm run dev
Frontend:
cd frontend
npm install
npm run dev
Access
Frontend: http://localhost:5173
Backend: http://localhost:3001
Health: http://localhost:3001/health
Environment Variables
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/linkedin_manager
JWT_SECRET=your-secret-key
PORT=3001
FRONTEND_URL=http://localhost:5173
OPENAI_API_KEY=
GEMINI_API_KEY=
DEEPSEEK_API_KEY=
License
MIT
""",
".gitignore": """node_modules/
dist/
build/
.env
.env.local
.env.*.local
.log
npm-debug.log
.DS_Store
Thumbs.db
.idea/
.vscode/
*.swp
*.swo
coverage/
*.tgz
.cache/
""",
".env.example": """DATABASE_URL="postgresql://postgres:postgres@localhost:5432/linkedin_manager"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
PORT=3001
FRONTEND_URL="http://localhost:5173"
OPENAI_API_KEY=""
GEMINI_API_KEY=""
DEEPSEEK_API_KEY=""
""",
}

def create_project(base_path: str = "linkedin-manager") -> bool:
    """Create the entire LinkedIn Manager project structure."""
    if not base_path or not base_path.strip():
        print("Error: Invalid directory name")
        return False
    
    base_path = os.path.normpath(base_path)
    
    if os.path.exists(base_path):
        response = input("Directory '" + base_path + "' already exists. Overwrite? (y/N): ")
        if response.lower() != 'y':
            print("Operation cancelled.")
            return False
    
    print("\nCreating LinkedIn Manager project in: " + base_path + "\n")
    print("=" * 50)
    
    created_dirs = set()
    file_count = 0
    
    try:
        for file_path, content in PROJECT_FILES.items():
            full_path = os.path.join(base_path, file_path)
            
            dir_path = os.path.dirname(full_path)
            if dir_path and dir_path not in created_dirs:
                os.makedirs(dir_path, exist_ok=True)
                created_dirs.add(dir_path)
            
            with open(full_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            file_count += 1
            print("  + " + file_path)
        
        print("=" * 50)
        print("\nProject created successfully!")
        print("  Directories: " + str(len(created_dirs)))
        print("  Files: " + str(file_count))
        
        print("\nNext Steps:")
        print("  1. cd " + base_path)
        print("  2. docker-compose up -d")
        print("     OR")
        print("  2. cd backend && npm install && npx prisma db push && npm run dev")
        print("  3. cd frontend && npm install && npm run dev")
        print("\nAccess the app at: http://localhost:5173")
        
        return True
        
    except PermissionError as e:
        print("\nPermission denied: " + str(e))
        return False
    except OSError as e:
        print("\nError creating project: " + str(e))
        return False
    except Exception as e:
        print("\nUnexpected error: " + str(e))
        return False


def main():
    """Main entry point."""
    print("\n" + "=" * 50)
    print("  LinkedIn Manager - Project Generator")
    print("=" * 50)
    
    if len(sys.argv) > 1:
        target_dir = sys.argv[1]
    else:
        target_dir = "linkedin-manager"
    
    success = create_project(target_dir)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
>>>>>>> Stashed changes
    main()