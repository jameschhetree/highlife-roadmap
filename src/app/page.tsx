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
import { Assistant } from "@/components/assistant";
import { ThemeToggle } from "@/components/theme";
import { guideFor } from "@/lib/today";
import { suggest } from "@/lib/priorities";
import { rollUp, collectedByMonth, monthUnderReview } from "@/lib/rollup";
import { occurrenceToLog, nextOccurrence, pretty } from "@/lib/meetingDates";

type View =
  | "ThisWeek" | "Meetings" | "QuarterlyOKR" | "Money" | "RevenueProject"
  | "ContentCalendar" | "Event" | "SOP" | "Systems" | "Blocked" | "DecisionLog";

type Item = {
  id: string; title: string; owner: string; pillar: string; view: string;
  quarterId: string | null; priority: "Critical" | "Standard" | "Backlog";
  status: "NotStarted" | "InProgress" | "Blocked" | "Done";
  dueDate: string | null; kpi: string; notes: string; dependency: string; weekNumber: number | null;
};
type KeyResult = { id: string; label: string; text: string; score: number | null };
type Objective = { id: string; kind: string; title: string; keyResults: KeyResult[] };
type Quarter = {
  id: string; name: string; dates: string; revenueTarget: string;
  cumulative: string; focus: string; isCurrent: boolean; objectives: Objective[];
};
type Week = { id: string; week: number; objective: string; deliverable: string; done: boolean; startsOn: string | null };
type Month = { id: string; key: string; label: string; target: number; cumulative: number };
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
  // Ordered the way the plan runs, not alphabetically: today's work, then the
  // meeting that sets it, then the money it serves, then the quarter it rolls
  // up to, then the systems that watch it, then the working surfaces.
  { key: "ThisWeek", label: "This week", blurb: "Commitments due before next Monday. One owner, one date." },
  { key: "Meetings", label: "Meetings", blurb: "Monday carries the scorecard. Wednesday and Sunday get a prep brief." },
  { key: "Money", label: "Money", blurb: "The monthly path to $250K, and the Monday thresholds." },
  { key: "QuarterlyOKR", label: "OKRs", blurb: "Three company objectives per quarter. No more." },
  { key: "Systems", label: "Systems", blurb: "Triggers, the offer ladder and the risk register. The conditions that oblige a decision." },
  { key: "Blocked", label: "Blocked", blurb: "Not a list you add to. Set any item's status to Blocked and it appears here, wherever it lives." },
  { key: "RevenueProject", label: "Revenue", blurb: "Two things: who owns each way work comes in, and the experiments running against them." },
  { key: "ContentCalendar", label: "Content", blurb: "Podcast, commercial batches, freestyle, events." },
  { key: "Event", label: "Events", blurb: "Every event needs one primary KPI." },
  { key: "SOP", label: "SOPs", blurb: "Documented in the order revenue touches the work." },
  { key: "DecisionLog", label: "Decisions", blurb: "Rockville, hires, packages, room capacity." },
];

/**
 * The meetings, with section 10's agenda detail rather than just its headings.
 *
 * The doc gives each block a duration and a list of what it covers. Only the
 * headings were showing, which made the agenda a table of contents instead of
 * something you can run a meeting from.
 */
