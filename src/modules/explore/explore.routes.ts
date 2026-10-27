import { Router } from 'express';
import { authenticate } from '@/middleware/auth.middleware';
import { searchTweetsHandler, searchUsersHandler } from './explore.controller';

const router = Router();

router.use(authenticate);

/** GET /api/v1/explore/tweets?q=... */
router.get('/tweets', searchTweetsHandler);

/** GET /api/v1/explore/users?q=... */
router.get('/users', searchUsersHandler);

export default router;
