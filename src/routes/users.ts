import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as usersController from '../controllers/users.controller';

const router = Router();

router.get('/', authenticate, requireRole('manager'), usersController.listUsers);
router.post('/', authenticate, requireRole('manager'), usersController.createUser);
router.get('/:id', authenticate, requireRole('manager'), usersController.getUser);
router.put('/:id', authenticate, requireRole('manager'), usersController.updateUser);
router.delete('/:id', authenticate, requireRole('manager'), usersController.deleteUser);

export default router;
