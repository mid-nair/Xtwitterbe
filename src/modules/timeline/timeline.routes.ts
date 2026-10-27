import { Router } from 'express';
import { authenticate } from '@/middleware/auth.middleware';
import { homeTimelineHandler } from './timeline.controller';

const router = Router();

router.use(authenticate);

/**
 * GET /api/v1/timeline/home
 * Query: feed_type=for_you|following, cursor?, limit?
 */
router.get('/home', homeTimelineHandler);

export default router;
