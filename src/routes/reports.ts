import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as reportsController from '../controllers/reports.controller';

const router = Router();

router.get('/', authenticate, reportsController.listReports);
router.post('/', authenticate, requireRole('sales'), reportsController.createReport);
router.get('/:id', authenticate, reportsController.getReport);
router.put('/:id', authenticate, requireRole('sales'), reportsController.updateReport);
router.patch('/:id/submit', authenticate, requireRole('sales'), reportsController.submitReport);
router.patch('/:id/review', authenticate, requireRole('manager'), reportsController.reviewReport);

export default router;
