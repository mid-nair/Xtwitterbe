import { FEED_PAGE_SIZE } from '@/config/constants';

export interface CursorPage<T> {
  data: T[];
  next_cursor: string | null;
}

export interface PaginationOptions {
  cursor?: string;
  limit?: number;
}

/**
 * Build a Prisma `where` clause for cursor-based pagination.
 * Items are sorted by `created_at DESC` then `id DESC` for stability.
 */
export function buildCursorWhere(cursor?: string): { created_at?: object; id?: object } {
  if (!cursor) return {};
  // cursor is the ID of the last item on the previous page
  // We use `id` as the tie-breaker to keep ordering deterministic
  return { id: { lt: cursor } };
}

/**
 * Wrap an array of items into the paginated envelope expected by the frontend.
 * The last item's `id` becomes the next cursor when the page is full.
 */
export function paginate<T extends { id: string }>(
  items: T[],
  limit: number = FEED_PAGE_SIZE,
): CursorPage<T> {
  const hasMore = items.length === limit;
  return {
    data: items,
    next_cursor: hasMore ? items[items.length - 1].id : null,
  };
}
