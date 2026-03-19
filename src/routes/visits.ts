import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as visitsController from '../controllers/visits.controller';

const router = Router({ mergeParams: true });

router.post('/', authenticate, requireRole('sales'), visitsController.addVisit);
router.patch('/reorder', authenticate, requireRole('sales'), visitsController.reorderVisits);
router.put('/:visit_id', authenticate, requireRole('sales'), visitsController.updateVisit);
router.delete('/:visit_id', authenticate, requireRole('sales'), visitsController.deleteVisit);

export default router;
