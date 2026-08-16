import { Router } from 'express';
import { createPractical, listPracticals, getPractical, updatePractical, presignAttachment } from '../controllers/practicalsController';

const router = Router();

router.post('/', createPractical);
router.get('/', listPracticals);
router.get('/:id', getPractical);
router.put('/:id', updatePractical);
router.post('/:id/presign-attachment', presignAttachment);

export default router;
