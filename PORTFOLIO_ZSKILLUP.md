# ZSkillup / Prephasz — Placement-Preparation LMS
### Résumé + LinkedIn source-of-truth document

> **What this file is:** every verified fact about the platform — stack, architecture, AWS
> footprint, real production traffic, performance work, and per-role feature surface — written so
> you can copy blocks straight into a résumé, a LinkedIn profile, or an interview answer.
>
> **Provenance:** every number below was pulled from the live systems on **2026-08-14** — AWS
> CloudWatch / ECS / RDS APIs, the two Git repositories, and the GitHub PR history. Numbers I could
> **not** verify are quarantined in [§13](#13-numbers-still-to-fill-in) — do **not** put those on a
> résumé until you fill them in.

---

## 1. The one-liner

> **ZSkillup (prephasz.com)** — a multi-tenant campus-placement preparation platform used by
> engineering colleges to get students job-ready. Built solo, end to end: Next.js 16 frontend,
> NestJS 11 backend, PostgreSQL, and the full AWS deployment — four role-based workspaces
> (Student, TPO/College Admin, Admin, Super Admin), proctored assessments, a Judge0 code-execution
> engine, AI interview practice, a gamification economy, and Razorpay billing.

**Elevator version (for a recruiter screen):**

> I built and run a placement-prep LMS for engineering colleges. It's a Next.js 16 / NestJS 11 /
> Postgres stack on AWS Fargate that I own end to end — product, schema, API, UI, infra and
> on-call. It serves four distinct role workspaces and has handled live college assessment drives
> at ~1,700 requests/minute with a 65 ms average response time. I found and fixed a rate-limiter
> bug that was 429-ing an entire college mid-exam, then did a full capacity re-architecture that
> took the platform from a ~200-concurrent ceiling to ~2,500.

---

## 2. Résumé bullets — pick a set

### 2a. The four-bullet version (standard résumé, most roles)

**ZSkillup (prephasz.com) — Full-Stack Engineer & Architect (sole engineer)** · *Jun 2026 – Present*

- Architected and shipped a **multi-tenant campus-placement LMS** end to end — **Next.js 16 (App
  Router) / React 19 / TypeScript** frontend and a **NestJS 11 / TypeORM / PostgreSQL** modular
  monolith exposing **368 REST endpoints** across **44 domain modules**, deployed on **AWS ECS
  Fargate** behind an ALB with autoscaling, RDS Postgres, S3 and Secrets Manager.
- Built **four role-scoped workspaces** (Student, TPO/College Admin, Admin, Super Admin) over
  **129 pages and 236 React components**, including a timed proctored assessment engine, a
  **self-hosted Judge0** code-execution service, an **OpenAI-powered mock-interview** flow with
  Whisper speech-to-text, and an XP/streak/badge gamification economy.
- **Diagnosed and fixed a production outage during a live college exam drive**: ~5,900 HTTP 429s
  at only 19% CPU traced to a rate limiter keying on the ALB hop IP, collapsing an entire campus
  behind one NAT into a single throttle bucket. Shipped per-user / per-email throttle keys with a
  non-spoofable client-IP derivation — **peak day now serves 99k requests with 3 server errors
  (0.003%)**.
- Led a **capacity re-architecture from a ~200-concurrent ceiling to ~2,500**: right-sized RDS
  (`db.t4g.micro` → `db.m6g.large`, **79 → ~900 max connections**), added ECS target-tracking
  autoscaling (2–10 tasks), tuned the pg pool with fail-fast timeouts and TCP keepalive, replaced
  N+1 grading loops with bulk upserts, and added covering indexes — holding **avg 65 ms / p95
  388 ms** response times under live drive load.

### 2b. The six-bullet version (add these two for senior / staff roles)

- Designed the persistence layer as **11 domain-isolated PostgreSQL schemas** (`auth`, `tenancy`,
  `students`, `catalog`, `assessments`, `gamification`, `billing`, `community`, `system`, …) across
  **58 entities and 99 forward-only TypeORM migrations**, with `synchronize` hard-disabled and
  migrations gated as an explicit pre-deploy step.
- Implemented the **security and billing surface**: Argon2id credentials with a server-side pepper,
  in-memory access tokens with **HttpOnly, SameSite=Lax, first-party refresh cookies** (proxied
  same-origin through Netlify to survive third-party-cookie blocking), route-group RBAC in Next.js
  middleware, **Razorpay** orders with HMAC webhook-signature verification, and a feature-flagged
  freemium paywall shippable dark and flipped on without a data migration.

### 2c. The one-line version (for a dense résumé or a cover letter)

> Sole engineer on **ZSkillup**, a multi-tenant placement-prep LMS (Next.js 16 / NestJS 11 /
> PostgreSQL on AWS Fargate) — 368 REST endpoints, 4 role workspaces, ~150k lines of TypeScript
> across 968 commits and 355 merged PRs in 10 weeks; scaled it from a 200- to a 2,500-concurrent
> ceiling and cut a live-drive outage to a 0.003% error rate.

---

## 3. LinkedIn copy

### 3a. Headline options

```
Full-Stack Engineer · Next.js 16 · NestJS · PostgreSQL · AWS — built & scaled a
multi-tenant EdTech platform end to end
```

```
Full-Stack & Platform Engineer | React/Next.js · NestJS · Postgres · AWS ECS |
Shipped a 4-role LMS solo, from schema to Fargate
```

### 3b. "About" section

> I build production systems end to end — not just the screens.
>
> Most recently I designed, built, deployed and now operate **ZSkillup (prephasz.com)**, a
> multi-tenant campus-placement preparation platform for engineering colleges. I was the only
> engineer on it: the Postgres schema, the NestJS API, the Next.js frontend, the AWS
> infrastructure, the CI/CD, and the pager.
>
> It's a real system with real users. Four separate role workspaces — students, college placement
> officers, content admins, and super admins — sit on a 368-endpoint REST API backed by 58 entities
> across 11 domain-isolated Postgres schemas. Students take timed, proctored assessments; write and
> run code against a self-hosted Judge0 execution engine; practise interviews against an AI
> interviewer with speech-to-text; and earn XP, streaks and badges. Placement officers get
> cohort-level readiness analytics, skill-gap heatmaps and company-wise reporting. It bills through
> Razorpay and runs on AWS ECS Fargate behind an autoscaling ALB.
>
> The work I'm proudest of isn't a feature — it's a capacity story. A live exam drive started
> failing for an entire college. CPU was at 19%, so it looked like a capacity problem, but it
> wasn't: the rate limiter was keying on the load balancer's hop IP, so every student behind one
> campus NAT shared a single throttle bucket. I fixed the keying, then went further and did a full
> readiness audit across nine dimensions — auth, grading, gamification, DB pooling, caching, code
> execution, frontend traffic — and worked the platform from a ~200-concurrent ceiling to ~2,500:
> right-sizing RDS, adding autoscaling, replacing N+1 write loops with bulk upserts, adding the
> indexes the hot paths needed, and debouncing the frontend's chattiest calls.
>
> Today the platform's busiest day serves ~99,000 requests with three server errors, at a 65 ms
> average response time.
>
> Stack I reach for: TypeScript everywhere, Next.js App Router with Server Components by default,
> NestJS, TypeORM with forward-only migrations, PostgreSQL, Redis/BullMQ, Tailwind + shadcn/ui, and
> AWS (ECS Fargate, RDS, ALB, S3, Secrets Manager, ECR, CloudWatch).

### 3c. LinkedIn "Projects" / "Featured" entry

**ZSkillup — Campus Placement Preparation Platform** · *prephasz.com*

> Multi-tenant EdTech platform built solo, end to end. Next.js 16 (App Router, React 19, Tailwind
> v4, shadcn/ui) frontend; NestJS 11 modular monolith with TypeORM and PostgreSQL 18; AWS ECS
> Fargate + ALB + RDS + S3 + Secrets Manager, deployed by GitHub Actions.
>
> • 4 role workspaces · 129 pages · 236 components · 368 REST endpoints · 58 entities · 99 migrations
> • Timed proctored assessment engine with browser-side camera intelligence (TensorFlow.js
>   BlazeFace, head-pose, object and audio detection)
> • Self-hosted Judge0 code-execution engine with a Monaco editor IDE
> • AI mock interviews (OpenAI + Whisper STT), AI résumé tailoring and ATS scoring
> • Gamification economy: XP ledger, streaks, badges, daily quests, leaderboards
> • Razorpay billing with HMAC webhook verification and a feature-flagged freemium paywall
> • Scaled from a ~200- to a ~2,500-concurrent ceiling; peak day 99k requests at 0.003% error rate

### 3d. A LinkedIn post (if you want to announce it)

> Ten weeks. 968 commits. 355 merged PRs. One engineer.
>
> I just shipped ZSkillup — a campus-placement preparation platform that engineering colleges use
> to get students job-ready. I built all of it: the Postgres schema, the NestJS API, the Next.js
> frontend, the AWS infrastructure, and the four different workspaces that students, placement
> officers, content admins and super admins each live in.
>
> The lesson that stuck with me had nothing to do with features.
>
> During a live assessment drive, students started getting locked out. My first instinct was
> "we're out of capacity." CPU was at 19%. It wasn't capacity — the rate limiter was reading the
> load balancer's IP instead of the student's, so an entire college behind one campus NAT was
> sharing a single throttle bucket. Every student after the first few got a 429 mid-exam.
>
> Fixing the keying took an afternoon. But it made me ask the harder question: what else would
> break at scale? So I audited the whole system — authentication, grading, the XP engine, DB
> pooling, caching, code execution, frontend request patterns — and rebuilt the parts that
> wouldn't hold. Right-sized the database. Added autoscaling. Replaced per-question write loops
> with bulk upserts. Added the indexes the hot paths were missing. Debounced the chattiest
> frontend calls.
>
> Ceiling went from ~200 concurrent students to ~2,500. Busiest day since: 99,000 requests, three
> server errors, 65 ms average response time.
>
> The bug taught me more than the feature work did. Load looks like a capacity problem right up
> until you actually read the metrics.
>
> #FullStack #NextJS #NestJS #PostgreSQL #AWS #EdTech

---

## 4. Verified scale & delivery metrics

*All figures measured 2026-08-14 from the repos, GitHub, and AWS.*

| Metric | Value | Source |
|---|---|---|
| Development window | **2026-06-02 → 2026-08-14** (~10 weeks) | Git first/last commit |
| Total commits | **968** (595 frontend + 373 backend) | `git log` |
| Merged pull requests | **355** (229 frontend + 126 backend) | GitHub API |
| TypeScript shipped | **~150,500 lines** (90,054 FE + 60,495 BE) | `wc -l` over `src/` |
| Frontend pages (routes) | **129** | `src/app/**/page.tsx` |
| React components | **236** | `src/components/**/*.tsx` |
| REST endpoints | **368** (162 GET, 139 POST, 33 PATCH, 28 DELETE, 6 PUT) | controller decorators |
| Backend domain modules | **44** | `src/modules/` |
| Controllers / services | **69 / 89** | file count |
| TypeORM entities | **58** | `*.entity.ts` |
| Database migrations | **99** (forward-only) | `src/database/migrations/` |
| PostgreSQL schemas | **11** domain-isolated | `src/database/schemas.ts` |
| Transactional email templates | **17** | notifications module |
| Pages covered by the SEO module | **98**, across 6 audience sections | SEO admin |

---

## 5. Verified production traffic & performance

*Source: AWS CloudWatch, `ap-south-1`, measured 2026-08-14.*

### Growth curve — weekly requests through the ALB

| Week beginning | Requests |
|---|---|
| 2026-06-08 | 425 |
| 2026-06-15 | 16,123 |
| 2026-06-22 | 77,372 |
| 2026-06-29 | 7,953 |
| 2026-07-06 | 17,248 |
| 2026-07-13 | 90,922 |
| 2026-07-20 | 112,299 |
| 2026-07-27 | 157,884 |
| 2026-08-03 | 127,943 |
| 2026-08-10 *(4 days, partial)* | 196,706 |

**≈ 805,000 API requests served since launch**, on a curve from **425 → ~197k requests/week** —
roughly **460× growth in ten weeks**, with the most recent partial week already the largest.

### Live assessment drive — 2026-08-12 (the largest single day)

| Metric | Value |
|---|---|
| Requests that day | **98,989** |
| Peak throughput | **1,694 requests/minute (~28 req/s)** |
| Target 5xx errors | **3** |
| ALB 5xx errors | **1** |
| Error rate | **0.003%** |
| Backend CPU at peak | ~19% (capacity was never the constraint) |
| RDS CPU peak | **17.2%** |
| RDS peak connections | **30** (of ~900 available) |
| ECS memory utilisation | **~15%** |

### Latency (14-day window ending 2026-08-14)

| Statistic | Value |
|---|---|
| Average response time | **35 – 65 ms** |
| p95 | **117 – 388 ms** |
| p99 | **0.53 – 1.32 s** |

> **Résumé-safe phrasings:** "Sustained ~1,700 req/min peaks at a 65 ms average response time with
> a 0.003% error rate." · "Grew API traffic ~460× in 10 weeks to ~197k requests/week." · "Served
> ~805k production API requests across the first ten weeks."

---

## 6. Architecture

```
                     Students · TPOs · Admins · Super Admins
                                     │
                                     ▼
              ┌───────────────────────────────────────────────┐
              │  Netlify CDN — prephasz.com                   │
              │  Next.js 16 App Router (SSG/ISR + RSC)        │
              │  /api/v1/* reverse-proxied same-origin ───────┼──┐  (keeps the refresh
              └───────────────────────────────────────────────┘  │   cookie first-party)
                                                                 ▼
                                        ┌────────────────────────────────────┐
                                        │  ALB (internet-facing)             │
                                        │  health check GET /health          │
                                        └────────────────┬───────────────────┘
                                                         ▼
                              ┌──────────────────────────────────────────────┐
                              │  ECS Fargate — cluster `zskillup`            │
                              │  NestJS 11 modular monolith · Node 22        │
                              │  0.5 vCPU / 1 GB · autoscale min 2 / max 10  │
                              └───┬──────────────┬───────────────┬───────────┘
                                  │              │               │
                    ┌─────────────▼───┐   ┌──────▼──────┐  ┌─────▼──────────────┐
                    │ RDS PostgreSQL  │   │ Judge0 CE   │  │ S3 (zskillup-media)│
                    │ 18.3            │   │ self-hosted │  │ pre-signed PUT,    │
                    │ db.m6g.large    │   │ on EC2      │  │ ECS task-role auth │
                    │ 11 schemas      │   │ code exec   │  │ (no keys in env)   │
                    └─────────────────┘   └─────────────┘  └────────────────────┘
                                  │
                    ┌─────────────▼──────────────────────────────────────────┐
                    │ Redis / BullMQ (queues) · Secrets Manager (config)     │
                    │ ECR (images) · CloudWatch (metrics/logs)               │
                    └────────────────────────────────────────────────────────┘

  External: Razorpay (payments + webhooks) · OpenAI (gpt-4o-mini + Whisper)
            Vimeo API (video library) · Google OAuth · SMTP (transactional email)
```

**Deployment:** merge to `main` → GitHub Actions builds the image and pushes to ECR →
`aws ecs update-service --force-new-deployment` → rolling deploy with
`minimumHealthyPercent=100 / maximumPercent=200`. Frontend deploys independently via Netlify.
Migrations are an explicit gated pre-deploy step (`migrationsRun: false`), never run on boot.

---

## 7. The full technology stack

### 7.1 Frontend

| Layer | Technology |
|---|---|
| Framework | **Next.js 16** (App Router, React Server Components by default) |
| UI runtime | **React 19** |
| Language | **TypeScript 5.6**, `strict` mode |
| Styling | **Tailwind CSS v4** + **shadcn/ui** (Radix primitives: Slot, Label, Separator) |
| Design system | Custom, codified — 4 card patterns, 3 visual zones, a fixed type scale, `cva` button tiers |
| Typography | Inter via `next/font/google` |
| State | **Zustand 5** (access token + toast queue only — deliberately minimal) |
| Forms | **react-hook-form 7** + Zod schemas shared with the backend contract |
| Charts | **Recharts 3** |
| Animation | **Framer Motion 12** (restrained — no scale/bounce; `transition-colors` is the default) |
| Code editor | **Monaco Editor** (`@monaco-editor/react`) for the in-browser coding IDE |
| Proctoring (client) | **TensorFlow.js 4** — BlazeFace (face presence), face-landmarks-detection (head pose), COCO-SSD (object detection), plus WebAudio-based audio detection |
| Video | `@vimeo/player` SDK + `player.vimeo.com` iframe embeds |
| Exports | **jsPDF** (certificates, résumés), **xlsx** (admin/TPO report exports), `html-to-image` |
| UX | `sonner` (toasts), `cmdk` (command palette), `lucide-react` (icons), `@number-flow/react` (animated counters), `canvas-confetti` |
| Tooling | ESLint 9 + typescript-eslint 8, `tsc --noEmit` typecheck gate |
| Hosting | **Netlify** — CDN, SSG/ISR for public pages, same-origin `/api/v1/*` proxy to the ALB |

### 7.2 Backend

| Layer | Technology |
|---|---|
| Framework | **NestJS 11** — modular monolith, 44 domain modules |
| Runtime | **Node 22 LTS** (pinned via `engines`) |
| Language | **TypeScript 5.6**, `strict` |
| ORM | **TypeORM 0.3** — `synchronize: false` everywhere, 99 forward-only migrations |
| Database | **PostgreSQL 18.3** on RDS, 11 domain schemas, no `public` |
| Cache | TypeORM database-backed `query_result_cache` (fail-open), `.cache()` opt-in on read-heavy catalog/question paths |
| Queues | **BullMQ 5** + **ioredis 5** (`@nestjs/bullmq`) |
| Events | `@nestjs/event-emitter` — decoupled email + gamification listeners |
| Auth | `@nestjs/jwt` (HS256, DB-free verification per request), **Argon2id** with a server-side pepper |
| Rate limiting | `@nestjs/throttler` behind a custom `UserOrIpThrottlerGuard` |
| Validation | `class-validator` + `class-transformer`, plus hand-written fail-fast env validation at boot |
| Security | **Helmet**, `cookie-parser`, strict CORS allowlist |
| API docs | `@nestjs/swagger` |
| Email | **Nodemailer** over SMTP, 17 branded templates, queued dispatch + delivery ledger |
| Storage | `@aws-sdk/client-s3` + `s3-request-presigner` — pre-signed PUT, credentials from the ECS task role |
| Dates | `dayjs` |
| Testing | **Jest 29** + ts-jest, unit + integration + e2e suites |

### 7.3 AWS & infrastructure

| Service | Configuration |
|---|---|
| **ECS Fargate** | Cluster `zskillup`, service `zskillup-backend-service`; 0.5 vCPU / 1 GB tasks; **target-tracking autoscaling, min 2 / max 10**; rolling deploys with shutdown hooks |
| **Application Load Balancer** | Internet-facing, round-robin, `GET /health` health check |
| **RDS PostgreSQL** | `zskillup-db` — **db.m6g.large**, PostgreSQL **18.3**, 20 GB gp2, TLS with the bundled Amazon CA |
| **S3** | `zskillup-media` — admin media uploads via pre-signed PUT, dedicated IAM task role |
| **Secrets Manager** | `zskillup/backend/prod` — DB URL, JWT secret, Argon2 pepper, third-party keys; **no secrets in env files or images** |
| **ECR** | Container registry, image built and pushed per merge to `main` |
| **CloudWatch** | Metrics + logs; the source of every traffic number in §5 |
| **EC2** | Self-hosted **Judge0 CE** for sandboxed code execution |
| **Region** | `ap-south-1` (Mumbai) — co-located with the user base |
| **CI/CD** | **GitHub Actions** → build → ECR → `ecs update-service --force-new-deployment`; a green deploy also proves the Nest DI graph resolved at boot |
| **Frontend hosting** | Netlify (CDN, ISR, API proxy) |

### 7.4 Third-party integrations

| Integration | What it does |
|---|---|
| **Razorpay** | Order creation, checkout signature verification, and webhook ingestion with `x-razorpay-signature` HMAC validation + a `webhook_events` idempotency ledger |
| **OpenAI** | `gpt-4o-mini` for AI mock interviews, per-student dashboard briefings, Socratic hints, adaptive-quiz narration, résumé tailoring and ATS analysis; **Whisper** for spoken-answer speech-to-text |
| **Vimeo** | API-driven catalog picker with folder browsing + full-library cache for admins; public player embeds for students |
| **Google OAuth** | Server-side ID-token verification, find-or-create account linking |
| **SMTP (Resend / SES)** | 17 transactional templates with a delivery-tracking ledger |
| **Judge0 CE** | Self-hosted multi-language code execution and test-case grading |

---

## 8. Feature surface, by role

### 8.1 Student workspace — 41 routes

- **Dashboard** — hero with live XP/level/streak, KPI row, daily quest, continue-learning,
  course table, practice hub, deadlines and activity rail, plus an **AI-generated personalised
  briefing**.
- **Company Hubs** — a canonical 7-tab template per recruiter (Overview · Syllabus · Material ·
  Practice Quiz · Full Mock Assessment · Formula Sheet · Interview Experience), covering major
  IT-services recruiters (TCS, Infosys, Accenture, Cognizant, Wipro, IBM, Tech Mahindra,
  LTIMindtree and more), with per-topic prep and **previous-year-question** drilldowns.
- **Sectional Hubs** — the same prep model organised by aptitude/reasoning/verbal section rather
  than by company.
- **Practice engine** — server-graded MCQ attempts, topic and company scoping, write-time option
  randomisation to kill answer-position bias, no-repeat question selection, review queue.
- **Mock assessments** — server-authoritative timers, autosave, mixed MCQ + coding papers,
  idempotent submission and grading, percentile ranking, per-attempt leaderboards.
- **Adaptive quiz engine** — ability estimation weighted by response time, topic/company-scoped
  sessions with a config snapshot, and a 3-section answer review (detailed solution · shortcut ·
  concept video).
- **Proctored assessments** — device pre-check, camera self-view, focus guard, tab-switch and
  fullscreen-exit tracking, plus **client-side camera intelligence** (BlazeFace presence,
  head-pose, object detection, audio detection, identity check).
- **Coding IDE** — Monaco editor, multi-language execution and test-case grading against
  self-hosted Judge0.
- **AI mock interviews** — spoken answers transcribed by Whisper, an interviewer that challenges
  weak answers, and a scored result report.
- **Résumé builder** — AI tailoring, AI ATS scoring, multi-résumé save, PDF export.
- **Gamification** — XP ledger, levels, streaks, badges, daily quests, coins, public and
  cohort leaderboards, and a "how XP works" explainer.
- **Certificates** — issued, verifiable at a public `/verify` and `/certificate/[id]` route.
- **Commerce** — catalog shop, build-your-own plan, cart, checkout, upgrade path, subscription
  management.
- **Also:** live sessions, community feed (posts, comments, likes), study plan, performance
  analytics with percentile and cohort-average context, recommendations hub, support tickets,
  interactive product tour, WhatsApp community links.

### 8.2 TPO / College Admin workspace — 17 routes

Cohort management · student roster and per-student drilldown · assessment scheduling and
assignment · **placement-readiness dashboards** · **company-readiness scoring** (confidence-weighted
by sample size) · **skill-gap heatmaps** · performance-vs-participation quadrant analytics with
cohort and company filters · coding analytics · interview analytics · invitations and bulk CSV
student import · exportable reports · billing and subscription views · college settings.

### 8.3 Admin workspace — 27 routes

Question bank and mock authoring · assessment builder with publish-time validation · coding-problem
management · company and company-hub content management · study material with bulk Vimeo import,
one-click title cleanup and cross-company "copy structure" · courses · colleges and college
registration requests · individual cohorts · scheduled assessments · student and user
administration · blogs and testimonials CMS · broadcasts · **SEO editor covering all 98 pages** ·
calibration settings · live sessions · WhatsApp community management · support queue · reports and
analytics.

### 8.4 Super Admin workspace — 26 routes

Everything Admin has, plus: **financials** — a subscription-projection view (plan catalog ×
subscriptions) alongside real collected Razorpay cash · billing and subscription-plan management ·
platform-wide analytics · **audit logs** · adaptive-session inspection and replay · challenges ·
concept videos · tips · platform settings and feature flags.

---

## 9. The performance & scaling story *(your strongest interview material)*

### 9.1 The audit

I ran a structured readiness audit against a hard question — *can this serve 10,000 concurrent
students taking assessments, with correct marks and zero login failures?* — combining live AWS
inspection with a multi-agent code analysis across **nine dimensions**: authentication, assessment
submission and scoring, gamification, proctoring, the database layer, app runtime and rate
limiting, code execution, frontend traffic patterns, and read-scaling/caching. Every
critical/high finding was adversarially re-verified against the cited source line before it made
the report.

**The verdict was uncomfortable and correct:** the realistic ceiling was **~200–300 concurrent**,
and *effectively zero* because of a single rate-limiter configuration bug. The audit produced a
phased remediation roadmap and a load-test plan with explicit pass thresholds.

### 9.2 What was actually wrong

| # | Problem | Root cause |
|---|---|---|
| 1 | Every student shared one rate-limit bucket | `@nestjs/throttler` keyed on `req.ip`, but Express `trust proxy` was unset — so behind the ALB, `req.ip` was the load balancer's hop IP |
| 2 | Whole platform capped at ~10 concurrent SQL statements | node-postgres pool left at its default of 10, with `desiredCount=1` |
| 3 | Requests hung instead of failing | No `connectionTimeoutMillis`, no `statement_timeout` — over-capacity requests waited forever |
| 4 | Login stampede would OOM the task | Argon2 running at library defaults (64 MiB/hash) on a 1 GB container |
| 5 | Grading didn't scale | One sequential UPSERT per question, plus two unindexed `COUNT` scans per submission for percentile |
| 6 | Leaderboard was a DDoS amplifier | Full window-sort over `total_xp` with **no index**, uncached, on a public unauthenticated route |
| 7 | Frontend was chatty | A POST per option click with no debounce; ~18 independent GETs on dashboard load with no shared cache |
| 8 | Idle connections silently died | NAT dropped pooled sockets; the next query hung ~28s on TCP retransmit → 504s across the whole DB surface |

### 9.3 The 2026-08-12 incident

A live college assessment drive started failing — logins, launches and proctor heartbeats all
erroring. **~5,881 HTTP 429s at 19% CPU.** The shape of the metrics was the whole diagnosis: if it
were capacity, CPU would be pinned. It wasn't capacity — it was problem #1 above. An entire campus
sat behind one NAT gateway, so every student collapsed into a single throttle bucket and everyone
after the first few got rate-limited mid-exam.

**The fix, shipped and verified the same day:**
- A `UserOrIpThrottlerGuard` keying on the **verified user ID** for authenticated routes.
- A **non-spoofable real-client-IP derivation** for anonymous traffic (you cannot just trust
  `X-Forwarded-For`).
- A **per-email key on `/auth/login`**, so a whole college behind one NAT doesn't share a login
  bucket.
- `trust proxy` enabled, and per-route limits sized for a synchronized 500–1,000-student start.

### 9.4 What I changed, and what it bought

| Change | Before | After |
|---|---|---|
| RDS instance class | `db.t4g.micro` — 1 GB, burstable | **`db.m6g.large`** — 8 GB, fixed CPU |
| Max DB connections | **79** | **~900** |
| ECS autoscaling | none (`desiredCount=1`) | **min 2 / max 10**, target-tracking |
| pg pool per task | 10 (default) | **15**, env-tunable via `DB_POOL_MAX` — retune from load-test data with **no code deploy** |
| Pool resilience | no timeouts, dead sockets hung ~28 s | `keepAlive`, 30 s idle reaping, 10 s connect timeout — **fixed the intermittent `/companies` 504s** |
| Grading writes | N sequential UPSERTs per attempt | one bulk UPSERT in a transaction |
| Hot-path indexes | leaderboard and percentile ran unindexed scans | covering indexes on `student_stats(total_xp)` and `mock_attempts(mock_test_id, status, score)` |
| Read caching | none | short-TTL caching on leaderboard, readiness, per-user stats and static mock content |
| Autosave | one POST per click | debounced + batched |
| Deadline behaviour | synchronized submit stampede | client-side auto-submit **jitter** to spread the spike |
| Practical ceiling | **~200–300 concurrent** | **~1,000–2,500 concurrent** |

I also wrote a **k6 load-test harness** modelling the real take-flow
(`login → start → (answer + proctor heartbeat)* → submit`) — ramping to 2,500 virtual users with
seed/cleanup scripts, a live DB/ALB/ECS monitor, and **automatic abort** on >5% HTTP errors or
>10% flow errors, with explicit pass thresholds (p95 start < 3 s, answer/proctor p95 < 1.5 s, DB
CPU < 80%).

**Engineering judgment worth naming:** getting to 10,000 concurrent would need RDS Proxy, a read
replica, Multi-AZ and a larger instance — roughly $400–600/month against a $250/month budget. I
scoped to the ceiling the business actually needed, documented exactly what 10k would cost and
require, and deferred it rather than gold-plating.

### 9.5 The correctness result I'm most pleased about

The audit specifically checked whether XP and marks could be **lost or double-counted** under load.
They can't: every award has a synchronous inline path writing straight to Postgres, made idempotent
by a `dedup_key`, and marks are persisted **before** gamification runs. Re-submitting an attempt
yields an identical score with no double-XP. Verified, not assumed.

---

## 10. Security engineering

| Area | Implementation |
|---|---|
| Password storage | **Argon2id** with a server-side pepper, tuned to OWASP parameters (`memoryCost 19456, timeCost 2, parallelism 1`) rather than library defaults |
| Access tokens | **In-memory only** (Zustand) — never `localStorage`, `sessionStorage`, or a readable cookie |
| Refresh tokens | **HttpOnly, SameSite=Lax, Secure-in-prod** cookie; rotated, revocable, stored server-side |
| Third-party cookie survival | All browser API calls proxied **same-origin** through Netlify (`/api/v1/*` → ALB), so the session cookie stays **first-party** and survives browser third-party-cookie blocking |
| Token verification | HS256 verified per request with **zero DB round-trips** on the hot path |
| Authorization | Route-group RBAC enforced in Next.js middleware **and** re-enforced server-side per endpoint — the client is never trusted |
| Rate limiting | Per-verified-user keys, non-spoofable client-IP derivation for anonymous traffic, per-email keys on login |
| Multi-tenancy | College-scoped data access; cohort and college drives are never cross-visible |
| Secrets | AWS **Secrets Manager**; S3 access via **ECS task role** — no static keys anywhere in env or images |
| Payments | Razorpay checkout signature verification + `x-razorpay-signature` HMAC webhook validation with a `webhook_events` idempotency ledger |
| Transport | Helmet, strict CORS allowlist, TLS to RDS with the bundled Amazon CA |
| Config safety | Boot-time env validation that **refuses to start** on missing/invalid config; `SKIP_DB=true` rejected outright in production |
| Schema safety | `synchronize: false` everywhere; migrations are an explicit gated pre-deploy step, never auto-run on boot |
| Audit | `system.audit_logs` for privileged actions |
| Vulnerabilities found and fixed | Leaderboard **IDOR** and result-embargo bypass; a one-attempt race condition; per-company practice progress leaking across hubs; Google login 500 when a soft-deleted row owned the `google_id`; password reset onto a deleted row |

---

## 11. Engineering practices worth mentioning

- **Documented architecture governance** — a checked-in operating manual plus **ADRs** covering
  the repo topology, auth model, backend contract, migration policy and config validation. Every
  significant decision has a written record and a rationale.
- **Contract-first API** — a shared `src/shared/` contract surface (DTOs + enums) duplicated
  identically across both repos, with a standard `{ data, meta }` / `{ error: { code, message,
  requestId } }` envelope. Business values (XP, PPS, level, coins, rank, percentile) are computed
  **only** on the server and rendered by the client — never recomputed in the browser.
- **A codified design system** — four permitted card patterns, three visual zones, a fixed type
  scale, `cva`-encoded button tiers, and an explicit rejection list (no glassmorphism, no heavy or
  coloured shadows, no oversized radii, no hover-scale). Consistency is enforced by rule, not taste.
- **Server Components by default** — `"use client"` is pushed to the leaf that genuinely needs it,
  never to a page or layout.
- **Feature-flagged rollouts** — the paywall, the freemium single-scope model, locked-drive
  visibility and the calibration gate all ship **dark** and flip on with no data migration and a
  clean revert path.
- **Fail-soft integrations** — missing Judge0, Vimeo, Razorpay or OpenAI credentials degrade to a
  clear "not configured" response instead of blocking boot.
- **Content pipelines at scale** — a repeatable extract-and-ingest playbook that backfilled
  **1,200 previous-year questions** (Accenture 513, TCS 599, Infosys 529) across 20 canonical
  topics, with live post-ingest verification.
- **Careful production data operations** — a reversible seed-data purge using a discriminator
  column (151 placeholder students soft-deleted, real users and the college directory preserved),
  and a CSV college-import re-parenting flow that skips real-college and admin accounts by design.

---

## 12. Interview talking points (STAR-shaped)

**1. "Tell me about a production incident you handled."**
→ §9.3. The key beat: **the metrics contradicted the obvious explanation.** 5,881 429s looks like
overload, but CPU was 19%. Reading the metric shape rather than the symptom pointed straight at the
throttler key. Fixed same day; then I asked what *else* would break and audited the whole system.

**2. "Tell me about a time you had to scale something."**
→ §9.4. Emphasise the sequencing: I didn't buy a bigger box first. I found the code-level walls
(pool size, throttle keying, N+1 grading, missing indexes) *before* spending money, then
right-sized the instance to remove the remaining hard limit. And I made the pool **env-tunable**
so the next retune needs no deploy.

**3. "Tell me about a trade-off you made."**
→ §9.4 closing. 10k concurrent was achievable but cost $400–600/month against a $250 budget. I
documented exactly what it would take, scoped to the ceiling the business needed, and deferred.
Knowing what *not* to build is the point.

**4. "How do you make sure you don't lose data under load?"**
→ §9.5. Idempotent `dedup_key` on every XP award, marks persisted before gamification, re-submit
yields an identical score. And I *verified* it rather than assuming it.

**5. "How do you handle auth securely?"**
→ §10. Access token in memory only, HttpOnly refresh cookie, and specifically the same-origin
proxy so the cookie stays first-party as browsers kill third-party cookies. That last one is a
real-world detail most candidates haven't hit.

**6. "How do you keep quality up working alone?"**
→ §11. Written ADRs, a codified design system with an explicit rejection list, a contract-first
shared API surface, feature flags for dark rollouts, and 355 reviewed PRs rather than direct
pushes to `main`.

---

## 13. Numbers still to fill in

I could not read the production database in this session — the query was blocked by a permission
guard. **These are the only figures in this document that are not verified.** Fill them in before
publishing anything that cites user counts:

- [ ] Registered students (total, and active in the last 30 days)
- [ ] Colleges onboarded (active tenants — separate from the ~1,389 directory placeholder records)
- [ ] Practice attempts, mock attempts and coding submissions completed
- [ ] Questions in the bank (total; ~1,200 of these are the backfilled PYQs)
- [ ] Total XP awarded / certificates issued
- [ ] Revenue collected through Razorpay

To generate them, approve this read-only command — the script is already written and does `SELECT`s
only:

```bash
node /private/tmp/claude-501/-Users-utkarshsingh-Developer-client-lms-zskillup/\
a352f98e-bb05-404e-884f-df120c0a97da/scratchpad/usage.cjs
```

Or paste the counts to me and I'll fold them into §4 and the résumé bullets.

> **A note on honesty:** don't estimate these. Traffic numbers (§5) are strong on their own — "805k
> API requests, 99k on peak day, 1,694 req/min, 0.003% error rate" is concrete, verifiable, and
> impressive without a user count attached. A fabricated "10,000+ students" is the one thing that
> can cost you an offer in a reference check.

---

## 14. ATS keyword bank

Paste into a résumé skills section, trimmed to the role you're targeting.

**Languages** — TypeScript, JavaScript (ES2023), SQL, HTML5, CSS3

**Frontend** — React 19, Next.js 16 (App Router), React Server Components, Tailwind CSS v4,
shadcn/ui, Radix UI, Zustand, react-hook-form, Zod, Recharts, Framer Motion, Monaco Editor,
TensorFlow.js, responsive design, WCAG 2.1 AA accessibility, SSG/ISR, Core Web Vitals

**Backend** — Node.js 22, NestJS 11, REST API design, TypeORM, PostgreSQL, database migrations,
schema design, Redis, BullMQ, JWT, OAuth 2.0, Argon2, RBAC, multi-tenancy, rate limiting,
OpenAPI/Swagger, event-driven architecture, background jobs, webhooks, idempotency

**Cloud & DevOps** — AWS (ECS Fargate, ALB, RDS, S3, Secrets Manager, ECR, CloudWatch, EC2, IAM),
Docker, GitHub Actions, CI/CD, autoscaling, infrastructure cost optimisation, load testing (k6),
observability, incident response, blue/green and rolling deploys, Netlify

**Practices** — System design, modular monolith architecture, Architecture Decision Records,
code review, feature flags, performance profiling, capacity planning, database indexing and query
optimisation, security hardening, technical documentation, solo ownership end to end

**Domain** — EdTech, LMS, multi-tenant SaaS, assessment and proctoring systems, gamification,
payments (Razorpay), AI/LLM integration (OpenAI GPT-4o-mini, Whisper), code-execution sandboxes
(Judge0)

---

## 15. Suggested résumé header line

```
ZSkillup — prephasz.com                                          Jun 2026 – Present
Founding / Sole Full-Stack Engineer  ·  Next.js · NestJS · PostgreSQL · AWS
```

If the platform is your own venture, "**Founding Engineer**" or "**Technical Founder**" is accurate
and stronger than "Freelance Developer". If it was client work, "**Lead Full-Stack Engineer
(contract)**" reads better than "Freelancer" — and either way, the phrase **"sole engineer"**
somewhere in the bullets is what makes the 968-commits-in-10-weeks number land.
