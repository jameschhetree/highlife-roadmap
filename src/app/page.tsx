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
import { Eyebrow, Empty, Field, Choice, Button, Tick, Tag, Reveal, Panel, SaveGroup, Fold, BLUR } from "@/components/ui";
import { gradeAll, type Card } from "@/lib/grade";
import { Assistant } from "@/components/assistant";
import { ThemeToggle } from "@/components/theme";
import {
  IconWeek, IconMeeting, IconMoney, IconTarget, IconSystems, IconRevenue,
  IconContent, IconEvent, IconSop, IconTeam, IconBlocked, IconDecision, IconPlan,
} from "@/components/icons";
import { guideFor } from "@/lib/today";
import { suggest } from "@/lib/priorities";
import { rollUp, collectedByMonth, monthUnderReview } from "@/lib/rollup";
import { occurrenceToLog, nextOccurrence, pretty, localToday } from "@/lib/meetingDates";
import { measureKr } from "@/lib/measure";
import { group } from "@/lib/group";
import { ownsIt, namesIn } from "@/lib/owner";
import { formatStoredDate } from "@/lib/days";
import { pace, monthKeyOf, funnel } from "@/lib/pace";
import { Curve, PaceBar, Funnel, Bars, type Point } from "@/components/chart";

type View =
  | "ThisWeek" | "Meetings" | "QuarterlyOKR" | "Money" | "RevenueProject"
  | "ContentCalendar" | "Event" | "SOP" | "Systems" | "Team" | "Blocked" | "DecisionLog";

