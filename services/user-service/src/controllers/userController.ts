import { Request, Response } from 'express';
import { findUserById, findAllUsers, updateUserById } from '../models/userRepo';

export async function getUser(req: Request, res: Response) {
  const id = String(req.params.id);
  const user = await findUserById(id);
  if (!user) return res.status(404).json({ error: 'not found' });
  res.json(user);
}

export async function listUsers(_req: Request, res: Response) {
  const users = await findAllUsers();
  res.json(users);
}

export async function updateUser(req: Request, res: Response) {
  const id = String(req.params.id);
  const patch = req.body;
  const updated = await updateUserById(id, patch);
  if (!updated) return res.status(404).json({ error: 'not found' });
  res.json(updated);
}
