import type { Request, Response, NextFunction } from 'express';
import { requireUser } from '@/middleware/auth.middleware';
import * as usersService from './users.service';
import type { UpdateProfileDto } from './users.dto';

// GET /api/v1/users/suggestions
export async function getSuggestionsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { sub } = requireUser(req);
    const suggestions = await usersService.getSuggestions(sub);
    res.json(suggestions);
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/users/search?q=...
export async function searchUsersHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { sub } = requireUser(req);
    const { q } = req.query as { q?: string };
    const users = await usersService.searchUsers(q ?? '', sub);
    res.json(users);
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/users/:username
export async function getUserProfileHandler(
  req: Request<{ username: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { sub } = requireUser(req);
    const profile = await usersService.getUserProfile(req.params.username, sub);
    res.json(profile);
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/users/:username/followers?cursor=...
export async function getFollowersHandler(
  req: Request<{ username: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { sub } = requireUser(req);
    const { cursor } = req.query as { cursor?: string };
    const page = await usersService.getFollowers(req.params.username, sub, cursor);
    res.json(page);
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/users/:username/following?cursor=...
export async function getFollowingHandler(
  req: Request<{ username: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { sub } = requireUser(req);
    const { cursor } = req.query as { cursor?: string };
    const page = await usersService.getFollowing(req.params.username, sub, cursor);
    res.json(page);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/v1/users/me
export async function updateProfileHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { sub } = requireUser(req);
    const profile = await usersService.updateProfile(sub, req.body as UpdateProfileDto);
    res.json(profile);
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/users/:userId/follow
export async function followUserHandler(
  req: Request<{ userId: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { sub } = requireUser(req);
    await usersService.followUser(sub, req.params.userId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// DELETE /api/v1/users/:userId/follow
export async function unfollowUserHandler(
  req: Request<{ userId: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { sub } = requireUser(req);
    await usersService.unfollowUser(sub, req.params.userId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
