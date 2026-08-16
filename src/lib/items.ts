import { Priority, Status, View, Pillar } from "@prisma/client";

/**
 * The document's rules, enforced in one place.
 *
 * Section 09: "Every commitment has one owner and one due date." and "If a task
 * has no owner, it is not a task; it is an idea." Jaco asked for that to be
 * enforced rather than suggested, so these run on every write — a plan that
 * only advises gets ignored the first busy week.
 */

export type ItemInput = {
  title?: unknown;
  owner?: unknown;
  view?: unknown;
  pillar?: unknown;
  priority?: unknown;
  status?: unknown;
  dueDate?: unknown;
  kpi?: unknown;
  notes?: unknown;
  dependency?: unknown;
  quarterId?: unknown;
  objectiveId?: unknown;
};

const enumOr = <T extends Record<string, string>>(e: T, v: unknown, fallback: T[keyof T]) =>
  typeof v === "string" && v in e ? (v as T[keyof T]) : fallback;

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export function validate(body: ItemInput, { partial = false } = {}): string | null {
  const title = str(body.title);
  const owner = str(body.owner);

  if (!partial || body.title !== undefined) {
    if (!title) return "A title is required.";
  }
  if (!partial || body.owner !== undefined) {
    if (!owner) return "Every item needs one owner. Without an owner it is an idea, not a task.";
  }

  // A weekly commitment is the one view the document ties to a hard date.
  const view = body.view;
  const isCommitment = view === "ThisWeek";
  if (isCommitment && !partial && !body.dueDate) {
    return "A This Week commitment needs a due date.";
  }
  if (body.dueDate !== undefined && body.dueDate !== null && body.dueDate !== "") {
    if (Number.isNaN(Date.parse(String(body.dueDate)))) return "That due date is not a real date.";
  }
  return null;
}

export function toData(body: ItemInput) {
  const due = body.dueDate;
  return {
    ...(body.title !== undefined && { title: str(body.title) }),
    ...(body.owner !== undefined && { owner: str(body.owner) }),
    ...(body.view !== undefined && { view: enumOr(View, body.view, View.ThisWeek) }),
    ...(body.pillar !== undefined && { pillar: enumOr(Pillar, body.pillar, Pillar.Operations) }),
    ...(body.priority !== undefined && { priority: enumOr(Priority, body.priority, Priority.Standard) }),
    ...(body.status !== undefined && { status: enumOr(Status, body.status, Status.NotStarted) }),
    ...(body.kpi !== undefined && { kpi: str(body.kpi) }),
    ...(body.notes !== undefined && { notes: str(body.notes) }),
    ...(body.dependency !== undefined && { dependency: str(body.dependency) }),
    ...(body.quarterId !== undefined && { quarterId: (str(body.quarterId) || null) as string | null }),
    ...(body.objectiveId !== undefined && { objectiveId: (str(body.objectiveId) || null) as string | null }),
    ...(due !== undefined && { dueDate: due ? new Date(String(due)) : null }),
  };
}
