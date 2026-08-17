import { requirePrisma } from "@/lib/db";

/**
 * Pull a week's deliverable out of the plan and into This Week as commitments.
 *
 * The deliverable is split on sentences rather than on commas: "revenue, MRR,
 * lead sources, tours, show rate, close rate, room hours and turnaround" is one
 * job, not eight, and splitting it finer produces a list nobody reads.
 *
 * Owner is left Unassigned on purpose. The plan does not name owners for the
 * execution weeks, and inventing one here would repeat the mistake the audit
 * caught. The UI shows Unassigned in red as "Needs an owner", so the gap is
 * visible rather than papered over.
 */
export async function POST(_r: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const prisma = requirePrisma();

  const week = await prisma.executionWeek.findUnique({ where: { id } });
  if (!week) return Response.json({ error: "No such week." }, { status: 404 });

  const already = await prisma.item.count({ where: { weekNumber: week.week } });
  if (already > 0) {
    return Response.json(
      { error: `Week ${week.week} is already in This week. Edit or delete those first.` },
      { status: 409 }
    );
  }

  // Split on sentences and semicolons — the plan uses a semicolon to separate
  // two distinct jobs ("Cost-check recurring packages; create one-page package
  // sheet"). Not on commas: "revenue, MRR, lead sources, tours, show rate" is
  // one job, and splitting it finer produces a list nobody reads.
  const parts = week.deliverable
    .split(/(?<=\.)\s+|;\s*/)
    .map((t) => t.trim().replace(/\.$/, ""))
    .filter((t) => t.length > 3)
    .map((t) => t.charAt(0).toUpperCase() + t.slice(1));

  // Commitments are due by the Sunday that closes the week.
  const due = week.startsOn
    ? new Date(week.startsOn.getTime() + 6 * 86400000)
    : null;

  const max = await prisma.item.aggregate({
    where: { view: "ThisWeek" },
    _max: { sortOrder: true },
  });
  let sort = (max._max.sortOrder ?? -1) + 1;

  await prisma.item.createMany({
    data: parts.map((title) => ({
      title,
      owner: "Unassigned",
      view: "ThisWeek" as const,
      pillar: "Operations" as const,
      priority: "Standard" as const,
      dueDate: due,
      weekNumber: week.week,
      notes: `Week ${week.week} of the 90-day plan: ${week.objective}.`,
      kpi: "Roadmap commitments completed",
      sortOrder: sort++,
    })),
  });

  return Response.json({ created: parts.length, week: week.week }, { status: 201 });
}
