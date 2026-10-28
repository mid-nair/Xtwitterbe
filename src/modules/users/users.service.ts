import type { Prisma, User } from '@prisma/client';
import { prisma } from '@/config/database';
import { AppError } from '@/shared/errors/AppError';
import { isObjectId } from '@/shared/utils/objectId';
import { FEED_PAGE_SIZE, SUGGESTIONS_LIMIT } from '@/config/constants';
import { createNotification, removeNotification } from '@/modules/notifications/notifications.service';
import type { UpdateProfileDto } from './users.dto';

// ─── Formatters ──────────────────────────────────────────────────────────────

/** Public user shape — excludes sensitive fields like password_hash. */
export function formatUser(user: User) {
  return {
    id: user.id,
    username: user.username,
    display_name: user.display_name,
    bio: user.bio,
    avatar_url: user.avatar_url,
    banner_url: user.banner_url,
    location: user.location,
    website_url: user.website_url,
    is_verified: user.is_verified,
    follower_count: 0, // enriched by profile queries when needed
    following_count: 0,
    tweet_count: 0,
    created_at: user.created_at.toISOString(),
  };
}

function formatProfile(user: User, counts: { followers: number; following: number; tweets: number }, isFollowing: boolean) {
  return {
    id: user.id,
    username: user.username,
    display_name: user.display_name,
    bio: user.bio,
    avatar_url: user.avatar_url,
    banner_url: user.banner_url,
    location: user.location,
    website_url: user.website_url,
    is_verified: user.is_verified,
    follower_count: counts.followers,
    following_count: counts.following,
    tweet_count: counts.tweets,
    created_at: user.created_at.toISOString(),
    is_following: isFollowing,
  };
}

// ─── Queries ─────────────────────────────────────────────────────────────────

/** Fetch a user profile with aggregate counts and follow status for the viewer. */
export async function getUserProfile(username: string, viewerId: string) {
  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      _count: { select: { followers: true, following: true, tweets: true } },
      followers: {
        where: { follower_id: viewerId },
        select: { follower_id: true },
      },
    },
  });

  if (!user) throw AppError.notFound('User not found.');

  return formatProfile(user, user._count, user.followers.length > 0);
}

/** Return users the viewer does not yet follow (excluding themselves). */
export async function getSuggestions(viewerId: string) {
  const alreadyFollowing = await prisma.follow.findMany({
    where: { follower_id: viewerId },
    select: { following_id: true },
  });
  const excludeIds = [viewerId, ...alreadyFollowing.map((f) => f.following_id)];

  const users = await prisma.user.findMany({
    where: { id: { notIn: excludeIds } },
    take: SUGGESTIONS_LIMIT,
    orderBy: { followers: { _count: 'desc' } },
  });

  return users.map((u) => ({
    id: u.id,
    username: u.username,
    display_name: u.display_name,
    avatar_url: u.avatar_url,
    is_verified: u.is_verified,
    is_following: false,
  }));
}

/** Case-insensitive people search used by Explore and the message composer. */
export async function searchUsers(query: string, viewerId: string) {
  const q = query.trim();
  if (!q) return [];

  const users = await prisma.user.findMany({
    where: {
      id: { not: viewerId },
      OR: [
        { username: { contains: q, mode: 'insensitive' } },
        { display_name: { contains: q, mode: 'insensitive' } },
      ],
    },
    take: 20,
    orderBy: { followers: { _count: 'desc' } },
  });

  const following = await prisma.follow.findMany({
    where: { follower_id: viewerId, following_id: { in: users.map((u) => u.id) } },
    select: { following_id: true },
  });
  const followingIds = new Set(following.map((f) => f.following_id));

  return users.map((u) => ({
    id: u.id,
    username: u.username,
    display_name: u.display_name,
    avatar_url: u.avatar_url,
    is_verified: u.is_verified,
    is_following: followingIds.has(u.id),
  }));
}

// ─── Followers / Following lists ─────────────────────────────────────────────

const connectionUserSelect = {
  id: true,
  username: true,
  display_name: true,
  bio: true,
  avatar_url: true,
  is_verified: true,
} satisfies Prisma.UserSelect;

export type ConnectionKind = 'followers' | 'following';

