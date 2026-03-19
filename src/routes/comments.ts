import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as commentsController from '../controllers/comments.controller';

const router = Router({ mergeParams: true });

router.get('/', authenticate, commentsController.listComments);
router.post('/', authenticate, requireRole('manager'), commentsController.addComment);
router.delete('/:comment_id', authenticate, requireRole('manager'), commentsController.deleteComment);

export default router;
