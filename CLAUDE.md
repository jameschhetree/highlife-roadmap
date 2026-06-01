@AGENTS.md

# HighLife Roadmap

Next.js 16 + Tailwind v4 + Prisma 7 + Postgres app.
Live at https://highlife-roadmap.vercel.app

## Stack
- Next.js 16.2.6 (App Router)
- Tailwind CSS v4 with @tailwindcss/postcss
- Prisma 7 with @prisma/adapter-pg
- PostgreSQL via Prisma Postgres (Vercel marketplace)
- Anthropic SDK for Claude chat integration

## Auth
- Simple admin/admin via sessionStorage (src/lib/admin-auth.ts)

## Database
- Prisma schema at prisma/schema.prisma
- Seed with: npm run seed
- Models: Phase, Task, Step, ChatLog

## Key files
- src/app/page.tsx - Main roadmap UI (all editability)
- src/app/api/phases/route.ts - GET full nested tree
- src/app/api/tasks/ - CRUD for tasks
- src/app/api/steps/ - CRUD for steps
- src/app/api/chat/route.ts - Claude chat integration
- src/lib/db.ts - Prisma client singleton
- prisma/seed.ts - Seed 4 phases, 39 tasks, 214 steps
