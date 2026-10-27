import { PrismaClient } from '@prisma/client';
import { env } from './env';

/** Singleton Prisma client — shared across the whole process. */
export const prisma = new PrismaClient({
  log: env.isDev ? ['query', 'warn', 'error'] : ['warn', 'error'],
});

/** Call this once on process exit to cleanly close the DB connection pool. */
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}
