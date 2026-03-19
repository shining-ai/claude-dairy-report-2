import { Router } from 'express';
import authRouter from './auth';
import reportsRouter from './reports';
import visitsRouter from './visits';
import commentsRouter from './comments';
import customersRouter from './customers';
import usersRouter from './users';

export const router = Router();

router.use('/auth', authRouter);
router.use('/reports', reportsRouter);
router.use('/reports/:id/visits', visitsRouter);
router.use('/reports/:id/comments', commentsRouter);
router.use('/customers', customersRouter);
router.use('/users', usersRouter);
