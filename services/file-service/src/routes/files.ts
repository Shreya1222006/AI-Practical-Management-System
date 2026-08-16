import { Router } from 'express';
import { presignUpload, getMeta, deleteAttachment } from '../controllers/fileController';

const router = Router();

router.post('/presign', presignUpload);
router.get('/meta/:id', getMeta);
router.delete('/:id', deleteAttachment);

export default router;