type Item = {
  id: string; title: string; owner: string; pillar: string; view: string;
  quarterId: string | null; priority: "Critical" | "Standard" | "Backlog";
  status: "NotStarted" | "InProgress" | "Blocked" | "Done";
  dueDate: string | null; kpi: string; notes: string; dependency: string; weekNumber: number | null;
  sop?: Sop | null;
};
type Sop = {
  docUrl: string;
  purpose: string; trigger: string; inputs: string; steps: string;
  qualityCheck: string; sla: string; escalation: string; version: string;
  published: boolean;
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
type Person = { id: string; name: string; role: string; owns: string; active: boolean };
type Trigger = { id: string; kind: string; signal: string; condition: string; action: string; firing: boolean; notes: string };
type Offer = { id: string; name: string; price: string; designedFor: string; scope: string; isPackage: boolean; costStudied: boolean };
type Risk = { id: string; risk: string; showsUpAs: string; mitigation: string; mitigated: boolean; owner: string };
type Meeting = {
  id: string; kind: string; date: string; held: boolean;
  cashCollected: number | null; podcastRevenue: number | null; podcastMrr: number | null;
  musicRevenue: number | null; leads: number | null; toursBooked: number | null;
  toursShowed: number | null; tourCloseRate: number | null; recurringConversion: number | null;
  roomHours: number | null; editTurnaround: number | null; roadmapCompletion: number | null;
  prep: string; decisions: string; notes: string;
};

const TABS: { key: View; label: string; blurb: string; icon: (p: { className?: string }) => React.ReactElement }[] = [
  // Ordered the way the plan runs, not alphabetically: today's work, then the
  // meeting that sets it, then the money it serves, then the quarter it rolls
  // up to, then the systems that watch it, then the working surfaces.
  { icon: IconWeek, key: "ThisWeek", label: "This week", blurb: "Commitments due before next Monday. One owner, one date." },
  { icon: IconMeeting, key: "Meetings", label: "Meetings", blurb: "Monday carries the scorecard. Wednesday and Sunday get a prep brief." },
  { icon: IconMoney, key: "Money", label: "Money", blurb: "The monthly path to $250K, and the Monday thresholds." },
  { icon: IconTarget, key: "QuarterlyOKR", label: "OKRs", blurb: "Three company objectives per quarter. No more." },
  { icon: IconSystems, key: "Systems", label: "Systems", blurb: "Triggers, the offer ladder and the risk register. The conditions that oblige a decision." },
  { icon: IconBlocked, key: "Blocked", label: "Blocked", blurb: "Not a list you add to. Set any item's status to Blocked and it appears here, wherever it lives." },
  { icon: IconRevenue, key: "RevenueProject", label: "Revenue", blurb: "Two things: who owns each way work comes in, and the experiments running against them." },
  { icon: IconContent, key: "ContentCalendar", label: "Content", blurb: "Podcast, commercial batches, freestyle, events." },
  { icon: IconEvent, key: "Event", label: "Events", blurb: "Every event needs one primary KPI." },
  { icon: IconSop, key: "SOP", label: "SOPs", blurb: "Documented in the order revenue touches the work." },
  { icon: IconTeam, key: "Team", label: "Team", blurb: "Who is accountable for what. Owners are picked from this list, so a typo cannot invent a person." },
  { icon: IconDecision, key: "DecisionLog", label: "Decisions", blurb: "Rockville, hires, packages, room capacity." },
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

/** Where an item can be moved to, with the label the tab uses. */
const MOVABLE: [string, string][] = [
  ["ThisWeek", "This week"],
  ["RevenueProject", "Revenue"],
  ["ContentCalendar", "Content"],
  ["Event", "Events"],
  ["SOP", "SOPs"],
  ["DecisionLog", "Decisions"],
];

const PILLARS = ["Revenue", "Podcast", "Music", "Media", "Merch", "Events", "Operations", "Finance"];
const PRIORITIES = ["Critical", "Standard", "Backlog"];
const STATUSES = ["NotStarted", "InProgress", "Blocked", "Done"];

const money = (n: number) => `$${Math.round(n / 1000)}K`;
/**
 * Exact dollars, with commas.
 *
 * `money` rounds to thousands, which is right for a $250K goal and useless for
 * a scoreboard: $1,275 collected and $907 behind both render as "$1K", so the
 * headline read "Behind by $1K" against "$1K in". At this stage of the plan the
 * months are $6,000 and the difference between $900 and $1,400 is the week.
 */
const dollars = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
// Dates are stored as calendar dates at UTC midnight. Formatted in the
// browser's zone, every one of them displayed a day early.
const fmtDate = (d: string | null) => (d ? formatStoredDate(d) : "");
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
  const [navOpen, setNavOpen] = useState(false);
  const [groupBy, setGroupBy] = useState<"due" | "owner" | "priority" | "none">("due");
  const [people, setPeople] = useState<Person[]>([]);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!isAdminAuthed()) router.push("/login");
    else setReady(true);
  }, [router]);

  const load = async () => {
    const [r, m, sy, pe] = await Promise.all([
      fetch("/api/roadmap"), fetch("/api/meetings"), fetch("/api/systems"), fetch("/api/people"),
    ]);
    if (!r.ok) { setError("Could not load the roadmap."); return; }
    const d = await r.json();
    setQuarters(d.quarters); setItems(d.items); setWeeks(d.weeks);
    setMonths(d.months ?? []); setThresholds(d.thresholds ?? []); setTests(d.tests ?? []);
    if (m.ok) setMeetings(await m.json());
    if (sy.ok) setSystems(await sy.json());
    if (pe.ok) setPeople(await pe.json());
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

  // The filter offers everyone on the roster plus anyone who already owns
  // something, so a name left over from before the roster existed is still
  // findable rather than being quietly hidden.
  /**
   * The list you filter by: individuals, not pairings.
   *
   * Built straight from the owner strings it listed "JoJo + Jaco" and
   * "Jojo + Jaco" as two more options — a case typo in the data showing up as a
   * choice — and picking either one narrowed to a single task. Now that a name
   * matches inside a shared owner, the pairings are redundant: choosing Jaco
   * already brings back everything he shares.
   */
  const owners = useMemo(() => {
    const seen = new Map<string, string>();
    for (const name of [
      ...people.filter((p) => p.active).map((p) => p.name),
      ...items.flatMap((i) => namesIn(i.owner)),
    ]) {
      const k = name.toLowerCase();
      if (!seen.has(k)) seen.set(k, name);
    }
    return ["Everyone", ...Array.from(seen.values()).sort()];
  }, [items, people]);
  const ownerOptions = useMemo(
    () => Array.from(new Set([...people.filter((p) => p.active).map((p) => p.name), ...items.map((i) => i.owner)])).sort(),
    [items, people]
  );
  const byOwner = (list: Item[]) => list.filter((i) => ownsIt(i.owner, who));

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
  const board = scoreboard(months, meetings, weeks);
  const unowned = items.filter((i) => i.owner === "Unassigned").length;

  // The dashboard is the one view that is meant to fit a monitor exactly.
  // Everything else is a document and scrolls.
  const dashboard = view === "ThisWeek";

  return (
    <div className={`min-h-screen lg:pl-[248px] ${dashboard ? "board-fit" : ""}`}>
      {/* On a phone the rail is off-canvas, so without this button the whole
          navigation is unreachable. It was missing on the first pass and the
          only reason I noticed is that the browser found zero of them. */}
      {navOpen && (
        <button
          aria-label="Close the menu"
          onClick={() => setNavOpen(false)}
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
        />
      )}

      {/* Left rail, following the HighLevel layout Jaco pointed at. Under
          1024px it goes off-canvas behind the Menu button. */}
      <aside
        className={`fixed z-40 lg:z-30 inset-y-0 left-0 w-[248px] shrink-0 overflow-y-auto no-scrollbar
          border-r border-white/10 bg-[var(--surface)] transition-transform duration-300
          ${navOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        <div className="px-4 pt-5 pb-8">
          <p className="text-[11px] tracking-[0.2em] uppercase text-[var(--muted-3)] mb-3 px-2">
            HighLife
          </p>
          <div className="bezel rounded-xl px-3 py-2.5 mb-5" style={BLUR(24)}>
            <p className="text-[15px] leading-tight">HighLife Studios</p>
            <p className="text-[13px] text-[var(--muted-3)] mt-0.5">
              {current ? current.name : "Operating System"}
            </p>
          </div>

          <nav className="space-y-0.5">
            {TABS.filter((t) => t.key !== "Blocked" || blocked > 0).map((t) => {
              const n = t.key === "Blocked" ? blocked
                : t.key === "Team" ? people.filter((x) => x.active).length
                : ["Money", "Meetings", "QuarterlyOKR"].includes(t.key) ? 0
                : byOwner(items.filter((i) => i.view === t.key)).length;
              const active = view === t.key;
              const Icon = t.icon;
              return (
                <button
                  key={t.key}
                  onClick={() => { setView(t.key); setNavOpen(false); }}
                  className={`w-full min-h-[46px] px-3 rounded-xl flex items-center gap-3 text-[15px]
                    transition-colors duration-200 ${
                    active
                      ? "bg-[var(--text)]/[0.10] text-[var(--text)]"
                      : "text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--text)]/[0.05]"
                  }`}
                >
                  <Icon className={`w-5 h-5 shrink-0 ${active ? "" : "opacity-70"}`} />
                  <span className="flex-1 text-left">{t.label}</span>
                  {n > 0 && <span className="text-[13px] tabular-nums text-[var(--muted-3)]">{n}</span>}
                </button>
              );
            })}
          </nav>

          <div className="mt-6 pt-5 border-t border-white/10">
            <Link
              href="/plan"
              className="w-full min-h-[46px] px-3 rounded-xl flex items-center gap-3 text-[15px] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--text)]/[0.05]"
            >
              <IconPlan className="w-5 h-5 shrink-0 opacity-70" />
              <span>Read the plan</span>
            </Link>
            <div className="px-3 pt-4 space-y-3">
              <ThemeToggle />
              <select
                value={who}
                onChange={(e) => setWho(e.target.value)}
                aria-label="Filter by owner"
                className="w-full min-h-[44px] rounded-xl px-3 text-[15px]"
              >
                {owners.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>
        </div>
      </aside>

      <header className={`px-5 md:px-10 ${dashboard
        ? "w-full max-w-[1800px] mx-auto pt-5 pb-4 board-head"
        : "max-w-[1100px] mx-auto pt-6 lg:pt-10 pb-6"}`}>
        <button
          onClick={() => setNavOpen(true)}
          style={BLUR(24)}
          className="lg:hidden mb-6 min-h-[46px] px-5 rounded-full bezel text-[15px]"
        >
          Menu
        </button>

        {/* The page names itself. "Roadmap" on every tab told you nothing about
            where you were. */}
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <h1 className={`${dashboard ? "text-[26px] md:text-[30px]" : "text-[30px] md:text-[36px]"} leading-[1.05] font-semibold tracking-[-0.025em]`}>
            {TABS.find((t) => t.key === view)?.label}
          </h1>
          {current && view === "ThisWeek" && (
            <p className="text-[15px] text-[var(--muted)] tabular-nums">
              {currentWeek ? `Week ${currentWeek.week} of 12` : current.name} · {current.dates}
            </p>
          )}
        </div>
        <p className={`mt-2 text-[16px] leading-relaxed text-[var(--muted)] max-w-[70ch] ${dashboard ? "xl:hidden" : ""}`}>
          {TABS.find((t) => t.key === view)?.blurb}
          {who !== "Everyone" && <span className="text-[var(--text)]"> Showing {who} only.</span>}
        </p>
        {dashboard && who !== "Everyone" && (
          <p className="mt-1 hidden xl:block text-[15px] text-[var(--muted)]">Showing {who} only.</p>
        )}

        {error && (
          <div className="mt-5 px-4 py-3.5 rounded-xl text-[16px] leading-relaxed bezel" style={BLUR(24)}>
            {error}
          </div>
        )}
      </header>

      <main className={`px-5 md:px-10 ${dashboard
        ? "w-full max-w-[1800px] mx-auto pb-6 board-main"
        : "max-w-[1100px] mx-auto pb-32"}`}>


        {error && (
          <div className="mb-6 px-4 py-3.5 rounded-xl text-[16px] leading-relaxed glass">
            {error}
          </div>
        )}

        {view === "QuarterlyOKR" && <Okrs quarters={quarters} call={call} meetings={meetings} items={items} />}
        {view === "Money" && <Money months={months} thresholds={thresholds} tests={tests} meetings={meetings} call={call} />}
        {view === "Meetings" && <MeetingsView meetings={meetings} months={months} thresholds={thresholds} weeks={weeks} call={call} />}
        {view === "Systems" && <Systems data={systems} call={call} />}
        {view === "Team" && <Team people={people} items={items} call={call} onDone={load} />}

        {/* This week is the dashboard. Two columns on a wide screen so it reads
            at a glance instead of scrolling for a minute: what to do on the
            left, where you stand on the right. */}
        {/*
          One screen, no scrolling, on a wide monitor.

          Jaco sent four dashboards and they all do the same thing: a grid of
          cards that fits the viewport, each card naming itself and putting its
          number in the corner. The old layout stacked the same content down a
          1100px column, so half of it was below the fold and the widescreen he
          works on was two thirds empty.

          Below 1280px this falls back to a stack that scrolls normally — a
          fixed-height grid on a laptop screen would crush every card. The
          panels in the lower row scroll inside themselves, so the page never
          does.
        */}
        {view === "ThisWeek" && (
          <div className="grid gap-4 board-grid xl:grid-cols-12">
            <div className="min-w-0 xl:col-span-5 xl:min-h-0">
              <PaceCard board={board} onOpen={setView} />
            </div>

            <div className="min-w-0 xl:col-span-4 xl:min-h-0 grid grid-cols-2 gap-3 content-start">
              <Tile label="Collected" value={collectedTotal == null ? "—" : dollars(collectedTotal)}
                sub={current ? `of ${current.cumulative} by Sep 30` : ""} onClick={() => setView("Money")} />
              <Tile label="Open" value={String(openThisWeek)}
                sub={overdue > 0 ? `${overdue} past due` : "on time"} warn={overdue > 0}
                onClick={() => setView("ThisWeek")} />
              <Tile label="Cadence" value={`${cadenceDone}/${weeks.length}`}
                sub="weeks done" onClick={() => setView("ThisWeek")} />
              <Tile label="SOPs" value={`${items.filter((i) => i.view === "SOP" && i.sop?.published).length}/${items.filter((i) => i.view === "SOP").length}`}
                sub="published" onClick={() => setView("SOP")} />
              {unowned > 0 && (
                <Tile label="Need an owner" value={String(unowned)} sub="an idea, not a task" warn
                  onClick={() => setView("ThisWeek")} />
              )}
              {blocked > 0 && (
                <Tile label="Blocked" value={String(blocked)} sub="clear on Monday" warn
                  onClick={() => setView("Blocked")} />
              )}
              {firing > 0 && (
                <Tile label="Triggers" value={String(firing)} sub="firing" warn
                  onClick={() => setView("Systems")} />
              )}
            </div>

            <div className="min-w-0 xl:col-span-3 xl:min-h-0">
              <ToursCard board={board} onOpen={setView} />
            </div>

            {/* The tasks, as a card like everything else. They were a bare list
                running down the page under a heading, which is why they did not
                look like part of the same product. */}
            <div className="min-w-0 xl:col-span-5 xl:min-h-0">
              <Panel className="h-full min-h-0 flex flex-col px-5 py-4">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="min-w-0">
                    <p className="text-[15px] leading-tight">
                      {who === "Everyone" ? "This week" : `${who}, this week`}
                    </p>
                    <p className="mt-0.5 text-[13px] text-[var(--muted-3)]">Due before next Monday</p>
                  </div>
                  <p className="shrink-0 text-[26px] leading-none tabular-nums tracking-[-0.02em]">
                    {openThisWeek}
                  </p>
                </div>

                {/*
                  Whose work, and how it is stacked.

                  The owner filter already existed at the bottom of the left
                  rail, which is why Jaco never found it — he was looking at the
                  card. It is the same setting in both places.

                  Two controls rather than one dropdown holding both: a select
                  can only hold one value, so putting "Jaco" and "Due date" in
                  the same list would mean picking a person forgot how the list
                  was grouped.
                */}
                <div className="flex items-center gap-2 mb-3">
                  <select
                    value={who}
                    onChange={(e) => setWho(e.target.value)}
                    aria-label="Whose tasks"
                    className="min-h-[36px] rounded-full px-3 text-[13px] min-w-0 flex-1"
                  >
                    {owners.map((o) => (
                      <option key={o} value={o}>{o === "Everyone" ? "Everyone" : o}</option>
                    ))}
                  </select>
                  <select
                    value={groupBy}
                    onChange={(e) => setGroupBy(e.target.value as never)}
                    aria-label="Group by"
                    className="min-h-[36px] rounded-full px-3 text-[13px] min-w-0 flex-1"
                  >
                    <option value="due">By due date</option>
                    <option value="owner">By owner</option>
                    <option value="priority">By priority</option>
                    <option value="none">No grouping</option>
                  </select>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar fade-b -mx-1 px-1">
                  {visible.length === 0 ? (
                    <Empty>
                      {who === "Everyone"
                        ? "Nothing due before Monday."
                        : `Nothing assigned to ${who} this week.`}
                    </Empty>
                  ) : (
                    <Items items={visible} call={call} ownerOptions={ownerOptions} groupBy={groupBy} dense />
                  )}
                </div>

                <div className="pt-3 mt-1 border-t border-white/10">
                  <AddItem
                    view={view} quarterId={current?.id ?? null}
                    open={adding} setOpen={setAdding} onDone={load} onError={setError}
                    ownerOptions={ownerOptions}
                  />
                </div>
              </Panel>
            </div>

            <div className="min-w-0 xl:col-span-4 xl:min-h-0 flex flex-col gap-3 xl:overflow-y-auto no-scrollbar fade-b xl:pb-10">
              <MeetingWidgets meetings={meetings} guide={guide} onOpen={setView} />

              {currentWeek && (
                <Fold title={`Week ${currentWeek.week} of 12`} count={currentWeek.objective}>
                  <p className="text-[11px] tracking-[0.18em] uppercase text-[var(--muted-3)] mb-2">
                    {currentWeek.objective}
                  </p>
                  <p className="text-[15px] leading-relaxed text-[var(--muted)]">{currentWeek.deliverable}</p>
                  {!items.some((i) => i.weekNumber === currentWeek.week) && (
                    <div className="mt-5">
                      <Button kind="solid" arrow onClick={() => call(`/api/weeks/${currentWeek.id}/load`, "POST")}>
                        Pull this week in
                      </Button>
                    </div>
                  )}
                </Fold>
              )}

              {weeks.length > 0 && (
                <Fold title="The first 12 weeks" count={`${cadenceDone}/${weeks.length} done`} soft>
                  <p className="text-[15px] leading-relaxed text-[var(--muted)] mb-5">
                    One objective per week, straight from the plan. Pull a week in and it becomes
                    editable commitments in the list — assign the owners, change the wording, add what
                    the plan did not think of.
                  </p>
                  <div className="divide-y divide-white/10 border-t border-white/10">
                    {weeks.map((w) => {
                      const loaded = items.some((i) => i.weekNumber === w.week);
                      const isNow = currentWeek?.week === w.week;
                      return (
                        <div key={w.id} className="py-4 flex gap-4">
                          <Tick
                            done={w.done} label={`Week ${w.week}`}
                            onClick={() => call(`/api/weeks/${w.id}`, "PATCH", { done: !w.done })}
                          />
                          <div className="min-w-0 flex-1">
                            <p className={`text-[16px] leading-snug ${w.done ? "text-[var(--muted-3)] line-through" : ""}`}>
                              <span className="text-[var(--muted-3)] tabular-nums mr-2">{w.week}</span>
                              {w.objective}
                              {isNow && (
                                <span className="ml-3 text-[12px] tracking-[0.14em] uppercase text-[var(--text)]">This week</span>
                              )}
                            </p>
                            <p className="mt-1.5 text-[14px] leading-relaxed text-[var(--muted)]">{w.deliverable}</p>
                            <div className="mt-3">
                              {loaded ? (
                                <span className="text-[14px] text-[var(--muted-3)]">Already pulled in</span>
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
                </Fold>
              )}
            </div>

            <div className="min-w-0 xl:col-span-3 xl:min-h-0 flex flex-col gap-3 xl:overflow-y-auto no-scrollbar fade-b xl:pb-10">
              {(() => {
                const open = items.filter((i) => i.view === "ThisWeek" && i.status !== "Done");
                const named = [...new Set(open.map((i) => i.owner))].filter((o) => o !== "Unassigned");
                if (named.length === 0) return null;
                return (
                  <Panel className="px-5 py-4 shrink-0">
                    <CardHead title="Per owner" sub="Three to five each, not between you"
                      value={String(named.length)} />
                    {/* A div, not a dl: the rows are buttons now, and a button
                        wrapping dt/dd is invalid markup that React hydrates
                        differently from what the server sent. */}
                    <div className="divide-y divide-white/[0.08]">
                      {named.map((o) => {
                        const n = open.filter((i) => i.owner === o).length;
                        const state = n > 5 ? "too many" : n < 3 ? "light" : null;
                        return (
                          <button
                            key={o}
                            onClick={() => setWho(who === o ? "Everyone" : o)}
                            className={`w-full flex items-baseline justify-between gap-3 py-2.5 text-left min-h-[44px]
                              rounded-lg px-2 -mx-2 transition-colors hover:bg-[var(--text)]/[0.06]
                              ${who === o ? "bg-[var(--text)]/[0.09]" : ""}`}
                          >
                            <span className="text-[15px]">{o}</span>
                            <span className="shrink-0 text-right">
                              <span className={`text-[18px] tabular-nums ${n > 5 ? "text-[var(--alert)]" : ""}`}>{n}</span>
                              {state && <span className="ml-2 text-[13px] text-[var(--muted-3)]">{state}</span>}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {who !== "Everyone" && (
                      <button
                        onClick={() => setWho("Everyone")}
                        className="mt-2 text-[13px] text-[var(--muted)] hover:text-[var(--text)] min-h-[40px]"
                      >
                        Show everyone
                      </button>
                    )}
                  </Panel>
                );
              })()}

              <PillarCard items={items.filter((i) => i.view === "ThisWeek")} onOpen={setView} />

              <NumbersCard meetings={meetings} call={call} onOpen={setView} />

              {priorities.length > 0 && (
                <Fold title="Housekeeping" count={`${priorities.length}`} soft>
                  <ul className="space-y-2.5">
                    {priorities.map((x, i) => (
                      <li key={i}>
                        <button onClick={() => x.goTo && setView(x.goTo as View)} className="text-left w-full min-h-[44px]">
                          <span className="block text-[15px] leading-snug">{x.text}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </Fold>
              )}
            </div>
          </div>
        )}

        {!["QuarterlyOKR", "Money", "Meetings", "Systems", "Team", "ThisWeek"].includes(view) && (
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

            {view === "SOP" && <SopImport onDone={load} />}

            {view === "SOP" ? (
              <SopSplit items={visible} call={call} ownerOptions={ownerOptions} />
            ) : visible.length === 0 && view === "Blocked" ? (
              <Empty>
                Nothing is blocked, which is what you want. This tab fills itself: open any item
                anywhere in the app, set its status to Blocked, and it shows up here too. Monday is for
                clearing it.
              </Empty>
            ) : (
              <Items items={visible} call={call} ownerOptions={ownerOptions} groupBy={groupBy} onGroupBy={setGroupBy} />
            )}
            {view !== "Blocked" && (
              <AddItem
                view={view} quarterId={current?.id ?? null}
                open={adding} setOpen={setAdding} onDone={load} onError={setError}
                ownerOptions={ownerOptions}
              />
            )}
          </>
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

/**
 * The week's numbers, enterable from the board.
 *
 * The scoreboard has one Monday card on it after two weeks of operating, and
 * getting to it meant Meetings, then the right meeting, then scrolling to the
 * scorecard. Every chart on this page waits on those numbers.
 *
 * So the four that drive what is on screen live here: cash is the pace line,
 * leads and tours are the funnel. The other eight are not duplicated — a second
 * place to type the same number is how a board ends up with two answers to what
 * did we collect. The button goes to the full card for those.
 */
function NumbersCard({
  meetings, call, onOpen,
}: {
  meetings: Meeting[];
  call: (u: string, m: string, b?: unknown) => Promise<boolean>;
  onOpen: (v: View) => void;
}) {
  const monday = [...meetings]
    .filter((m) => m.kind === "MondayBusiness" || m.kind === "MondayMonthly")
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))[0] ?? null;

  if (!monday) {
    return (
      <Panel className="px-5 py-4 shrink-0">
        <CardHead title="This week's numbers" sub="No Monday card yet" value="—" />
        <Button onClick={() => onOpen("Meetings")}>Go to meetings</Button>
      </Panel>
    );
  }

  const FIELDS = [
    "cashCollected", "podcastRevenue", "podcastMrr", "musicRevenue", "leads",
    "toursBooked", "toursShowed", "tourCloseRate", "recurringConversion",
    "roomHours", "editTurnaround", "roadmapCompletion",
  ] as const;
  const filled = FIELDS.filter((k) => monday[k] != null).length;

  const num = (v: number | null) => (v == null ? "" : String(v));

  return (
    <Fold title="This week's numbers" count={`${filled}/12 · ${fmtDate(monday.date)}`} soft>
      <SaveGroup>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Cash collected" type="number" value={num(monday.cashCollected)}
            onSave={(v) => call(`/api/meetings/${monday.id}`, "PATCH", { cashCollected: v })} />
          <Field label="Leads" type="number" value={num(monday.leads)}
            onSave={(v) => call(`/api/meetings/${monday.id}`, "PATCH", { leads: v })} />
          <Field label="Tours booked" type="number" value={num(monday.toursBooked)}
            onSave={(v) => call(`/api/meetings/${monday.id}`, "PATCH", { toursBooked: v })} />
          <Field label="Tours showed" type="number" value={num(monday.toursShowed)}
            onSave={(v) => call(`/api/meetings/${monday.id}`, "PATCH", { toursShowed: v })} />
        </div>
      </SaveGroup>

      <button
        onClick={() => onOpen("Meetings")}
        className="mt-3 text-[14px] text-[var(--muted)] hover:text-[var(--text)] min-h-[40px]"
      >
        {filled === FIELDS.length ? "Open the full card →" : `The other ${FIELDS.length - filled} on the full card →`}
      </button>
    </Fold>
  );
}


/**
 * The week's three meetings, as three widgets.
 *
 * The plan is a weekly rhythm — Monday the scoreboard, Wednesday the team,
 * Sunday the brand — and the board showed only whichever one happened to be
 * today, inside a paragraph. Three cards say when each one is, whether the last
 * one was held, and what it is for, without anyone opening a tab.
 *
 * Today's card carries the guidance that used to sit in its own panel above,
 * because that text was always about one of these three meetings anyway.
 */
const MEETING_WIDGETS = [
  { kind: "MondayBusiness", name: "Monday", when: "10:00 AM", purpose: "Scoreboard, funnel, money, commitments", tone: "var(--c1)" },
  { kind: "WednesdayTeam", name: "Wednesday", when: "5:30 PM", purpose: "Wins, bookings, training, accountability", tone: "var(--c3)" },
  { kind: "SundayBrand", name: "Sunday", when: "4:00 PM", purpose: "Music, Media, Merch — creative decisions", tone: "var(--c4)" },
] as const;

function MeetingWidgets({
  meetings, guide, onOpen,
}: {
  meetings: Meeting[];
  guide: ReturnType<typeof guideFor>;
  onOpen: (v: View) => void;
}) {
  const today = localToday();

  return (
    <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1 shrink-0">
      {MEETING_WIDGETS.map((w) => {
        const due = occurrenceToLog(w.kind, today);
        const next = nextOccurrence(w.kind, today);
        const isToday = due === today;

        // Monday's numbers can be logged under either Monday kind.
        const logged = meetings.find(
          (m) => (m.kind === w.kind || (w.kind === "MondayBusiness" && m.kind === "MondayMonthly"))
            && m.date.slice(0, 10) === due
        );
        const held = logged?.held ?? false;

        return (
          <button
            key={w.kind}
            onClick={() => onOpen("Meetings")}
            className="text-left"
          >
            <Panel className="h-full px-4 py-3.5 hover:bg-white/[0.06] transition-colors">
              <div className="flex items-baseline justify-between gap-3">
                <span className="flex items-baseline gap-2 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: w.tone }} />
                  <span className="text-[15px]">{w.name}</span>
                  {isToday && (
                    <span className="text-[11px] tracking-[0.14em] uppercase text-[var(--text)]">today</span>
                  )}
                </span>
                <span className="shrink-0 text-[13px] tabular-nums text-[var(--muted-3)]">{w.when}</span>
              </div>

              <p className="mt-1 text-[13px] leading-snug text-[var(--muted-3)]">{w.purpose}</p>

              <p className="mt-2 text-[13px]">
                {isToday ? (
                  held
                    ? <span className="text-[var(--ok)]">Held</span>
                    : <span className="text-[var(--warn)]">Not logged yet</span>
                ) : (
                  <span className="text-[var(--muted)]">Next {pretty(next)}</span>
                )}
              </p>

              {isToday && guide.detail && (
                <p className="mt-2.5 text-[13px] leading-relaxed text-[var(--muted)]">
                  {guide.detail}
                </p>
              )}
            </Panel>
          </button>
        );
      })}
    </div>
  );
}


/**
 * Where the open work is.
 *
 * Every one of the nine commitments on the board says Operations, and until
 * this card there was nothing anywhere on the page that said so. Against a plan
 * whose argument is that podcast is the cash engine and gets 65% of the growth
 * attention, a board that is entirely Operations is the most useful fact on the
 * screen — and it was invisible because it was repeated identically on every row.
 */
const PILLAR_TONE: Record<string, string> = {
  Podcast: "var(--c1)",
  Music: "var(--c2)",
  Media: "var(--c3)",
  Merch: "var(--c4)",
  Events: "var(--c5)",
  Revenue: "var(--c6)",
  Operations: "var(--c7)",
  Finance: "var(--c7)",
};

function PillarCard({ items, onOpen }: { items: Item[]; onOpen: (v: View) => void }) {
  const open = items.filter((i) => i.status !== "Done");
  const counts = new Map<string, number>();
  for (const i of open) counts.set(i.pillar, (counts.get(i.pillar) ?? 0) + 1);

  const rows = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value, colour: PILLAR_TONE[label] ?? "var(--c7)" }));

  if (rows.length === 0) return null;

  const podcast = counts.get("Podcast") ?? 0;
  const share = Math.round((podcast / open.length) * 100);

  return (
    <Panel className="px-5 py-4 shrink-0">
      <CardHead
        title="Open work"
        sub={`${rows.length} pillar${rows.length === 1 ? "" : "s"}`}
        value={String(open.length)}
      />
      <Bars rows={rows} total={open.length} />
      <button
        onClick={() => onOpen("ContentCalendar")}
        className="mt-3 text-left text-[13px] leading-relaxed text-[var(--muted-3)] hover:text-[var(--text)]"
      >
        {podcast === 0
          ? "Nothing open against Podcast. The plan gives it 65% of the growth attention →"
          : `Podcast is ${share}% of what is open. The plan asks for 65% of the attention →`}
      </button>
    </Panel>
  );
}

/** The day the plan starts, which is the day its first, short month starts. */
function planStartOf(weeks: Week[]): string | null {
  return weeks.reduce<string | null>(
    (a, w) => (w.startsOn && (!a || w.startsOn < a) ? w.startsOn : a),
    null
  );
}

/**
 * Revenue pace as at a given Monday, as a percentage of what was due by then.
 *
 * Only cards up to that Monday count. A card graded with money collected after
 * it would show a week as having hit a number it had not hit yet, and the whole
 * point of the card is what was true in the room that morning.
 */
function pacePctAt(
  date: string, months: Month[], meetings: Meeting[], weeks: Week[]
): number | null {
  const key = monthKeyOf(new Date(date));
  const month = months.find((m) => m.key === key);
  if (!month) return null;

  const upTo = meetings.filter(
    (m) => (m.kind === "MondayBusiness" || m.kind === "MondayMonthly") && Date.parse(m.date) <= Date.parse(date)
  );
  const collected = collectedByMonth(upTo as never)[key] ?? null;

  return pace({
    key, target: month.target, collected,
    planStart: planStartOf(weeks), now: new Date(date),
  })?.pct ?? null;
}

/**
 * Where the money stands, at the top of the board.
 *
 * The four tiles under this said "$1,275 collected of $16,000" and left the
 * reader to work out whether that was good — which depends entirely on what day
 * it is. Two of the other three were progress counters. Nothing on the page had
 * a time axis, so nothing on the page could say "behind".
 *
 * This says it in three ways at once: the sentence, the bar with today marked
 * on it, and the plan's whole revenue curve with actual drawn on top.
 */
/**
 * Everything the scoreboard needs, worked out once.
 *
 * The pace card and the tours card sit in different cells of the dashboard
 * grid, so the arithmetic cannot live inside either of them.
 */
function scoreboard(months: Month[], meetings: Meeting[], weeks: Week[]) {
  const weekly = meetings.filter((m) => m.kind === "MondayBusiness" || m.kind === "MondayMonthly");
  const actual = collectedByMonth(weekly as never);
  const planStart = planStartOf(weeks);

  const key = monthKeyOf(new Date());
  const month = months.find((m) => m.key === key) ?? null;
  const p = month
    ? pace({ key, target: month.target, collected: actual[key] ?? null, planStart })
    : null;

  // Cumulative, both lines. The actual stops at the last month anyone reported:
  // continuing it through unreported months would draw them as months of no
  // revenue, which is a different claim from "not filled in".
  const lastKnown = months.reduce((last, m, i) => (actual[m.key] != null ? i : last), -1);
  const monthIndex = months.findIndex((m) => m.key === key);
  let cumT = 0;
  let cumA = 0;
  let bankedByNow: number | null = null;
  const points: Point[] = months.map((m, i) => {
    // What the plan says is due by today: every earlier month in full, plus the
    // part of this one the calendar has used up.
    if (i === monthIndex && p) bankedByNow = cumT + p.expected;
    cumT += m.target;
    cumA += actual[m.key] ?? 0;
    return {
      label: m.label.replace(/[\s-]*\d+.*?,/, "").trim().split(" ")[0],
      target: cumT,
      actual: i <= lastKnown ? cumA : null,
    };
  });

  const nowMark =
    monthIndex >= 0 && p && bankedByNow != null
      ? { at: monthIndex + p.through - 1 + (monthIndex === 0 ? 1 : 0), expected: bankedByNow }
      : null;

  // The most recent Monday card that has any tour numbers on it.
  const card = [...weekly]
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
    .find((m) => m.toursBooked != null || m.leads != null) ?? null;
  const stages = card ? funnel(card) : null;

  // Cash by week, oldest first, for the sparkline on the Collected tile. One
  // week draws nothing; it fills in as Mondays accumulate.
  const cashByWeek = [...weekly]
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date))
    .map((m) => m.cashCollected);

  return { p, month, points, nowMark, card, stages, hasFunnel: stages?.some((s) => s.value != null) ?? false, cashByWeek };
}

type Board = ReturnType<typeof scoreboard>;

/**
 * Where the money stands. The card that leads the board.
 *
 * The tiles under it said "$1,275 collected of $16,000" and left the reader to
 * work out whether that was good — which depends entirely on what day it is.
 * Nothing on the page had a time axis, so nothing on the page could say behind.
 */
function PaceCard({ board, onOpen }: { board: Board; onOpen: (v: View) => void }) {
  const { p, month, points, nowMark } = board;

  return (
    <Panel className="h-full min-h-0 flex flex-col px-5 py-4">
      {p && month ? (
        <>
          <CardHead
            title={month.label}
            // The number alone is a minus sign in red. The word is what he reads.
            sub={`Day ${p.daysGone} of ${p.daysTotal} · ${
              Math.abs(p.delta) < 1 ? "on pace" : p.delta > 0 ? "ahead of pace" : "behind pace"
            }`}
            value={
              Math.abs(p.delta) < 1 ? "On pace"
                : p.delta > 0 ? `+${dollars(p.delta)}`
                : `−${dollars(-p.delta)}`
            }
            tone={Math.abs(p.delta) < 1 ? undefined : p.delta > 0 ? "ok" : "alert"}
          />

          <p className="text-[15px] leading-relaxed text-[var(--muted)] tabular-nums mb-3">
            {dollars(p.collected)} in, {dollars(p.expected)} due by tonight, {dollars(month.target)} for the month.
          </p>

          <PaceBar pct={p.pct} through={p.through} />
        </>
      ) : (
        <>
          <CardHead title="Pace" sub="No target for this month yet" value="—" />
          <p className="text-[15px] leading-relaxed text-[var(--muted)]">
            Pace needs a monthly target to measure against. They live on Money.
          </p>
        </>
      )}

      <div className="mt-4 min-h-0 flex-1 flex items-end text-[var(--text)]">
        <Curve points={points} now={nowMark} height={168} />
      </div>

      <div className="mt-2 flex items-center gap-5 text-[13px] text-[var(--muted-3)]">
        <span className="flex items-center gap-2">
          <span className="w-4 h-px" style={{ borderTop: "1px dashed currentColor" }} />
          plan
        </span>
        <span className="flex items-center gap-2">
          <span className="w-4 h-[2px] rounded bg-[var(--text)]" />
          collected
        </span>
        <button onClick={() => onOpen("Money")} className="ml-auto text-[var(--muted)] hover:text-[var(--text)]">
          Money →
        </button>
      </div>
    </Panel>
  );
}

/** Tours as a funnel rather than as three counts in three boxes. */
function ToursCard({ board, onOpen }: { board: Board; onOpen: (v: View) => void }) {
  const { card, stages, hasFunnel } = board;

  if (!hasFunnel) {
    return (
      <Panel className="h-full min-h-0 px-5 py-4">
        <CardHead title="Tours" sub="Nothing to draw yet" value="—" />
        <p className="text-[15px] leading-relaxed text-[var(--muted)] mb-4">
          Leads and tours go on the Monday card. The funnel appears the moment
          there are numbers on one.
        </p>
        <Button arrow onClick={() => onOpen("Meetings")}>Open the Monday card</Button>
      </Panel>
    );
  }

  const b = card?.toursBooked ?? null;
  const s = card?.toursShowed ?? null;
  const rate = b != null && s != null && b > 0 ? (s / b) * 100 : null;

  return (
    <Panel className="h-full min-h-0 flex flex-col px-5 py-4">
      <CardHead title="Tours" sub="Last card"
        value={rate == null ? "—" : `${Math.round(rate)}%`}
        tone={rate == null ? undefined : rate >= 70 ? "ok" : rate >= 60 ? "warn" : "alert"} />
      <Funnel stages={stages!} />
      <p className="mt-3 text-[13px] leading-relaxed text-[var(--muted-3)]">
        {rate == null
          ? "Fill in leads and tours on Monday and the drop shows up here."
          : rate >= 70
            ? `${Math.round(rate)}% showed. Green on your threshold.`
            : `${b! - s!} booked tour${b! - s! === 1 ? "" : "s"} did not turn up. Green is 70% showing.`}
      </p>
      <button
        onClick={() => onOpen("Meetings")}
        className="mt-auto pt-3 text-left text-[14px] text-[var(--muted)] hover:text-[var(--text)] min-h-[40px]"
      >
        Open the Monday card →
      </button>
    </Panel>
  );
}

/**
 * The header every card wears: what it is on the left, what it says on the right.
 *
 * Taken from the dashboards Jaco sent — each card names itself and puts its one
 * number in the corner, so the board can be read by running down the right edge
 * without stopping to parse a sentence.
 */
function CardHead({ title, sub, value, tone }: {
  title: string; sub?: string; value?: string; tone?: "ok" | "warn" | "alert";
}) {
  const colour =
    tone === "ok" ? "text-[var(--ok)]" : tone === "warn" ? "text-[var(--warn)]"
      : tone === "alert" ? "text-[var(--alert)]" : "";
  return (
    <div className="flex items-start justify-between gap-4 mb-3">
      <div className="min-w-0">
        <p className="text-[15px] leading-tight truncate">{title}</p>
        {sub && <p className="mt-0.5 text-[13px] text-[var(--muted-3)] truncate">{sub}</p>}
      </div>
      {value && (
        <p className={`shrink-0 text-[26px] leading-none tabular-nums tracking-[-0.02em] ${colour}`}>{value}</p>
      )}
    </div>
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
  items, call, ownerOptions, groupBy = "due", onGroupBy, dense = false,
}: {
  items: Item[];
  call: (u: string, m: string, b?: unknown) => Promise<boolean>;
  ownerOptions: string[];
  groupBy?: "due" | "owner" | "priority" | "none";
  onGroupBy?: (v: "due" | "owner" | "priority" | "none") => void;
  /** Inside a dashboard card, where the room is a fixed panel rather than a page. */
  dense?: boolean;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  if (items.length === 0) return <Empty>Nothing here yet.</Empty>;

  const groups =
    groupBy === "none"
      ? [{ key: "all", label: "", items, urgent: false }]
      : group(items as never, groupBy);

  return (
    <>
      {onGroupBy && items.length > 2 && (
        <div className="flex items-center gap-3 mb-4">
          <span className="text-[13px] text-[var(--muted-3)]">Group by</span>
          <select
            value={groupBy}
            onChange={(e) => onGroupBy(e.target.value as never)}
            className="min-h-[40px] rounded-full px-4 text-[15px]"
          >
            <option value="due">Due date</option>
            <option value="owner">Owner</option>
            <option value="priority">Priority</option>
            <option value="none">Nothing</option>
          </select>
        </div>
      )}

      {groups.map((g) => (
        <section key={g.key} className={dense ? "mb-4" : "mb-7"}>
          {g.label && (
            <div className="flex items-baseline gap-3 mb-1">
              <h3 className={`text-[13px] tracking-[0.14em] uppercase ${g.urgent ? "text-[var(--alert)]" : "text-[var(--muted-3)]"}`}>
                {g.label}
              </h3>
              <span className="text-[13px] tabular-nums text-[var(--muted-3)]">{g.items.length}</span>
            </div>
          )}
          <ItemRows
            items={g.items as Item[]} call={call} ownerOptions={ownerOptions} dense={dense}
            open={open} setOpen={setOpen} confirming={confirming} setConfirming={setConfirming}
          />
        </section>
      ))}
    </>
  );
}

function ItemRows({
  items, call, ownerOptions, open, setOpen, confirming, setConfirming, dense = false,
}: {
  items: Item[];
  call: (u: string, m: string, b?: unknown) => Promise<boolean>;
  ownerOptions: string[];
  open: string | null; setOpen: (v: string | null) => void;
  confirming: string | null; setConfirming: (v: string | null) => void;
  dense?: boolean;
}) {
  return (
    <div className="divide-y divide-white/10 border-t border-white/10">
      {items.map((it) => (
        <div key={it.id} className={dense ? "py-2.5" : "py-3.5"}>
          <div className="flex items-start gap-4">
            <Tick
              done={it.status === "Done"}
              label={it.status === "Done" ? "Mark not done" : "Mark done"}
              onClick={() => call(`/api/items/${it.id}`, "PATCH", {
                status: it.status === "Done" ? "NotStarted" : "Done",
              })}
            />
            <button onClick={() => setOpen(open === it.id ? null : it.id)} className="min-w-0 flex-1 text-left">
              <span className={`block ${dense ? "text-[16px]" : "text-[18px]"} leading-snug ${it.status === "Done" ? "text-[var(--muted-3)] line-through" : ""}`}>
                {it.title}
              </span>
              <span className={`mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 ${dense ? "text-[13px]" : "text-[14px]"} text-[var(--muted)]`}>
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
            <>
            <SaveGroup className="pt-6 sm:pl-[34px]">
              <div className="grid gap-5 sm:grid-cols-2">
              <Choice
                label="Owner"
                value={it.owner}
                options={ownerOptions}
                onSave={(v) => call(`/api/items/${it.id}`, "PATCH", { owner: v })}
              />
              <Choice
                label="Section"
                value={it.view}
                options={MOVABLE.map(([v]) => v)}
                labels={Object.fromEntries(MOVABLE)}
                onSave={(v) => call(`/api/items/${it.id}`, "PATCH", { view: v })}
              />
              <Choice label="Pillar" value={it.pillar} options={PILLARS} onSave={(v) => call(`/api/items/${it.id}`, "PATCH", { pillar: v })} />
              <Choice label="Priority" value={it.priority} options={PRIORITIES} onSave={(v) => call(`/api/items/${it.id}`, "PATCH", { priority: v })} />
              <Choice label="Status" value={it.status} options={STATUSES} onSave={(v) => call(`/api/items/${it.id}`, "PATCH", { status: v })} />
              <Field label="Due date" type="date" value={it.dueDate ? it.dueDate.slice(0, 10) : ""} onSave={(v) => call(`/api/items/${it.id}`, "PATCH", { dueDate: v || null })} />
              <Field label="KPI / impact" value={it.kpi} onSave={(v) => call(`/api/items/${it.id}`, "PATCH", { kpi: v })} />
              <Field label="Dependency" value={it.dependency} onSave={(v) => call(`/api/items/${it.id}`, "PATCH", { dependency: v })} className="sm:col-span-2" />
              <Field label="Notes / evidence" multiline value={it.notes} onSave={(v) => call(`/api/items/${it.id}`, "PATCH", { notes: v })} className="sm:col-span-2" />
              </div>
              {it.view === "SOP" && <SopEditor item={it} call={call} />}
            </SaveGroup>

            <div className="mt-8 pt-5 border-t border-white/10 sm:pl-[34px]">
              {confirming === it.id ? (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-[15px] text-[var(--muted)]">Delete “{it.title}” for good?</span>
                  <button
                    onClick={() => { setConfirming(null); call(`/api/items/${it.id}`, "DELETE"); }}
                    className="min-h-[44px] px-5 rounded-full text-[15px] bg-[var(--alert)] text-white"
                  >
                    Yes, delete
                  </button>
                  <button
                    onClick={() => setConfirming(null)}
                    className="min-h-[44px] px-5 rounded-full bezel text-[15px]"
                    style={BLUR(24)}
                  >
                    Keep it
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirming(it.id)}
                  className="min-h-[44px] text-[15px] text-[var(--muted-3)] hover:text-[var(--alert)]"
                >
                  Delete this item
                </button>
              )}
            </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

function AddItem({
  view, quarterId, open, setOpen, onDone, onError, ownerOptions,
}: {
  view: View; quarterId: string | null; open: boolean;
  setOpen: (b: boolean) => void; onDone: () => void; onError: (s: string) => void;
  ownerOptions: string[];
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
    <div className="mt-7 grid gap-4 max-w-[560px]">
      {/* Plain controlled inputs rather than Field.
          Field only reports its value when it loses focus, which is right for
          editing something that already exists and wrong for a form you submit:
          pick a date, press Add while the picker still has focus, and the date
          never reaches the form. Here every keystroke is the state. */}
      <label className="block">
        <span className="block text-[11px] tracking-[0.14em] uppercase text-[var(--muted-3)] mb-2">Task</span>
        <input
          value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="Clear verb and outcome"
          className="w-full min-h-[48px] px-3.5 py-3 text-[16px] rounded-[10px] bg-white/[0.04] border border-white/10 text-[var(--text)]"
        />
      </label>

      <label className="block">
        <span className="block text-[11px] tracking-[0.14em] uppercase text-[var(--muted-3)] mb-2">
          Owner — required
        </span>
        <select
          value={owner} onChange={(e) => setOwner(e.target.value)}
          className="w-full min-h-[48px] px-3 text-[16px] rounded-[10px] bg-white/[0.04] border border-white/10 text-[var(--text)]"
        >
          <option value="">Pick someone</option>
          {ownerOptions.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </label>

      <label className="block">
        <span className="block text-[11px] tracking-[0.14em] uppercase text-[var(--muted-3)] mb-2">
          {view === "ThisWeek" ? "Due date — required" : "Due date"}
        </span>
        <input
          type="date" value={due} onChange={(e) => setDue(e.target.value)}
          className="w-full min-h-[48px] px-3.5 py-3 text-[16px] rounded-[10px] bg-white/[0.04] border border-white/10 text-[var(--text)]"
        />
      </label>

      <div className="flex gap-3">
        <Button kind="solid" onClick={submit} disabled={saving || !title.trim() || !owner.trim()}>
          {saving ? "Saving" : "Add"}
        </Button>
        <Button onClick={() => { setOpen(false); onError(""); }}>Cancel</Button>
      </div>
    </div>
  );
}

function Okrs({
  quarters, call, meetings, items,
}: {
  quarters: Quarter[];
  call: (u: string, m: string, b?: unknown) => Promise<boolean>;
  meetings: Meeting[]; items: Item[];
}) {
  // What the Monday cards already know, so a key result the scorecard can
  // answer does not get scored by hand into a different number.
  const cards = meetings
    .filter((m) => m.kind === "MondayBusiness" || m.kind === "MondayMonthly")
    .map((m) => ({
      date: m.date, toursBooked: m.toursBooked, toursShowed: m.toursShowed,
      tourCloseRate: m.tourCloseRate, podcastMrr: m.podcastMrr,
    }));
  const sops = items.filter((i) => i.view === "SOP");
  const thisWeek = items.filter((i) => i.view === "ThisWeek");
  const counts = {
    sopsPublished: sops.filter((i) => i.sop?.published).length,
    sopsRequired: 7,
    meetingsHeld: meetings.length,
    // Three a week since the sprint began, which is what the plan schedules.
    meetingsExpected: Math.max(
      1,
      Math.ceil((Date.now() - Date.parse("2026-08-10T00:00:00-04:00")) / (7 * 86400000)) * 3
    ),
    commitmentsOwnedAndDated: thisWeek.filter((i) => i.owner !== "Unassigned" && i.dueDate).length,
    commitmentsTotal: thisWeek.length,
  };
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
                      {o.keyResults.map((k) => {
                        const measured = measureKr(k.text, cards, counts);
                        return (
                        <div key={k.id}>
                          <p className="text-[16px] leading-relaxed text-[var(--muted)]">
                            <span className="text-[var(--muted-3)] tabular-nums mr-2">{k.label}</span>
                            {k.text}
                          </p>
                          {measured && (
                            <p className="mt-2 text-[15px] tabular-nums">
                              <span className="text-[var(--text)]">{measured.value}</span>
                              <span className="text-[var(--muted-3)]"> {measured.label} · from the Monday cards</span>
                            </p>
                          )}
                          <div className="mt-2.5 flex flex-wrap items-center gap-3">
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
                            {measured && measured.score !== k.score && (
                              <button
                                onClick={() => call(`/api/krs/${k.id}`, "PATCH", { score: String(measured.score) })}
                                className="min-h-[46px] px-4 rounded-full bezel text-[15px]"
                                style={BLUR(24)}
                              >
                                Use {measured.score.toFixed(2)}
                              </button>
                            )}
                          </div>
                        </div>
                        );
                      })}
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
  const [showAll, setShowAll] = useState(false);
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
          {(showAll ? rows : rows.slice(0, 4)).map((m) => (
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
        {rows.length > 4 && (
          <button
            onClick={() => setShowAll((v) => !v)}
            className="mt-4 min-h-[46px] text-[15px] text-[var(--muted)] hover:text-[var(--text)]"
          >
            {showAll ? "Show fewer months" : `Show all ${rows.length} months to $250K`}
          </button>
        )}
        {!anyActual && (
          <p className="mt-4 text-[15px] leading-relaxed text-[var(--muted-3)]">
            No actuals yet. Log a Monday meeting and fill in cash collected, and these fill in
            themselves.
          </p>
        )}
      </section>

      <section className="mt-12">
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

      <section className="mt-12">
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
  meeting, pacePct, thresholds,
}: { meeting: Meeting; pacePct: number | null; thresholds: Threshold[] }) {
  const graded = gradeAll(meeting, pacePct);
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
  meetings, months, thresholds, weeks, call,
}: {
  meetings: Meeting[]; months: Month[]; thresholds: Threshold[]; weeks: Week[];
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
                            pacePct={pacePctAt(m.date, months, meetings, weeks)}
                          />
                          <Eyebrow>Scorecard</Eyebrow>
                          <SaveGroup>
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
                          </SaveGroup>
                        </>
                      ) : (
                        <SaveGroup>
                        <Field
                          label="Prep brief — write this before the meeting" multiline value={m.prep}
                          placeholder={
                            def.kind === "WednesdayTeam"
                              ? "Bookings this week and next. Client or technical issues worth teaching from. Training topic. Intern assignments."
                              : "Where do Music, Media and Merch rank this week? What is in the content bank? Next podcast, freestyle or commercial? Upcoming event and its business objective."
                          }
                          onSave={(v) => call(`/api/meetings/${m.id}`, "PATCH", { prep: v })}
                        />
                        </SaveGroup>
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

      <SaveGroup>
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
      </SaveGroup>
    </>
  );
}


const SOP_FIELDS: [keyof Sop, string, string][] = [
  ["purpose", "Purpose", "Why this process exists."],
  ["trigger", "Trigger", "What starts it."],
  ["inputs", "Inputs", "The information or files needed before you begin."],
  ["steps", "Steps", "One per line. Five to twelve."],
  ["qualityCheck", "Quality check", "What must be true before it counts as done."],
  ["sla", "SLA", "How long it should take."],
  ["escalation", "Escalation", "What happens when something goes wrong."],
  ["version", "Version", "v1, and the date you last changed it."],
];

/**
 * The SOP itself, in section 18's format.
 *
 * The list held titles and owners, which is a list of intentions. Written out,
 * an SOP reads like the plan document does — which is what Jaco asked for, and
 * also what makes it usable by someone who was not in the room.
 */
function SopEditor({
  item, call,
}: { item: Item; call: (u: string, m: string, b?: unknown) => Promise<boolean> }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Sop>(
    item.sop ?? {
      docUrl: "", purpose: "", trigger: "", inputs: "", steps: "",
      qualityCheck: "", sla: "", escalation: "", version: "v1", published: false,
    }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const linked = item.sop?.docUrl?.trim();
  const written = item.sop && (item.sop.docUrl || item.sop.purpose || item.sop.steps);

  // Google serves an embeddable copy at /preview. Anything else, just link it.
  const previewUrl = linked
    ? linked.replace(/\/(edit|view)(\?[^#]*)?(#.*)?$/, "/preview")
    : null;

  const save = async (published?: boolean) => {
    setSaving(true); setError("");
    const r = await fetch(`/api/sops/${item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...draft, ...(published === undefined ? {} : { published }) }),
    });
    setSaving(false);
    if (!r.ok) { setError((await r.json().catch(() => ({}))).error ?? "Could not save."); return; }
    setOpen(false);
    await call("/api/roadmap", "GET");
  };

  if (!open) {
    return (
      <div className="mt-7 pt-6 border-t border-white/10">
        {written ? (
          <>
            <div className="flex items-baseline justify-between gap-3 mb-4">
              <Eyebrow>The procedure</Eyebrow>
              <span className="text-[13px] text-[var(--muted-3)]">
                {item.sop!.version}
                {item.sop!.published ? " · published" : " · draft"}
              </span>
            </div>
            {linked && (
              <div className="mb-6">
                <div className="rounded-xl overflow-hidden border border-white/10 bg-white">
                  {/* The doc as it looks in Docs. Needs link-sharing on, or
                      Google shows a sign-in wall inside the frame. */}
                  <iframe
                    src={previewUrl!}
                    title={`${item.title} in Google Docs`}
                    className="w-full h-[520px]"
                    loading="lazy"
                  />
                </div>
                <a
                  href={linked} target="_blank" rel="noopener noreferrer"
                  className="inline-block mt-3 min-h-[44px] leading-[44px] text-[15px] text-[var(--muted)] hover:text-[var(--text)]"
                >
                  Open in Google Docs →
                </a>
              </div>
            )}

            {/* Recommendations sit under the document, the way the plan page
                reads: the thing itself first, then what to do about it. */}
            {linked && <DocGaps itemId={item.id} />}

            {SOP_FIELDS.filter(([k]) => (item.sop![k] as string)?.trim()).map(([k, label]) => (
              <div key={k} className="mb-5">
                <p className="text-[11px] tracking-[0.14em] uppercase text-[var(--muted-3)] mb-1.5">{label}</p>
                {k === "steps" ? (
                  <ol className="space-y-1.5">
                    {(item.sop![k] as string).split("\n").filter((l) => l.trim()).map((l, i) => (
                      <li key={i} className="flex gap-3 text-[16px] leading-relaxed">
                        <span className="shrink-0 tabular-nums text-[var(--muted-3)]">{i + 1}</span>
                        <span>{l.replace(/^\d+[.)]\s*/, "")}</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-[16px] leading-relaxed whitespace-pre-wrap">{item.sop![k] as string}</p>
                )}
              </div>
            ))}
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => setOpen(true)}>Edit the procedure</Button>
              {!item.sop!.published && (
                <Button kind="solid" onClick={() => save(true)}>Publish</Button>
              )}
            </div>
          </>
        ) : (
          <>
            <Eyebrow>The procedure</Eyebrow>
            <p className="text-[15px] leading-relaxed text-[var(--muted)] mb-4">
              Not written yet. Either paste the link to the Google Doc you already have, or write it
              here in the plan's format — purpose, trigger, inputs, five to twelve steps, quality
              check, SLA, escalation, version.
            </p>
            <Button onClick={() => setOpen(true)}>Add it</Button>
          </>
        )}
        {error && <p className="mt-3 text-[15px] text-[var(--alert)]">{error}</p>}
      </div>
    );
  }

  return (
    <div className="mt-7 pt-6 border-t border-white/10">
      <Eyebrow>The procedure</Eyebrow>
      <label className="block mb-6">
        <span className="block text-[11px] tracking-[0.14em] uppercase text-[var(--muted-3)] mb-1">
          Google Doc
        </span>
        <span className="block text-[13px] text-[var(--muted-3)] mb-2">
          Paste the link and that becomes the SOP. The fields below stay optional — no point keeping
          the same procedure in two places. Set the doc to anyone-with-the-link or it will ask JoJo to
          sign in.
        </span>
        <input
          value={draft.docUrl}
          onChange={(e) => setDraft({ ...draft, docUrl: e.target.value })}
          placeholder="https://docs.google.com/document/d/…"
          className="w-full min-h-[48px] px-3.5 py-3 text-[16px] rounded-[10px] bg-white/[0.04] border border-white/10 text-[var(--text)]"
        />
      </label>

      <div className="grid gap-5">
        {SOP_FIELDS.map(([k, label, hint]) => (
          <label key={k} className="block">
            <span className="block text-[11px] tracking-[0.14em] uppercase text-[var(--muted-3)] mb-1">
              {label}
            </span>
            <span className="block text-[13px] text-[var(--muted-3)] mb-2">{hint}</span>
            {k === "steps" ? (
              <textarea
                rows={8}
                value={draft[k] as string}
                onChange={(e) => setDraft({ ...draft, [k]: e.target.value })}
                className="w-full px-3.5 py-3 text-[16px] leading-relaxed rounded-[10px] bg-white/[0.04] border border-white/10 text-[var(--text)]"
              />
            ) : (
              <input
                value={draft[k] as string}
                onChange={(e) => setDraft({ ...draft, [k]: e.target.value })}
                className="w-full min-h-[48px] px-3.5 py-3 text-[16px] rounded-[10px] bg-white/[0.04] border border-white/10 text-[var(--text)]"
              />
            )}
          </label>
        ))}
      </div>
      {error && <p className="mt-3 text-[15px] text-[var(--alert)]">{error}</p>}
      <div className="mt-6 flex flex-wrap gap-3">
        <Button kind="solid" onClick={() => save()} disabled={saving}>
          {saving ? "Saving" : "Save the procedure"}
        </Button>
        <Button onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </div>
  );
}