const MEETINGS: {
  kind: string; label: string; when: string;
  agenda: { item: string; mins?: string; detail: string }[];
  scorecard: boolean;
}[] = [
  {
    kind: "MondayBusiness", label: "Monday business", when: "Mondays, 10:00 AM · 60–75 min", scorecard: true,
    agenda: [
      { item: "Scoreboard", mins: "10 min", detail: "Cash collected against target, podcast revenue and MRR, studio revenue, bookings, the major wins and misses. The week that just ended, not the week ahead." },
      { item: "Sales funnel", mins: "15 min", detail: "Leads, tours booked and showed, proposals out, close rate, stuck deals, follow-up, the marketing report." },
      { item: "Operations", mins: "10 min", detail: "Upcoming bookings, delivery backlog, client issues, engineer and room capacity, quality." },
      { item: "People", mins: "5 min", detail: "Intern and team progress, staffing needs, accountability concerns." },
      { item: "Money", mins: "10 min", detail: "Spend, ad budget, commissions, collections, anything unusual, cash needs." },
      { item: "Roadmap and SOPs", mins: "10 min", detail: "Quarter OKRs, blocked tasks, SOP progress, decisions needed." },
      { item: "Commit", mins: "10 min", detail: "Owner and due date for the three to five most important commitments each." },
    ],
  },
  {
    kind: "MondayMonthly", label: "Monthly review", when: "First Monday · 90 min", scorecard: true,
    agenda: [
      { item: "Revenue", detail: "What did we collect, split by studio, podcast recording, post-production, on-location, events and merch?" },
      { item: "Podcast MRR", detail: "How much contracted recurring value did we enter and exit the month with? How many active recurring clients?" },
      { item: "Sales", detail: "How many leads, tours, shows, proposals, first sales and recurring conversions? Which channel created them?" },
      { item: "Marketing", detail: "What did we spend? CPL, CAC, creative winners and losers, outbound performance, next tests." },
      { item: "Operations", detail: "Room utilization, editing turnaround, revisions, complaints, late deliveries, capacity risks." },
      { item: "Brand", detail: "Did we hit podcast, commercial, freestyle and event cadence? What created leads or meaningful reach?" },
      { item: "People", detail: "Who is carrying too much? Who is ready for more responsibility? What training is needed?" },
      { item: "Finance", detail: "Cash balance, receivables, commissions, upcoming fixed obligations, unusual spend." },
      { item: "Next month", detail: "One revenue target, one funnel target, one operating target, and the key brand priorities." },
    ],
  },
  {
    kind: "WednesdayTeam", label: "Wednesday team", when: "Wednesdays, 5:30 PM · 45–60 min", scorecard: false,
    agenda: [
      { item: "Wins and recognition", mins: "5 min", detail: "Name what went well and who did it." },
      { item: "Bookings and events", mins: "10 min", detail: "This week and next week, plus anything the team needs to prepare for." },
      { item: "Client or technical issues", mins: "10 min", detail: "Only the ones everyone can learn something from." },
      { item: "Training topic or SOP", mins: "15 min", detail: "The SOP of the week, taught rather than circulated." },
      { item: "Intern assignments", mins: "10 min", detail: "Assignments, engineer accountability, team responsibilities." },
      { item: "Announcements", mins: "5 min", detail: "Culture, questions, anything outstanding." },
    ],
  },
  {
    kind: "SundayBrand", label: "Sunday brand", when: "Sundays, 4:00 PM · 45–60 min", scorecard: false,
    agenda: [
      { item: "Rank the pillars", detail: "Music, Media and Merch, one to three for the coming week, based on the quarter plan." },
      { item: "Content bank", detail: "Review what is already shot and unpublished." },
      { item: "Creative priorities", detail: "Decide the next HL Podcast, freestyle, commercial or campaign." },
      { item: "The monthly event", detail: "Review the upcoming event and its primary business objective." },
      { item: "Decide and assign", detail: "Make the creative decisions, give them owners, then stop before it becomes a second Monday." },
    ],
  },
];

