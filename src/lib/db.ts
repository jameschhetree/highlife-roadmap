import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient | null {
  const url =
    process.env.DATABASE_URL ||
    process.env.PRISMA_DATABASE_URL ||
    process.env.POSTGRES_URL;
  if (!url) return null;
  // One connection per instance, and drop it when idle.
  //
  // Without a cap, every serverless invocation opens its own pool and the
  // database refuses new ones: "too many connections for role prisma_migration".
  // /api/plan returned 500 in production for exactly that reason while every
  // other route happened to be lucky — a failure that looks like a broken
  // endpoint and is actually the whole app exhausting its budget.
  const adapter = new PrismaPg({
    connectionString: url,
    max: 1,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production" && prisma) {
  globalForPrisma.prisma = prisma;
}

export function requirePrisma(): PrismaClient {
  if (!prisma) throw new Error("DATABASE_URL not set");
  return prisma;
}
