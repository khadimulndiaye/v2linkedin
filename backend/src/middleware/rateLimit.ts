import { Request, Response, NextFunction } from 'express';
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
