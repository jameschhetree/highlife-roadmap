import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
const p = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, max: 1 }) });
const g = await p.item.groupBy({ by: ['view'], _count: { _all: true } });
console.log("ITEMS BY VIEW:", JSON.stringify(g));
const blocked = await p.item.count({ where: { status: 'Blocked' } });
console.log("BLOCKED ITEMS:", blocked);
console.log("PLAN SECTIONS:", await p.planSection.count());
await p.$disconnect();
