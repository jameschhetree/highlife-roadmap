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
          "Choose 2028 priority investments across owned media, music projects, merch, events and physical capacity based on 2027 returns.",
          "Publish a new three-year roadmap that converts the five-year cultural vision into specific bets.",
        ],
      },
    ],
  },
];

// Launch Sprint O2 KR3 names its seven SOPs rather than taking the first seven
// of section 18's priority order: lead response, tour, proposal/follow-up,
// client onboarding, podcast session, file handoff/editing, revision/delivery.
// Those are numbers 1-6 and 9 — not 1-7. Taking 1-7 quietly swapped
// "revision/delivery" out for "session execution".
const SPRINT_SEVEN = [1, 2, 3, 5, 6, 8, 9];

// Section 18. Owners are the document's own suggestions.
const SOPS: { n: number; title: string; owner: string; with?: string }[] = [
  { n: 1, title: "New lead response + qualification", owner: "Marketing partner" },
  { n: 2, title: "Podcast tour experience", owner: "Jaco", with: "Sales" },
  { n: 3, title: "Proposal + follow-up sequence", owner: "Marketing partner" },
  { n: 4, title: "Recurring package close + autopay", owner: "Jaco", with: "Sales" },
  { n: 5, title: "Podcast client onboarding", owner: "JoJo", with: "Podcast Producer, once hired" },
  { n: 6, title: "Podcast room setup + preflight", owner: "JoJo", with: "Engineers" },
  { n: 7, title: "Session execution + client experience", owner: "Engineers" },
  { n: 8, title: "File naming, backup + delivery handoff", owner: "JoJo", with: "Editors" },
  { n: 9, title: "Video edit + QA + revision", owner: "Editing lead" },
  { n: 10, title: "Recurring client success + renewal", owner: "Client Success" },
  { n: 11, title: "Monthly event playbook", owner: "Jaco", with: "Event owner" },
  { n: 12, title: "Monday / Wednesday / Sunday meeting process", owner: "Jaco", with: "JoJo" },
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
const CONTENT: { title: string; owner: string; kpi: string; notes: string; pillar?: string; view?: string }[] = [
  { title: "HL Podcast — weekly episode", owner: "Unassigned", kpi: "Cadence completed", notes: "Captured Sunday. Owned media, authority and short-form source. The plan does not name an owner for this — assign one." },
  { title: "Podcast commercials — 2x/month batch", owner: "Marketing partner", kpi: "Leads by source", notes: "Captured Sunday. Demand generation for the podcast revenue engine." },
  { title: "HL Freestyle — 1x/month", owner: "Unassigned", pillar: "Music", kpi: "Cadence completed", notes: "Captured Saturday. Music credibility, artist community." },
  { title: "Monthly event", owner: "Unassigned", pillar: "Events", view: "Event", kpi: "Revenue", notes: "Primary goal: revenue. Section 11 requires ONE primary goal plus at least one secondary win — leads, content or community are secondary here." },
];

// Section 19 — the risks worth deciding about early, entered as open decisions.
const DECISIONS: { title: string; owner: string; notes: string; due?: string }[] = [
  {
    title: "Rockville: keep, renew, expand, buy or exit?",
    owner: "Jaco",
    notes: "EOY 2026 decision gate. Needs trailing 3-month location revenue and contribution margin, unique clients, utilization, lease obligations and a 12-month forecast.",
  },
  {
    title: "Confirm 15% first-sale commission structure after 60-90 days of data",
    owner: "Jaco",
    notes: "Pay on collected net service revenue after payment clears. If recurring packages become the priority, consider a one-time bonus for 3-month commitments rather than lifetime residuals.",
  },
  {
    title: "Second podcast room — do not decide before capacity proof",
    owner: "JoJo",
    notes: "Trigger is prime-time utilization >75% for 8 weeks plus a meaningful waitlist. Guardrail 4: use utilization and waitlist data, not excitement.",
  },
];


// Section 03 — the monthly path. The plan reviews money monthly; quarters alone
// hide a weak month until the quarter is already lost.
const MONTHS: [string, string, number, number][] = [
  ["2026-08", "Aug 10-31, 2026", 6000, 6000],
  ["2026-09", "Sep 2026", 10000, 16000],
  ["2026-10", "Oct 2026", 11000, 27000],
  ["2026-11", "Nov 2026", 12000, 39000],
  ["2026-12", "Dec 2026", 13000, 52000],
  ["2027-01", "Jan 2027", 14000, 66000],
  ["2027-02", "Feb 2027", 14000, 80000],
  ["2027-03", "Mar 2027", 15000, 95000],
  ["2027-04", "Apr 2027", 15000, 110000],
  ["2027-05", "May 2027", 16000, 126000],
  ["2027-06", "Jun 2027", 16000, 142000],
  ["2027-07", "Jul 2027", 17000, 159000],
  ["2027-08", "Aug 2027", 17000, 176000],
  ["2027-09", "Sep 2027", 18000, 194000],
  ["2027-10", "Oct 2027", 18000, 212000],
  ["2027-11", "Nov 2027", 19000, 231000],
  ["2027-12", "Dec 2027", 19000, 250000],
];

// Section 15 — Monday thresholds. Recalibrate after 60-90 days of real data.
const THRESHOLDS: [string, string, string, string][] = [
  ["Revenue vs monthly pace", ">=100% pace", "90%-99%", "<90%"],
  ["Tour show rate", ">=70%", "60%-69%", "<60%"],
  ["Tour close rate", ">=30%", "20%-29%", "<20%"],
  ["Recurring conversion", ">=40%", "25%-39%", "<25%"],
  ["Standard edit turnaround", "<=5-7 days", "8-9 days", "10+ days"],
  ["Roadmap commitments", ">=85% on time", "70%-84%", "<70%"],
];

// Section 20 — what should be true after 90 days.
const NINETY_DAY: string[] = [
  "HighLife knows exactly where every podcast lead is in the funnel.",
  "Tours have a repeatable discovery and closing flow.",
  "Recurring packages are being sold and retention is measured.",
  "Monday leadership decisions are based on one scoreboard.",
  "The Roadmap contains current OKRs, owners and due dates.",
  "At least the first 12 revenue-critical SOPs are drafted or actively being built.",
  "Content and events run on cadence without stealing the company from revenue execution.",
  "Leadership can say which channel, offer and client type creates the best economics.",
];

// Week 1 of section 20, broken into the commitments it actually requires. This
// Week was empty on the first build: the plan was loaded and the work was not,
// so the first screen Jaco opened was the one with nothing on it.
const THIS_WEEK: { title: string; owner: string; pillar: string; kpi: string; due: string; priority?: string }[] = [
  { title: "Baseline current revenue and podcast MRR", owner: "Jaco", pillar: "Finance", kpi: "Cash collected", due: "2026-08-24", priority: "Critical" },
  { title: "Baseline lead sources, tours booked and show rate", owner: "Jaco", pillar: "Revenue", kpi: "Tours booked / showed", due: "2026-08-24", priority: "Critical" },
  { title: "Baseline tour-to-first-sale close rate", owner: "Jaco", pillar: "Revenue", kpi: "Tour close rate", due: "2026-08-24", priority: "Critical" },
  { title: "Baseline podcast room hours and edit turnaround", owner: "JoJo", pillar: "Operations", kpi: "Room hours / turnaround", due: "2026-08-24", priority: "Critical" },
  { title: "Update the Roadmap with this week's commitments and owners", owner: "Jaco", pillar: "Operations", kpi: "Roadmap commitments completed", due: "2026-08-24" },
];

// Section 08 — capacity triggers. Transcribed, including the two separate
// utilization bands, which are different decisions at different thresholds.
const CAPACITY: [string, string, string][] = [
  ["Prime-time room utilization", ">60% for 8 consecutive weeks", "Raise/segment pricing, expand hours, tighten recurring reserved slots."],
  ["Prime-time room utilization", ">75% for 8 weeks plus a meaningful waitlist", "Begin the second-room / alternate-space business case."],
  ["Editing backlog", "Typical delivery repeatedly exceeds 7 business days", "Add contract editor capacity before adding more marketing volume."],
  ["Revisions", ">20%-25% of jobs require avoidable rework", "Fix the pre-production brief, templates and approval process."],
  ["Founder sales load", "Jaco spends >5 hours/week on routine follow-up for 4+ weeks", "Add a dedicated closer / pipeline coordinator."],
  ["Client success load", "8-10+ recurring clients and missed follow-ups appear", "Assign a podcast producer / client success owner."],
];

// Section 16 — hiring triggers, with the plan's preferred structure first.
const HIRING: [string, string, string][] = [
  ["Bookkeeping / CPA", "Immediately, or as soon as monthly reporting is inconsistent", "Fractional bookkeeper plus CPA/tax advisor. Do not wait for a full-time finance hire."],
  ["Pipeline coordinator / closer", "Tour volume stays high and routine follow-up consumes founder time", "Commission or part-time contractor with a clear CRM scorecard."],
  ["Podcast producer / client success", "8-10+ recurring accounts, or follow-ups begin slipping", "Part-time contractor first, full-time when the economics support it."],
  ["Editor bench", "Delivery pushes beyond 7 business days, or one editor becomes a bottleneck", "Contract bench with standardized templates and QA."],
  ["Operations manager", "Revenue above $20K/month for several months and founders are still the routing layer", "Hire only after SOPs exist, so the role manages a system rather than chaos."],
];

// Section 05 — the recurring ladder, then the public à la carte stack.
const OFFERS: { name: string; price: string; forWho: string; scope: string; pkg?: boolean }[] = [
  { name: "Studio Session", price: "$300/hr", forWho: "One-off or trial clients", scope: "Video capture with the HighLife production team; raw files; upsell post-production." },
  { name: "Biweekly Authority", price: "$1,750/mo", forWho: "Established professionals starting a serious show", scope: "2 x 1-hour video sessions, 2 full edits, 6 short clips total, reserved scheduling, standard delivery." },
  { name: "Weekly Authority", price: "$3,250/mo", forWho: "Active brands and creators", scope: "4 x 1-hour sessions, 4 full edits, 12 short clips, audio polish, priority scheduling." },
  { name: "Executive Media Engine", price: "$5,000+/mo", forWho: "HNW, political, medical, corporate or media clients", scope: "Weekly production plus expanded clip volume, strategy, distribution support, custom graphics and/or on-location options." },
  { name: "Video podcast production", price: "from $300/hr", forWho: "Public rate", scope: "Premium capture product and top-of-funnel anchor.", pkg: false },
  { name: "Audio podcast production", price: "from $100/hr", forWho: "Public rate", scope: "Lower-complexity option; not the main growth engine.", pkg: false },
  { name: "Video editing", price: "$350 up to 60 min · $450 for 60-90 min", forWho: "Public rate", scope: "Highest-value post-production upsell and recurring deliverable.", pkg: false },
  { name: "Audio editing", price: "$200 up to 60 min", forWho: "Public rate", scope: "Useful for audio distribution and polished deliverables.", pkg: false },
  { name: "Mixing & mastering", price: "$200 up to 2 hours", forWho: "Public rate", scope: "Quality and consistency upsell.", pkg: false },
  { name: "Short-form clips", price: "$150 for 3 clips", forWho: "Public rate", scope: "Growth deliverable; easy recurring bundle component.", pkg: false },
  { name: "On-location recording", price: "Custom quote", forWho: "Corporate, event and executive", scope: "High-value corporate, event and executive opportunity.", pkg: false },
];

// Section 19 — risks with the mitigation the plan already chose.
const RISKS: [string, string, string][] = [
  ["Founder concentration", "Jaco and JoJo become the routing layer for every decision", "SOPs, role scorecards, the Roadmap, triggered contractor hires."],
  ["Lead volume without sales discipline", "Many tours, few payments", "Same-day proposal, sales coaching, funnel KPIs and call/tour review."],
  ["Sales without retention", "First-sale revenue rises but MRR stays flat", "Recurring offer, client-success cadence, reserved slots and a renewal process."],
  ["Post-production bottleneck", "Late edits and revision chaos", "Editor bench, templates, briefs, QA and capacity thresholds."],
  ["Too-broad ICP", "Ads generate low-budget or low-intent leads", "Qualifying language, persona-specific creative, lead scoring."],
  ["Creative distraction", "Events, merch and media consume leadership time without returns", "Quarterly OKRs, the 65% growth allocation and event scorecards."],
  ["Expansion too early", "A second room or major gear purchase drains cash", "Utilization trigger and a business case before capital spend."],
];

async function main() {
  console.log("Clearing previous roadmap structure…");
  await prisma.item.deleteMany();
  await prisma.keyResult.deleteMany();
  await prisma.objective.deleteMany();
  await prisma.quarter.deleteMany();
  await prisma.executionWeek.deleteMany();
  await prisma.monthTarget.deleteMany();
  await prisma.threshold.deleteMany();
  await prisma.ninetyDayTest.deleteMany();
  await prisma.planSection.deleteMany();
  await prisma.trigger.deleteMany();
  await prisma.offer.deleteMany();
  await prisma.risk.deleteMany();

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

  // Week 1 begins on the sprint start, Monday Aug 10 2026, and each week runs
  // Monday to Sunday from there.
  const SPRINT_START = Date.parse("2026-08-10T00:00:00-04:00");
  await prisma.executionWeek.createMany({
    data: WEEKS.map((w) => ({
      week: w.week, objective: w.objective, deliverable: w.deliverable,
      startsOn: new Date(SPRINT_START + (w.week - 1) * 7 * 86400000),
    })),
  });
  console.log(`  ${WEEKS.length} execution weeks`);

  const sprint = quarterIds["launch-sprint"];

  // Section 17: every item carries the objective it supports. Looked up rather
  // than hardcoded so the ids stay correct if the seed order changes.
  const objs = await prisma.objective.findMany({ where: { quarterId: sprint } });
  const objId = (kind: string) => objs.find((o) => o.kind === kind)?.id ?? null;
  const OPS = objId("OperatingSystem");
  const BRAND = objId("BrandFootprint");
  const REVENUE = objId("RevenueEngine");

  await prisma.item.createMany({
    data: [
      ...SOPS.map((s) => ({
        title: s.title, owner: s.owner, view: "SOP" as const,
        pillar: "Operations" as const, quarterId: sprint,
        priority: SPRINT_SEVEN.includes(s.n) ? ("Critical" as const) : ("Standard" as const),
        objectiveId: OPS,
        sortOrder: s.n,
        // The first seven are a Launch Sprint key result, not a nice-to-have.
        notes: [
          SPRINT_SEVEN.includes(s.n) ? "Launch Sprint O2 KR3 — required before Q4." : "Section 18 priority order.",
          s.with ? `Works with: ${s.with}.` : "",
          "Format: purpose, trigger, owner, inputs, 5-12 steps, quality check, SLA, escalation, version.",
        ].filter(Boolean).join(" "),
        kpi: "Roadmap commitments completed",
      })),
      ...CONTENT.map((c, i) => ({
        title: c.title, owner: c.owner,
        view: (c.view ?? "ContentCalendar") as never,
        pillar: (c.pillar ?? "Media") as never,
        quarterId: sprint,
        priority: "Standard" as const, sortOrder: i, kpi: c.kpi, notes: c.notes,
        objectiveId: BRAND,
      })),
      ...DECISIONS.map((d, i) => ({
        title: d.title, owner: d.owner, view: "DecisionLog" as const,
        pillar: "Finance" as const, quarterId: sprint,
        priority: "Critical" as const, sortOrder: i, notes: d.notes,
        dueDate: d.due ? new Date(d.due) : null,
      })),
    ],
  });

  await prisma.monthTarget.createMany({
    data: MONTHS.map(([key, label, target, cumulative], i) => ({
      key, label, target, cumulative, sortOrder: i,
    })),
  });
  await prisma.threshold.createMany({
    data: THRESHOLDS.map(([metric, green, yellow, red], i) => ({ metric, green, yellow, red, sortOrder: i })),
  });
  await prisma.ninetyDayTest.createMany({
    data: NINETY_DAY.map((text, i) => ({ text, sortOrder: i })),
  });
  console.log(`  ${MONTHS.length} monthly targets, ${THRESHOLDS.length} thresholds, ${NINETY_DAY.length} 90-day tests`);

  // The plan document itself, section by section, editable in the app.
  const sections = JSON.parse(
    require("fs").readFileSync(__dirname + "/plan-sections.json", "utf8")
  ) as { number: number; title: string; body: string; pages: string }[];
  await prisma.planSection.createMany({ data: sections });
  console.log(`  ${sections.length} plan sections`);

  await prisma.item.createMany({
    data: THIS_WEEK.map((t, i) => ({
      title: t.title, owner: t.owner, view: "ThisWeek" as const,
      pillar: t.pillar as never, quarterId: sprint, objectiveId: REVENUE,
      priority: (t.priority ?? "Standard") as never,
      kpi: t.kpi, dueDate: new Date(t.due), sortOrder: i, weekNumber: 1,
      notes: "Week 1 of the 90-day execution plan: install the scoreboard.",
    })),
  });

  await prisma.trigger.createMany({
    data: [
      ...CAPACITY.map(([signal, condition, action], i) => ({
        kind: "Capacity" as const, signal, condition, action, sortOrder: i,
      })),
      ...HIRING.map(([signal, condition, action], i) => ({
        kind: "Hiring" as const, signal, condition, action, sortOrder: i,
      })),
    ],
  });
  await prisma.offer.createMany({
    data: OFFERS.map((o, i) => ({
      name: o.name, price: o.price, designedFor: o.forWho, scope: o.scope,
      isPackage: o.pkg !== false, sortOrder: i,
    })),
  });
  await prisma.risk.createMany({
    data: RISKS.map(([risk, showsUpAs, mitigation], i) => ({ risk, showsUpAs, mitigation, sortOrder: i })),
  });
  console.log(`  ${CAPACITY.length + HIRING.length} triggers, ${OFFERS.length} offers, ${RISKS.length} risks`);

  const counts = await prisma.item.groupBy({ by: ["view"], _count: true });
  for (const c of counts) console.log(`  ${c.view}: ${c._count} items`);
  console.log("Seed complete.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
