import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
const p = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, max: 1 }) });
const ms = await p.meeting.findMany({ orderBy: { date: 'asc' } });
for (const m of ms) console.log(JSON.stringify(m, null, 1));
console.log("=== TABLE COUNTS ===");
const counts = {};
for (const model of ['quarter','objective','keyResult','item','meeting','planSection','monthTarget','threshold','ninetyDayTest']) {
  try { counts[model] = await p[model].count(); } catch(e) { counts[model] = 'ERR ' + e.message.slice(0,60); }
}
console.log(counts);
console.log("=== ALL TABLES IN DB ===");
const t = await p.$queryRawUnsafe("select table_name from information_schema.tables where table_schema='public' order by 1");
console.log(t.map(r=>r.table_name).join(', '));
await p.$disconnect();
