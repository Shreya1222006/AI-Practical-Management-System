import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { getConfig } from '../../../../libs/shared/config';

const config = getConfig();

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authSvc = process.env.AUTH_SERVICE_URL || config.authServiceUrl;
  if (!authSvc) return next(); // no auth configured

  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'missing auth' });

  try {
    const baseUrl = authSvc.replace(/\/$/, '');
    const meUrl = baseUrl.endsWith('/auth') ? `${baseUrl}/me` : `${baseUrl}/auth/me`;
    const resp = await axios.get(meUrl, { headers: { authorization: auth } });
    if (resp.status === 200) {
      // attach user
      (req as any).user = resp.data;
      return next();
    }
    return res.status(401).json({ error: 'invalid token' });
  } catch (err: any) {
    console.error('auth check failed', err?.response?.data || err.message);
    return res.status(401).json({ error: 'auth failed' });
  }
}
