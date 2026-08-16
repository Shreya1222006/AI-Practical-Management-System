import { Router } from 'express';
import * as ctrl from './controllers/submissionsController';

const router = Router();

router.post('/', ctrl.createSubmission);
router.get('/', ctrl.listSubmissions);
router.get('/:id', ctrl.getSubmission);

export default router;
