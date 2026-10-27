import { Router } from 'express';
import { authenticate } from '@/middleware/auth.middleware';
import { getBookmarksHandler } from './bookmarks.controller';

const router = Router();

router.use(authenticate);

/** GET /api/v1/bookmarks */
router.get('/', getBookmarksHandler);

export default router;
