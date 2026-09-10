@AGENTS.md

# HighLife Roadmap

Next.js 16 + Tailwind v4 + Prisma 7 + Postgres app.
Live at https://highlife-roadmap.vercel.app

## Stack
- Next.js 16.3.4 (App Router)
- Tailwind CSS v4 with @tailwindcss/postcss
- Prisma 7 with @prisma/adapter-pg
- PostgreSQL via Prisma Postgres (Vercel marketplace)
- Anthropic SDK for Claude chat integration

## Auth
- Simple admin/admin via sessionStorage (src/lib/admin-auth.ts)

## Database
- Prisma schema at prisma/schema.prisma
- Seed with: npm run seed
- Models: Quarter, Objective, KeyResult, Item, ExecutionWeek, Scoreboard, ChatLog

Rebuilt 2026-08-16 on the HighLife Operating System 2026-2027 plan. The old
Phase/Task/Step model described a different roadmap and is gone; its contents
are in backup-preOS-20260816.json.

## Rules the code enforces
From the plan, not invented here — change them only if the plan changes:
- Every Item has one owner. No owner means it is an idea, not a task, and the
  API rejects it (src/lib/items.ts). Applies to the chat assistant too.
- A This Week commitment needs a real due date.
- Key result scores are 0.0-1.0.
- The Roadmap tracks the company; HighLevel tracks customers. There is no lead
  or contact model and the chat prompt refuses to create one.

## Install note
Fixed 2026-08-24. `~/.npmrc` used to set `optional=false`, which skipped the
platform-native lightningcss/oxide binaries and made the build fail on a missing
module. That line is gone, so a plain `npm install` now works.

It was a machine-wide setting, so any project that pinned a `-darwin-arm64`
package into dependencies to work around it can drop the pin — those pins break
Vercel, which builds on Linux.

## Key files
- src/app/page.tsx - Roadmap UI. Three primary tabs (This week, Money, Plan)
  plus a More fold holding the rest. Weekly numbers are entered on Money;
  they live on Meeting rows keyed by week.
- src/lib/items.ts - Validation shared by the API and the chat assistant
- src/app/api/roadmap/route.ts - GET everything the board needs
- src/app/api/items/ - CRUD
- src/app/api/krs/[id] - Score a key result
- src/app/api/weeks/[id] - Tick off an execution week
- src/app/api/chat/route.ts - Claude chat integration
- src/lib/db.ts - Prisma client singleton
- prisma/seed.ts - Seeds the plan verbatim
