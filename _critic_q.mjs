import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
const url = process.env.DATABASE_URL;
const p = new PrismaClient({ adapter: new PrismaPg({ connectionString: url, max: 1 }) });
const ms = await p.meeting.findMany({ orderBy: { date: 'asc' } });
console.log("MEETINGS:", ms.length);
for (const m of ms) {
  const money = { rev: m.revenue, pod: m.podcastRevenue, studio: m.studioRevenue, media: m.mediaRevenue, merch: m.merchRevenue, ev: m.eventRevenue, music: m.musicRevenue, exp: m.expenses };
  const nz = Object.fromEntries(Object.entries(money).filter(([k,v]) => v !== null && v !== undefined));
  console.log(m.kind, m.date.toISOString().slice(0,10), JSON.stringify(nz), "| prep:", (m.prep||"").length, "dec:", (m.decisions||"").length, "notes:", (m.notes||"").length);
}
console.log("---MONTHTARGETS---");
const mt = await p.monthTarget.findMany({ orderBy: { sortOrder: 'asc' } });
for (const t of mt) console.log(t.key, t.label, "target:", t.target, "collected:", t.collected);
await p.$disconnect();
