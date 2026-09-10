"use client";

import { useEffect, useState } from "react";
import SprintRoad, { type RoadWeek } from "@/components/SprintRoad";
import { Dial } from "@/components/OkrDial";

/**
 * One screen that answers "where are we", without reading a list.
 *
 * This week is the to-do list; this is the map above it. Everything here is a
 * shape rather than a table: the sprint as a road, each phase as a filled bar,
 * each objective as a dial. Numbers are there to confirm what the shape already
 * said, not to be added up.
 */

type Phase = {
  id: string; number: number; name: string; dates: string; color: string; colorBg: string;
  tasks: { done: boolean; steps: { done: boolean }[] }[];
};
type KR = { id: string; score: number | null };
type Objective = { id: string; title: string; kind: string; keyResults: KR[] };

export default function Dashboard({
  weeks,
  currentWeek,
  objectives,
  openCommitments,
  cashThisMonth,
  cashTarget,
  onGo,
}: {
  weeks: RoadWeek[];
  currentWeek?: number;
  objectives: Objective[];
  openCommitments: number;
  cashThisMonth?: number | null;
  cashTarget?: number | null;
  onGo: (view: string) => void;
}) {
  const [phases, setPhases] = useState<Phase[]>([]);

  useEffect(() => {
    fetch("/api/phases")
      .then((r) => r.json())
      .then((d) => setPhases(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  const allTasks = phases.flatMap((p) => p.tasks);
  const allSteps = allTasks.flatMap((t) => t.steps);
  const stepsDone = allSteps.filter((s) => s.done).length;
  const weeksDone = weeks.filter((w) => w.done).length;
  const pacePct = cashTarget && cashThisMonth != null ? Math.round((cashThisMonth / cashTarget) * 100) : null;

  const tiles: [string, string, string | null][] = [
    ["Sprint", `${weeksDone}/${weeks.length}`, "weeks done"],
    ["12-month plan", `${stepsDone}/${allSteps.length}`, "steps done"],
    ["Open commitments", `${openCommitments}`, "due this week"],
    ["Pace", pacePct != null ? `${pacePct}%` : "—", "of this month"],
  ];

  return (
    <div className="space-y-14">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {tiles.map(([label, value, sub]) => (
          <div key={label} className="rounded-[12px] border border-white/10 p-4">
            <p className="text-[12px] tracking-[0.1em] uppercase text-[var(--muted-3)]">{label}</p>
            <p className="mt-1.5 text-[26px] leading-none tabular-nums">{value}</p>
            {sub && <p className="mt-1 text-[13px] text-[var(--muted-3)]">{sub}</p>}
          </div>
        ))}
      </div>

      {weeks.length > 0 && (
        <section>
          <p className="text-[13px] tracking-[0.12em] uppercase text-[var(--muted-3)] mb-4">The sprint</p>
          <SprintRoad weeks={weeks} currentWeek={currentWeek} />
        </section>
      )}

      {phases.length > 0 && (
        <section>
          <button
            onClick={() => onGo("Roadmap12")}
            className="text-[13px] tracking-[0.12em] uppercase text-[var(--muted-3)] mb-4 block"
          >
            The twelve months →
          </button>
          <div className="space-y-4">
            {phases.map((p) => {
              const steps = p.tasks.flatMap((t) => t.steps);
              const done = steps.filter((s) => s.done).length;
              const pct = steps.length ? (done / steps.length) * 100 : 0;
              return (
                <div key={p.id}>
                  <div className="flex items-baseline justify-between gap-3 mb-1.5">
                    <p className="text-[15px]">
                      <span style={{ color: p.color }}>Phase {p.number}</span> · {p.name}
                    </p>
                    <p className="text-[13px] tabular-nums text-[var(--muted-3)] shrink-0">
                      {done}/{steps.length}
                    </p>
                  </div>
                  <div className="h-[6px] rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, background: p.color, transition: "width .5s cubic-bezier(0.32,0.72,0,1)" }}
                    />
                  </div>
                  <p className="mt-1 text-[12px] text-[var(--muted-3)]">{p.dates}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {objectives.length > 0 && (
        <section>
          <button
            onClick={() => onGo("QuarterlyOKR")}
            className="text-[13px] tracking-[0.12em] uppercase text-[var(--muted-3)] mb-4 block"
          >
            This quarter →
          </button>
          <div className="grid gap-6 sm:grid-cols-3">
            {objectives.map((o) => {
              const scored = o.keyResults.filter((k) => k.score != null);
              const avg = scored.length
                ? scored.reduce((n, k) => n + (k.score as number), 0) / scored.length
                : null;
              return (
                <div key={o.id} className="flex items-start gap-3">
                  <Dial score={avg} size={54} />
                  <div className="min-w-0">
                    <p className="text-[15px] leading-snug">{o.title}</p>
                    <p className="mt-1 text-[12.5px] text-[var(--muted-3)]">
                      {scored.length}/{o.keyResults.length} scored
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
