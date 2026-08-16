import { Request, Response } from 'express';
import { createUser, findUserByEmail, findUserById } from '../models/userRepo';
import bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';

import { getConfig } from '../../../../libs/shared/config';

const cfg = getConfig();
const accessSecret = cfg.jwt.accessSecret;
const refreshSecret = cfg.jwt.refreshSecret;
const accessExpiry = cfg.jwt.accessExpiry;

export async function register(req: Request, res: Response) {
  const { email, password, name } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });

  const existing = await findUserByEmail(email);
  if (existing) return res.status(409).json({ error: 'user exists' });

  const hash = await bcrypt.hash(password, Number(process.env.BCRYPT_SALT_ROUNDS || 10));
  const user = await createUser({ email, password_hash: hash, name });

  const token = jwt.sign(
    { sub: user.id, email: user.email, role: user.role } as unknown as string | Buffer | jwt.JwtPayload,
    accessSecret as unknown as jwt.Secret,
    { expiresIn: accessExpiry } as unknown as jwt.SignOptions
  ) as string;
  return res.status(201).json({ user: { id: user.id, email: user.email, name: user.name }, token });
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });

  const user = await findUserByEmail(email);
  if (!user) return res.status(401).json({ error: 'invalid credentials' });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'invalid credentials' });

  const token = jwt.sign(
    { sub: user.id, email: user.email, role: user.role } as unknown as string | Buffer | jwt.JwtPayload,
    accessSecret as unknown as jwt.Secret,
    { expiresIn: accessExpiry } as unknown as jwt.SignOptions
  ) as string;
  return res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
}

export async function me(req: Request, res: Response) {
  const userId = (req as any).user?.sub;
  if (!userId) return res.status(401).end();
  const user = await findUserById(userId);
  if (!user) return res.status(404).end();
  res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
}
