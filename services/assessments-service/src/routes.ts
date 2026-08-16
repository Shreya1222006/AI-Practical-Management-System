import { Router } from 'express';
import * as ctrl from './controllers/assessmentsController';

const router = Router();

router.post('/', ctrl.createAssessment);
router.get('/', ctrl.listAssessments);
router.get('/:id', ctrl.getAssessment);
router.post('/:id/presign-resource', ctrl.presignResource);

export default router;
