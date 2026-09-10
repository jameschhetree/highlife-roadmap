"use client";

import { useMemo, useState } from "react";

/**
 * Monday as a series of questions, and the one place the surfaces meet.
 *
 * The scorecard used to be a grid of twelve boxes. Filling it in told you
 * nothing, and the numbers then sat in the meeting while the OKRs, the triggers
 * and the week's commitments carried on separately — four screens with no
 * argument between them.
 *
 * This asks one question at a time, then ends on what the answers did: which
 * key results moved, which thresholds went red, and what that means for the
 * week. Nothing downstream is written without a tap, which is the rule
 * src/lib/measure.ts already set — a score is a judgement, not an output.
 */

export type Question = {
  field: string;
  ask: string;
  why: string;
  unit?: "money" | "percent" | "count" | "days";
};

// The Monday agenda, turned into the questions it is really asking.
export const MONDAY_QUESTIONS: Question[] = [
  { field: "cashCollected", ask: "How much cash came in last week?", why: "Everything on the scoreboard is downstream of this.", unit: "money" },
  { field: "musicRevenue", ask: "How much of that was studio?", why: "Splits the number so the podcast side is visible on its own.", unit: "money" },
  { field: "podcastRevenue", ask: "How much was podcast work?", why: "Recording, editing and post, one-off rather than recurring.", unit: "money" },
  { field: "podcastMrr", ask: "What is contracted recurring value now?", why: "The number the quarter is actually judged on.", unit: "money" },
  { field: "leads", ask: "How many new leads?", why: "Top of the funnel. Everything below is a rate against it.", unit: "count" },
  { field: "toursBooked", ask: "How many tours were booked?", why: "Booked, not showed. The gap between them is the show rate.", unit: "count" },
  { field: "toursShowed", ask: "How many actually showed up?", why: "Under 60 percent turns the show rate red.", unit: "count" },
  { field: "tourCloseRate", ask: "What percent of tours closed?", why: "Under 20 percent and the offer or the tour is the problem.", unit: "percent" },
  { field: "recurringConversion", ask: "What percent converted to recurring?", why: "One-off work does not compound. This is the one that does.", unit: "percent" },
  { field: "roomHours", ask: "How many hours was the podcast room used?", why: "Capacity. Sustained high usage is the trigger to open another room.", unit: "count" },
  { field: "editTurnaround", ask: "Average edit turnaround, in days?", why: "Ten days or more and delivery is the bottleneck, not sales.", unit: "days" },
  { field: "roadmapCompletion", ask: "What percent of last week's commitments landed on time?", why: "Under 70 percent means the plan is fiction.", unit: "percent" },
];

type Meeting = Record<string, unknown> & { id: string };

const PREFIX: Record<string, string> = { money: "$", percent: "", count: "", days: "" };
const SUFFIX: Record<string, string> = { money: "", percent: "%", count: "", days: " days" };