/**
 * The SOP tab, split into what exists and what is still owed.
 *
 * A single list of twelve titles does not tell you where you stand. Launch
 * Sprint O2 KR3 is about published SOPs, so the split is published, drafted and
 * not written — and the seven the sprint actually names are marked, because
 * those are the ones with a deadline.
 */
function SopSplit({
  items, call, ownerOptions,
}: {
  items: Item[];
  call: (u: string, m: string, b?: unknown) => Promise<boolean>;
  ownerOptions: string[];
}) {
  const published = items.filter((i) => i.sop?.published);
  const drafted = items.filter((i) => i.sop && !i.sop.published);
  const unwritten = items.filter((i) => !i.sop);
  const critical = unwritten.filter((i) => i.priority === "Critical");

  return (
    <>
      <Panel className="mb-8 px-5 py-5">
        <p className="text-[11px] tracking-[0.18em] uppercase text-[var(--muted-3)] mb-3">Where you stand</p>
        <dl className="divide-y divide-white/[0.08]">
          <Row k="Published" v={String(published.length)} big />
          <Row k="Drafted, not published" v={String(drafted.length)} big />
          <Row k="Not written" v={String(unwritten.length)} big warn={unwritten.length > 0} />
        </dl>
        {critical.length > 0 && (
          <p className="mt-4 text-[15px] leading-relaxed text-[var(--muted)]">
            {critical.length} of the unwritten {critical.length === 1 ? "is" : "are"} in the seven the
            Launch Sprint requires before Q4.
          </p>
        )}
      </Panel>

      {published.length > 0 && (
        <section className="mb-10">
          <Eyebrow>Published</Eyebrow>
          <Items items={published} call={call} ownerOptions={ownerOptions} />
        </section>
      )}
      {drafted.length > 0 && (
        <section className="mb-10">
          <Eyebrow>Drafted — read it, then publish</Eyebrow>
          <Items items={drafted} call={call} ownerOptions={ownerOptions} />
        </section>
      )}
      {unwritten.length > 0 && (
        <section className="mb-10">
          <Eyebrow>Still to write</Eyebrow>
          <Items items={unwritten} call={call} ownerOptions={ownerOptions} />
        </section>
      )}
    </>
  );
}