const SCORECARD: [keyof Meeting, string][] = [
  ["cashCollected", "Cash collected"], ["podcastRevenue", "Podcast revenue"],
  ["podcastMrr", "Podcast MRR"], ["musicRevenue", "Studio revenue"],
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

/**
 * The seven days a Monday scorecard reports on: the week that just ended.
 * Monday's meeting is a recap, so cash collected on 17 August means the money
 * that came in between the 10th and the 16th.
 */
function coveringWeek(meetingDate: string): string {
  const end = new Date(Date.parse(meetingDate) - 86400000);
  const start = new Date(end.getTime() - 6 * 86400000);
  const f = (d: Date) =>
    d.toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric" });
  return `${f(start)} – ${f(end)}`;
}

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
  const [focus, setFocus] = useState<{
    focus: { text: string; why: string; owner?: string; section?: string }[];
    stale: boolean; generatedAt: string | null;
  }>({ focus: [], stale: true, generatedAt: null });
  const [thinking, setThinking] = useState(false);
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
    fetch("/api/focus").then((r) => (r.ok ? r.json() : null)).then((d) => d && setFocus(d)).catch(() => {});
  };
  useEffect(() => { if (ready) load(); }, [ready]);

  const current = quarters.find((q) => q.isCurrent) ?? quarters[0];

  // The live week is the last one whose Monday has passed. Before the sprint
  // starts that is week 1; after week 12 it stays on 12 rather than running off
  // the end of the plan.
  const currentWeek = useMemo(() => {
    const dated = weeks.filter((w) => w.startsOn);
    if (dated.length === 0) return null;
    const now = Date.now();
    const started = dated.filter((w) => Date.parse(w.startsOn!) <= now);
    return started.length ? started[started.length - 1] : dated[0];
  }, [weeks]);

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

  const guide = guideFor(new Date());
  const firing = systems.triggers.filter((t) => t.firing).length;
  const cadenceDone = weeks.filter((w) => w.done).length;
  const collectedTotal = (() => {
    const byMonth = collectedByMonth(
      meetings.filter((m) => m.kind === "MondayBusiness" || m.kind === "MondayMonthly") as never
    );
    const vals = Object.values(byMonth).filter((v): v is number => v != null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) : null;
  })();
  const blocked = items.filter((i) => i.status === "Blocked").length;
  const overdue = items.filter(
    (i) => i.dueDate && i.status !== "Done" && Date.parse(i.dueDate) < Date.now()
  ).length;
  const priorities = suggest({
    weekNumber: currentWeek?.week ?? null,
    weekObjective: currentWeek?.objective ?? null,
    weekLoaded: currentWeek ? items.some((i) => i.weekNumber === currentWeek.week) : true,
    unowned: items.filter((i) => i.owner === "Unassigned").length,
    blocked,
    overdue,
    firingTriggers: systems.triggers.filter((t) => t.firing).map((t) => ({ signal: t.signal, action: t.action })),
    uncostedPackages: systems.offers.filter((o) => o.isPackage && !o.costStudied).length,
    unmitigatedRisks: systems.risks.filter((r) => !r.mitigated).length,
    sopsOutstanding: items.filter((i) => i.view === "SOP" && i.priority === "Critical" && i.status !== "Done").length,
    monthLabel: null, monthTarget: null, collected: null,
  });
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
            <p className="mt-4 text-[17px] leading-relaxed text-[var(--muted)]">{current.focus}</p>
            {/* Stacked rows, not a four-across strip. On a phone that strip
                wrapped mid-label and was the worst of the readability problem. */}
            {/* Two across on a phone rather than four, so nothing shrinks. Each
                tile goes to the tab that explains it. */}
            <div className="mt-8 grid grid-cols-2 gap-3">
              <Tile label="Collected so far" value={collectedTotal == null ? "—" : money(collectedTotal)}
                sub={`of ${current.cumulative} by ${current.name.replace("Launch Sprint", "Sep 30")}`}
                onClick={() => setView("Money")} />
              <Tile label="This period" value={current.revenueTarget}
                sub={current.dates} onClick={() => setView("Money")} />
              <Tile label="Open this week" value={String(openThisWeek)}
                sub={overdue > 0 ? `${overdue} past due` : "on time"} warn={overdue > 0}
                onClick={() => setView("ThisWeek")} />
              <Tile label="Week" value={currentWeek ? `${currentWeek.week} of 12` : "—"}
                sub={currentWeek?.objective ?? ""} onClick={() => setView("ThisWeek")} />
              {unowned > 0 && (
                <Tile label="Need an owner" value={String(unowned)} sub="an idea, not a task" warn
                  onClick={() => setView("ThisWeek")} />
              )}
              {blocked > 0 && (
                <Tile label="Blocked" value={String(blocked)} sub="clear on Monday" warn
                  onClick={() => setView("Blocked")} />
              )}
              {firing > 0 && (
                <Tile label="Triggers firing" value={String(firing)} sub="the action follows the trigger" warn
                  onClick={() => setView("Systems")} />
              )}
              <Tile label="Cadence" value={`${cadenceDone}/${weeks.length}`}
                sub="execution weeks done" onClick={() => setView("ThisWeek")} />
            </div>
          </>
        )}

        {/* What the plan says to do today, so nobody has to work out which part
            of a 38-page document applies on a Wednesday. */}
        <Panel className="mt-8 px-5 py-5">
          <p className="text-[11px] tracking-[0.18em] uppercase text-[var(--muted-3)] mb-2">
            {guide.weekday}
          </p>
          <p className="text-[19px] leading-snug mb-2">{guide.headline}</p>
          <p className="text-[15px] leading-relaxed text-[var(--muted)]">{guide.detail}</p>
          {guide.goTo && (
            <div className="mt-5">
              <Button arrow onClick={() => setView(guide.goTo as View)}>{guide.goToLabel}</Button>
            </div>
          )}
        </Panel>

        {view === "ThisWeek" && (() => {
          const open = items.filter((i) => i.view === "ThisWeek" && i.status !== "Done");
          const named = [...new Set(open.map((i) => i.owner))].filter((o) => o !== "Unassigned");
          if (named.length === 0) return null;
          return (
            <Panel className="mt-4 px-5 py-5">
              <p className="text-[11px] tracking-[0.18em] uppercase text-[var(--muted-3)] mb-1">
                Commitments per owner
              </p>
              <p className="text-[14px] leading-relaxed text-[var(--muted-3)] mb-4">
                The plan gives each owner three to five for the week. Not three to five between you.
              </p>
              <dl className="divide-y divide-white/[0.08]">
                {named.map((o) => {
                  const n = open.filter((i) => i.owner === o).length;
                  const state = n > 5 ? "too many" : n < 3 ? "light" : null;
                  return (
                    <div key={o} className="flex items-baseline justify-between gap-4 py-3">
                      <dt className="text-[16px]">{o}</dt>
                      <dd className="shrink-0 text-right">
                        <span className={`text-[20px] tabular-nums ${n > 5 ? "text-[var(--alert)]" : ""}`}>{n}</span>
                        {state && <span className="ml-2 text-[14px] text-[var(--muted)]">{state}</span>}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </Panel>
          );
        })()}

        {view === "ThisWeek" && (
          <Panel className="mt-4 px-5 py-5">
            <div className="flex items-baseline justify-between gap-4 mb-1">
              <p className="text-[11px] tracking-[0.18em] uppercase text-[var(--muted-3)]">
                What this week should be about
              </p>
              {focus.generatedAt && !focus.stale && (
                <span className="shrink-0 text-[12px] text-[var(--muted-3)]">read from the plan</span>
              )}
            </div>

            {focus.focus.length === 0 ? (
              <p className="text-[15px] leading-relaxed text-[var(--muted)] mb-4">
                Nothing worked out yet. This reads your plan against the current state — the quarter's
                objectives, this week's deliverable, who owns what — and names the three to five things
                that actually move it.
              </p>
            ) : (
              <>
                {focus.stale && (
                  <p className="text-[14px] leading-relaxed text-[var(--warn)] mb-4">
                    Owners or statuses have changed since this was worked out. Refresh it.
                  </p>
                )}
                <ol className="space-y-5 mb-5">
                  {focus.focus.map((f, i) => (
                    <li key={i}>
                      <p className="text-[17px] leading-snug">
                        <span className="text-[var(--muted-3)] tabular-nums mr-2">{i + 1}</span>
                        {f.text}
                      </p>
                      <p className="mt-1.5 text-[14px] leading-relaxed text-[var(--muted)]">{f.why}</p>
                      <p className="mt-1.5 text-[13px] text-[var(--muted-3)]">
                        {f.owner && (
                          <span className={f.owner === "Needs an owner" ? "text-[var(--alert)]" : ""}>{f.owner}</span>
                        )}
                        {f.section && <> · plan section {f.section}</>}
                      </p>
                    </li>
                  ))}
                </ol>
              </>
            )}

            <Button
              onClick={async () => {
                setThinking(true);
                const r = await fetch("/api/focus", { method: "POST" });
                if (r.ok) setFocus(await r.json());
                else setError((await r.json().catch(() => ({}))).error ?? "Could not work it out.");
                setThinking(false);
              }}
              disabled={thinking}
            >
              {thinking ? "Reading the plan…" : focus.focus.length ? "Work it out again" : "Work out this week"}
            </Button>
          </Panel>
        )}

        {view === "ThisWeek" && priorities.length > 0 && (
          <Panel soft className="mt-4 px-5 py-5">
            <p className="text-[11px] tracking-[0.18em] uppercase text-[var(--muted-3)] mb-3">
              Housekeeping
            </p>
            <ul className="space-y-3">
              {priorities.map((s, i) => (
                <li key={i}>
                  <button onClick={() => s.goTo && setView(s.goTo as View)} className="text-left w-full min-h-[44px]">
                    <span className="block text-[16px] leading-snug">{s.text}</span>
                    <span className="block mt-1 text-[13px] leading-relaxed text-[var(--muted-3)]">{s.why}</span>
                  </button>
                </li>
              ))}
            </ul>
          </Panel>
        )}

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Link href="/plan" className="inline-block">
            <Button kind="solid" arrow>Read the plan</Button>
          </Link>
          <ThemeToggle />
          <select
            value={who}
            onChange={(e) => setWho(e.target.value)}
            aria-label="Filter by owner"
            className="min-h-[48px] rounded-full px-5 text-[16px]"
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
            {TABS.filter((t) => t.key !== "Blocked" || blocked > 0).map((t) => {
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
                    active ? "bg-[var(--text)] text-[var(--bg)]" : "text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--text)]/[0.06]"
                  }`}
                >
                  {t.label}
                  {n > 0 && (
                    <span className={`ml-2 text-[13px] tabular-nums ${active ? "text-[var(--bg)] opacity-60" : "text-[var(--muted-3)]"}`}>
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
        <p className="text-[16px] leading-relaxed text-[var(--muted)] mb-7">
          {TABS.find((t) => t.key === view)?.blurb}
          {who !== "Everyone" && <span className="text-[var(--text)]"> Showing {who} only.</span>}
        </p>

        {error && (
          <div className="mb-6 px-4 py-3.5 rounded-xl text-[16px] leading-relaxed glass">
            {error}
          </div>
        )}

        {view === "QuarterlyOKR" && <Okrs quarters={quarters} call={call} />}
        {view === "Money" && <Money months={months} thresholds={thresholds} tests={tests} meetings={meetings} call={call} />}
        {view === "Meetings" && <MeetingsView meetings={meetings} months={months} thresholds={thresholds} call={call} />}
        {view === "Systems" && <Systems data={systems} call={call} />}

        {view === "ThisWeek" && currentWeek && (
          <Panel className="mb-8 px-5 py-5">
            <p className="text-[11px] tracking-[0.18em] uppercase text-[var(--muted-3)] mb-2">
              Week {currentWeek.week} of 12
            </p>
            <p className="text-[19px] leading-snug mb-2">{currentWeek.objective}</p>
            <p className="text-[15px] leading-relaxed text-[var(--muted)]">{currentWeek.deliverable}</p>
            {!items.some((i) => i.weekNumber === currentWeek.week) && (
              <div className="mt-5">
                <Button kind="solid" arrow onClick={() => call(`/api/weeks/${currentWeek.id}/load`, "POST")}>
                  Pull this week in
                </Button>
              </div>
            )}
          </Panel>
        )}

        {!["QuarterlyOKR", "Money", "Meetings", "Systems"].includes(view) && (
          <>
            {view === "RevenueProject" && (
              <div className="mb-8">
                <Eyebrow>Who owns what</Eyebrow>
                <p className="text-[16px] leading-relaxed text-[var(--muted)]">
                  You asked whether this is a responsibility tab. For the five rows below, yes — they are
                  the channels from section 07, each permanently owned and judged on its own numbers.
                  They are not tasks and they never get ticked off. Anything you add here is different:
                  an offer test, a campaign, a pricing change — work with an end.
                </p>
              </div>
            )}

            {visible.length === 0 && view === "Blocked" ? (
              <Empty>
                Nothing is blocked, which is what you want. This tab fills itself: open any item
                anywhere in the app, set its status to Blocked, and it shows up here too. Monday is for
                clearing it.
              </Empty>
            ) : (
              <Items items={visible} call={call} />
            )}
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
            <p className="text-[16px] leading-relaxed text-[var(--muted)] mb-6">
              One objective per week, straight from the plan. Pull a week in and it becomes editable
              commitments above — assign the owners, change the wording, add what the plan did not think of.
            </p>
            <div className="divide-y divide-white/10 border-t border-white/10">
              {weeks.map((w) => {
                const loaded = items.some((i) => i.weekNumber === w.week);
                const isNow = currentWeek?.week === w.week;
                return (
                  <div key={w.id} className="py-5 flex gap-4">
                    <Tick
                      done={w.done} label={`Week ${w.week}`}
                      onClick={() => call(`/api/weeks/${w.id}`, "PATCH", { done: !w.done })}
                    />
                    <div className="min-w-0 flex-1">
                      <p className={`text-[17px] leading-snug ${w.done ? "text-[var(--muted-3)] line-through" : ""}`}>
                        <span className="text-[var(--muted-3)] tabular-nums mr-2">{w.week}</span>
                        {w.objective}
                        {isNow && (
                          <span className="ml-3 text-[12px] tracking-[0.14em] uppercase text-[var(--text)]">This week</span>
                        )}
                      </p>
                      <p className="mt-1.5 text-[15px] leading-relaxed text-[var(--muted)]">{w.deliverable}</p>
                      <div className="mt-3">
                        {loaded ? (
                          <span className="text-[14px] text-[var(--muted-3)]">Already pulled into This week</span>
                        ) : (
                          <Button onClick={() => call(`/api/weeks/${w.id}/load`, "POST")}>
                            Pull week {w.week} in
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Reveal>
        )}
      </main>

      <Assistant onChanged={load} />
    </div>
  );
}

function Tile({
  label, value, sub, warn, onClick,
}: { label: string; value: string; sub?: string; warn?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-left">
      <Panel className="h-full px-4 py-4 hover:bg-white/[0.09] transition-colors">
        <p className="text-[11px] tracking-[0.16em] uppercase text-[var(--muted-3)] mb-2">{label}</p>
        <p className={`text-[28px] leading-none tabular-nums ${warn ? "text-[var(--alert)]" : ""}`}>{value}</p>
        {sub && <p className="mt-2 text-[13px] leading-snug text-[var(--muted)]">{sub}</p>}
      </Panel>
    </button>
  );
}

function Row({ k, v, big, warn }: { k: string; v: string; big?: boolean; warn?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3.5">
      <dt className="text-[15px] text-[var(--muted)]">{k}</dt>
      <dd className={`shrink-0 tabular-nums ${big ? "text-[22px]" : "text-[16px]"} ${warn ? "text-[var(--alert)]" : ""}`}>
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
              <span className={`block text-[18px] leading-snug ${it.status === "Done" ? "text-[var(--muted-3)] line-through" : ""}`}>
                {it.title}
              </span>
              <span className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[15px] text-[var(--muted)]">
                <span className={it.owner === "Unassigned" ? "text-[var(--alert)]" : "text-[var(--text)]"}>
                  {it.owner === "Unassigned" ? "Needs an owner" : it.owner}
                </span>
                <span className="text-[var(--muted-3)]">·</span>
                <span>{it.pillar}</span>
                {it.priority === "Critical" && (<><span className="text-[var(--muted-3)]">·</span><span className="text-[var(--text)] font-medium">Critical</span></>)}
                {it.dueDate && (<><span className="text-[var(--muted-3)]">·</span><span className="tabular-nums">{fmtDate(it.dueDate)}</span></>)}
                {it.status === "Blocked" && (<><span className="text-[var(--muted-3)]">·</span><span className="text-[var(--alert)]">Blocked</span></>)}
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
                className="justify-self-start min-h-[44px] text-[15px] text-[var(--muted)]"
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
      <button onClick={() => setOpen(true)} className="mt-7 min-h-[48px] text-[16px] text-[var(--muted)]">
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
                  {q.isCurrent && <span className="ml-3 text-[12px] tracking-[0.14em] uppercase text-[var(--muted)]">Current</span>}
                </span>
                <span className="shrink-0 text-[15px] text-[var(--muted)]">{open ? "−" : "+"}</span>
              </span>
              <span className="block mt-1.5 text-[15px] text-[var(--muted)]">{q.dates}</span>
              {/* Spelled out. "$52K cum." meant nothing at a glance. */}
              <span className="block mt-1 text-[15px] text-[var(--muted)]">
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
                          <p className="text-[16px] leading-relaxed text-[var(--muted)]">
                            <span className="text-[var(--muted-3)] tabular-nums mr-2">{k.label}</span>
                            {k.text}
                          </p>
                          <div className="mt-2.5 flex items-center gap-3">
                            <span className="text-[13px] tracking-[0.1em] uppercase text-[var(--muted-3)]">Score</span>
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
  months, thresholds, tests, meetings, call,
}: {
  months: Month[]; thresholds: Threshold[]; tests: Test[]; meetings: Meeting[];
  call: (u: string, m: string, b?: unknown) => Promise<boolean>;
}) {
  // Actuals come from the Monday cards. Nothing here is typed twice.
  const weekly = meetings.filter((m) => m.kind === "MondayBusiness" || m.kind === "MondayMonthly");
  const actual = collectedByMonth(weekly);

  let cumTarget = 0;
  let cumActual = 0;
  let anyActual = false;

  const rows = months.map((m) => {
    cumTarget += m.target;
    const got = actual[m.key] ?? null;
    if (got != null) { cumActual += got; anyActual = true; }
    const pct = got != null && m.target > 0 ? (got / m.target) * 100 : null;
    return { ...m, got, pct, cumTarget, cumActual: anyActual ? cumActual : null };
  });

  return (
    <>
      <section>
        <Eyebrow>Target against actual</Eyebrow>
        <p className="text-[16px] leading-relaxed text-[var(--muted)] mb-6">
          $250K cumulative is the floor; manage toward $275K so one weak month does not break the goal.
          Actuals are the cash collected on your Monday cards — enter it once, it appears here.
        </p>
        <div className="divide-y divide-white/10 border-y border-white/10">
          {rows.map((m) => (
            <div key={m.id} className="py-4">
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-[16px]">{m.label}</span>
                <span className="shrink-0 text-right tabular-nums">
                  <span className={`text-[18px] ${m.got == null ? "text-[var(--muted-3)]" : ""}`}>
                    {m.got == null ? "—" : money(m.got)}
                  </span>
                  <span className="text-[16px] text-[var(--muted-3)]"> / {money(m.target)}</span>
                </span>
              </div>
              <div className="mt-1.5 flex items-baseline justify-between gap-4 text-[14px]">
                <span className="text-[var(--muted-3)] tabular-nums">
                  {money(m.cumTarget)} cumulative target
                  {m.cumActual != null && <> · {money(m.cumActual)} so far</>}
                </span>
                {m.pct != null && (
                  <span
                    className={`shrink-0 tabular-nums ${
                      m.pct >= 100 ? "text-[var(--ok)]" : m.pct >= 90 ? "text-[var(--warn)]" : "text-[var(--alert)]"
                    }`}
                  >
                    {Math.round(m.pct)}% of target
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
        {!anyActual && (
          <p className="mt-5 text-[15px] leading-relaxed text-[var(--muted-3)]">
            No actuals yet. Log a Monday meeting and fill in cash collected, and these fill in
            themselves.
          </p>
        )}
      </section>

      <section className="mt-16">
        <Eyebrow>Monday thresholds</Eyebrow>
        <p className="text-[16px] leading-relaxed text-[var(--muted)] mb-6">
          Recalibrate after 60–90 days of real data. Using the same definition every week matters more
          than the exact number.
        </p>
        <div className="divide-y divide-white/10 border-y border-white/10">
          {thresholds.map((t) => (
            <div key={t.id} className="py-4">
              <p className="text-[17px]">{t.metric}</p>
              <p className="mt-1.5 text-[15px] text-[var(--muted)] tabular-nums">
                Green {t.green} · Yellow {t.yellow} · Red {t.red}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-16">
        <Eyebrow>True after 90 days</Eyebrow>
        <p className="text-[16px] leading-relaxed text-[var(--muted)] mb-6">
          The test of whether the first quarter actually worked.
        </p>
        <div className="divide-y divide-white/10 border-t border-white/10">
          {tests.map((t) => (
            <div key={t.id} className="py-4 flex gap-4">
              <Tick
                done={t.passed} label={t.text}
                onClick={() => call(`/api/tests/${t.id}`, "PATCH", { passed: !t.passed })}
              />
              <p className={`text-[17px] leading-relaxed ${t.passed ? "text-[var(--muted-3)] line-through" : ""}`}>
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
        <p className="text-[16px] leading-relaxed text-[var(--muted)] mb-4">
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
                  g.card ? CARD_STYLE[g.card] : "text-[var(--muted-3)] border border-white/10"
                }`}
              >
                {g.card ?? "—"}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[16px]">{t.metric}</span>
                <span className="block text-[14px] text-[var(--muted)] tabular-nums">
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
                <span className="shrink-0 text-[15px] text-[var(--muted)]">{open ? "−" : "+"}</span>
              </span>
              <span className="block mt-1.5 text-[15px] text-[var(--muted)]">
                {def.when}
              </span>
              {/* Dates, so it is obvious which occurrence is being logged and
                  what happens next Monday. */}
              <span className="block mt-1 text-[15px] text-[var(--muted-3)] tabular-nums">
                {logged.length > 0
                  ? <>Last logged {pretty(logged[0].date.slice(0, 10))} · </>
                  : <>Nothing logged yet · </>}
                next {pretty(nextOccurrence(def.kind))}
              </span>
            </button>

            {open && (
              <div className="mt-6">
                <Eyebrow>Agenda</Eyebrow>
                <ul className="mb-7 space-y-4">
                  {def.agenda.map((a) => (
                    <li key={a.item}>
                      <p className="text-[17px] leading-snug">
                        {a.item}
                        {a.mins && <span className="ml-2 text-[14px] text-[var(--muted-3)]">{a.mins}</span>}
                      </p>
                      <p className="mt-1 text-[15px] leading-relaxed text-[var(--muted)]">{a.detail}</p>
                    </li>
                  ))}
                </ul>

                {/* Logs the occurrence, not the day he happens to be sitting
                    down. Monday's numbers entered on Wednesday belong to Monday. */}
                <Button onClick={() => call("/api/meetings", "POST", { kind: def.kind, date: occurrenceToLog(def.kind) })}>
                  Log {pretty(occurrenceToLog(def.kind))}
                </Button>

                <div className="mt-8 space-y-9">
                  {logged.length === 0 && (
                    <p className="text-[16px] text-[var(--muted)]">
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
                          {def.scorecard && (
                            <span className="block mt-1 text-[14px] text-[var(--muted)]">
                              Numbers for {coveringWeek(m.date)}
                            </span>
                          )}
                        </p>
                        <button
                          onClick={() => call(`/api/meetings/${m.id}`, "DELETE")}
                          className="min-h-[44px] text-[15px] text-[var(--muted)]"
                        >
                          Remove
                        </button>
                      </div>

                      {def.kind === "MondayMonthly" ? (
                        <MonthlyRollup meeting={m} weekly={meetings.filter((x) => x.kind === "MondayBusiness")} call={call} />
                      ) : def.scorecard ? (
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
              {t.firing && <span className="ml-3 text-[13px] tracking-[0.12em] uppercase text-[var(--alert)]">Firing</span>}
            </p>
            <p className="mt-1.5 text-[15px] leading-relaxed text-[var(--muted)]">{t.condition}</p>
            {/* The action only matters once the condition is met, so it is shown
                as the consequence rather than as another line of description. */}
            <p className={`mt-2 text-[15px] leading-relaxed ${t.firing ? "text-[var(--text)]" : "text-[var(--muted-3)]"}`}>
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
        <p className="text-[16px] leading-relaxed text-[var(--muted)] mb-5">
          Tick one when the condition is true. The plan&apos;s discipline is that the action follows the
          trigger, not the mood of the room.
        </p>
        <TriggerList list={capacity} />
      </Reveal>

      <Reveal>
        <Eyebrow>Hiring triggers</Eyebrow>
        <p className="text-[16px] leading-relaxed text-[var(--muted)] mb-5">
          Grow leverage before hierarchy. Each of these names the structure to try first.
        </p>
        <TriggerList list={hiring} />
      </Reveal>

      <Reveal>
        <Eyebrow>The offer ladder</Eyebrow>
        <p className="text-[16px] leading-relaxed text-[var(--muted)] mb-5">
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
                  <span className="tabular-nums text-[var(--muted)]">{o.price}</span>
                  {!o.costStudied && (
                    <span className="text-[13px] tracking-[0.1em] uppercase text-[var(--muted-3)]">not costed</span>
                  )}
                </p>
                <p className="mt-1.5 text-[15px] text-[var(--muted)]">{o.designedFor}</p>
                <p className="mt-2 text-[15px] leading-relaxed text-[var(--muted-3)]">{o.scope}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-8 mb-4 text-[13px] tracking-[0.14em] uppercase text-[var(--muted-3)]">Public rates</p>
        <div className="divide-y divide-white/10 border-t border-white/10">
          {rates.map((o) => (
            <div key={o.id} className="py-4 flex items-baseline justify-between gap-4">
              <span className="text-[16px]">{o.name}</span>
              <span className="shrink-0 text-[15px] tabular-nums text-[var(--muted)]">{o.price}</span>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal>
        <Eyebrow>Risk register</Eyebrow>
        <p className="text-[16px] leading-relaxed text-[var(--muted)] mb-5">
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
                <p className="mt-1.5 text-[15px] leading-relaxed text-[var(--muted)]">Shows up as: {r.showsUpAs}</p>
                <p className="mt-2 text-[15px] leading-relaxed text-[var(--muted-3)]">{r.mitigation}</p>
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


/**
 * The monthly review, assembled from that month's Monday cards.
 *
 * Section 12's questions are all "what did we collect" — which the weekly cards
 * already answer. Asking for them again would produce two versions of the same
 * month.
 */
function MonthlyRollup({
  meeting, weekly, call,
}: {
  meeting: Meeting; weekly: Meeting[];
  call: (u: string, m: string, b?: unknown) => Promise<boolean>;
}) {
  const r = rollUp(meeting.date, weekly as never);
  const { label } = monthUnderReview(meeting.date);

  const TOTALS: [string, string, boolean][] = [
    ["cashCollected", "Cash collected", true],
    ["podcastRevenue", "Podcast revenue", true],
    ["musicRevenue", "Studio revenue", true],
    ["leads", "Leads", false],
    ["toursBooked", "Tours booked", false],
    ["toursShowed", "Tours showed", false],
  ];
  const AVERAGES: [string, string, string][] = [
    ["podcastMrr", "Podcast MRR", "$"],
    ["tourCloseRate", "Tour close rate", "%"],
    ["recurringConversion", "Recurring conversion", "%"],
    ["roomHours", "Room hours per week", ""],
    ["editTurnaround", "Edit turnaround", " days"],
    ["roadmapCompletion", "Roadmap completion", "%"],
  ];

  return (
    <>
      <Eyebrow>Reviewing {label}</Eyebrow>
      <p className="text-[15px] leading-relaxed text-[var(--muted)] mb-5">
        {r.weeks === 0
          ? "No Monday cards for that month yet, so there is nothing to total. Log the weekly meetings and this fills itself."
          : `Totalled from ${r.weeks} Monday ${r.weeks === 1 ? "card" : "cards"}. Nothing to re-enter.`}
      </p>

      {r.weeks > 0 && (
        <div className="divide-y divide-white/10 border-y border-white/10 mb-7">
          {TOTALS.map(([k, label2, isMoney]) => (
            <div key={k} className="py-3 flex items-baseline justify-between gap-4">
              <span className="text-[16px]">{label2}</span>
              <span className={`shrink-0 text-[18px] tabular-nums ${r.totals[k] == null ? "text-[var(--muted-3)]" : ""}`}>
                {r.totals[k] == null ? "—" : isMoney ? `$${r.totals[k]!.toLocaleString()}` : r.totals[k]}
              </span>
            </div>
          ))}
          {AVERAGES.map(([k, label2, unit]) => (
            <div key={k} className="py-3 flex items-baseline justify-between gap-4">
              <span className="text-[16px]">
                {label2} <span className="text-[14px] text-[var(--muted-3)]">avg</span>
              </span>
              <span className={`shrink-0 text-[18px] tabular-nums ${r.averages[k] == null ? "text-[var(--muted-3)]" : ""}`}>
                {r.averages[k] == null ? "—" : `${unit === "$" ? "$" : ""}${r.averages[k]}${unit === "$" ? "" : unit}`}
              </span>
            </div>
          ))}
        </div>
      )}

      <Field
        label="Next month: one revenue target, one funnel target, one operating target"
        multiline value={meeting.notes}
        onSave={(v) => call(`/api/meetings/${meeting.id}`, "PATCH", { notes: v })}
      />
      <div className="mt-5">
        <Field
          label="Decisions and blockers" multiline value={meeting.decisions}
          onSave={(v) => call(`/api/meetings/${meeting.id}`, "PATCH", { decisions: v })}
        />
      </div>
    </>
  );
}
