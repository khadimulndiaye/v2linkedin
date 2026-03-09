import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL:   z.string(),
  JWT_SECRET:     z.string(),
  PORT:           z.string().default('3001'),
  FRONTEND_URL:   z.string().default('http://localhost:5173'),

  // AI providers (at least one recommended)
  OPENAI_API_KEY:   z.string().optional(),
  GEMINI_API_KEY:   z.string().optional(),
  DEEPSEEK_API_KEY: z.string().optional(),

  // LinkedIn OAuth (Option A) — get from developer.linkedin.com
  LINKEDIN_CLIENT_ID:     z.string().optional(),
  LINKEDIN_CLIENT_SECRET: z.string().optional(),
  LINKEDIN_REDIRECT_URI:  z.string().optional(),

  // Encryption key for stored passwords (Option B)
  // Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ENCRYPTION_KEY: z.string().optional(),
});

export const config = envSchema.parse(process.env);
