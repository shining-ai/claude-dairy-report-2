import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as customersController from '../controllers/customers.controller';

const router = Router();

router.get('/', authenticate, customersController.listCustomers);
router.post('/', authenticate, requireRole('manager'), customersController.createCustomer);
router.get('/:id', authenticate, customersController.getCustomer);
router.put('/:id', authenticate, requireRole('manager'), customersController.updateCustomer);
router.delete('/:id', authenticate, requireRole('manager'), customersController.deleteCustomer);

export default router;
