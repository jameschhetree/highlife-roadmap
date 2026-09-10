"use client";

import { useEffect, useMemo, useState } from "react";

/**
 * The 12-month plan, in the style of the HTML James sent back.
 *
 * That document is where this plan lived before 16 August: phase rails in their
 * own colour, a category badge per task, and the steps folded away behind an
 * arrow. He asked to go back to it, so the shapes here follow it rather than the
 * sprint views elsewhere in the app — same colours, same badges, same
 * expand-a-task-to-see-its-steps behaviour.
 */

type Step = { id: string; title: string; done: boolean; owner: string | null };
type Task = {
  id: string; title: string; dueLabel: string | null; category: string;
  owner: string | null; done: boolean; steps: Step[];
};
type Phase = {
  id: string; number: number; name: string; dates: string; goal: string;
  color: string; colorBg: string; tasks: Task[];
};

// Straight from the original document, so a category means the same colour it
// always did.
const CAT: Record<string, string> = {
  Legal: "#DC2626", Finance: "#059669", Operations: "#2563EB",
  Marketing: "#DB2777", Brand: "#7C3AED", Pricing: "#EA580C",
  Revenue: "#0D9488", Hiring: "#CA8A04",
};

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-[6px] rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
      <div
        className="h-full rounded-full"
        style={{ width: `${pct}%`, background: color, transition: "width .5s cubic-bezier(0.32,0.72,0,1)" }}
      />
    </div>
  );
}

export default function TwelveMonth() {
  const [phases, setPhases] = useState<Phase[]>([]);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () =>
    fetch("/api/phases")
      .then((r) => r.json())
      .then((d) => setPhases(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => {
    const tasks = phases.flatMap((p) => p.tasks);
    const steps = tasks.flatMap((t) => t.steps);
    return {
      tasks: tasks.length,
      tasksDone: tasks.filter((t) => t.done).length,
      steps: steps.length,
      stepsDone: steps.filter((s) => s.done).length,
    };
  }, [phases]);

  async function toggleStep(step: Step) {
    setBusy(step.id);
    // Optimistic, so a tick lands immediately on a phone.
    setPhases((ps) =>
      ps.map((p) => ({
        ...p,
        tasks: p.tasks.map((t) => ({
          ...t,
          steps: t.steps.map((s) => (s.id === step.id ? { ...s, done: !s.done } : s)),
        })),
      }))
    );
    try {
      await fetch(`/api/task-steps/${step.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: !step.done }),
      });
      await load();
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <p className="text-[15px] text-[var(--muted)]">Loading the plan…</p>;
  if (!phases.length) return <p className="text-[15px] text-[var(--muted)]">No plan loaded.</p>;

  return (
    <div className="space-y-12">
      {/* The header row from the original: four numbers, nothing else. */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          ["Tasks", stats.tasks],
          ["Steps", stats.steps],
          ["Steps done", stats.stepsDone],
          ["Tasks done", stats.tasksDone],
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-[12px] border border-white/10 p-4">
            <p className="text-[13px] tracking-[0.1em] uppercase text-[var(--muted-3)]">{label}</p>
            <p className="mt-1.5 text-[26px] leading-none tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      {phases.map((phase) => {
        const tDone = phase.tasks.filter((t) => t.done).length;
        const allSteps = phase.tasks.flatMap((t) => t.steps);
        const sDone = allSteps.filter((s) => s.done).length;
        const pct = allSteps.length ? (sDone / allSteps.length) * 100 : 0;

        return (
          <section key={phase.id}>
            {/* Phase header, carrying its own colour like the original rails. */}
            <div
              className="rounded-[12px] p-5 mb-6 border"
              style={{ background: phase.colorBg, borderColor: `${phase.color}55` }}
            >
              <p className="text-[13px] tracking-[0.12em] uppercase" style={{ color: phase.color }}>
                Phase {phase.number} · {phase.dates}
              </p>
              <p className="mt-1.5 text-[22px] leading-snug">{phase.name}</p>
              <p className="mt-2 text-[15px] leading-relaxed text-[var(--muted)]">{phase.goal}</p>
              <div className="mt-4">
                <Bar pct={pct} color={phase.color} />
                <p className="mt-2 text-[13px] tabular-nums text-[var(--muted-3)]">
                  {tDone}/{phase.tasks.length} tasks · {sDone}/{allSteps.length} steps
                </p>
              </div>
            </div>

            <div className="divide-y divide-white/10 border-t border-white/10">
              {phase.tasks.map((task) => {
                const isOpen = open[task.id];
                const done = task.steps.filter((s) => s.done).length;
                return (
                  <div key={task.id} className="py-4">
                    <button
                      onClick={() => setOpen((o) => ({ ...o, [task.id]: !o[task.id] }))}
                      className="w-full text-left flex items-start gap-3"
                    >
                      <span
                        className="mt-[3px] shrink-0 w-[18px] h-[18px] rounded-[5px] border flex items-center justify-center"
                        style={{
                          borderColor: task.done ? CAT[task.category] ?? phase.color : "rgba(255,255,255,0.25)",
                          background: task.done ? CAT[task.category] ?? phase.color : "transparent",
                        }}
                      >
                        {task.done && (
                          <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true">
                            <path d="M2 6.2 L4.7 9 L10 3.3" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className={`block text-[17px] leading-snug ${task.done ? "text-[var(--muted-3)] line-through" : ""}`}>
                          {task.title}
                        </span>
                        <span className="mt-1.5 flex flex-wrap items-center gap-2">
                          <span
                            className="text-[12px] px-2 py-[2px] rounded-full"
                            style={{ background: `${CAT[task.category] ?? phase.color}22`, color: CAT[task.category] ?? phase.color }}
                          >
                            {task.category}
                          </span>
                          {task.dueLabel && (
                            <span className="text-[13px] text-[var(--muted-3)]">{task.dueLabel}</span>
                          )}
                          {task.owner && task.owner !== "Unassigned" && (
                            <span className="text-[13px] text-[var(--muted-3)]">· {task.owner}</span>
                          )}
                          {task.steps.length > 0 && (
                            <span className="text-[13px] tabular-nums text-[var(--muted-3)]">
                              · {done}/{task.steps.length} steps
                            </span>
                          )}
                        </span>
                      </span>

                      <span className="shrink-0 text-[15px] text-[var(--muted-3)] mt-1">{isOpen ? "−" : "+"}</span>
                    </button>

                    {isOpen && task.steps.length > 0 && (
                      <ul className="mt-4 ml-[30px] space-y-3">
                        {task.steps.map((s) => (
                          <li key={s.id}>
                            <button
                              onClick={() => toggleStep(s)}
                              disabled={busy === s.id}
                              className="w-full text-left flex items-start gap-2.5 min-h-[32px]"
                            >
                              <span
                                className="mt-[3px] shrink-0 w-[15px] h-[15px] rounded-[4px] border flex items-center justify-center"
                                style={{
                                  borderColor: s.done ? phase.color : "rgba(255,255,255,0.22)",
                                  background: s.done ? phase.color : "transparent",
                                }}
                              >
                                {s.done && (
                                  <svg width="9" height="9" viewBox="0 0 12 12" aria-hidden="true">
                                    <path d="M2 6.2 L4.7 9 L10 3.3" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                )}
                              </span>
                              <span className={`text-[15px] leading-relaxed ${s.done ? "text-[var(--muted-3)] line-through" : "text-[var(--muted)]"}`}>
                                {s.title}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
