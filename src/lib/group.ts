/**
 * Grouping for a list of items.
 *
 * Nine commitments rendered as nine identical rows is a list you scan rather
 * than read — every one saying "Operations" and a name tells you nothing about
 * what to do first. Grouped by when they are due, the same nine become "two
 * overdue, three by Friday, four later", which is a different thing to look at.
 */

export type Groupable = {
  id: string;
  owner: string;
  dueDate: string | null;
  priority: string;
  status: string;
};

export type Group<T> = { key: string; label: string; items: T[]; urgent?: boolean };

import { dayNumber } from "./days";

/** Whole days from today, counted in Eastern. Negative is in the past. */
export function daysAway(due: string, now = new Date()): number {
  return dayNumber(new Date(due)) - dayNumber(now);
}

export function groupByDue<T extends Groupable>(items: T[], now = new Date()): Group<T>[] {
  const buckets: Record<string, { label: string; urgent?: boolean; items: T[] }> = {
    overdue: { label: "Overdue", urgent: true, items: [] },
    today: { label: "Today", urgent: true, items: [] },
    soon: { label: "Before next Monday", items: [] },
    later: { label: "Later", items: [] },
    undated: { label: "No date", items: [] },
    done: { label: "Done", items: [] },
  };

  for (const i of items) {
    if (i.status === "Done") { buckets.done.items.push(i); continue; }
    if (!i.dueDate) { buckets.undated.items.push(i); continue; }
    const d = daysAway(i.dueDate, now);
    if (d < 0) buckets.overdue.items.push(i);
    else if (d === 0) buckets.today.items.push(i);
    else if (d <= 7) buckets.soon.items.push(i);
    else buckets.later.items.push(i);
  }

  // Inside a bucket, the soonest first; undated keeps its own order.
  for (const b of Object.values(buckets)) {
    b.items.sort((a, z) =>
      !a.dueDate || !z.dueDate ? 0 : Date.parse(a.dueDate) - Date.parse(z.dueDate)
    );
  }

  return Object.entries(buckets)
    .filter(([, b]) => b.items.length > 0)
    .map(([key, b]) => ({ key, label: b.label, items: b.items, urgent: b.urgent }));
}

export function groupByOwner<T extends Groupable>(items: T[]): Group<T>[] {
  const by = new Map<string, T[]>();
  for (const i of items) {
    if (!by.has(i.owner)) by.set(i.owner, []);
    by.get(i.owner)!.push(i);
  }
  return [...by.entries()]
    // Unassigned last: it is a gap to close, not a person to plan around.
    .sort((a, z) =>
      a[0] === "Unassigned" ? 1 : z[0] === "Unassigned" ? -1 : a[0].localeCompare(z[0])
    )
    .map(([owner, list]) => ({
      key: owner,
      label: owner === "Unassigned" ? "Needs an owner" : owner,
      items: list,
      urgent: owner === "Unassigned",
    }));
}

const ORDER = ["Critical", "Standard", "Backlog"];

export function groupByPriority<T extends Groupable>(items: T[]): Group<T>[] {
  return ORDER.map((p) => ({
    key: p,
    label: p,
    items: items.filter((i) => i.priority === p),
    urgent: p === "Critical",
  })).filter((g) => g.items.length > 0);
}

export function group<T extends Groupable>(
  items: T[], by: "due" | "owner" | "priority", now = new Date()
): Group<T>[] {
  return by === "owner" ? groupByOwner(items)
    : by === "priority" ? groupByPriority(items)
    : groupByDue(items, now);
}
