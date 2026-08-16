import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const accessSecret = process.env.JWT_ACCESS_TOKEN_SECRET || 'dev_secret';

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).end();
  const parts = auth.split(' ');
  if (parts.length !== 2) return res.status(401).end();
  const token = parts[1];
  try {
    const payload = jwt.verify(token, accessSecret);
    (req as any).user = payload;
    next();
  } catch (err) {
    res.status(401).json({ error: 'invalid token' });
  }
}