/**
 * Paginated list of the people who follow `username` (kind = "followers")
 * or whom `username` follows (kind = "following"). Each entry carries
 * `is_following` relative to the viewer so the client can render Follow buttons.
 * Pagination is by Follow row id, newest first.
 */
export async function getConnections(
  kind: ConnectionKind,
  username: string,
  viewerId: string,
  cursor?: string,
) {
  const limit = FEED_PAGE_SIZE;
  if (cursor && !isObjectId(cursor)) throw AppError.badRequest('Invalid cursor.');

  const owner = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (!owner) throw AppError.notFound('User not found.');

  // Load only the Follow rows first, then the users separately. A Follow row can
  // point at a user who no longer exists (relations use onDelete: NoAction), and
  // including the relation would make Prisma throw on such an orphan row.
  const rows = await prisma.follow.findMany({
    where: {
      ...(kind === 'followers' ? { following_id: owner.id } : { follower_id: owner.id }),
      ...(cursor ? { id: { lt: cursor } } : {}),
    },
    orderBy: { id: 'desc' },
    take: limit,
    select: { id: true, follower_id: true, following_id: true },
  });

  const userIds = rows.map((row) => (kind === 'followers' ? row.follower_id : row.following_id));

  const [users, viewerFollows] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: userIds } },
      select: connectionUserSelect,
    }),
    prisma.follow.findMany({
      where: { follower_id: viewerId, following_id: { in: userIds } },
      select: { following_id: true },
    }),
  ]);

  const usersById = new Map(users.map((u) => [u.id, u]));
  const viewerFollowingIds = new Set(viewerFollows.map((f) => f.following_id));

  const data = userIds
    .map((id) => usersById.get(id))
    .filter((u): u is NonNullable<typeof u> => u !== undefined) // skip deleted users
    .map((u) => ({
      id: u.id,
      username: u.username,
      display_name: u.display_name,
      bio: u.bio,
      avatar_url: u.avatar_url,
      is_verified: u.is_verified,
      is_following: viewerFollowingIds.has(u.id),
    }));

  return {
    data,
    // The cursor comes from the Follow rows (not the users) so skipped orphans never stall paging.
    next_cursor: rows.length === limit ? rows[rows.length - 1].id : null,
  };
}

export const getFollowers = (username: string, viewerId: string, cursor?: string) =>
  getConnections('followers', username, viewerId, cursor);

export const getFollowing = (username: string, viewerId: string, cursor?: string) =>
  getConnections('following', username, viewerId, cursor);

// ─── Mutations ───────────────────────────────────────────────────────────────

export async function updateProfile(userId: string, dto: UpdateProfileDto) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(dto.display_name !== undefined && { display_name: dto.display_name }),
      ...(dto.bio !== undefined && { bio: dto.bio }),
      ...(dto.location !== undefined && { location: dto.location }),
      ...(dto.website_url !== undefined && { website_url: dto.website_url }),
      ...(dto.avatar_url !== undefined && { avatar_url: dto.avatar_url }),
      ...(dto.banner_url !== undefined && { banner_url: dto.banner_url }),
    },
  });

  return getUserProfile(user.username, userId);
}

export async function followUser(followerId: string, targetUserId: string): Promise<void> {
  if (!isObjectId(targetUserId)) throw AppError.notFound('User not found.');
  if (followerId === targetUserId) {
    throw AppError.badRequest('You cannot follow yourself.');
  }

  const target = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!target) throw AppError.notFound('User not found.');

  const existing = await prisma.follow.findUnique({
    where: { follower_id_following_id: { follower_id: followerId, following_id: targetUserId } },
  });

  await prisma.follow.upsert({
    where: { follower_id_following_id: { follower_id: followerId, following_id: targetUserId } },
    create: { follower_id: followerId, following_id: targetUserId },
    update: {},
  });

  if (!existing) {
    await createNotification({
      recipientId: targetUserId,
      actorId: followerId,
      type: 'FOLLOW',
    });
  }
}

export async function unfollowUser(followerId: string, targetUserId: string): Promise<void> {
  if (!isObjectId(targetUserId)) throw AppError.notFound('User not found.');

  await prisma.follow.deleteMany({
    where: { follower_id: followerId, following_id: targetUserId },
  });
  await removeNotification({
    recipientId: targetUserId,
    actorId: followerId,
    type: 'FOLLOW',
  });
}