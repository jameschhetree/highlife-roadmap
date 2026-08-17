"use client";

/**
 * HighLife Roadmap.
 *
 * Black and white, built for the phone. The first version was designed on a
 * laptop and Jaco called it unreadable on mobile — 14px type, four stats crammed
 * into one row, dense rows of metadata. Everything here starts at 17px and
 * stacks rather than sitting side by side.
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isAdminAuthed } from "@/lib/admin-auth";
import { Eyebrow, Empty, Field, Choice, Button, Tick, Tag, Reveal, Panel, BLUR } from "@/components/ui";
import { gradeAll, type Card } from "@/lib/grade";

type View =
  | "ThisWeek" | "Meetings" | "QuarterlyOKR" | "Money" | "RevenueProject"
  | "ContentCalendar" | "Event" | "SOP" | "Systems" | "Blocked" | "DecisionLog";

type Item = {
  id: string; title: string; owner: string; pillar: string; view: string;
  quarterId: string | null; priority: "Critical" | "Standard" | "Backlog";
  status: "NotStarted" | "InProgress" | "Blocked" | "Done";
  dueDate: string | null; kpi: string; notes: string; dependency: string;
};
type KeyResult = { id: string; label: string; text: string; score: number | null };
type Objective = { id: string; kind: string; title: string; keyResults: KeyResult[] };
type Quarter = {
  id: string; name: string; dates: string; revenueTarget: string;
  cumulative: string; focus: string; isCurrent: boolean; objectives: Objective[];
};
type Week = { id: string; week: number; objective: string; deliverable: string; done: boolean };
type Month = { id: string; label: string; target: number; cumulative: number };
type Threshold = { id: string; metric: string; green: string; yellow: string; red: string };
type Test = { id: string; text: string; passed: boolean };
type Trigger = { id: string; kind: string; signal: string; condition: string; action: string; firing: boolean; notes: string };
type Offer = { id: string; name: string; price: string; designedFor: string; scope: string; isPackage: boolean; costStudied: boolean };
type Risk = { id: string; risk: string; showsUpAs: string; mitigation: string; mitigated: boolean; owner: string };
type Meeting = {
  id: string; kind: string; date: string;
  cashCollected: number | null; podcastRevenue: number | null; podcastMrr: number | null;
  musicRevenue: number | null; leads: number | null; toursBooked: number | null;
  toursShowed: number | null; tourCloseRate: number | null; recurringConversion: number | null;
  roomHours: number | null; editTurnaround: number | null; roadmapCompletion: number | null;
  prep: string; decisions: string; notes: string;
};

const TABS: { key: View; label: string; blurb: string }[] = [
  { key: "ThisWeek", label: "This week", blurb: "Commitments due before next Monday. One owner, one date." },
  { key: "Meetings", label: "Meetings", blurb: "Monday carries the scorecard. Wednesday and Sunday get a prep brief." },
  { key: "QuarterlyOKR", label: "OKRs", blurb: "Three company objectives per quarter. No more." },
  { key: "Money", label: "Money", blurb: "The monthly path to $250K, and the Monday thresholds." },
  { key: "RevenueProject", label: "Revenue", blurb: "Offer, funnel, campaigns, partnerships, pricing tests." },
  { key: "ContentCalendar", label: "Content", blurb: "Podcast, commercial batches, freestyle, events." },
  { key: "Event", label: "Events", blurb: "Every event needs one primary KPI." },
  { key: "SOP", label: "SOPs", blurb: "Documented in the order revenue touches the work." },
  { key: "Systems", label: "Systems", blurb: "Triggers, the offer ladder and the risk register. The conditions that oblige a decision." },
  { key: "Blocked", label: "Blocked", blurb: "Anything waiting on a decision, a person or a dependency." },
  { key: "DecisionLog", label: "Decisions", blurb: "Rockville, hires, packages, room capacity." },
];

const MEETINGS: { kind: string; label: string; when: string; agenda: string[]; scorecard: boolean }[] = [
  {
    kind: "MondayBusiness", label: "Monday business", when: "Mondays, 10:00 AM · 60–75 min", scorecard: true,
    agenda: [
      "Scoreboard — 10 min", "Sales funnel — 15 min", "Operations — 10 min",
      "People — 5 min", "Money — 10 min", "Roadmap and SOPs — 10 min",
      "Commit: owner and due date for the 3–5 biggest things — 10 min",
    ],
  },
  {
    kind: "MondayMonthly", label: "Monthly review", when: "First Monday · 90 min", scorecard: true,
    agenda: [
      "Revenue by line", "Podcast MRR entering and exiting the month",
      "Sales funnel and which channel created it", "Marketing spend, CPL, CAC",
      "Operations: utilization, turnaround, complaints", "Brand cadence and reach",
      "People: who is carrying too much, who is ready for more",
      "Finance: cash, receivables, upcoming obligations",
      "Next month: one revenue target, one funnel target, one operating target",
    ],
  },
  {
    kind: "WednesdayTeam", label: "Wednesday team", when: "Wednesdays, 5:30 PM · 45–60 min", scorecard: false,
    agenda: [
      "Wins and recognition — 5 min", "This week and next week bookings and events — 10 min",
      "Client-service or technical issues everyone can learn from — 10 min",
      "Training topic or SOP of the week — 15 min",
      "Intern assignments and accountability — 10 min", "Announcements and questions — 5 min",
    ],
  },
  {
    kind: "SundayBrand", label: "Sunday brand", when: "Sundays, 4:00 PM · 45–60 min", scorecard: false,
    agenda: [
      "Rank Music, Media and Merch 1–3 for the coming week",
      "Review what is in the content bank",
      "Decide the next podcast, freestyle, commercial or campaign",
      "Review the upcoming monthly event and its business objective",
      "Make the decisions, assign owners, then stop before it becomes a second Monday",
    ],
  },
];

const SCORECARD: [keyof Meeting, string][] = [
  ["cashCollected", "Cash collected"], ["podcastRevenue", "Podcast revenue"],
  ["podcastMrr", "Podcast MRR"], ["musicRevenue", "Music revenue"],
  ["leads", "Leads"], ["toursBooked", "Tours booked"], ["toursShowed", "Tours showed"],
  ["tourCloseRate", "Tour close rate %"], ["recurringConversion", "Recurring conversion %"],
  ["roomHours", "Podcast room hours"], ["editTurnaround", "Edit turnaround, days"],
  ["roadmapCompletion", "Roadmap completion %"],
];

const OBJECTIVE_LABEL: Record<string, string> = {
  RevenueEngine: "O1 · Revenue engine",
  OperatingSystem: "O2 · Operating system",
  BrandFootprint: "O3 · Brand and cultural footprint",
};

const PILLARS = ["Revenue", "Podcast", "Music", "Media", "Merch", "Events", "Operations", "Finance"];
const PRIORITIES = ["Critical", "Standard", "Backlog"];
const STATUSES = ["NotStarted", "InProgress", "Blocked", "Done"];

const money = (n: number) => `$${Math.round(n / 1000)}K`;
const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";
const today = () => new Date().toISOString().slice(0, 10);

export default function RoadmapPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<View>("ThisWeek");
  const [who, setWho] = useState("Everyone");
  const [quarters, setQuarters] = useState<Quarter[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [months, setMonths] = useState<Month[]>([]);
  const [thresholds, setThresholds] = useState<Threshold[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [systems, setSystems] = useState<{ triggers: Trigger[]; offers: Offer[]; risks: Risk[] }>(
    { triggers: [], offers: [], risks: [] }
  );
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!isAdminAuthed()) router.push("/login");
    else setReady(true);
  }, [router]);

  const load = async () => {
    const [r, m, sy] = await Promise.all([
      fetch("/api/roadmap"), fetch("/api/meetings"), fetch("/api/systems"),
    ]);
    if (!r.ok) { setError("Could not load the roadmap."); return; }
    const d = await r.json();
    setQuarters(d.quarters); setItems(d.items); setWeeks(d.weeks);
    setMonths(d.months ?? []); setThresholds(d.thresholds ?? []); setTests(d.tests ?? []);
    if (m.ok) setMeetings(await m.json());
    if (sy.ok) setSystems(await sy.json());
  };
  useEffect(() => { if (ready) load(); }, [ready]);

  const current = quarters.find((q) => q.isCurrent) ?? quarters[0];

  const owners = useMemo(
    () => ["Everyone", ...Array.from(new Set(items.map((i) => i.owner))).sort()],
    [items]
  );
  const byOwner = (list: Item[]) => (who === "Everyone" ? list : list.filter((i) => i.owner === who));

  const visible = useMemo(() => {
    const base = view === "Blocked"
      ? items.filter((i) => i.status === "Blocked")
      : items.filter((i) => i.view === view);
    return byOwner(base);
  }, [items, view, who]);

  const call = async (url: string, method: string, body?: unknown) => {
    setError("");
    const r = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!r.ok && r.status !== 204) {
      setError((await r.json().catch(() => ({}))).error ?? "Could not save.");
      return false;
    }
    await load();
    return true;
  };

  if (!ready) return null;

  const blocked = items.filter((i) => i.status === "Blocked").length;
  const openThisWeek = byOwner(items.filter((i) => i.view === "ThisWeek" && i.status !== "Done")).length;
  const unowned = items.filter((i) => i.owner === "Unassigned").length;

  return (
    <div className="min-h-screen bg-transparent">
      <header className="px-5 md:px-10 pt-14 pb-10 max-w-[900px] mx-auto">
        <Tag>HighLife Operating System</Tag>
        <h1 className="text-[38px] md:text-[52px] leading-[1.02] font-semibold tracking-[-0.03em]">
          Roadmap
        </h1>

        {current && (
          <>
            <p className="mt-4 text-[17px] leading-relaxed text-[#a0a0a0]">{current.focus}</p>
            {/* Stacked rows, not a four-across strip. On a phone that strip
                wrapped mid-label and was the worst of the readability problem. */}
            <Panel className="mt-8 px-5 md:px-6">
            <dl className="divide-y divide-white/[0.08]">
              <Row k={current.name} v={current.dates} />
              <Row k="Target this period" v={current.revenueTarget} big />
              <Row k="Cumulative by end of period" v={current.cumulative} big />
              <Row k="Open this week" v={String(openThisWeek)} big />
              {blocked > 0 && <Row k="Blocked" v={String(blocked)} big warn />}
              {unowned > 0 && <Row k="Still need an owner" v={String(unowned)} big warn />}
            </dl>
            </Panel>
          </>
        )}

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Link href="/plan" className="inline-block">
            <Button kind="solid" arrow>Read the plan</Button>
          </Link>
          <select
            value={who}
            onChange={(e) => setWho(e.target.value)}
            aria-label="Filter by owner"
            className="min-h-[48px] rounded-full px-5 text-[16px] bg-white/[0.04] border border-white/10 focus:outline-none focus:border-white/40"
          >
            {owners.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      </header>

      {/* The pill itself is what sticks. A full-width sticky wrapper is the
          edge-to-edge bar the standard bans, even when what you see floats. */}
      <nav className="px-3 md:px-8">
        <div style={BLUR(24, true)} className="sticky top-3 z-30 w-fit max-w-full mx-auto pill-nav px-2">
          <div className="flex gap-1 overflow-x-auto no-scrollbar">
            {TABS.map((t) => {
              const n = t.key === "Blocked" ? blocked
                : t.key === "Systems" ? systems.triggers.filter((x) => x.firing).length
                : ["Money", "Meetings", "QuarterlyOKR"].includes(t.key) ? 0
                : byOwner(items.filter((i) => i.view === t.key)).length;
              const active = view === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setView(t.key)}
                  className={`shrink-0 min-h-[46px] px-4 my-1 rounded-full text-[15px] whitespace-nowrap
                    transition-[background-color,color] duration-300 ${
                    active ? "bg-white text-black" : "text-[#9a9a9a] hover:text-white hover:bg-white/[0.06]"
                  }`}
                >
                  {t.label}
                  {n > 0 && (
                    <span className={`ml-2 text-[13px] tabular-nums ${active ? "text-black/50" : "text-[#666]"}`}>
                      {n}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      <main className="max-w-[900px] mx-auto px-5 md:px-10 pt-12 pb-32">
        <p className="text-[16px] leading-relaxed text-[#888] mb-7">
          {TABS.find((t) => t.key === view)?.blurb}
          {who !== "Everyone" && <span className="text-white"> Showing {who} only.</span>}
        </p>

        {error && (
          <div className="mb-6 px-4 py-3.5 rounded-xl text-[16px] leading-relaxed glass">
            {error}
          </div>
        )}

        {view === "QuarterlyOKR" && <Okrs quarters={quarters} call={call} />}
        {view === "Money" && <Money months={months} thresholds={thresholds} tests={tests} call={call} />}
        {view === "Meetings" && <MeetingsView meetings={meetings} months={months} thresholds={thresholds} call={call} />}
        {view === "Systems" && <Systems data={systems} call={call} />}

        {!["QuarterlyOKR", "Money", "Meetings", "Systems"].includes(view) && (
          <>
            <Items items={visible} call={call} />
            {view !== "Blocked" && (
              <AddItem
                view={view} quarterId={current?.id ?? null}
                open={adding} setOpen={setAdding} onDone={load} onError={setError}
              />
            )}
          </>
        )}

        {view === "ThisWeek" && weeks.length > 0 && (
          <Reveal className="mt-20 block">
            <Eyebrow>The first 12 weeks</Eyebrow>
            <p className="text-[16px] leading-relaxed text-[#888] mb-6">
              One objective per week. Week 1 is already loaded into This week above.
            </p>
            <div className="divide-y divide-white/10 border-t border-white/10">
              {weeks.map((w) => (
                <div key={w.id} className="py-5 flex gap-4">
                  <Tick
                    done={w.done} label={`Week ${w.week}`}
                    onClick={() => call(`/api/weeks/${w.id}`, "PATCH", { done: !w.done })}
                  />
                  <div className="min-w-0">
                    <p className={`text-[17px] leading-snug ${w.done ? "text-[#666] line-through" : ""}`}>
                      <span className="text-[#666] tabular-nums mr-2">{w.week}</span>
                      {w.objective}
                    </p>
                    <p className="mt-1.5 text-[15px] leading-relaxed text-[#888]">{w.deliverable}</p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        )}
      </main>
    </div>
  );
}

function Row({ k, v, big, warn }: { k: string; v: string; big?: boolean; warn?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3.5">
      <dt className="text-[15px] text-[#888]">{k}</dt>
      <dd className={`shrink-0 tabular-nums ${big ? "text-[22px]" : "text-[16px]"} ${warn ? "text-[#ff6b6b]" : ""}`}>
        {v}
      </dd>
    </div>
  );
}

function Items({
  items, call,
}: { items: Item[]; call: (u: string, m: string, b?: unknown) => Promise<boolean> }) {
  const [open, setOpen] = useState<string | null>(null);
  if (items.length === 0) return <Empty>Nothing here yet.</Empty>;

  return (
    <div className="divide-y divide-white/10 border-t border-white/10">
      {items.map((it) => (
        <div key={it.id} className="py-5">
          <div className="flex items-start gap-4">
            <Tick
              done={it.status === "Done"}
              label={it.status === "Done" ? "Mark not done" : "Mark done"}
              onClick={() => call(`/api/items/${it.id}`, "PATCH", {
                status: it.status === "Done" ? "NotStarted" : "Done",
              })}
            />
            <button onClick={() => setOpen(open === it.id ? null : it.id)} className="min-w-0 flex-1 text-left">
              <span className={`block text-[18px] leading-snug ${it.status === "Done" ? "text-[#666] line-through" : ""}`}>
                {it.title}
              </span>
              <span className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[15px] text-[#888]">
                <span className={it.owner === "Unassigned" ? "text-[#ff6b6b]" : "text-white"}>
                  {it.owner === "Unassigned" ? "Needs an owner" : it.owner}
                </span>
                <span className="text-[#444]">·</span>
                <span>{it.pillar}</span>
                {it.priority === "Critical" && (<><span className="text-[#444]">·</span><span className="text-white font-medium">Critical</span></>)}
                {it.dueDate && (<><span className="text-[#444]">·</span><span className="tabular-nums">{fmtDate(it.dueDate)}</span></>)}
                {it.status === "Blocked" && (<><span className="text-[#444]">·</span><span className="text-[#ff6b6b]">Blocked</span></>)}
              </span>
            </button>
          </div>

          {open === it.id && (
            <div className="pt-6 sm:pl-[34px] grid gap-5 sm:grid-cols-2">
              <Field label="Owner" value={it.owner} onSave={(v) => call(`/api/items/${it.id}`, "PATCH", { owner: v })} />
              <Choice label="Pillar" value={it.pillar} options={PILLARS} onSave={(v) => call(`/api/items/${it.id}`, "PATCH", { pillar: v })} />
              <Choice label="Priority" value={it.priority} options={PRIORITIES} onSave={(v) => call(`/api/items/${it.id}`, "PATCH", { priority: v })} />
              <Choice label="Status" value={it.status} options={STATUSES} onSave={(v) => call(`/api/items/${it.id}`, "PATCH", { status: v })} />
              <Field label="Due date" type="date" value={it.dueDate ? it.dueDate.slice(0, 10) : ""} onSave={(v) => call(`/api/items/${it.id}`, "PATCH", { dueDate: v || null })} />
              <Field label="KPI / impact" value={it.kpi} onSave={(v) => call(`/api/items/${it.id}`, "PATCH", { kpi: v })} />
              <Field label="Dependency" value={it.dependency} onSave={(v) => call(`/api/items/${it.id}`, "PATCH", { dependency: v })} className="sm:col-span-2" />
              <Field label="Notes / evidence" multiline value={it.notes} onSave={(v) => call(`/api/items/${it.id}`, "PATCH", { notes: v })} className="sm:col-span-2" />
              <button
                onClick={() => call(`/api/items/${it.id}`, "DELETE")}
                className="justify-self-start min-h-[44px] text-[15px] text-[#888]"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
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

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="mt-7 min-h-[48px] text-[16px] text-[#888]">
        + Add item
      </button>
    );
  }

  const submit = async () => {
    setSaving(true); onError("");
    const r = await fetch("/api/items", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, owner, view, quarterId, dueDate: due || null }),
    });
    setSaving(false);
    if (!r.ok) { onError((await r.json()).error ?? "Could not save."); return; }
    setTitle(""); setOwner(""); setDue(""); setOpen(false); onDone();
  };

  return (
    <div className="mt-7 grid gap-4">
      <Field label="Task" value={title} onSave={setTitle} placeholder="Clear verb and outcome" />
      <Field label="Owner — required" value={owner} onSave={setOwner} placeholder="One name" />
      <Field label={view === "ThisWeek" ? "Due date — required" : "Due date"} type="date" value={due} onSave={setDue} />
      <div className="flex gap-3">
        <Button kind="solid" onClick={submit} disabled={saving}>{saving ? "Saving" : "Add"}</Button>
        <Button onClick={() => { setOpen(false); onError(""); }}>Cancel</Button>
      </div>
    </div>
  );
}

function Okrs({
  quarters, call,
}: { quarters: Quarter[]; call: (u: string, m: string, b?: unknown) => Promise<boolean> }) {
  const [openQ, setOpenQ] = useState<string | null>(
    quarters.find((q) => q.isCurrent)?.id ?? quarters[0]?.id ?? null
  );
  return (
    <div className="divide-y divide-white/10 border-t border-white/10">
      {quarters.map((q) => {
        const open = openQ === q.id;
        const scored = q.objectives.flatMap((o) => o.keyResults).filter((k) => k.score !== null);
        const avg = scored.length
          ? (scored.reduce((s, k) => s + (k.score ?? 0), 0) / scored.length).toFixed(2)
          : null;
        return (
          <div key={q.id} className="py-5">
            <button onClick={() => setOpenQ(open ? null : q.id)} className="w-full text-left">
              <span className="flex items-baseline justify-between gap-3">
                <span className="text-[20px]">
                  {q.name}
                  {q.isCurrent && <span className="ml-3 text-[12px] tracking-[0.14em] uppercase text-[#888]">Current</span>}
                </span>
                <span className="shrink-0 text-[15px] text-[#888]">{open ? "−" : "+"}</span>
              </span>
              <span className="block mt-1.5 text-[15px] text-[#888]">{q.dates}</span>
              {/* Spelled out. "$52K cum." meant nothing at a glance. */}
              <span className="block mt-1 text-[15px] text-[#888]">
                {q.revenueTarget} this period · {q.cumulative} cumulative
                {avg && <> · scored {avg}</>}
              </span>
            </button>

            {open && (
              <div className="pt-7 space-y-9">
                {q.objectives.map((o) => (
                  <div key={o.id}>
                    <Eyebrow>{OBJECTIVE_LABEL[o.kind] ?? o.kind}</Eyebrow>
                    <p className="text-[19px] leading-snug mb-5">{o.title}</p>
                    <div className="space-y-6">
                      {o.keyResults.map((k) => (
                        <div key={k.id}>
                          <p className="text-[16px] leading-relaxed text-[#a0a0a0]">
                            <span className="text-[#666] tabular-nums mr-2">{k.label}</span>
                            {k.text}
                          </p>
                          <div className="mt-2.5 flex items-center gap-3">
                            <span className="text-[13px] tracking-[0.1em] uppercase text-[#666]">Score</span>
                            <input
                              type="number" min="0" max="1" step="0.1"
                              defaultValue={k.score ?? ""} placeholder="—"
                              aria-label={`Score for ${k.label}`}
                              onBlur={(e) => {
                                if (e.target.value !== String(k.score ?? "")) {
                                  call(`/api/krs/${k.id}`, "PATCH", { score: e.target.value });
                                }
                              }}
                              className="w-[86px] min-h-[46px] rounded-lg px-2 text-[16px] text-center tabular-nums bg-white/[0.04] border border-white/10 focus:outline-none focus:border-white/40"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Money({
  months, thresholds, tests, call,
}: {
  months: Month[]; thresholds: Threshold[]; tests: Test[];
  call: (u: string, m: string, b?: unknown) => Promise<boolean>;
}) {
  return (
    <>
      <section>
        <Eyebrow>The monthly path</Eyebrow>
        <p className="text-[16px] leading-relaxed text-[#888] mb-6">
          $250K cumulative is the floor. Manage toward $275K so one weak month does not break the goal.
        </p>
        <div className="divide-y divide-white/10 border-y border-white/10">
          {months.map((m) => (
            <div key={m.id} className="py-4 flex items-baseline justify-between gap-4">
              <span className="text-[16px]">{m.label}</span>
              <span className="shrink-0 text-right tabular-nums">
                <span className="text-[18px]">{money(m.target)}</span>
                <span className="block text-[14px] text-[#888]">{money(m.cumulative)} cumulative</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-16">
        <Eyebrow>Monday thresholds</Eyebrow>
        <p className="text-[16px] leading-relaxed text-[#888] mb-6">
          Recalibrate after 60–90 days of real data. Using the same definition every week matters more
          than the exact number.
        </p>
        <div className="divide-y divide-white/10 border-y border-white/10">
          {thresholds.map((t) => (
            <div key={t.id} className="py-4">
              <p className="text-[17px]">{t.metric}</p>
              <p className="mt-1.5 text-[15px] text-[#888] tabular-nums">
                Green {t.green} · Yellow {t.yellow} · Red {t.red}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-16">
        <Eyebrow>True after 90 days</Eyebrow>
        <p className="text-[16px] leading-relaxed text-[#888] mb-6">
          The test of whether the first quarter actually worked.
        </p>
        <div className="divide-y divide-white/10 border-t border-white/10">
          {tests.map((t) => (
            <div key={t.id} className="py-4 flex gap-4">
              <Tick
                done={t.passed} label={t.text}
                onClick={() => call(`/api/tests/${t.id}`, "PATCH", { passed: !t.passed })}
              />
              <p className={`text-[17px] leading-relaxed ${t.passed ? "text-[#666] line-through" : ""}`}>
                {t.text}
              </p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

/** The one place colour is allowed. A card is a signal, not decoration. */
const CARD_STYLE: Record<Exclude<Card, null>, string> = {
  green: "bg-[#0b7a35]/85 border border-[#16a34a]/40 text-white",
  yellow: "bg-[#a37000]/85 border border-[#eab308]/40 text-white",
  red: "bg-[#9b0000]/85 border border-[#ef4444]/45 text-white",
};

function Cards({
  meeting, monthTarget, thresholds,
}: { meeting: Meeting; monthTarget: number | null; thresholds: Threshold[] }) {
  const graded = gradeAll(meeting, monthTarget);
  const known = Object.values(graded).filter((g) => g.card !== null).length;

  return (
    <div className="mb-7">
      <Eyebrow>Cards</Eyebrow>
      {known === 0 && (
        <p className="text-[16px] leading-relaxed text-[#888] mb-4">
          Fill in the scorecard below and the cards appear. Nothing is graded until the number exists —
          a blank box is not a red.
        </p>
      )}
      <div className="divide-y divide-white/10 border-y border-white/10">
        {thresholds.map((t) => {
          const g = graded[t.metric];
          if (!g) return null;
          return (
            <div key={t.id} className="py-3.5 flex items-center gap-4">
              <span
                className={`shrink-0 w-[64px] text-center text-[12px] tracking-[0.1em] uppercase rounded-md py-1.5 ${
                  g.card ? CARD_STYLE[g.card] : "text-[#666] border border-white/10"
                }`}
              >
                {g.card ?? "—"}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[16px]">{t.metric}</span>
                <span className="block text-[14px] text-[#888] tabular-nums">
                  {g.display} · green {t.green}, yellow {t.yellow}, red {t.red}
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MeetingsView({
  meetings, months, thresholds, call,
}: {
  meetings: Meeting[]; months: Month[]; thresholds: Threshold[];
  call: (u: string, m: string, b?: unknown) => Promise<boolean>;
}) {
  const [openKind, setOpenKind] = useState<string | null>("MondayBusiness");

  return (
    <div className="space-y-10">
      {MEETINGS.map((def) => {
        const logged = meetings.filter((m) => m.kind === def.kind);
        const open = openKind === def.kind;
        return (
          <section key={def.kind} className="border-t border-white/10 pt-6">
            <button onClick={() => setOpenKind(open ? null : def.kind)} className="w-full text-left">
              <span className="flex items-baseline justify-between gap-3">
                <span className="text-[20px]">{def.label}</span>
                <span className="shrink-0 text-[15px] text-[#888]">{open ? "−" : "+"}</span>
              </span>
              <span className="block mt-1.5 text-[15px] text-[#888]">
                {def.when}
                {logged.length > 0 && <> · {logged.length} logged</>}
              </span>
            </button>

            {open && (
              <div className="mt-6">
                <Eyebrow>Agenda</Eyebrow>
                <ul className="mb-7 space-y-2.5">
                  {def.agenda.map((a) => (
                    <li key={a} className="text-[16px] leading-relaxed text-[#a0a0a0] pl-5 -indent-5">
                      <span className="text-[#444]">— </span>{a}
                    </li>
                  ))}
                </ul>

                <Button onClick={() => call("/api/meetings", "POST", { kind: def.kind, date: today() })}>
                  Log today&apos;s {def.label.toLowerCase()}
                </Button>

                <div className="mt-8 space-y-9">
                  {logged.length === 0 && (
                    <p className="text-[16px] text-[#888]">
                      Nothing recorded yet.
                      {def.scorecard
                        ? " Log one and the scorecard appears."
                        : " Log one and write the prep brief before you meet."}
                    </p>
                  )}
                  {logged.map((m) => (
                    <div key={m.id} className="border-t border-white/10 pt-5">
                      <div className="flex items-baseline justify-between gap-3 mb-5">
                        <p className="text-[17px] tabular-nums">
                          {new Date(m.date).toLocaleDateString("en-US", {
                            weekday: "short", month: "short", day: "numeric",
                          })}
                        </p>
                        <button
                          onClick={() => call(`/api/meetings/${m.id}`, "DELETE")}
                          className="min-h-[44px] text-[15px] text-[#888]"
                        >
                          Remove
                        </button>
                      </div>

                      {def.scorecard ? (
                        <>
                          <Cards
                            meeting={m}
                            thresholds={thresholds}
                            monthTarget={
                              months.find((mo) => mo.label.includes(
                                new Date(m.date).toLocaleDateString("en-US", { month: "short" })
                              ) && mo.label.includes(String(new Date(m.date).getFullYear())))?.target ?? null
                            }
                          />
                          <Eyebrow>Scorecard</Eyebrow>
                          <div className="grid gap-4 sm:grid-cols-2 mb-6">
                            {SCORECARD.map(([key, label]) => (
                              <Field
                                key={String(key)} label={label} type="number"
                                value={m[key] === null ? "" : String(m[key])}
                                onSave={(v) => call(`/api/meetings/${m.id}`, "PATCH", { [key]: v })}
                              />
                            ))}
                          </div>
                          <Field
                            label="Decisions and blockers" multiline value={m.decisions}
                            onSave={(v) => call(`/api/meetings/${m.id}`, "PATCH", { decisions: v })}
                          />
                        </>
                      ) : (
                        <Field
                          label="Prep brief — write this before the meeting" multiline value={m.prep}
                          placeholder={
                            def.kind === "WednesdayTeam"
                              ? "Bookings this week and next. Client or technical issues worth teaching from. Training topic. Intern assignments."
                              : "Where do Music, Media and Merch rank this week? What is in the content bank? Next podcast, freestyle or commercial? Upcoming event and its business objective."
                          }
                          onSave={(v) => call(`/api/meetings/${m.id}`, "PATCH", { prep: v })}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}


function Systems({
  data, call,
}: {
  data: { triggers: Trigger[]; offers: Offer[]; risks: Risk[] };
  call: (u: string, m: string, b?: unknown) => Promise<boolean>;
}) {
  const capacity = data.triggers.filter((t) => t.kind === "Capacity");
  const hiring = data.triggers.filter((t) => t.kind === "Hiring");
  const packages = data.offers.filter((o) => o.isPackage);
  const rates = data.offers.filter((o) => !o.isPackage);

  const TriggerList = ({ list }: { list: Trigger[] }) => (
    <div className="divide-y divide-white/10 border-t border-white/10">
      {list.map((t) => (
        <div key={t.id} className="py-5 flex gap-4">
          <Tick
            done={t.firing} label={`${t.signal} firing`}
            onClick={() => call(`/api/systems/trigger/${t.id}`, "PATCH", { firing: !t.firing })}
          />
          <div className="min-w-0">
            <p className="text-[17px] leading-snug">
              {t.signal}
              {t.firing && <span className="ml-3 text-[13px] tracking-[0.12em] uppercase text-[#ff6b6b]">Firing</span>}
            </p>
            <p className="mt-1.5 text-[15px] leading-relaxed text-[#888]">{t.condition}</p>
            {/* The action only matters once the condition is met, so it is shown
                as the consequence rather than as another line of description. */}
            <p className={`mt-2 text-[15px] leading-relaxed ${t.firing ? "text-white" : "text-[#666]"}`}>
              → {t.action}
            </p>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-16">
      <Reveal>
        <Eyebrow>Capacity triggers</Eyebrow>
        <p className="text-[16px] leading-relaxed text-[#888] mb-5">
          Tick one when the condition is true. The plan&apos;s discipline is that the action follows the
          trigger, not the mood of the room.
        </p>
        <TriggerList list={capacity} />
      </Reveal>

      <Reveal>
        <Eyebrow>Hiring triggers</Eyebrow>
        <p className="text-[16px] leading-relaxed text-[#888] mb-5">
          Grow leverage before hierarchy. Each of these names the structure to try first.
        </p>
        <TriggerList list={hiring} />
      </Reveal>

      <Reveal>
        <Eyebrow>The offer ladder</Eyebrow>
        <p className="text-[16px] leading-relaxed text-[#888] mb-5">
          Prices stay provisional until the cost study exists — real editor hours, production labour,
          revisions, commission and payment fees. Tick one once it has been costed.
        </p>
        <div className="divide-y divide-white/10 border-t border-white/10">
          {packages.map((o) => (
            <div key={o.id} className="py-5 flex gap-4">
              <Tick
                done={o.costStudied} label={`${o.name} costed`}
                onClick={() => call(`/api/systems/offer/${o.id}`, "PATCH", { costStudied: !o.costStudied })}
              />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-baseline gap-x-3 text-[17px]">
                  <span>{o.name}</span>
                  <span className="tabular-nums text-[#a0a0a0]">{o.price}</span>
                  {!o.costStudied && (
                    <span className="text-[13px] tracking-[0.1em] uppercase text-[#666]">not costed</span>
                  )}
                </p>
                <p className="mt-1.5 text-[15px] text-[#888]">{o.designedFor}</p>
                <p className="mt-2 text-[15px] leading-relaxed text-[#666]">{o.scope}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-8 mb-4 text-[13px] tracking-[0.14em] uppercase text-[#666]">Public rates</p>
        <div className="divide-y divide-white/10 border-t border-white/10">
          {rates.map((o) => (
            <div key={o.id} className="py-4 flex items-baseline justify-between gap-4">
              <span className="text-[16px]">{o.name}</span>
              <span className="shrink-0 text-[15px] tabular-nums text-[#a0a0a0]">{o.price}</span>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal>
        <Eyebrow>Risk register</Eyebrow>
        <p className="text-[16px] leading-relaxed text-[#888] mb-5">
          Tick a risk once its mitigation is actually in place, not once it is written down.
        </p>
        <div className="divide-y divide-white/10 border-t border-white/10">
          {data.risks.map((r) => (
            <div key={r.id} className="py-5 flex gap-4">
              <Tick
                done={r.mitigated} label={`${r.risk} mitigated`}
                onClick={() => call(`/api/systems/risk/${r.id}`, "PATCH", { mitigated: !r.mitigated })}
              />
              <div className="min-w-0 flex-1">
                <p className="text-[17px] leading-snug">{r.risk}</p>
                <p className="mt-1.5 text-[15px] leading-relaxed text-[#888]">Shows up as: {r.showsUpAs}</p>
                <p className="mt-2 text-[15px] leading-relaxed text-[#666]">{r.mitigation}</p>
                <div className="mt-3 max-w-[240px]">
                  <Field
                    label="Owner" value={r.owner}
                    onSave={(v) => call(`/api/systems/risk/${r.id}`, "PATCH", { owner: v })}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Reveal>
    </div>
  );
}
