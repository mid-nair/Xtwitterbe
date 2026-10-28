import { Router } from 'express';
import { authenticate } from '@/middleware/auth.middleware';
import { validate } from '@/middleware/validate.middleware';
import { getUserTweetsHandler } from '@/modules/tweets/tweets.controller';
import {
  followUserHandler,
  getFollowersHandler,
  getFollowingHandler,
  getSuggestionsHandler,
  getUserProfileHandler,
  searchUsersHandler,
  unfollowUserHandler,
  updateProfileHandler,
} from './users.controller';
import { searchUsersSchema, updateProfileSchema } from './users.dto';

const router = Router();

router.use(authenticate);

/**
 * GET /api/v1/users/suggestions
 * Must be registered before /:username so "suggestions" is not a username.
 */
router.get('/suggestions', getSuggestionsHandler);

/** GET /api/v1/users/search?q=... — case-insensitive people search. */
router.get('/search', validate(searchUsersSchema, 'query'), searchUsersHandler);

/** PATCH /api/v1/users/me — update the authenticated user's profile. */
router.patch('/me', validate(updateProfileSchema), updateProfileHandler);

/** GET /api/v1/users/:username/tweets?tab=posts|replies|media|reposts */
router.get('/:username/tweets', getUserTweetsHandler);

/** GET /api/v1/users/:username/followers?cursor= — people who follow this user. */
router.get('/:username/followers', getFollowersHandler);

/** GET /api/v1/users/:username/following?cursor= — people this user follows. */
router.get('/:username/following', getFollowingHandler);

/** GET /api/v1/users/:username — full profile with counts and follow status. */
router.get('/:username', getUserProfileHandler);

router.post('/:userId/follow', followUserHandler);
router.delete('/:userId/follow', unfollowUserHandler);

export default router;
