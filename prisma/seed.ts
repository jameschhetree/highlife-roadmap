/**
 * Seeds the Roadmap from the HighLife Operating System 2026-2027 document.
 *
 * Every objective, key result, SOP and execution week below is transcribed from
 * that document rather than invented. Where the plan is silent — an owner for a
 * KR-level project, say — the row is not created, because a made-up owner is
 * worse than an absent one when the whole system runs on accountability.
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";

config({ path: ".env" });
config({ path: ".env.local", override: true });

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!url) throw new Error("DATABASE_URL not set");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

type KR = string;
type Obj = { kind: "RevenueEngine" | "OperatingSystem" | "BrandFootprint"; title: string; krs: KR[] };

const QUARTERS: {
  key: string; name: string; dates: string; revenueTarget: string;
  cumulative: string; focus: string; isCurrent?: boolean; objectives: Obj[];
}[] = [
  {
    key: "launch-sprint",
    name: "Launch Sprint",
    dates: "Aug 10 – Sep 30, 2026",
    revenueTarget: "$16K",
    cumulative: "$16K",
    focus: "Prove the podcast funnel and close recurring packages.",
    isCurrent: true,
    objectives: [
      {
        kind: "RevenueEngine",
        title: "Prove the podcast acquisition-to-recurring funnel",
        krs: [
          "Book at least 50 podcast tours during the sprint.",
          "Achieve at least 65% tour show rate and 25% tour-to-first-sale close rate.",
          "Close at least 10 new paid podcast customers.",
          "Exit September with at least $2.5K in podcast MRR or equivalent contracted monthly recurring value.",
          "Every lead and opportunity lives in HighLevel with stage, owner, source and next action.",
        ],
      },
      {
        kind: "OperatingSystem",
        title: "Install the HighLife operating system",
        krs: [
          "Hold >=90% of scheduled Monday, Wednesday and Sunday meetings.",
          "Move all leadership commitments into the Roadmap with owner, due date and OKR tag.",
          "Publish the first 7 core SOPs: lead response, tour, proposal/follow-up, client onboarding, podcast session, file handoff/editing, revision/delivery.",
        ],
      },
      {
        kind: "BrandFootprint",
        title: "Restart brand cadence without losing revenue focus",
        krs: [
          "Publish/record the HL Podcast weekly for the remainder of the sprint.",
          "Complete at least 3 podcast commercial creative batches during the partial two-month sprint.",
          "Run 2 HL Freestyle activations and 2 monthly events or documented equivalent if calendar constraints require one event to shift.",
        ],
      },
    ],
  },
  {
    key: "q4-2026",
    name: "Q4 2026",
    dates: "Oct – Dec 2026",
    revenueTarget: "$36K",
    cumulative: "$52K",
    focus: "Exit December at ~$13K/month with podcast becoming material.",
    objectives: [
      {
        kind: "RevenueEngine",
        title: "Reach $36K quarter revenue and make podcasting material",
        krs: [
          "Collect $36K total revenue across October–December.",
          "Exit December at approximately $13K monthly revenue.",
          "Reach at least $4K–$4.5K monthly podcast revenue and $4K podcast MRR or close equivalent.",
          "Sustain >=70% tour show rate and >=25%-30% tour-to-first-sale close rate.",
          "Reach >=35% first-sale-to-recurring conversion for qualified podcast clients.",
        ],
      },
      {
        kind: "OperatingSystem",
        title: "Make delivery reliable enough to scale",
        krs: [
          "90%+ of standard post-production delivered within the published 5-7 business-day expectation.",
          "Implement standardized briefs, file naming, edit templates and revision tracking.",
          "Complete a service cost study for every podcast package before expanding paid spend materially.",
        ],
      },
      {
        kind: "BrandFootprint",
        title: "Build visible consistency",
        krs: [
          "12-13 HL Podcast episodes in Q4.",
          "6 podcast commercial batches, 3 HL Freestyles and 3 events.",
          "Capture at least 6 usable client testimonials/case-study assets.",
        ],
      },
    ],
  },
  {
    key: "q1-2027",
    name: "Q1 2027",
    dates: "Jan – Mar 2027",
    revenueTarget: "$43K",
    cumulative: "$95K",
    focus: "Build retention and recurring podcast book.",
    objectives: [
      {
        kind: "RevenueEngine",
        title: "Collect $43K and deepen recurring podcast revenue",
        krs: [
          "Collect $43K total revenue in Q1.",
          "Exit March at $15K monthly revenue.",
          "Reach $5K–$6K podcast MRR / contracted recurring value.",
          "Maintain at least 6 active recurring podcast accounts or equivalent revenue concentration.",
        ],
      },
      {
        kind: "OperatingSystem",
        title: "Make client retention a system",
        krs: [
          "Measure 30-, 60- and 90-day recurring retention; target >=80% 90-day retention after sample size is meaningful.",
          "Install monthly client check-ins for higher-tier recurring accounts.",
          "Reduce avoidable revision and missed-deadline causes month over month.",
        ],
      },
      {
        kind: "BrandFootprint",
        title: "Turn HighLife content into authority",
        krs: [
          "13 HL Podcast episodes, 6 podcast commercial batches, 3 freestyles and 3 events.",
          "Build a reusable proof library: client clips, testimonials, behind-the-scenes and final outputs tagged by ICP.",
        ],
      },
    ],
  },
  {
    key: "q2-2027",
    name: "Q2 2027",
    dates: "Apr – Jun 2027",
    revenueTarget: "$47K",
    cumulative: "$142K",
    focus: "Scale channels beyond paid ads and harden delivery capacity.",
    objectives: [
      {
        kind: "RevenueEngine",
        title: "Collect $47K and reach $6K–$7K+ podcast monthly revenue",
        krs: [
          "Collect $47K in Q2.",
          "Exit June at $16K monthly revenue.",
          "Build at least 8 active recurring podcast clients or equivalent recurring revenue book.",
          "At least 30% of new podcast revenue comes from referrals, organic, partnerships or events rather than paid acquisition alone.",
        ],
      },
      {
        kind: "OperatingSystem",
        title: "Add leverage where workload proves the need",
        krs: [
          "Assign or hire a dedicated podcast client-success/producer owner if the trigger is reached.",
          "Establish an editor bench with backup capacity and consistent templates.",
          "Have monthly financial reporting with revenue and direct cost by business line.",
        ],
      },
      {
        kind: "BrandFootprint",
        title: "Strengthen HighLife as an ecosystem",
        krs: [
          "Maintain owned-content and event cadence without missing revenue service standards.",
          "Run at least one merch preorder/collaboration test tied to a proven community moment rather than speculative inventory.",
        ],
      },
    ],
  },
  {
    key: "q3-2027",
    name: "Q3 2027",
    dates: "Jul – Sep 2027",
    revenueTarget: "$52K",
    cumulative: "$194K",
    focus: "Push podcast toward $8K-$9K/month; evaluate capacity only if data says so.",
    objectives: [
      {
        kind: "RevenueEngine",
        title: "Collect $52K and push podcast toward $8K–$9K/month",
        krs: [
          "Collect $52K in Q3.",
          "Exit September at $18K monthly revenue.",
          "Reach $8K–$9K monthly podcast/media revenue with at least 50% coming from recurring clients.",
          "Increase average podcast account value through packages and upsells without increasing avoidable churn.",
        ],
      },
      {
        kind: "OperatingSystem",
        title: "Make a data-based capacity decision",
        krs: [
          "Track sellable podcast hours, prime-time utilization, edit load and lead-to-booking wait time every month.",
          "Only build a second podcast room/business case if utilization and waitlist thresholds have been sustained.",
          "Ensure no single recurring client represents a dangerous percentage of podcast revenue.",
        ],
      },
      {
        kind: "BrandFootprint",
        title: "Expand brand partnerships",
        krs: [
          "Build 3-5 active referral/brand/community partnerships that create measurable leads or content opportunities.",
          "Continue 1 event/month; test 2/month only if team capacity and event scorecards justify it.",
        ],
      },
    ],
  },
  {
    key: "q4-2027",
    name: "Q4 2027",
    dates: "Oct – Dec 2027",
    revenueTarget: "$56K",
    cumulative: "$250K",
    focus: "Finish the floor goal and exit at $20K-$25K/month stretch run-rate.",
    objectives: [
      {
        kind: "RevenueEngine",
        title: "Finish $250K cumulative and exit with a stronger run-rate",
        krs: [
          "Collect $56K in Q4 and finish at least $250K cumulative since Aug. 10, 2026.",
          "Exit December at $19K base monthly revenue; stretch toward $20K-$25K.",
          "Reach $9K-$12K+ monthly podcast/media revenue with at least 60% recurring where feasible.",
          "Finish 2027 with a clear 2028 budget, revenue target and reinvestment plan.",
        ],
      },
      {
        kind: "OperatingSystem",
        title: "Make the company less founder-dependent",
        krs: [
          "Core sales, client-success, studio and delivery SOPs work without Jaco or JoJo manually touching every step.",
          "Role scorecards exist for every recurring contractor/leader.",
          "Bookkeeping/CPA reporting cadence and cash reserve policy are active.",
        ],
      },
      {
        kind: "BrandFootprint",
        title: "Decide where the cash engine invests next",
        krs: [
          "Choose 2028 priority investments across owned media, music projects, merch, events and physical capacity.",
          "Publish a new three-year roadmap that converts the five-year cultural vision into specific bets.",
        ],
      },
    ],
  },
];

// Section 18. Owners are the document's own suggestions.
const SOPS: { n: number; title: string; owner: string }[] = [
  { n: 1, title: "New lead response + qualification", owner: "Marketing/Sales" },
  { n: 2, title: "Podcast tour experience", owner: "Jaco + Sales" },
  { n: 3, title: "Proposal + follow-up sequence", owner: "Marketing/Sales" },
  { n: 4, title: "Recurring package close + autopay", owner: "Jaco + Sales" },
  { n: 5, title: "Podcast client onboarding", owner: "Podcast Producer / JoJo" },
  { n: 6, title: "Podcast room setup + preflight", owner: "JoJo / Engineers" },
  { n: 7, title: "Session execution + client experience", owner: "Engineers" },
  { n: 8, title: "File naming, backup + delivery handoff", owner: "JoJo / Editors" },
  { n: 9, title: "Video edit + QA + revision", owner: "Editing lead" },
  { n: 10, title: "Recurring client success + renewal", owner: "Client Success" },
  { n: 11, title: "Monthly event playbook", owner: "Leadership / Event owner" },
  { n: 12, title: "Monday / Wednesday / Sunday meeting process", owner: "Jaco + JoJo" },
];

// Section 20.
const WEEKS: { week: number; objective: string; deliverable: string }[] = [
  { week: 1, objective: "Install the scoreboard", deliverable: "Baseline current revenue, MRR, lead sources, tours, show rate, close rate, room hours and turnaround. Roadmap updated." },
  { week: 2, objective: "Finalize offer ladder", deliverable: "Cost-check recurring packages; create one-page package sheet and tour close options." },
  { week: 3, objective: "Fix the tour-to-proposal flow", deliverable: "Tour checklist, discovery questions, same-day proposal template and follow-up automation." },
  { week: 4, objective: "Launch recurring conversion", deliverable: "Every first-session client receives a relevant recurring option; measure conversion." },
  { week: 5, objective: "Build ad creative system", deliverable: "Use first commercial batch to create multiple hooks/personas; track campaign-to-revenue attribution." },
  { week: 6, objective: "Build referral engine", deliverable: "Create referral ask, partner list and intro offer for agencies, professionals and existing clients." },
  { week: 7, objective: "Run event as acquisition", deliverable: "Monthly event with QR/CRM capture, clear primary KPI and post-event tour offer." },
  { week: 8, objective: "Harden client success", deliverable: "Kickoff brief, reserved slots, delivery checklist, testimonial/referral moment." },
  { week: 9, objective: "Coach sales with data", deliverable: "Review lost tours, objections and proposals; improve script/offer instead of just buying more leads." },
  { week: 10, objective: "Build the proof library", deliverable: "Organize testimonials, best clips, BTS, set photos and use cases by ICP for ads and tours." },
  { week: 11, objective: "Cost + capacity review", deliverable: "Measure editor hours, margin, room utilization, revision rate and delivery backlog." },
  { week: 12, objective: "Quarter review + next OKRs", deliverable: "Score KRs, keep/kill experiments, set next-quarter targets and update Roadmap." },
];

// Section 11 — owned content cadence, as recurring content slots.
const CONTENT: { title: string; owner: string; kpi: string; notes: string }[] = [
  { title: "HL Podcast — weekly episode", owner: "JoJo", kpi: "Cadence completed", notes: "Captured Sunday. Owned media, authority and short-form source." },
  { title: "Podcast commercials — 2x/month batch", owner: "Marketing/Sales", kpi: "Leads by source", notes: "Captured Sunday. Demand generation for the podcast revenue engine." },
  { title: "HL Freestyle — 1x/month", owner: "JoJo", kpi: "Cadence completed", notes: "Captured Saturday. Music credibility, artist community." },
  { title: "Monthly event", owner: "Jaco", kpi: "Revenue + leads", notes: "Every event needs one primary goal: revenue, leads, content or community." },
];

// Section 19 — the risks worth deciding about early, entered as open decisions.
const DECISIONS: { title: string; owner: string; notes: string; due?: string }[] = [
  {
    title: "Rockville: keep, renew, expand, buy or exit?",
    owner: "Jaco",
    notes: "EOY 2026 decision gate. Needs trailing 3-month location revenue and contribution margin, unique clients, utilization, lease obligations and a 12-month forecast.",
    due: "2026-12-15",
  },
  {
    title: "Confirm 15% first-sale commission structure after 60-90 days of data",
    owner: "Jaco",
    notes: "Pay on collected net service revenue after payment clears. If recurring packages become the priority, consider a one-time bonus for 3-month commitments rather than lifetime residuals.",
    due: "2026-11-10",
  },
  {
    title: "Second podcast room — do not decide before capacity proof",
    owner: "JoJo",
    notes: "Trigger is prime-time utilization >75% for 8 weeks plus a meaningful waitlist. Guardrail 4: use utilization and waitlist data, not excitement.",
  },
];

async function main() {
  console.log("Clearing previous roadmap structure…");
  await prisma.item.deleteMany();
  await prisma.keyResult.deleteMany();
  await prisma.objective.deleteMany();
  await prisma.quarter.deleteMany();
  await prisma.executionWeek.deleteMany();

  const quarterIds: Record<string, string> = {};

  for (const [i, q] of QUARTERS.entries()) {
    const created = await prisma.quarter.create({
      data: {
        key: q.key, name: q.name, dates: q.dates,
        revenueTarget: q.revenueTarget, cumulative: q.cumulative,
        focus: q.focus, sortOrder: i, isCurrent: q.isCurrent ?? false,
        objectives: {
          create: q.objectives.map((o, oi) => ({
            kind: o.kind, title: o.title, sortOrder: oi,
            keyResults: {
              create: o.krs.map((text, ki) => ({
                label: `KR${ki + 1}`, text, sortOrder: ki,
              })),
            },
          })),
        },
      },
    });
    quarterIds[q.key] = created.id;
    console.log(`  ${q.name}: ${q.objectives.length} objectives, ${q.objectives.reduce((n, o) => n + o.krs.length, 0)} KRs`);
  }

  await prisma.executionWeek.createMany({
    data: WEEKS.map((w) => ({ week: w.week, objective: w.objective, deliverable: w.deliverable })),
  });
  console.log(`  ${WEEKS.length} execution weeks`);

  const sprint = quarterIds["launch-sprint"];

  await prisma.item.createMany({
    data: [
      ...SOPS.map((s) => ({
        title: s.title, owner: s.owner, view: "SOP" as const,
        pillar: "Operations" as const, quarterId: sprint,
        priority: s.n <= 7 ? ("Critical" as const) : ("Standard" as const),
        sortOrder: s.n,
        // The first seven are a Launch Sprint key result, not a nice-to-have.
        notes: s.n <= 7 ? "Launch Sprint O2 KR3 — required before Q4." : "Section 18 priority order.",
        kpi: "Roadmap commitments completed",
      })),
      ...CONTENT.map((c, i) => ({
        title: c.title, owner: c.owner, view: "ContentCalendar" as const,
        pillar: "Media" as const, quarterId: sprint,
        priority: "Standard" as const, sortOrder: i, kpi: c.kpi, notes: c.notes,
      })),
      ...DECISIONS.map((d, i) => ({
        title: d.title, owner: d.owner, view: "DecisionLog" as const,
        pillar: "Finance" as const, quarterId: sprint,
        priority: "Critical" as const, sortOrder: i, notes: d.notes,
        dueDate: d.due ? new Date(d.due) : null,
      })),
    ],
  });

  const counts = await prisma.item.groupBy({ by: ["view"], _count: true });
  for (const c of counts) console.log(`  ${c.view}: ${c._count} items`);
  console.log("Seed complete.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
