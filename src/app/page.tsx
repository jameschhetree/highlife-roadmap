"use client";

/**
 * HighLife Roadmap.
 *
 * The eight views named in section 17 of the Operating System document, over the
 * item shape section 17 specifies. Deliberately not a Kanban board: the plan's
 * unit of work is a commitment with an owner and a due date, not a card drifting
 * between columns.
 *
 * Layout follows what Jaco asked for in July — divider-separated rows rather
 * than bordered boxes, shadow only where something is genuinely raised, and
 * underline tabs. He described the previous bordered-card version as the worst
 * build we had done.
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { isAdminAuthed } from "@/lib/admin-auth";

type View =
  | "ThisWeek" | "QuarterlyOKR" | "RevenueProject"
  | "ContentCalendar" | "Event" | "SOP" | "Blocked" | "DecisionLog";

type Item = {
  id: string; title: string; owner: string; pillar: string; view: string;
  quarterId: string | null; objectiveId: string | null;
  priority: "Critical" | "Standard" | "Backlog";
  status: "NotStarted" | "InProgress" | "Blocked" | "Done";
  dueDate: string | null; kpi: string; notes: string; dependency: string;
  sortOrder: number;
};
type KeyResult = { id: string; label: string; text: string; score: number | null };
type Objective = { id: string; kind: string; title: string; keyResults: KeyResult[] };
type Quarter = {
  id: string; key: string; name: string; dates: string; revenueTarget: string;
  cumulative: string; focus: string; isCurrent: boolean; objectives: Objective[];
};
type Week = { id: string; week: number; objective: string; deliverable: string; done: boolean };

const VIEWS: { key: View; label: string; blurb: string }[] = [
  { key: "ThisWeek", label: "This Week", blurb: "Leadership commitments due before next Monday." },
  { key: "QuarterlyOKR", label: "Quarterly OKRs", blurb: "Three company objectives per quarter. No more." },
  { key: "RevenueProject", label: "Revenue", blurb: "Offer, funnel, campaigns, partnerships and pricing tests." },
  { key: "ContentCalendar", label: "Content", blurb: "HL Podcast, commercial batches, freestyle and event deliverables." },
  { key: "Event", label: "Events", blurb: "Every event needs one primary KPI: revenue, leads, content or community." },
  { key: "SOP", label: "SOPs", blurb: "Document the work in the order revenue touches it." },
  { key: "Blocked", label: "Blocked", blurb: "Every item waiting on a decision, a person or a dependency." },
  { key: "DecisionLog", label: "Decisions", blurb: "Rockville, hires, package changes, new room capacity." },
];

const OBJECTIVE_LABEL: Record<string, string> = {
  RevenueEngine: "O1 · Revenue engine",
  OperatingSystem: "O2 · Operating system",
  BrandFootprint: "O3 · Brand & cultural footprint",
};

const STATUS_STYLE: Record<Item["status"], string> = {
  NotStarted: "text-[#9a9a94]",
  InProgress: "text-teal-700",
  Blocked: "text-red-700",
  Done: "text-[#b8b5ad] line-through",
};

const PILLARS = ["Revenue", "Podcast", "Music", "Media", "Merch", "Events", "Operations", "Finance"];
const PRIORITIES = ["Critical", "Standard", "Backlog"];
const STATUSES = ["NotStarted", "InProgress", "Blocked", "Done"];

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";

export default function RoadmapPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<View>("ThisWeek");
  const [quarters, setQuarters] = useState<Quarter[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!isAdminAuthed()) router.push("/login");
    else setReady(true);
  }, [router]);

  const load = async () => {
    const r = await fetch("/api/roadmap");
    if (!r.ok) { setError("Could not load the roadmap."); return; }
    const d = await r.json();
    setQuarters(d.quarters); setItems(d.items); setWeeks(d.weeks);
  };
  useEffect(() => { if (ready) load(); }, [ready]);

  const current = quarters.find((q) => q.isCurrent) ?? quarters[0];

  // Blocked is a status, not a stored view — an item is blocked wherever it lives.
  const visible = useMemo(() => {
    if (view === "Blocked") return items.filter((i) => i.status === "Blocked");
    return items.filter((i) => i.view === view);
  }, [items, view]);

  const patch = async (id: string, body: Partial<Item>) => {
    setError("");
    const r = await fetch(`/api/items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) { setError((await r.json()).error ?? "Could not save."); return; }
    load();
  };

  const remove = async (id: string) => {
    await fetch(`/api/items/${id}`, { method: "DELETE" });
    load();
  };

  const scoreKr = async (id: string, score: string) => {
    setError("");
    const r = await fetch(`/api/krs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ score: score === "" ? null : score }),
    });
    if (!r.ok) { setError((await r.json()).error ?? "Could not save."); return; }
    load();
  };

  const toggleWeek = async (w: Week) => {
    await fetch(`/api/weeks/${w.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !w.done }),
    });
    load();
  };

  if (!ready) return null;

  const done = items.filter((i) => i.status === "Done").length;
  const blocked = items.filter((i) => i.status === "Blocked").length;

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <header className="px-5 md:px-10 pt-8 md:pt-12 pb-6 max-w-[1180px] mx-auto">
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[11px] tracking-[0.22em] uppercase text-[#a3a099] mb-2">
              HighLife Operating System
            </p>
            <h1 className="text-[30px] md:text-[38px] leading-[1.05] font-semibold tracking-[-0.02em] text-[#1a1a1a]">
              Roadmap
            </h1>
          </div>
          {current && (
            <div className="text-right">
              <p className="text-[11px] tracking-[0.16em] uppercase text-[#a3a099]">{current.name}</p>
              <p className="text-[15px] text-[#4a4740] mt-1">{current.dates}</p>
            </div>
          )}
        </div>

        {current && (
          <div className="mt-8 flex flex-wrap gap-x-10 gap-y-4">
            <Stat label="Quarter target" value={current.revenueTarget} />
            <Stat label="Cumulative" value={current.cumulative} />
            <Stat label="Done" value={String(done)} />
            <Stat label="Blocked" value={String(blocked)} tone={blocked ? "warn" : undefined} />
          </div>
        )}
        {current && (
          <p className="mt-6 text-[15px] leading-relaxed text-[#4a4740] max-w-[68ch]">{current.focus}</p>
        )}
      </header>

      <nav className="sticky top-0 z-20 bg-[#FAFAF8]/92 backdrop-blur-sm border-b border-[#e8e5dd]">
        <div className="max-w-[1180px] mx-auto px-5 md:px-10">
          <div className="flex gap-7 overflow-x-auto no-scrollbar">
            {VIEWS.map((v) => {
              const n = v.key === "Blocked"
                ? blocked
                : items.filter((i) => i.view === v.key).length;
              const active = view === v.key;
              return (
                <button
                  key={v.key}
                  onClick={() => setView(v.key)}
                  className={`shrink-0 py-4 text-[14px] whitespace-nowrap border-b-2 -mb-px transition-colors ${
                    active
                      ? "border-[#1a1a1a] text-[#1a1a1a] font-medium"
                      : "border-transparent text-[#8a8780] hover:text-[#4a4740]"
                  }`}
                >
                  {v.label}
                  {n > 0 && <span className="ml-2 text-[12px] text-[#b0aca3] tabular-nums">{n}</span>}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      <main className="max-w-[1180px] mx-auto px-5 md:px-10 py-8 md:py-10">
        <p className="text-[14px] text-[#8a8780] mb-7">
          {VIEWS.find((v) => v.key === view)?.blurb}
        </p>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mb-6 px-4 py-3 rounded-lg bg-red-50 text-[14px] text-red-800"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {view === "QuarterlyOKR" ? (
          <OkrView quarters={quarters} onScore={scoreKr} />
        ) : (
          <>
            <ItemList items={visible} onPatch={patch} onDelete={remove} />
            {view !== "Blocked" && (
              <AddItem
                view={view}
                quarterId={current?.id ?? null}
                open={adding}
                setOpen={setAdding}
                onDone={load}
                onError={setError}
              />
            )}
            {view === "Blocked" && visible.length === 0 && (
              <Empty>Nothing is blocked. Mark an item blocked anywhere and it appears here.</Empty>
            )}
          </>
        )}

        {view === "ThisWeek" && weeks.length > 0 && (
          <section className="mt-16">
            <h2 className="text-[11px] tracking-[0.2em] uppercase text-[#a3a099] mb-1">
              First 12 weeks
            </h2>
            <p className="text-[14px] text-[#8a8780] mb-5">
              The 90-day execution plan. One objective per week.
            </p>
            <div className="divide-y divide-[#ece9e1]">
              {weeks.map((w) => (
                <button
                  key={w.id}
                  onClick={() => toggleWeek(w)}
                  className="w-full text-left py-4 flex gap-4 md:gap-6 items-start group"
                >
                  <span
                    className={`shrink-0 mt-[3px] w-[22px] h-[22px] rounded-full border flex items-center justify-center text-[11px] tabular-nums transition-colors ${
                      w.done
                        ? "bg-[#C8A45C] border-[#C8A45C] text-white"
                        : "border-[#d8d4ca] text-[#a3a099] group-hover:border-[#b8b4aa]"
                    }`}
                  >
                    {w.week}
                  </span>
                  <span className="min-w-0">
                    <span className={`block text-[15px] ${w.done ? "text-[#b8b5ad] line-through" : "text-[#1a1a1a]"}`}>
                      {w.objective}
                    </span>
                    <span className="block text-[13px] leading-relaxed text-[#8a8780] mt-1">
                      {w.deliverable}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "warn" }) {
  return (
    <div>
      <p className="text-[11px] tracking-[0.16em] uppercase text-[#a3a099] mb-1.5">{label}</p>
      <p className={`text-[26px] leading-none tabular-nums ${tone === "warn" ? "text-red-700" : "text-[#1a1a1a]"}`}>
        {value}
      </p>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-10 text-[15px] text-[#a3a099]">{children}</p>;
}

function ItemList({
  items, onPatch, onDelete,
}: {
  items: Item[];
  onPatch: (id: string, body: Partial<Item>) => void;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  if (items.length === 0) return <Empty>Nothing here yet.</Empty>;

  return (
    <div className="divide-y divide-[#ece9e1]">
      {items.map((it) => (
        <div key={it.id} className="py-4">
          <div className="flex items-start gap-4">
            {/* The dot stays 18px because a big circle looks clumsy next to the
                text, but the tappable area around it is a full 44. */}
            <button
              onClick={() => onPatch(it.id, { status: it.status === "Done" ? "NotStarted" : "Done" })}
              aria-label={it.status === "Done" ? "Mark not done" : "Mark done"}
              className="shrink-0 -m-[13px] p-[13px] flex items-start"
            >
              <span
                className={`block mt-[3px] w-[18px] h-[18px] rounded-full border transition-colors ${
                  it.status === "Done"
                    ? "bg-[#C8A45C] border-[#C8A45C]"
                    : "border-[#d8d4ca] hover:border-[#b8b4aa]"
                }`}
              />
            </button>
            <button onClick={() => setOpen(open === it.id ? null : it.id)} className="min-w-0 flex-1 text-left">
              <span className={`block text-[16px] leading-snug ${STATUS_STYLE[it.status]} ${it.status === "Done" ? "" : "text-[#1a1a1a]"}`}>
                {it.title}
              </span>
              <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-[#8a8780]">
                <span className="text-[#4a4740]">{it.owner}</span>
                <span className="text-[#d8d4ca]">·</span>
                <span>{it.pillar}</span>
                {it.priority === "Critical" && (
                  <>
                    <span className="text-[#d8d4ca]">·</span>
                    <span className="text-[#C8A45C]">Critical</span>
                  </>
                )}
                {it.dueDate && (
                  <>
                    <span className="text-[#d8d4ca]">·</span>
                    <span className="tabular-nums">{fmtDate(it.dueDate)}</span>
                  </>
                )}
                {it.status === "Blocked" && (
                  <>
                    <span className="text-[#d8d4ca]">·</span>
                    <span className="text-red-700">Blocked</span>
                  </>
                )}
              </span>
            </button>
          </div>

          <AnimatePresence>
            {open === it.id && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
                className="overflow-hidden"
              >
                <div className="pt-5 pl-[34px] pb-1 grid gap-4 sm:grid-cols-2 max-w-[720px]">
                  <Field label="Owner" value={it.owner} onSave={(v) => onPatch(it.id, { owner: v })} />
                  <Select label="Pillar" value={it.pillar} options={PILLARS} onSave={(v) => onPatch(it.id, { pillar: v })} />
                  <Select label="Priority" value={it.priority} options={PRIORITIES} onSave={(v) => onPatch(it.id, { priority: v as Item["priority"] })} />
                  <Select label="Status" value={it.status} options={STATUSES} onSave={(v) => onPatch(it.id, { status: v as Item["status"] })} />
                  <Field label="Due date" type="date" value={it.dueDate ? it.dueDate.slice(0, 10) : ""} onSave={(v) => onPatch(it.id, { dueDate: v || null })} />
                  <Field label="KPI / impact" value={it.kpi} onSave={(v) => onPatch(it.id, { kpi: v })} />
                  <Field label="Dependency" value={it.dependency} onSave={(v) => onPatch(it.id, { dependency: v })} className="sm:col-span-2" />
                  <Field label="Notes / evidence" value={it.notes} onSave={(v) => onPatch(it.id, { notes: v })} className="sm:col-span-2" />
                  <button
                    onClick={() => onDelete(it.id)}
                    className="justify-self-start text-[13px] text-[#b0aca3] hover:text-red-700 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

function Field({
  label, value, onSave, type = "text", className = "",
}: {
  label: string; value: string; onSave: (v: string) => void; type?: string; className?: string;
}) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return (
    <label className={`block ${className}`}>
      <span className="block text-[11px] tracking-[0.14em] uppercase text-[#a3a099] mb-1.5">{label}</span>
      <input
        type={type}
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => v !== value && onSave(v)}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        className="w-full min-h-[40px] bg-white rounded-lg px-3 py-2 text-[14px] text-[#1a1a1a] shadow-[0_1px_2px_rgba(0,0,0,0.04)] focus:outline-none focus:ring-2 focus:ring-[#C8A45C]/35"
      />
    </label>
  );
}

