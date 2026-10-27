import { prisma } from '@/config/database';
import { TRENDS_LIMIT } from '@/config/constants';

export async function getTrends() {
  return prisma.trend.findMany({
    orderBy: { post_count: 'desc' },
    take: TRENDS_LIMIT,
    select: { id: true, category: true, topic: true, post_count: true },
  });
}
