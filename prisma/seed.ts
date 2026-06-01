import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

dotenv.config();

const url =
  process.env.DATABASE_URL ||
  process.env.PRISMA_DATABASE_URL ||
  process.env.POSTGRES_URL;
if (!url) {
  console.error("No DATABASE_URL found");
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString: url });
const prisma = new PrismaClient({ adapter });

interface RawTask {
  t: string;
  d: string;
  cat: string;
  s: string[];
}

interface RawPhase {
  n: number;
  name: string;
  dates: string;
  c: string;
  cb: string;
  goal: string;
  tasks: RawTask[];
}

const P: RawPhase[] = [
  {
    n: 1,
    name: "Foundation",
    dates: "Jun - Aug 2026",
    c: "#F59E0B",
    cb: "rgba(245,158,11,.13)",
    goal: "Get legally protected, financially clear, and operationally structured.",
    tasks: [
      {
        t: "Sign operating agreement",
        d: "Jun 15",
        cat: "Legal",
        s: [
          "Hire a business attorney or use a legal service (LegalZoom, Clerky)",
          "Define ownership split, decision rights, and profit distribution",
          "Draft exit provisions and buyout terms",
          "Both partners review, negotiate, and finalize all terms",
          "Sign, notarize, and file with DC DCRA",
        ],
      },
      {
        t: "Open dedicated business bank account",
        d: "Jun 15",
        cat: "Finance",
        s: [
          "Gather required docs: EIN, LLC articles, government ID",
          "Research and choose a business bank (Mercury, Chase, or Bank of America)",
          "Open account and set up online access for both JoJo and Jaco",
          "Transfer any existing business funds from personal accounts",
          "Open a separate savings account earmarked for quarterly taxes",
        ],
      },
      {
        t: "Obtain business insurance (liability + equipment)",
        d: "Jun 30",
        cat: "Legal",
        s: [
          "Research brokers who specialize in entertainment or media businesses",
          "Get at least 3 quotes for general liability insurance",
          "Get quotes for equipment and contents coverage",
          "Select policy, pay first premium, and receive certificate of insurance",
          "Store certificate in shared legal documents folder",
        ],
      },
      {
        t: "Confirm DC business licenses are current",
        d: "Jun 30",
        cat: "Legal",
        s: [
          "Look up both LLCs on the DC DCRA portal and check standing",
          "Check license expiration dates for both locations",
          "Renew any lapsed or expiring licenses",
          "Set annual calendar reminders for future renewals",
        ],
      },
      {
        t: "Set up exact monthly revenue tracking",
        d: "Jun 30",
        cat: "Finance",
        s: [
          "Define revenue categories: recording, podcast, mixing, upsells",
          "Create or update tracking template in accounting software",
          "Log actual revenue for the last 3 months to establish a baseline",
          "Set Friday as the weekly revenue log day - non-negotiable",
          "Run first complete monthly revenue report for June",
        ],
      },
      {
        t: "Draft contractor agreements - engineers + outreach team",
        d: "Jul 15",
        cat: "Legal",
        s: [
          "Confirm all workers qualify as independent contractors under IRS rules",
          "Draft engineer contractor agreement template with attorney review",
          "Draft outreach rep agreement template with attorney review",
          "Collect signatures from all current contractors",
          "Store signed copies in a shared legal folder accessible to both partners",
        ],
      },
      {
        t: "Implement engineer SOPs + session notes log",
        d: "Jul 15",
        cat: "Operations",
        s: [
          "Document the full session flow: setup, recording, client interaction, teardown",
          "Define minimum quality standards and client communication protocols",
          "Create session notes template: client info, project goals, feedback, next steps",
          "Train all engineers on SOPs in a mandatory team meeting",
          "Set a clear consequence for missing or incomplete session notes",
          "Review and refine after the first two weeks of use",
        ],
      },
      {
        t: "Launch client intake form + enforce CRM discipline",
        d: "Jul 31",
        cat: "Operations",
        s: [
          "Build intake form: project goals, references, budget, preferred dates, contact info",
          "Embed form in booking confirmation flow so every client fills it out",
          "Define CRM pipeline stages and required fields for every lead",
          "Set the rule: every new lead enters CRM within 24 hours of first contact",
          "Run first weekly CRM review together - JoJo and Jaco",
        ],
      },
      {
        t: "Build podcast studio SOPs + shot document",
        d: "Jul 31",
        cat: "Operations",
        s: [
          "Document standard camera positions, angles, and lighting setup",
          "Create audio check and equipment setup checklist",
          "Define the standard shot list for every podcast session",
          "Create a pre-session client brief template",
          "Create a post-session wrap and delivery handoff checklist",
          "Test on a real session and update based on what breaks",
        ],
      },
      {
        t: "Launch monthly P&L review process",
        d: "Aug 1",
        cat: "Finance",
        s: [
          "Set up P&L template in accounting software with all categories defined",
          "Establish baseline monthly fixed expenses: rent, software, contractors, utilities",
          "Schedule a recurring first-week-of-month meeting for P&L review",
          "Complete and review the first P&L together as partners",
          "Define the profitability benchmark you are measuring against each month",
        ],
      },
      {
        t: "Define podcast deliverables + turnaround timeline",
        d: "Aug 15",
        cat: "Operations",
        s: [
          "List every deliverable included in each package tier",
          "Set firm turnaround times: audio 48hr, full video 5 business days",
          "Define revision policy: rounds included, what qualifies as a revision",
          "Add delivery terms and turnaround timeline to every booking confirmation",
          "Create a delivery checklist editors must complete before sending to client",
        ],
      },
      {
        t: "Complete master business document",
        d: "Aug 31",
        cat: "Operations",
        s: [
          "Compile all SOPs, agreements, pricing, and templates into one shared folder",
          "Document all revenue streams with current pricing",
          "Document all team roles, responsibilities, and direct contact info",
          "Document all tools, vendors, subscriptions, and their costs",
          "Schedule a joint review session with Jaco",
          "Set a quarterly calendar reminder to update the document",
        ],
      },
    ],
  },
  {
    n: 2,
    name: "Revenue Growth",
    dates: "Sep - Nov 2026",
    c: "#0D9488",
    cb: "rgba(13,148,136,.13)",
    goal: "Increase per-client revenue and build a predictable sales system.",
    tasks: [
      {
        t: "Notify existing clients of rate increase (60-day notice)",
        d: "Aug 15",
        cat: "Pricing",
        s: [
          "Draft a clear, professional rate increase announcement",
          "Segment the client list - top clients get a personal call, not just an email",
          "Confirm the new rate effective date is at least 60 days out",
          "Update all booking platforms with the new rate after the notice period ends",
          "Prepare honest talking points for clients who push back",
        ],
      },
      {
        t: "Raise JoJo rate + launch out-of-session mixing service",
        d: "Sep 1",
        cat: "Pricing",
        s: [
          "Set final hourly engineering rate",
          "Set per-song mixing price and define exactly what is included",
          "Define revision policy for mixes: rounds included, what counts as a revision",
          "Set standard turnaround time: 48-72 hours for out-of-session mixes",
          "Update website and booking pages with new rates and mixing service info",
          "Create a separate inquiry or booking flow for mixing-only clients",
        ],
      },
      {
        t: "Launch podcast studio sales pitch + package deck",
        d: "Sep 15",
        cat: "Marketing",
        s: [
          "Define 3 package tiers - Basic, Standard, Premium - with full contents and pricing",
          "Create a visual one-page package menu or PDF deck using brand colors",
          "Record a sample reel showing studio setup, lighting, and production quality",
          "Write and rehearse a tight 2-minute verbal sales pitch",
          "Brief the outreach team on packages, pricing, and common objections",
          "Publish packages and the sample reel on the website",
        ],
      },
      {
        t: "Onboard marketing agency for Google/Meta paid ads",
        d: "Sep 30",
        cat: "Marketing",
        s: [
          "Define monthly ad budget split between recording studio and podcast studio",
          "Brief agency on ideal client profiles and target audiences for each division",
          "Provide brand kit, studio photos, and any existing creative assets",
          "Set up conversion tracking on the website: form fills, calls, bookings",
          "Define KPIs upfront: cost per lead and monthly lead volume targets",
          "Schedule a recurring weekly reporting call to review performance",
        ],
      },
      {
        t: "Launch recording studio upsell packages",
        d: "Oct 1",
        cat: "Revenue",
        s: [
          "Finalize package names, contents, and prices for all tiers",
          "Create a one-page package menu for in-studio and digital use",
          "Train engineers to mention relevant packages naturally during sessions",
          "Add packages to booking confirmations and after-session follow-up emails",
          "Track upsell conversion rate every month",
        ],
      },
      {
        t: "Launch podcast upsell packages",
        d: "Oct 1",
        cat: "Revenue",
        s: [
          "Define upsell tiers: editing add-on, distribution setup, monthly management retainer",
          "Set pricing for each upsell and create a retainer proposal template",
          "Identify the top 5 existing podcast clients who are strong retainer candidates",
          "Send personalized retainer pitches to those 5 clients with a follow-up call",
          "Add upsell options visibly to all podcast booking confirmations",
        ],
      },
      {
        t: "Activate after-session follow-up email sequences",
        d: "Oct 15",
        cat: "Marketing",
        s: [
          "Write the 3-email sequence: same-day thank you, day-3 check-in, day-7 upsell offer",
          "Set up automation in your CRM or email tool",
          "Add personalization: client name, session date, engineer name, project type",
          "Test the full sequence end-to-end with a real booking before going live",
          "Monitor open rates and response rates weekly and refine as needed",
        ],
      },
      {
        t: "Begin testimonial + review collection system",
        d: "Oct 31",
        cat: "Marketing",
        s: [
          "Identify the top 10 existing clients most likely to give strong testimonials",
          "Create a Google review request template for post-session sends",
          "Create a video testimonial request process for standout clients",
          "Add a review request step to the after-session email sequence",
          "Build a social proof folder to collect all reviews, testimonials, and screenshots",
          "Feature top testimonials on the website and in social content monthly",
        ],
      },
      {
        t: "Build consistent LinkedIn, Google, Instagram presence",
        d: "Nov 30",
        cat: "Marketing",
        s: [
          "Audit all profiles: photos, bios, links, contact info - update anything stale",
          "Create a content calendar with a defined posting schedule per platform",
          "Define 4-5 content pillars: behind the scenes, client features, tips, culture, milestones",
          "Assign a named person responsible for executing the weekly content calendar",
          "Optimize the Google Business Profile: fresh photos, weekly posts, Q&A responses",
        ],
      },
    ],
  },
  {
    n: 3,
    name: "Brand Expansion",
    dates: "Dec 2026 - Feb 2027",
    c: "#7C3AED",
    cb: "rgba(124,58,237,.13)",
    goal: "Make HighLife visible, respected, and culturally relevant.",
    tasks: [
      {
        t: "Launch HighLife LinkedIn company page",
        d: "Dec 15",
        cat: "Brand",
        s: [
          "Create the page with logo, cover image, location, and company description",
          "Link JoJo and Jaco personal profiles as admins and employees",
          "Post a company launch announcement and pin it",
          "Connect with 50 relevant local professionals in the first 30 days",
          "Set posting cadence: 3x per week targeting podcast and B2B audience",
        ],
      },
      {
        t: "Release professional brand kit",
        d: "Dec 31",
        cat: "Brand",
        s: [
          "Hire a graphic designer or set up Canva Pro for in-house use",
          "Finalize primary logo and alternate versions: horizontal, stacked, icon only",
          "Define brand colors with hex codes and usage rules for each",
          "Define typography: heading font and body font with usage guidance",
          "Create social media post and story templates for both studios",
          "Create email signature templates for JoJo and Jaco",
          "Distribute brand kit to all team members and contractors - no more off-brand posts",
        ],
      },
      {
        t: "Activate JoJo + Jaco co-founder personal brand",
        d: "Jan 1",
        cat: "Brand",
        s: [
          "Update both LinkedIn profiles: headline, about section, featured posts",
          "Define each founder's content focus and voice - JoJo vs. Jaco should feel distinct",
          "Post the first personal brand announcement on LinkedIn and Instagram",
          "Commit to a weekly posting schedule on personal accounts - minimum 1 post each",
          "Actively engage with industry conversations and tag HighLife Studios in relevant posts",
        ],
      },
      {
        t: "Launch Artist of the Month program",
        d: "Jan 15",
        cat: "Brand",
        s: [
          "Define selection criteria and a simple nomination or selection process",
          "Design an Artist of the Month graphic template using the brand kit",
          "Plan the content for each feature: written post, short video clip, session footage",
          "Launch the first feature and post across all platforms",
          "Tag the featured artist and encourage them to share - amplifies reach organically",
        ],
      },
      {
        t: "Build TikTok/IG content system with posting schedule",
        d: "Jan 31",
        cat: "Brand",
        s: [
          "Define 4-5 content series formats that can be produced consistently",
          "Assign a named person responsible for capturing content during studio sessions",
          "Build a 2-week content backlog before going live - do not launch empty",
          "Set the posting schedule: TikTok 4x per week, IG Reels 3x per week",
          "Define the editing workflow and tools used for every video",
          "Track follower growth and leads generated from content monthly",
        ],
      },
      {
        t: "Activate engineer content plan",
        d: "Jan 31",
        cat: "Brand",
        s: [
          "Identify which engineers are willing and comfortable appearing on camera",
          "Define 2-3 content formats for engineers: tips, day-in-the-life, before and after",
          "Film the first batch of 3-5 engineer videos",
          "Brief engineers on brand voice and what not to say on camera",
          "Set a posting schedule for engineer-led content - at least 2 posts per month per engineer",
        ],
      },
      {
        t: "Begin PR push (Washington Post, local media, podcasts)",
        d: "Feb 15",
        cat: "Brand",
        s: [
          "Create a press kit: company overview, founder bios, studio photos, notable client work",
          "Define the key story angle - what makes HighLife genuinely newsworthy in DC",
          "Build a list of 10 target journalists, editors, and outlets",
          "Draft and send personalized pitches to each target - not a mass blast",
          "Identify 5 podcasts where JoJo or Jaco could appear as guests",
          "Follow up on unanswered pitches once per week - persistence wins press",
        ],
      },
      {
        t: "Host first HighLife open house / community event",
        d: "Feb 28",
        cat: "Brand",
        s: [
          "Set the date, format, and maximum guest count",
          "Build the invite list: existing clients, target clients, community figures, local press",
          "Send invitations at least 3 weeks in advance - digital and physical",
          "Plan the event: studio tours, live demo, networking, music",
          "Assign someone to capture photos and video throughout the event",
          "Send a follow-up message to every attendee within 48 hours",
          "Post a full event recap across all platforms within 72 hours",
        ],
      },
      {
        t: "Launch HighLife Radio or community content series",
        d: "Feb 28",
        cat: "Brand",
        s: [
          "Define the format, episode length, release frequency, and topic focus",
          "Book the first 4 guests before recording anything",
          "Record and edit the pilot episode",
          "Set up distribution on Spotify, Apple Podcasts, and YouTube",
          "Promote the launch across all HighLife channels with a coordinated push",
        ],
      },
    ],
  },
  {
    n: 4,
    name: "Scale",
    dates: "Mar - May 2027",
    c: "#2563EB",
    cb: "rgba(37,99,235,.13)",
    goal: "Move from hustle-based growth to system-based growth.",
    tasks: [
      {
        t: "Launch internship program",
        d: "Mar 15",
        cat: "Hiring",
        s: [
          "Define internship roles: content creation, admin support, production assistant",
          "Write job descriptions with clear responsibilities and time commitment",
          "Post on college job boards: Howard, UDC, American University, Morgan State",
          "Set up a simple interview and selection process",
          "Create an intern onboarding doc with weekly tasks and learning goals",
          "Assign a mentor to each intern - JoJo or Jaco directly",
        ],
      },
      {
        t: "Formalize freelance videographer/editor roster",
        d: "Mar 31",
        cat: "Hiring",
        s: [
          "List all current freelancers and their areas of specialty and availability",
          "Standardize rates and scope-of-work expectations across the roster",
          "Have every freelancer on the roster sign a contractor agreement",
          "Create a shared folder with brand guidelines, shot documents, and delivery specs",
          "Set up a group communication channel for shoot assignments and availability",
        ],
      },
      {
        t: "Hire or contract dedicated editing team",
        d: "Mar 31",
        cat: "Hiring",
        s: [
          "Define the editing team structure: lead editor plus support, or small team",
          "Write and post the job description in relevant creative communities and job boards",
          "Interview finalists and test each with a sample edit assignment",
          "Onboard with editing workflow, brand guidelines, and turnaround time standards",
          "Set up the file delivery system: Frame.io, Dropbox, or Google Drive",
          "Define performance KPIs: turnaround time, revision rate, client satisfaction score",
        ],
      },
      {
        t: "Lock in first monthly podcast management retainers",
        d: "Apr 15",
        cat: "Revenue",
        s: [
          "Identify the top 5 existing podcast clients to pitch a management retainer",
          "Build a retainer proposal document: services included, monthly price, contract length",
          "Send personalized pitches and schedule follow-up calls with each prospect",
          "Close the first 2-3 retainer contracts",
          "Set up recurring billing in your accounting software",
          "Assign a dedicated point of contact to manage each retainer client relationship",
        ],
      },
      {
        t: "Pursue first round of grant applications",
        d: "Apr 30",
        cat: "Revenue",
        s: [
          "Research available grants: DC arts grants, small business grants, minority-owned business grants",
          "Shortlist 5 grants with the strongest fit and nearest deadlines",
          "Gather all required documents: financials, EIN, business description, impact statement",
          "Write a reusable grant narrative that can be adapted across multiple applications",
          "Submit all applications before their deadlines",
          "Track application status and follow up wherever permitted",
        ],
      },
      {
        t: "Activate affiliate partnerships",
        d: "Apr 30",
        cat: "Revenue",
        s: [
          "Identify 10 potential partners: gear brands, DAW companies, distribution platforms, music schools",
          "Draft a partnership proposal with commission structure or cross-promotion terms",
          "Reach out and close the first 3-5 partnerships",
          "Set up tracking links or affiliate codes to measure revenue per partner",
          "Feature partners on the website and tag them in relevant social content",
        ],
      },
      {
        t: "Install in-studio digital menu displays for upsells",
        d: "Apr 30",
        cat: "Operations",
        s: [
          "Purchase smart TV or commercial display screens for each studio",
          "Design rotating menu graphics using the brand kit",
          "Build content: services, packages, pricing, client testimonials, and social proof",
          "Mount and install displays in the lounge or waiting area of each studio",
          "Schedule quarterly content refresh so pricing and packages stay current",
        ],
      },
      {
        t: "Complete Q2 financial review + quarterly tax payment",
        d: "May 15",
        cat: "Finance",
        s: [
          "Pull the full Q2 P&L from accounting software",
          "Compare Q2 actuals against the projections set in the business plan",
          "Calculate the estimated quarterly tax payment owed to IRS and DC OTR",
          "Make both tax payments on time",
          "Document the top 3 revenue drivers and biggest expense changes in Q2",
          "Adjust Q3 and Q4 projections based on Q2 actual results",
        ],
      },
      {
        t: "Build Year 2 projections and growth plan",
        d: "May 31",
        cat: "Finance",
        s: [
          "Review Year 1 actual revenue against the original projections - be honest",
          "Identify the top 3 highest-leverage growth opportunities for Year 2",
          "Set Year 2 monthly revenue targets broken down by studio division",
          "Define Year 2 hiring plan and capital investment needs",
          "Draft Year 2 roadmap with quarterly milestones",
          "Present Year 2 plan to Jaco, align on priorities, and commit in writing",
        ],
      },
    ],
  },
];