/** Paste an SOP written elsewhere and have it mapped onto the plan's format. */
function SopImport({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ title: string; missing: string[] } | null>(null);
  const [error, setError] = useState("");

  const run = async () => {
    setBusy(true); setError(""); setResult(null);
    const r = await fetch("/api/sops/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    setBusy(false);
    if (!r.ok) { setError((await r.json().catch(() => ({}))).error ?? "Could not import that."); return; }
    const d = await r.json();
    setResult({ title: d.item.title, missing: d.missing ?? [] });
    setText("");
    onDone();
  };

  if (!open) {
    return (
      <div className="mb-8">
        <Button onClick={() => setOpen(true)}>Import an SOP you already have</Button>
      </div>
    );
  }

  return (
    <Panel className="mb-8 px-5 py-5">
      <p className="text-[11px] tracking-[0.18em] uppercase text-[var(--muted-3)] mb-2">Import</p>
      <p className="text-[15px] leading-relaxed text-[var(--muted)] mb-4">
        Paste a Google Doc link, or the SOP text itself. A link is fetched and stays attached to the
        SOP so the doc remains the source. Either way it uses only what the document says — anything
        it does not cover is listed rather than invented — and arrives as a draft.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        placeholder="https://docs.google.com/document/d/… or paste the text"
        className="w-full px-3.5 py-3 text-[16px] leading-relaxed rounded-[10px] bg-white/[0.04] border border-white/10 text-[var(--text)]"
      />
      {error && <p className="mt-3 text-[15px] text-[var(--alert)]">{error}</p>}
      {result && (
        <div className="mt-4">
          <p className="text-[16px]">Imported: {result.title}</p>
          {result.missing.length > 0 && (
            <p className="mt-1.5 text-[15px] leading-relaxed text-[var(--warn)]">
              Your document did not cover: {result.missing.join(", ")}. Fill those in before publishing.
            </p>
          )}
        </div>
      )}
      <div className="mt-5 flex flex-wrap gap-3">
        <Button kind="solid" onClick={run} disabled={busy || (text.trim().length < 40 && !/^https:\/\/(docs|drive)\.google\.com\//.test(text.trim()))}>
          {busy ? "Reading it…" : "Import"}
        </Button>
        <Button onClick={() => { setOpen(false); setError(""); setResult(null); }}>Close</Button>
      </div>
    </Panel>
  );
}


/** The roster, and what each person is carrying. */
function Team({
  people, items, call, onDone,
}: {
  people: Person[]; items: Item[];
  call: (u: string, m: string, b?: unknown) => Promise<boolean>;
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [error, setError] = useState("");

  const add = async () => {
    setError("");
    const r = await fetch("/api/people", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, role }),
    });
    if (!r.ok) { setError((await r.json().catch(() => ({}))).error ?? "Could not add."); return; }
    setName(""); setRole(""); onDone();
  };

  return (
    <>
      <div className="divide-y divide-white/10 border-t border-white/10">
        {people.filter((p) => p.active).map((p) => {
          const open = items.filter((i) => i.owner === p.name && i.status !== "Done").length;
          const week = items.filter(
            (i) => i.owner === p.name && i.view === "ThisWeek" && i.status !== "Done"
          ).length;
          return (
            <div key={p.id} className="py-5">
              <div className="flex items-baseline justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[18px]">{p.name}</p>
                  {p.role && <p className="mt-1 text-[15px] text-[var(--muted)]">{p.role}</p>}
                </div>
                <div className="shrink-0 text-right">
                  <p className={`text-[20px] tabular-nums ${week > 5 ? "text-[var(--alert)]" : ""}`}>{week}</p>
                  <p className="text-[13px] text-[var(--muted-3)]">this week</p>
                </div>
              </div>
              {p.owns && (
                <p className="mt-2.5 text-[15px] leading-relaxed text-[var(--muted-3)]">{p.owns}</p>
              )}
              {open > 0 && (
                <p className="mt-2 text-[14px] text-[var(--muted-3)]">
                  {open} open item{open === 1 ? "" : "s"} in total
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8 grid gap-4 max-w-[520px]">
        <Eyebrow>Add someone</Eyebrow>
        <input
          value={name} onChange={(e) => setName(e.target.value)} placeholder="Name"
          className="w-full min-h-[48px] px-3.5 text-[16px]"
        />
        <input
          value={role} onChange={(e) => setRole(e.target.value)} placeholder="Role, e.g. Podcast producer"
          className="w-full min-h-[48px] px-3.5 text-[16px]"
        />
        {error && <p className="text-[15px] text-[var(--alert)]">{error}</p>}
        <div>
          <Button kind="solid" onClick={add} disabled={!name.trim()}>Add to the roster</Button>
        </div>
      </div>
    </>
  );
}


/**
 * What a linked Google Doc does not cover, and the words to fix it.
 *
 * The app cannot write to the Doc — it has read-only calendar access and asking
 * for write access to Drive to append a paragraph would be a wildly
 * disproportionate permission. So it drafts and he pastes.
 */
function DocGaps({ itemId }: { itemId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    covered: string[];
    gaps: { section: string; draft: string; assumption: string }[];
  } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const run = async () => {
    setBusy(true); setError(""); setResult(null);
    const r = await fetch("/api/sops/gaps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId }),
    });
    setBusy(false);
    if (!r.ok) { setError((await r.json().catch(() => ({}))).error ?? "Could not read it."); return; }
    setResult(await r.json());
  };

  return (
    <div className="mb-6">
      {!result && (
        <>
          <Button onClick={run} disabled={busy} kind="solid" arrow>
            {busy ? "Scanning the doc…" : "Run scan"}
          </Button>
          <p className="mt-3 text-[15px] leading-relaxed text-[var(--muted)]">
            Reads the doc against the house format and recommends what to add. Run it again whenever
            you change the document.
          </p>
          {error && <p className="mt-3 text-[15px] text-[var(--alert)]">{error}</p>}
        </>
      )}

      {result && (
        <Panel className="px-5 py-5">
          <p className="text-[11px] tracking-[0.18em] uppercase text-[var(--muted-3)] mb-3">
            Against the house format
          </p>

          {result.covered.length > 0 && (
            <p className="text-[15px] leading-relaxed text-[var(--muted)] mb-5">
              Already covered: {result.covered.map((c) => c.split("(")[0].trim()).join(", ")}.
            </p>
          )}

          {result.gaps.length === 0 ? (
            <p className="text-[16px] leading-relaxed">
              Nothing missing — this doc covers the whole format. Ready to publish.
            </p>
          ) : (
            <div className="space-y-6">
              {result.gaps.map((g) => (
                <div key={g.section}>
                  <p className="text-[16px] mb-2">
                    <span className="text-[var(--warn)]">Missing</span> · {g.section}
                  </p>
                  <pre className="whitespace-pre-wrap text-[15px] leading-relaxed text-[var(--muted)] bg-[var(--text)]/[0.04] rounded-lg p-4">
{g.draft}
                  </pre>
                  {g.assumption && (
                    <p className="mt-2 text-[14px] leading-relaxed text-[var(--muted-3)]">
                      Assumed: {g.assumption}
                    </p>
                  )}
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(g.draft);
                      setCopied(g.section);
                      setTimeout(() => setCopied(null), 2000);
                    }}
                    className="mt-3 min-h-[44px] px-5 rounded-full bezel text-[15px]"
                    style={BLUR(24)}
                  >
                    {copied === g.section ? "Copied" : "Copy to paste into the doc"}
                  </button>
                </div>
              ))}
              <p className="text-[14px] leading-relaxed text-[var(--muted-3)]">
                Paste these at the bottom of the doc. I cannot write to it — this app only has
                read-only access to your calendar, and asking for write access to your whole Drive to
                append a paragraph is not a trade worth making.
              </p>
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button onClick={run} disabled={busy}>{busy ? "Scanning…" : "Run scan again"}</Button>
            <span className="text-[14px] text-[var(--muted-3)]">
              after you edit the doc
            </span>
          </div>
        </Panel>
      )}
    </div>
  );
}
