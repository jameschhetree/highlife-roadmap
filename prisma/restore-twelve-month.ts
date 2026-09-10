/**
 * Restores the 12-month plan that was parked on 16 August.
 *
 * Source is backup-preOS-20260816.json rather than the HTML James sent, because
 * the backup carries the work already ticked off — one task and eleven steps,
 * plus who owns what. The HTML is the same plan with that progress stripped out,
 * so restoring from it would quietly undo real work.
 *
 * Idempotent: existing rows are updated by their original id, so running it
 * twice does not duplicate the plan or reset a tick.
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const backup = JSON.parse(
  readFileSync(join(root, "backup-preOS-20260816.json"), "utf8")
) as {
  phases: { id: string; number: number; name: string; dates: string; goal: string; color: string; colorBg: string; sortOrder: number }[];
  tasks: { id: string; phaseId: string; title: string; dueLabel: string | null; category: string; owner: string | null; done: boolean; sortOrder: number }[];
  steps: { id: string; taskId: string; title: string; owner: string | null; done: boolean; sortOrder: number }[];
};

// Prisma 7 wants the adapter passed explicitly, same as src/lib/db.ts.
const adapter = new PrismaPg({
  connectionString:
    process.env.DATABASE_URL || process.env.PRISMA_DATABASE_URL || process.env.POSTGRES_URL,
  max: 1,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  for (const p of backup.phases) {
    await prisma.phase.upsert({
      where: { id: p.id },
      update: { number: p.number, name: p.name, dates: p.dates, goal: p.goal, color: p.color, colorBg: p.colorBg, sortOrder: p.sortOrder },
      create: { id: p.id, number: p.number, name: p.name, dates: p.dates, goal: p.goal, color: p.color, colorBg: p.colorBg, sortOrder: p.sortOrder },
    });
  }

  for (const t of backup.tasks) {
    await prisma.phaseTask.upsert({
      where: { id: t.id },
      update: { phaseId: t.phaseId, title: t.title, dueLabel: t.dueLabel, category: t.category, owner: t.owner, done: t.done, sortOrder: t.sortOrder },
      create: { id: t.id, phaseId: t.phaseId, title: t.title, dueLabel: t.dueLabel, category: t.category, owner: t.owner, done: t.done, sortOrder: t.sortOrder },
    });
  }

  for (const s of backup.steps) {
    await prisma.taskStep.upsert({
      where: { id: s.id },
      update: { taskId: s.taskId, title: s.title, owner: s.owner, done: s.done, sortOrder: s.sortOrder },
      create: { id: s.id, taskId: s.taskId, title: s.title, owner: s.owner, done: s.done, sortOrder: s.sortOrder },
    });
  }

  const [phases, tasks, steps, tasksDone, stepsDone] = await Promise.all([
    prisma.phase.count(),
    prisma.phaseTask.count(),
    prisma.taskStep.count(),
    prisma.phaseTask.count({ where: { done: true } }),
    prisma.taskStep.count({ where: { done: true } }),
  ]);

  console.log(`${phases} phases, ${tasks} tasks (${tasksDone} done), ${steps} steps (${stepsDone} done)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