async function main() {
  console.log("Clearing existing data...");
  await prisma.step.deleteMany();
  await prisma.task.deleteMany();
  await prisma.phase.deleteMany();
  await prisma.chatLog.deleteMany();

  console.log("Seeding phases, tasks, and steps...");

  let totalTasks = 0;
  let totalSteps = 0;

  for (const ph of P) {
    const phase = await prisma.phase.create({
      data: {
        number: ph.n,
        name: ph.name,
        dates: ph.dates,
        goal: ph.goal,
        color: ph.c,
        colorBg: ph.cb,
        sortOrder: ph.n - 1,
      },
    });

    for (let ti = 0; ti < ph.tasks.length; ti++) {
      const t = ph.tasks[ti];
      const task = await prisma.task.create({
        data: {
          phaseId: phase.id,
          title: t.t,
          dueLabel: t.d,
          category: t.cat as "Legal" | "Finance" | "Operations" | "Marketing" | "Brand" | "Pricing" | "Revenue" | "Hiring",
          owner: "Unassigned",
          done: false,
          sortOrder: ti,
        },
      });
      totalTasks++;

      for (let si = 0; si < t.s.length; si++) {
        await prisma.step.create({
          data: {
            taskId: task.id,
            title: t.s[si],
            owner: "Unassigned",
            done: false,
            sortOrder: si,
          },
        });
        totalSteps++;
      }
    }
  }

  console.log(
    `Seeded: 4 phases, ${totalTasks} tasks, ${totalSteps} steps`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