export default function MondayFlow({
  meeting,
  onSave,
  onDone,
  measured,
  triggers,
}: {
  meeting: Meeting;
  onSave: (field: string, value: string) => Promise<void>;
  onDone: () => void;
  /** Key results this week's numbers can answer for themselves. */
  measured: { id: string; label: string; text: string; current: number | null; suggested: number; value: string }[];
  /** Thresholds and whether this week's numbers put them in the red. */
  triggers: { metric: string; state: "green" | "yellow" | "red" | "unknown"; reading: string }[];
  }) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const questions = MONDAY_QUESTIONS;
  const atEnd = step >= questions.length;
  const q = atEnd ? null : questions[step];

  const answeredCount = useMemo(
    () => questions.filter((x) => {
      const v = draft[x.field] ?? meeting[x.field];
      return v !== undefined && v !== null && v !== "";
    }).length,
    [draft, meeting, questions]
  );

  async function commit(field: string, value: string) {
    setSaving(true);
    try {
      await onSave(field, value);
    } finally {
      setSaving(false);
    }
  }

  async function next() {
    if (q) {
      const v = draft[q.field];
      if (v !== undefined && v !== String(meeting[q.field] ?? "")) {
        await commit(q.field, v);
      }
    }
    setStep((s) => s + 1);
  }

  if (atEnd) {
    const reds = triggers.filter((t) => t.state === "red");
    const moved = measured.filter((m) => m.current !== m.suggested);

    return (
      <div className="space-y-8">
        <div>
          <p className="text-[13px] tracking-[0.14em] uppercase text-[var(--muted-3)]">Monday, done</p>
          <p className="mt-2 text-[19px] leading-snug">
            {answeredCount} of {questions.length} answered. Here is what they mean.
          </p>
        </div>

        {/* What the numbers did to the quarter. */}
        <section>
          <p className="text-[13px] tracking-[0.14em] uppercase text-[var(--muted-3)] mb-3">Key results</p>
          {moved.length === 0 ? (
            <p className="text-[15px] text-[var(--muted)]">Nothing this week's numbers can score moved.</p>
          ) : (
            <div className="space-y-4">
              {moved.map((m) => (
                <div key={m.id} className="flex items-start gap-3">
                  <span className="text-[12px] tracking-[0.1em] uppercase text-[var(--muted-3)] w-8 shrink-0 mt-1">
                    {m.label}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] leading-snug">{m.text}</p>
                    <p className="mt-1 text-[14px] text-[var(--muted)] tabular-nums">
                      {m.value} · scores {m.suggested.toFixed(2)}
                      {m.current != null && <span className="text-[var(--muted-3)]"> (was {m.current.toFixed(2)})</span>}
                    </p>
                  </div>
                </div>
              ))}
              <p className="text-[13px] text-[var(--muted-3)]">
                Open OKRs to accept these. They are not written for you.
              </p>
            </div>
          )}
        </section>

        {/* What the numbers did to the thresholds. */}
        <section>
          <p className="text-[13px] tracking-[0.14em] uppercase text-[var(--muted-3)] mb-3">Thresholds</p>
          {reds.length === 0 ? (
            <p className="text-[15px] text-[var(--muted)]">Nothing in the red.</p>
          ) : (
            <div className="space-y-2.5">
              {reds.map((t) => (
                <div key={t.metric} className="flex items-baseline gap-3">
                  <span className="shrink-0 text-[11px] tracking-[0.1em] uppercase text-[var(--alert,#c4614f)]">red</span>
                  <span className="min-w-0 flex-1 text-[15px] leading-snug">{t.metric}</span>
                  <span className="shrink-0 text-[14px] tabular-nums text-[var(--muted)]">{t.reading}</span>
                </div>
              ))}
              <p className="text-[13px] text-[var(--muted-3)]">
                The plan says a red threshold obliges a decision, not a discussion.
              </p>
            </div>
          )}
        </section>

        <div className="flex flex-wrap gap-2.5 pt-2">
          <button onClick={() => setStep(0)} className="min-h-[46px] px-5 rounded-full bezel text-[15px]">
            Go back through
          </button>
          <button onClick={onDone} className="min-h-[46px] px-5 rounded-full bezel text-[15px]">
            Close
          </button>
        </div>
      </div>
    );
  }

  const existing = meeting[q!.field];
  const value = draft[q!.field] ?? (existing == null ? "" : String(existing));

  return (
    <div className="space-y-7">
      <div>
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[13px] tracking-[0.14em] uppercase text-[var(--muted-3)]">
            Question {step + 1} of {questions.length}
          </p>
          <button onClick={onDone} className="text-[14px] text-[var(--muted-3)] min-h-[32px]">
            Close
          </button>
        </div>
        <div className="mt-3 h-[3px] rounded-full overflow-hidden" style={{ background: "var(--track)" }}>
          <div
            className="h-full rounded-full"
            style={{
              width: `${((step + 1) / questions.length) * 100}%`,
              background: "var(--text)",
              transition: "width .35s cubic-bezier(0.32,0.72,0,1)",
            }}
          />
        </div>
      </div>

      <div>
        <p className="text-[22px] leading-snug">{q!.ask}</p>
        <p className="mt-2 text-[15px] leading-relaxed text-[var(--muted)]">{q!.why}</p>
      </div>

      <div className="flex items-center gap-2">
        {PREFIX[q!.unit ?? "count"] && (
          <span className="text-[19px] text-[var(--muted)]">{PREFIX[q!.unit ?? "count"]}</span>
        )}
        <input
          autoFocus
          type="number"
          inputMode="decimal"
          value={value}
          placeholder="—"
          aria-label={q!.ask}
          onChange={(e) => setDraft((d) => ({ ...d, [q!.field]: e.target.value }))}
          onKeyDown={(e) => {
            if (e.key === "Enter") next();
          }}
          className="w-[160px] min-h-[52px] rounded-lg px-3 text-[20px] tabular-nums bg-[var(--card-2)] border border-[var(--line)] focus:outline-none focus:border-[var(--line-2)]"
        />
        {SUFFIX[q!.unit ?? "count"] && (
          <span className="text-[17px] text-[var(--muted)]">{SUFFIX[q!.unit ?? "count"]}</span>
        )}
      </div>

      <div className="flex flex-wrap gap-2.5">
        <button
          onClick={next}
          disabled={saving}
          className="min-h-[46px] px-6 rounded-full bezel text-[15px]"
        >
          {saving ? "Saving…" : step === questions.length - 1 ? "See what it means" : "Next"}
        </button>
        <button
          onClick={() => setStep((s) => s + 1)}
          className="min-h-[46px] px-4 text-[15px] text-[var(--muted-3)]"
        >
          Skip
        </button>
        {step > 0 && (
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className="min-h-[46px] px-4 text-[15px] text-[var(--muted-3)]"
          >
            Back
          </button>
        )}
      </div>
    </div>
  );
}
