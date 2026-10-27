import { Router } from 'express';
import { authenticate } from '@/middleware/auth.middleware';
import { getTrendsHandler } from './trends.controller';

const router = Router();

router.use(authenticate);

/** GET /api/v1/trends */
router.get('/', getTrendsHandler);

export default router;
