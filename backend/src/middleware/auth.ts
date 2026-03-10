import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

// AuthRequest is just Request — userId is globally augmented via src/types/express.d.ts
export type AuthRequest = Request;

export function auth(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers?.authorization?.replace('Bearer ', '') ?? null;

  if (!token) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  try {
    const payload = jwt.verify(token, config.JWT_SECRET) as { userId: string };
    req.userId = payload.userId;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