function Select({
  label, value, options, onSave,
}: { label: string; value: string; options: string[]; onSave: (v: string) => void }) {
  return (
    <label className="block">
      <span className="block text-[11px] tracking-[0.14em] uppercase text-[#a3a099] mb-1.5">{label}</span>
      <select
        value={value}
        onChange={(e) => onSave(e.target.value)}
        className="w-full min-h-[40px] bg-white rounded-lg px-3 py-2 text-[14px] text-[#1a1a1a] shadow-[0_1px_2px_rgba(0,0,0,0.04)] focus:outline-none focus:ring-2 focus:ring-[#C8A45C]/35"
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

function AddItem({
  view, quarterId, open, setOpen, onDone, onError,
}: {
  view: View; quarterId: string | null; open: boolean;
  setOpen: (b: boolean) => void; onDone: () => void; onError: (s: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [owner, setOwner] = useState("");
  const [due, setDue] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    onError("");
    const r = await fetch("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, owner, view, quarterId, dueDate: due || null }),
    });
    setSaving(false);
    if (!r.ok) { onError((await r.json()).error ?? "Could not save."); return; }
    setTitle(""); setOwner(""); setDue(""); setOpen(false);
    onDone();
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-4 min-h-[44px] pr-4 text-[14px] text-[#8a8780] hover:text-[#1a1a1a] transition-colors"
      >
        + Add item
      </button>
    );
  }

  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_180px_150px_auto] items-end max-w-[820px]">
      <label className="block">
        <span className="block text-[11px] tracking-[0.14em] uppercase text-[#a3a099] mb-1.5">Task</span>
        <input
          autoFocus value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="Clear verb + outcome"
          className="w-full min-h-[42px] bg-white rounded-lg px-3 py-2 text-[14px] shadow-[0_1px_2px_rgba(0,0,0,0.04)] focus:outline-none focus:ring-2 focus:ring-[#C8A45C]/35"
        />
      </label>
      <label className="block">
        <span className="block text-[11px] tracking-[0.14em] uppercase text-[#a3a099] mb-1.5">Owner</span>
        <input
          value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="Required"
          className="w-full min-h-[42px] bg-white rounded-lg px-3 py-2 text-[14px] shadow-[0_1px_2px_rgba(0,0,0,0.04)] focus:outline-none focus:ring-2 focus:ring-[#C8A45C]/35"
        />
      </label>
      <label className="block">
        <span className="block text-[11px] tracking-[0.14em] uppercase text-[#a3a099] mb-1.5">
          Due{view === "ThisWeek" ? "" : " (optional)"}
        </span>
        <input
          type="date" value={due} onChange={(e) => setDue(e.target.value)}
          className="w-full min-h-[42px] bg-white rounded-lg px-3 py-2 text-[14px] shadow-[0_1px_2px_rgba(0,0,0,0.04)] focus:outline-none focus:ring-2 focus:ring-[#C8A45C]/35"
        />
      </label>
      <div className="flex gap-2">
        <button
          onClick={submit} disabled={saving}
          className="min-h-[42px] px-5 rounded-lg bg-[#C8A45C] text-white text-[14px] font-medium disabled:opacity-50"
        >
          {saving ? "Saving" : "Add"}
        </button>
        <button
          onClick={() => { setOpen(false); onError(""); }}
          className="min-h-[42px] px-3 text-[14px] text-[#8a8780]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function OkrView({
  quarters, onScore,
}: { quarters: Quarter[]; onScore: (id: string, score: string) => void }) {
  const [openQ, setOpenQ] = useState<string | null>(
    quarters.find((q) => q.isCurrent)?.id ?? quarters[0]?.id ?? null
  );

  return (
    <div className="divide-y divide-[#ece9e1]">
      {quarters.map((q) => {
        const expanded = openQ === q.id;
        const scored = q.objectives.flatMap((o) => o.keyResults).filter((k) => k.score !== null);
        const avg = scored.length
          ? (scored.reduce((s, k) => s + (k.score ?? 0), 0) / scored.length).toFixed(2)
          : null;

        return (
          <div key={q.id} className="py-5">
            <button
              onClick={() => setOpenQ(expanded ? null : q.id)}
              className="w-full text-left flex items-baseline justify-between gap-4"
            >
              <span>
                <span className="text-[17px] text-[#1a1a1a]">
                  {q.name}
                  {q.isCurrent && (
                    <span className="ml-3 text-[11px] tracking-[0.14em] uppercase text-[#C8A45C]">Current</span>
                  )}
                </span>
                <span className="block text-[13px] text-[#8a8780] mt-1">{q.dates} · {q.revenueTarget}</span>
              </span>
              <span className="shrink-0 text-[13px] text-[#a3a099] tabular-nums">
                {avg ? `scored ${avg}` : `${q.cumulative} cum.`}
              </span>
            </button>

            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
                  className="overflow-hidden"
                >
                  <div className="pt-6 space-y-8">
                    {q.objectives.map((o) => (
                      <div key={o.id}>
                        <p className="text-[11px] tracking-[0.16em] uppercase text-[#a3a099] mb-2">
                          {OBJECTIVE_LABEL[o.kind] ?? o.kind}
                        </p>
                        <p className="text-[17px] leading-snug text-[#1a1a1a] mb-4 max-w-[62ch]">{o.title}</p>
                        <div className="space-y-3">
                          {o.keyResults.map((k) => (
                            <div key={k.id} className="flex gap-4 items-start">
                              <span className="shrink-0 w-[34px] pt-[3px] text-[12px] tabular-nums text-[#b0aca3]">
                                {k.label}
                              </span>
                              <span className="flex-1 text-[14px] leading-relaxed text-[#4a4740] max-w-[70ch]">
                                {k.text}
                              </span>
                              <input
                                type="number" min="0" max="1" step="0.1"
                                defaultValue={k.score ?? ""}
                                placeholder="–"
                                onBlur={(e) => {
                                  const next = e.target.value;
                                  if (next !== String(k.score ?? "")) onScore(k.id, next);
                                }}
                                aria-label={`Score for ${k.label}`}
                                className="shrink-0 w-[62px] min-h-[44px] bg-white rounded-lg px-2 text-[13px] text-center tabular-nums shadow-[0_1px_2px_rgba(0,0,0,0.04)] focus:outline-none focus:ring-2 focus:ring-[#C8A45C]/35"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
