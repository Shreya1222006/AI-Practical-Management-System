import { Router } from 'express';
import { getUser, listUsers, updateUser } from '../controllers/userController';

const router = Router();

router.get('/', listUsers);
router.get('/:id', getUser);
router.put('/:id', updateUser);

export default router;
