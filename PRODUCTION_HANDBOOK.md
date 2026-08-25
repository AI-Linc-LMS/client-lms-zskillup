# ZSkillup / Prephasz — Production Handbook

> **What this document is.** A single, complete reference for (a) the full structure of the
> website — every route, module, and data schema — and (b) everything required to take it live
> in production and keep it there: infrastructure, environment variables, third-party accounts,
> deploy pipelines, go-live checklist, scaling runbook, monitoring, and rollback procedures.
>
> **Audience.** Anyone who has to deploy, operate, debug, or hand over this system.
>
> **Provenance.** Every fact below was read out of the two repos at the state described in
> "Document status". Where something is operational knowledge that lives only in AWS (not in the
> repo), it is marked **`[out-of-band]`** — that means you cannot recreate it from `git clone`
> alone and it must be provisioned by hand.

---

## Document status

| Field | Value |
|---|---|
| Written | 2026-08-23 |
| Frontend repo HEAD | `bc0e215` — `feat(jobs): apply + track applications` (branch `main`, clean) |
| Backend repo HEAD | `client-lms-zskillup-backend` @ `main` |
| Product name (public) | **Prephasz** (`prephasz.com`) — internal/codebase name is **ZSkillup** |
| Live URL | `https://prephasz.com` |
| AWS account | `511974511619`, region `ap-south-1` (Mumbai), CLI profile `zskillup` |

---

# PART 0 — Orientation

## 0.1 What the product is

A campus-placement preparation LMS for Indian engineering students. Four distinct user roles
share one platform:

| Role | Enum value | Workspace | What they do |
|---|---|---|---|
| Student | `STUDENT` | `/dashboard` | Practice, PYQs, mock assessments, coding, mock interviews, jobs, certificates |
| TPO / Placement cell | `COLLEGE_ADMIN` | `/tpo/dashboard` | Their college's students, drives, readiness analytics, invitations |
| Admin | `ADMIN` | `/admin/dashboard` | Content authoring: questions, courses, companies, jobs, blogs, live sessions |
| Super admin | `SUPER_ADMIN` | `/superadmin/dashboard` | Everything Admin can do, plus billing, financials, audit logs, colleges, impersonation |

Content is organised around **company hubs** (TCS, Infosys, Wipro, Accenture, Cognizant,
Capgemini, TechM, IBM, LTIMindtree …) each with syllabus, study material, MCQ practice, PYQs,
coding problems, full mock assessments, formula sheets, and interview experiences.

## 0.2 Repo topology (polyrepo — ADR-011)

```
~/Developer/
├── client-lms-zskillup/            # FRONTEND  — Next.js 16, deploys to Netlify
│   └── src/shared/                 #   contract surface (DTOs + enums)  ─┐
└── client-lms-zskillup-backend/    # BACKEND   — NestJS 11, deploys to AWS ECS Fargate
    └── src/shared/                 #   DUPLICATE of the above — keep identical ─┘
```

`src/shared/` is **duplicated by design**, not symlinked. Any change to a DTO must be applied to
both repos in the same change set, or the contract silently drifts.

## 0.3 The two-line summary of how a request works

```
Browser ──HTTPS──> prephasz.com (Netlify)
                     ├── page HTML/RSC  → Next.js SSR function
                     └── /api/v1/*      → Netlify edge rewrite (netlify.toml)
                                            └──HTTP──> AWS ALB
                                                         └──> ECS Fargate tasks (NestJS)
                                                                └──> RDS Postgres 16
                                                                └──> ElastiCache/Redis (BullMQ)
```

The API is served **same-origin** on purpose. See §5.3 — it is the reason auth works at all.

---

# PART 1 — System architecture

## 1.1 Stack (fixed — changing any of these needs an ADR)

**Frontend**

| Concern | Choice | Version |
|---|---|---|
| Framework | Next.js App Router | `^16.0.0` |
| UI runtime | React | `^19.0.0` |
| Language | TypeScript `strict` | `^5.6.3` |
| Styling | Tailwind CSS v4 + shadcn/ui | `^4.0.0` |
| Charts | Recharts | `^3.9.2` |
| Forms | react-hook-form | `^7.53.2` |
| State | Zustand (auth token + toasts ONLY) | `^5.0.0` |
| Code editor | Monaco (`@monaco-editor/react`) | `^4.7.0` |
| Video | `@vimeo/player` | `^2.30.4` |
| Proctoring | TensorFlow.js + blazeface + face-landmarks-detection | `^4.22.0` |
| Motion | framer-motion | `^12.40.0` |
| Export | jspdf, xlsx, html-to-image | — |
| Runtime | Node | 22 LTS (`.nvmrc`) |

**Backend**

| Concern | Choice | Version |
|---|---|---|
| Framework | NestJS (modular monolith) | `^11.0.0` |
| ORM | TypeORM | `^0.3.20` |
| Database | PostgreSQL | 16 (RDS) |
| Cache/queue | Redis + BullMQ (`ioredis`) | `^5.11.1` / `^5.78.0` |
| Auth hashing | argon2 (+ server-side pepper) | `^0.41.1` |
| JWT | `@nestjs/jwt` | `^11.0.0` |
| Validation | class-validator + class-transformer | `^0.15.1` |
| API docs | `@nestjs/swagger` → `/api` | `^11.0.0` |
| Rate limit | `@nestjs/throttler` (custom guard) | `^6.3.0` |
| Headers | helmet | `^8.0.0` |
| Email | nodemailer → AWS SES SMTP | `^8.0.11` |
| Storage | `@aws-sdk/client-s3` + presigner | `^3.1097.0` |
| Runtime | Node | 22 LTS |

## 1.2 Scale of the codebase

| Metric | Count |
|---|---|
| Frontend pages (`page.tsx`) | 133 |
| Frontend components | 241 `.tsx` files across 37 domains |
| Frontend API client modules (`lib/api/`) | 57 |
| Backend feature modules | 48 |
| Backend controllers | 71 |
| Backend entities | 61 |
| Backend migrations | 104 |
| Backend unit specs | 23 |

---

# PART 2 — Frontend structure (complete)

## 2.1 Directory layout

```
src/
├── app/                      # Next.js App Router — 133 pages
│   ├── (public)/             # Marketing + public content — SSG/ISR
│   ├── (auth)/               # Login, signup, password flows
│   ├── (student)/            # role STUDENT — wrapped in AppShell
│   ├── (tpo)/                # role COLLEGE_ADMIN
│   ├── (admin)/              # role ADMIN (+ SUPER_ADMIN)
│   ├── (superadmin)/         # role SUPER_ADMIN
│   ├── (quiz)/               # full-screen quiz — NO AppShell
│   ├── prepare/              # public prep landing (own layout)
│   ├── api/auth/{refresh,logout}/route.ts   # ONLY route handlers that exist
│   ├── layout.tsx  robots.ts  sitemap.ts  not-found.tsx
│   └── globals.css           # design tokens
├── components/               # 37 domains (ui, layout, student, company, admin, tpo,
│                             #  proctoring, coding, resume, jobs, community, charts, …)
├── hooks/                    # 8 shared hooks (access gates, subscription, recommendations)
├── lib/
│   ├── api/                  # 57 typed API modules — ALL backend access goes through here
│   ├── proctoring/           # TF.js model wiring + mediapipe stub
│   ├── server/               # server-only fetchers (public-content for sitemap/blog/jobs)
│   ├── seo/  jobs/  payments/ sections/ certificates/ profile/ guide/
│   └── demo-data*.ts         # demo fixtures — NEVER inline demo data in components
├── shared/                   # contract surface: enums.ts, api.ts, dto/ (31 DTO files)
├── store/auth.ts             # Zustand — access token in MEMORY ONLY
└── middleware.ts             # canonical-host guard + route-group RBAC
```

## 2.2 Complete route map

### `(public)` — no session required, crawlable

| Route | Purpose |
|---|---|
| `/` | Homepage / landing |
| `/about` | About page |
| `/blog` · `/blog/[slug]` | Blog index + post |
| `/jobs` · `/jobs/[slug]` | Public job board + per-job page (JSON-LD) |
| `/roadmap` | Public roadmap |
| `/certificate/[id]` | Public certificate view (shareable) |
| `/verify` | Certificate verification |
| `/prepare` | Public prep landing (outside the group, own layout) |

### `(auth)` — unauthenticated flows

| Route | Purpose |
|---|---|
| `/login` | Sign in (email/password + Google) |
| `/signup` | Step 1 — account |
| `/signup/verify` | Step 2 — email OTP |
| `/signup/onboarding` | Step 3 — profile. **Reachable while authenticated** (special-cased in middleware) |
| `/forgot-password` · `/reset-password` · `/set-password` | Password lifecycle |

### `(student)` — role `STUDENT`, wrapped in AppShell

| Area | Routes |
|---|---|
| Home | `/dashboard` |
| Company hubs | `/dashboard/company`, `/dashboard/company/[slug]`, `/dashboard/company/[slug]/prep`, `…/prep/[topicSlug]`, `…/pyqs/[topicSlug]` |
| Sections | `/dashboard/section`, `/dashboard/section/[slug]` |
| Practice | `/practice`, `/practice/review`, `/practice-wish` |
| Assessments | `/assessments`, `/assessments/[id]`, `/assessments/[id]/leaderboard`, `/mock-assessment` |
| Coding | `/coding`, `/coding/[slug]` |
| Mock interview | `/mock-interview`, `/mock-interview/[id]/take`, `/mock-interview/[id]/result` |
| Learning | `/my-learning`, `/study-plan`, `/recommendations`, `/live-sessions` |
| Career | `/resume-builder`, `/applications`, `/certificates` |
| Progress | `/performance`, `/leaderboard`, `/how-xp-works` |
| Commerce | `/shop`, `/shop/build`, `/shop/full`, `/cart`, `/upgrade` |
| Social/support | `/community`, `/community/[id]`, `/support`, `/profile` |

### `(quiz)` — full-screen, no AppShell (Zone B)

`/dashboard/quiz` · `/dashboard/quiz/adaptive` · `/dashboard/quiz/adaptive/results`

### `(tpo)` — role `COLLEGE_ADMIN`, prefix `/tpo/*`

`dashboard` · `students` · `students/[id]` · `cohorts` · `assessments` · `invitations` ·
`analytics` · `coding-analytics` · `interview-analytics` · `placement-readiness` ·
`company-readiness` · `skill-gaps` · `reports` · `billing` · `subscription` · `settings`

### `(admin)` — role `ADMIN` or `SUPER_ADMIN`, prefix `/admin/*`

`dashboard` · `questions` · `coding` · `mocks` · `courses` · `companies` · `study-material` ·
`blogs` · `jobs` · `testimonials` · `live-sessions` · `scheduled-assessments` · `calibration` ·
`students` · `students/[id]` · `colleges` · `colleges/[id]` · `college-requests` ·
`college-requests/new` · `college-requests/[id]` · `individual-cohorts` · `users` ·
`broadcasts` · `whatsapp-community` · `analytics` · `reports` · `seo` · `support`

### `(superadmin)` — role `SUPER_ADMIN`, prefix `/superadmin/*`

Everything the admin console has, **plus**: `billing` · `financials` · `subscriptions` ·
`audit-logs` · `adaptive-sessions` · `adaptive-sessions/[sessionId]` · `challenges` ·
`concept-videos` · `tips`

### Route handlers (the only two)

| Handler | Why it exists |
|---|---|
| `POST /api/auth/refresh` | Reads the HttpOnly `zskillup_refresh` cookie server-side, forwards it to Nest, returns the new access token, forwards the rotated `Set-Cookie` back |
| `POST /api/auth/logout` | Clears the refresh cookie |

Everything else under `/api/v1/*` is **proxied to the backend**, not handled by Next.

### Permanent redirects (`next.config.ts`)

| From | To |
|---|---|
| `/topic-mastery` | `/practice` |
| `/mock-tests` | `/mock-assessment` |
| `/calendar` | `/assessments` |

## 2.3 `middleware.ts` — the routing gate

Runs on every non-asset request. In order:

1. **Canonical host guard.** `zskilluplms.netlify.app` → `301` to `https://prephasz.com` preserving
   path + query. *This is load-bearing*: Razorpay live checkout is registered to `prephasz.com`
   only (a payment from the Netlify subdomain fails "Business – Website Mismatch"), and session
   cookies are host-scoped (mixing domains logs the user out).
2. **Company hubs bypass.** `/dashboard/company/*` is publicly browsable — never gated.
3. **Session signal** = the first-party `role` cookie (a **UX hint**, client-set). The HttpOnly
   refresh cookie is invisible to middleware.
4. **RSC-request escape hatch.** Requests carrying `RSC: 1` are never redirected to `/login` —
   Next caches redirected prefetch responses and replays them on the real click. This caused the
   "first click bounces to /login, hard refresh fixes it" bug three separate times.
5. **Unauthenticated + protected** → `/login?redirect=<path+query>` (query preserved so campaign
   links like `/cart?add=PLATFORM:MONTHLY` survive the login round trip).
6. **Authenticated on an auth route** → role home.
7. **Role mismatch** → own workspace. `SUPER_ADMIN` outranks `ADMIN` (matches the API contract);
   a `SUPER_ADMIN` with the `preview=student` cookie is allowed into the student area.

Every session-dependent redirect is emitted through `sessionRedirect()`, which sets
`Cache-Control: private, no-cache, no-store` and `Vary: Cookie, RSC` — so a redirect can never be
cached by Next's router cache or Netlify's Durable cache.

> ⚠️ `/practice` is **deliberately excluded** from the protected list. It is `force-dynamic`;
> gating it reintroduced the cached-redirect bounce. It is gated client-side instead, and its data
> endpoints require auth. **Nest guards are the real security boundary — middleware is UX only.**

## 2.4 Design system (as actually implemented)

Tokens live in `src/app/globals.css`. Fonts are loaded in `src/app/layout.tsx`.

**Current live palette — "Prephasz 2026":**

| Token | Value | Role |
|---|---|---|
| `--primary` | `#ffc42d` yellow | Primary CTA (dark text **on** it) |
| `--secondary` | `#1a1a1a` black | Identity / active nav |
| `--gold` | `#f5b400` | Progress / XP / premium |
| `--background` | `#f8f9fc` | Page background |
| `--color-surface` | `#ffffff` | Cards |
| `--border` | `#e9edf5` | Card border |
| `--destructive` | `#ef4444` | Errors |
| `--radius` | `1rem` (16px) | Button/xl step |

**Fonts:** Plus Jakarta Sans (body, `--font-jakarta`), Bricolage Grotesque (headings,
`--font-bricolage`), Instrument Serif italic (hero garnish only, `--font-instrument`).

> ⚠️ **Documented drift.** `CLAUDE.md` §1/§4 still specifies **Inter** with navy `#1e3a8a` /
> orange `#f37021`. The code has moved to the Prephasz 2026 palette and the three-font pairing;
> the CSS variables are still *named* `--navy` and `--orange` for reach, but hold black and
> yellow. **Trust the code, and update `CLAUDE.md` before the next design review** — otherwise a
> future session will "fix" the theme back to navy/orange.

**Three visual zones** (do not mix within a page):
- **Zone A — Workspace:** light, AppShell-wrapped. `(student)`, `(tpo)`, `(admin)`, `(superadmin)`.
- **Zone B — Premium dark:** full-screen, no chrome. `(quiz)`.
- **Zone C — Public marketing:** dark hero block + light body. `(public)`, `/prepare`.

Card patterns, type scale, button tiers, status pills, and the hard-stop list are specified in
full in `CLAUDE.md` §4 and §12 — that file remains the design law.

---

# PART 3 — Backend structure (complete)

## 3.1 Directory layout

```
src/
├── main.ts                 # bootstrap: helmet, cookie-parser, CORS, /api/v1 prefix, Swagger
├── app.module.ts           # 48 feature modules + global guard/interceptor/filter chain
├── config/validation.ts    # THE ONLY place process.env is read (ADR-008 fail-fast)
├── database/
│   ├── database.module.ts  # TypeORM runtime wiring (pool, SSL, query cache)
│   ├── data-source.ts      # standalone DataSource for the TypeORM CLI
│   ├── migrate.ts          # standalone runner used by the container entrypoint
│   ├── schemas.ts          # the 11 Postgres schema names
│   └── migrations/         # 104 migrations
├── common/                 # guards, filters, interceptors, decorators, cache
├── modules/                # 48 feature modules, 71 controllers, 61 entities
├── shared/                 # DUPLICATE of frontend src/shared/
└── pem/global-bundle.pem   # Amazon RDS CA bundle (baked into the image)
```

## 3.2 The 48 feature modules

| Domain | Modules |
|---|---|
| **Identity & tenancy** | `auth` (+ impersonation) · `users` · `onboarding` · `colleges` · `college-requests` · `cohorts` · `tpo` |
| **Catalog & content** | `companies` · `courses` · `content` · `study` · `study-material` · `admin-catalog` · `seo` · `tips` · `media` · `vimeo` |
| **Assessment engine** | `assessments/questions` · `assessments/company-intelligence` · `practice` · `mocks` · `adaptive-mocks` · `coding` · `scheduling` · `calibration` · `question-generation` · `question-solutions` |
| **Student outcomes** | `students` · `readiness` · `recommendations` · `personalization` · `gamification` · `certificates` · `challenges` · `resumes` · `mock-interviews` |
| **Commerce** | `payments` · `subscriptions` |
| **Engagement** | `community` · `live-sessions` · `registrations` · `notifications` · `jobs` · `assistant` · `support` |
| **Platform** | `health` · `system` (audit) · `platform-settings` |

## 3.3 Bootstrap contract (`main.ts`)

| Setting | Value | Why |
|---|---|---|
| `rawBody: true` | on | Razorpay webhook HMAC must verify over exact request bytes |
| `app.set('trust proxy', true)` | on | Behind ALB + Netlify proxy. **Without it the rate limiter keyed every request on the ALB IP** — that turned per-user limits into a platform-wide cap and caused the 2026-08-12 drive incident |
| `helmet()` | on | Security headers |
| `cookieParser()` | on | Refresh cookie |
| Body limit | `2mb` json + urlencoded | Resume with embedded photo data-URL; bounds abuse |
| CORS | `origin: true, credentials: true` | Browser must send the HttpOnly refresh cookie |
| Global prefix | `api/v1`, **excluding** `health` + `ready` | ADR-007; probes stay unprefixed (ADR-008) |
| ValidationPipe | `whitelist` + `forbidNonWhitelisted` + `transform` + `stopAtFirstError` | Unknown fields are stripped **and rejected** |
| Swagger | mounted at `/api` | ⚠️ see §15 risk register |
| Shutdown hooks | enabled | Graceful ECS task drain |

## 3.4 Global guard chain (order matters)

```
UserOrIpThrottlerGuard  →  JwtAuthGuard  →  RolesGuard  →  CapabilitiesGuard
        ↓
TransformInterceptor  →  AllExceptionsFilter
```

- **`UserOrIpThrottlerGuard`** — baseline `200 req / 60s`. Keyed by **authenticated user id**, or
  by the real client IP when anonymous, or **by email on `/auth/login`** so a whole college behind
  one NAT doesn't share a login bucket. Tighter per-route limits are declared at the auth
  controllers (`refresh` is 1500/min).
- **`JwtAuthGuard`** — `verifyAsync` on the HS256 access token. Routes opt out with `@Public()`.
- **`RolesGuard`** — `@Roles(...)`. Every `/admin/*` controller is `@Roles(ADMIN, SUPER_ADMIN)`.
- **`CapabilitiesGuard`** — only fires on `@RequireCapability()` routes; zero overhead otherwise.

## 3.5 Response envelope

| Case | Shape |
|---|---|
| Success | `{ data, meta }` |
| Error | `{ error: { code, message, requestId } }` |
| Validation error | `code: 'VALIDATION_FAILED'` + `details: { field: [msg] }` |

> **Frontend gotcha, already bitten once:** always unwrap `.data`. The refresh route once read
> `accessToken` off the envelope root, got `undefined`, and silently logged users out the first
> time their access token expired.

## 3.6 Health probes (ADR-008)

| Endpoint | Auth | Returns |
|---|---|---|
| `GET /health` | `@Public()` | `{ status: 'ok' }` — process is up (liveness) |
| `GET /ready` | `@Public()` | `{ ready, checks: { database, migrations } }` — **503** when not ready (readiness) |

Both are unprefixed and are proxied through Netlify (`netlify.toml`) so the in-app Platform Health
widget can reach them.

---

# PART 4 — Data layer

## 4.1 Postgres schema map

Entities are **never** placed in `public`. `src/database/schemas.ts` defines 11 schemas:

| Schema | Contents |
|---|---|
| `auth` | `users`, `refresh_tokens`, `email_verification_tokens`, `password_reset_tokens` |
| `tenancy` | `colleges`, `cohorts`, `subscriptions`, `subscription_plans` |
| `students` | `student_profiles`, `resumes`, `mock_interviews`, `mock_interview_violations`, `company_registrations`, `job_applications` |
| `catalog` | `companies`, `company_courses`, `company_hub_content`, `courses`, `course_modules`, `module_lessons`, `blog_posts`, `job_postings`, `live_sessions`, `live_session_signups`, `testimonials` |
| `assessments` | `questions`, `question_options`, `question_solutions`, `question_company_tags`, `question_content_usage`, `topics`, `practice_attempts`, `mock_tests`, `mock_test_questions`, `mock_test_coding_problems`, `mock_attempts`, `mock_attempt_answers`, `mock_attempt_coding`, `mock_attempt_violations`, `adaptive_sessions`, `adaptive_responses`, `coding_problems`, `coding_submissions`, `scheduled_assessments`, `review_items`, `study_plans`, `study_plan_days`, `platform_settings` |
| `gamification` | `student_stats`, `student_xp_ledger`, `streak_events`, `badges`, `student_badges`, `challenges`, `student_challenges`, `daily_challenges`, `daily_quests`, `certificates`, `tips` |
| `billing` | `price_book`, `entitlements`, `payment_orders`, `payment_order_items`, `payments`, `webhook_events` |
| `community` | `posts`, `comments`, `post_likes`, `comment_likes` |
| `system` | `audit_logs`, `notifications`, `support_tickets`, `support_ticket_messages`, `email_deliveries`, `seo_metadata` |
| `roadmap` | roadmap templates + per-student state |
| `admin` | reserved |

Plus `query_result_cache` — TypeORM's database-backed result cache table.

## 4.2 Connection pool + SSL (`database.module.ts`)

| Setting | Value | Why |
|---|---|---|
| `synchronize` | **`false` everywhere** | ADR-005 — forbidden, no exceptions |
| `migrationsRun` | `false` | Migrations gate the deploy, not boot (see §9.3) |
| `ssl` | Amazon CA bundle from `pem/global-bundle.pem`; `DB_SSL=false` opts out locally | RDS requires SSL |
| `extra.max` | `DB_POOL_MAX` env, default **15** per task | Peak conns ≈ tasks × max. 10×15=150 « m6g.large's ~900 |
| `extra.keepAlive` | `true`, initial delay 10s | Without it, idle pooled conns get silently dropped by the NAT gateway and the next query hangs ~28s on TCP retransmit → 504 |
| `extra.idleTimeoutMillis` | 30 000 | Reap before they go stale |
| `extra.connectionTimeoutMillis` | 10 000 | Fail fast instead of hanging |
| `cache` | database-backed, `ignoreErrors: true` | Fail-open catalog cache |

> 🔥 **Historic bug worth knowing.** `bustQueryCache()` used to call TypeORM's
> `queryResultCache.clear()` without a QueryRunner; TypeORM created one internally and **never
> released it** → one leaked pool connection per admin content edit → the task's 15-connection
> pool exhausted after ~9h → `timeout exceeded when trying to connect` on every request routed
> there, while RDS itself looked perfectly healthy. Fixed in BE `3ba9d04` (own QueryRunner,
> always released, fail-soft). **If you ever see connect-timeouts with a healthy DB, check
> `pg_stat_activity` grouped by `client_addr` for idle connections whose last query was
> `TRUNCATE query_result_cache`.**

## 4.3 Migrations

- 104 migrations in `src/database/migrations/`, named `<timestamp>-<Name>.ts`.
- Applied by `src/database/migrate.ts`, invoked from `docker-entrypoint.sh` **before** the app
  starts.
- A **Postgres session advisory lock** (`pg_advisory_lock(483920571)`) held on one dedicated
  connection serialises the concurrent runs a rolling ECS deploy produces — exactly one task
  applies, the rest block then find nothing pending.
- A failed migration exits non-zero → the container dies → **ECS keeps the previous healthy task
  set running**. A bad schema never serves traffic.

**Local commands:**

```bash
npm run migration:generate    # diff entities → new migration file
npm run migration:create      # empty migration
npm run migration:run         # apply
npm run migration:revert      # roll back the last one
```

---

# PART 5 — Auth & session model

## 5.1 The three session artifacts

| Artifact | Where it lives | Readable by JS? | Purpose |
|---|---|---|---|
| **Access token** (JWT HS256) | Zustand **memory only** (`src/store/auth.ts`) | yes, in-tab | `Authorization: Bearer` on every API call |
| **Refresh token** | HttpOnly cookie `zskillup_refresh` | **no** | Mint new access tokens; rotated on use, reuse-detected |
| **`role` cookie** | first-party, client-set | yes | UX-only hint for `middleware.ts` routing |

**Hard rule:** the access token is **never** written to `localStorage`, `sessionStorage`, or a
readable cookie. XSS exfiltration risk. This is a §12 instant-rejection item.

**Preview layer:** a super-admin "view as student" preview layers a short-lived student access
token on top of the real session token. `authToken.get()` returns the preview token so all calls
run as the student, while the admin's real token is untouched — exiting is instant. The preview
token is also memory-only. A `preview=student` cookie tells middleware to allow the student area.

## 5.2 Refresh cookie configuration (`auth.cookies.ts`)

| Attribute | Dev | Prod |
|---|---|---|
| Name | `zskillup_refresh` | `zskillup_refresh` |
| `httpOnly` | true | true |
| `secure` | false | **true** |
| `sameSite` | `lax` | **`none`** |
| `path` | `/` | `/` |
| Expiry | `REFRESH_TTL_DAYS` (default 7) | same |

`path: '/'` is required — restricting it to `/api/v1/auth` means the cookie is never sent on any
frontend page, which breaks middleware session detection and the `/api/auth/refresh` proxy.

## 5.3 Why the API must be same-origin

The site is HTTPS; the backend ALB is **plain HTTP**. A browser cannot call it directly (mixed
content). Two layers solve this, and both must stay in sync with the ALB DNS name:

1. **`netlify.toml`** — edge rewrite `/api/v1/*` → ALB. Processed at Netlify's edge **before** the
   Next.js serverless function, so API calls skip the function cold start.
2. **`next.config.ts`** — an equivalent `beforeFiles` rewrite gated on `BACKEND_ORIGIN`, as a
   fallback for anything the edge layer misses.

Same-origin also keeps the refresh cookie **first-party**, avoiding third-party-cookie fragility.
`/api/auth/*` (the Next route handlers) are deliberately **not** proxied — only `/api/v1/*`.

## 5.4 The 401 → refresh → retry loop

```
apiClient call → 401
   → POST /api/auth/refresh   (Next handler reads HttpOnly cookie, forwards to Nest)
      → 200 { accessToken }   → store in Zustand → retry the original request ONCE
      → 401/503               → clear session → redirect to /login
```

All API calls go through `lib/api/client.ts` with `credentials: 'include'`. **Zero raw `fetch` to
the backend from components** — a §12 instant-rejection item.

## 5.5 Post-login routing (ADR-003)

| Role | Lands on |
|---|---|
| `STUDENT` (onboarded) | `/dashboard` |
| `STUDENT` (not onboarded) | `/signup/onboarding` |
| `COLLEGE_ADMIN` | `/tpo/dashboard` |
| `ADMIN` | `/admin/dashboard` |
| `SUPER_ADMIN` | `/superadmin/dashboard` |

A `?redirect=` param, if present and same-site (`sanitizeRedirect()`), wins.

---

# PART 6 — Production infrastructure inventory

> Everything in this section is **`[out-of-band]`** — provisioned by hand in AWS/Netlify, not in
> the repos. There is no Terraform/CDK. **If this account were lost, the repos alone would not
> rebuild it** — this section is the recovery spec. Treat it as the highest-value part of this
> document.

## 6.1 Account & region

| Item | Value |
|---|---|
| AWS account | `511974511619` |
| Region | `ap-south-1` (Mumbai) |
| Local CLI profile | `zskillup` (`aws --profile zskillup --region ap-south-1 …`) |

## 6.2 Compute — ECS Fargate

| Item | Value |
|---|---|
| Cluster | `zskillup` |
| Service | `zskillup-backend-service` |
| Launch type | Fargate |
| Task size | **0.5 vCPU / 1 GB** (a 1-vCPU/2GB task def **rev 14** is registered but not in use) |
| Current task def revision | **rev 11+** — rev 11 = rev 10 + `taskRoleArn` + S3 env vars |
| Idle baseline | `min 2` tasks |
| Autoscaling ceiling | `max 15` |
| Scaling policies | `ALBRequestCountPerTarget` **and** `ECSServiceAverageCPUUtilization @ 50%`, 60s cooldown |
| Log group | `/ecs/zskillup-backend` |
| Execution role | `ecsTaskExecutionRole` |
| Task role | `zskillup-backend-task-role` (trust `ecs-tasks`) — inline `s3:PutObject`/`s3:GetObject` on `live-sessions/*` |

> ⚠️ **The real ceiling is the Fargate On-Demand vCPU quota, which was still 8 as of 2026-08-15.**
> A raise to 32 is `CASE_OPENED` (case `d289094…`), not granted. Until it lands:
> 15 tasks × 0.5 vCPU = **7.5 vCPU is the hard cap**, and **you cannot deploy code while
> pre-scaled** — a rolling deploy needs old+new tasks concurrently and exceeds the quota.

> ⚠️ **CI keeps whatever revision the service points at.** The pipeline runs
> `update-service --force-new-deployment` against the **mutable `:main` image tag** — it does not
> register a new task definition. So env-var/role changes made by registering a new revision
> persist across deploys, and **watch `rolloutState == COMPLETED`, not the revision number.**

## 6.3 Load balancer

| Item | Value |
|---|---|
| ALB DNS | `zskillup-load-balancer-122235018.ap-south-1.elb.amazonaws.com` |
| Protocol | **HTTP only** (no TLS on the ALB — TLS terminates at Netlify) |
| Target group | `arn:aws:elasticloadbalancing:ap-south-1:511974511619:targetgroup/zskillup-load-tg/9e48d26d43166400` |
| Health check | `GET /health` (liveness) |

This DNS name is hardcoded in **`netlify.toml`** (3 rewrite rules) and referenced in
`loadtest/prescale.sh`. **If the ALB is ever recreated, update `netlify.toml` in the same change.**

## 6.4 Database — RDS PostgreSQL

| Item | Value |
|---|---|
| Instance | `zskillup-db` |
| Engine | PostgreSQL 16 |
| Class | **`db.m6g.large`** (upgraded 2026-08-13 from `db.t4g.micro`) |
| Cost | ~$165/mo |
| `max_connections` | ~900 (was 79 on micro — that was the hard wall) |
| RAM | 8 GB |
| Storage | gp2, 20 GB |
| Availability | **Single-AZ** — no Multi-AZ, no read replica, no RDS Proxy |
| SSL | Required; app verifies against the bundled Amazon CA |

## 6.5 Redis

BullMQ queue for the gamification engine. `REDIS_URL` in the task definition.
**Fail-soft:** a down Redis does *not* block boot — the app stays live, `/ready` reports
`redis: 'unreachable'`, and gamification jobs fail soft until it returns.

## 6.6 Storage — S3

| Item | Value |
|---|---|
| Bucket | `zskillup-media` |
| Public read | scoped to `live-sessions/*` **only**, via bucket policy |
| CORS | `PUT`/`GET`/`HEAD` from `prephasz.com`, `www.prephasz.com`, `*.netlify.app`, `localhost:3000` |
| Credentials | **Task role only — no keys in env** (default AWS provider chain) |
| Flow | `POST /api/v1/admin/media/live-session-cover/presign` → `{ uploadUrl, publicUrl, key, expiresInSeconds }` → browser `PUT`s straight to S3 |

Fail-soft: with `S3_BUCKET` unset the presign endpoint returns 503 "not configured" and admins can
paste a cover URL instead.

## 6.7 Registry

| Item | Value |
|---|---|
| ECR registry | `511974511619.dkr.ecr.ap-south-1.amazonaws.com` |
| Repository | `zskillup-backend` |
| Tag | **`main`** — mutable, overwritten every deploy |

> ⚠️ A mutable tag means **there is no immutable artifact to roll back to.** See §14.1.

## 6.8 Secrets

| Item | Value |
|---|---|
| Secrets Manager entry | `zskillup/backend/prod` |
| Contains | `JWT_ACCESS_SECRET`, `DATABASE_URL`, and the other backend secrets |
| GitHub Actions secrets | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` (repo `client-lms-zskillup-backend`) |

## 6.9 Frontend hosting — Netlify

| Item | Value |
|---|---|
| Site | `zskilluplms.netlify.app` → **canonical `prephasz.com`** |
| Trigger | auto-deploy on push to `main` |
| Config | `netlify.toml` (3 API rewrites + 1 canonical-domain 301) |
| Build | Next.js 16, `output: 'standalone'` |
| Cache | Netlify Durable cache — **the reason every session redirect must be `no-store`** |

`amplify.yml` is also present (AWS Amplify build spec) but **Netlify is the live host**. Amplify is
a leftover/fallback path; do not assume both are live.

## 6.10 Alerting

| Item | Value |
|---|---|
| SNS topic | `zskillup-backend-alerts` → `zskilluptech@gmail.com` (subscription confirmed 2026-08-15) |
| Alarms | `Backend-DbPoolConnectTimeouts`, `Backend-Target5xx` |

Both alarms fired correctly during the 2026-08-16 connection-leak incident.

## 6.11 Monthly cost envelope

| Item | ~Cost |
|---|---|
| RDS `db.m6g.large` | $165 |
| ECS Fargate (2-task idle baseline) | variable |
| S3 + ECR + ALB + data transfer | small |
| Netlify | plan-dependent |
| **User's stated cap** | **~$250/mo total** |

To actually serve 5,000 concurrent: bigger DB (`r6g.large`/`r6g.xlarge`), RDS Proxy, read replica,
Multi-AZ ⇒ **$400–600/mo minimum**. Deferred pending budget and a real requirement.

---

# PART 7 — Environment variables (complete reference)

## 7.1 Backend

Validated at boot by `src/config/validation.ts` (ADR-008). **The app refuses to start on invalid
config** and prints an aggregated list of every failure. This is the only place `process.env` is
read.

### Required — boot fails without these

| Var | Rule | Production value |
|---|---|---|
| `DATABASE_URL` | required | RDS connection string (Secrets Manager) |
| `JWT_ACCESS_SECRET` | **≥ 32 chars** | long random (Secrets Manager) |
| `ARGON2_PEPPER` | **≥ 16 chars** | long random (Secrets Manager). **Rotating this invalidates every existing password hash** |

### Core

| Var | Default | Production value | Notes |
|---|---|---|---|
| `NODE_ENV` | `development` | **`production`** | Also flips the refresh cookie to `Secure` + `SameSite=None` |
| `PORT` | `3001` | `3000` (container `EXPOSE 3000`) | 1–65535 |
| `CORS_ORIGIN` | `http://localhost:3000` | `https://prephasz.com` | CSV of origins |
| `SKIP_DB` | `false` | **must be `false`** | Cross-field rule: validator **rejects** `true` when `NODE_ENV=production` |
| `DB_SSL` | (unset ⇒ SSL on) | leave unset | `false` only for local Postgres |
| `DB_POOL_MAX` | `15` | `15` | Per-task pool. Retune from load tests via task-def env — no code deploy needed |
| `REDIS_URL` | `redis://localhost:6379` | ElastiCache URL | Must be `redis://` or `rediss://` |
| `JWT_ACCESS_TTL` | `15m` | `15m` | |
| `REFRESH_TTL_DAYS` | `7` | `7` | 1–90 |
| `FRONTEND_URL` | `http://localhost:3000` | `https://prephasz.com` | Used to build links in emails |

### Email (SES)

| Var | Production value |
|---|---|
| `SMTP_HOST` | `email-smtp.ap-south-1.amazonaws.com` |
| `SMTP_PORT` | `587` |
| `SMTP_SECURE` | `false` |
| `SMTP_USER` | SES SMTP username |
| `SMTP_PASS` | SES SMTP password |
| `EMAIL_FROM` | `no-reply@prephasz.com` — **must be a verified SES sender identity** |
| `EMAIL_FROM_NAME` | `prephasz` — renders `prephasz <no-reply@prephasz.com>` |

**SES must be out of sandbox mode** to email unverified recipients. If SMTP is unreachable,
`EmailService` falls back to logging + the dev OTP endpoint, so signup still works locally.

### Payments — Razorpay

| Var | Notes |
|---|---|
| `RAZORPAY_KEY_ID` | `rzp_live_…` in prod |
| `RAZORPAY_KEY_SECRET` | **All-or-nothing:** validator rejects one without the other |
| `RAZORPAY_WEBHOOK_SECRET` | Verifies `x-razorpay-signature` |

Fail-soft: unset ⇒ app boots, payment endpoints return "not configured".

### Optional / fail-soft integrations

| Var | Effect when unset |
|---|---|
| `OAUTH_CLIENT_ID` / `OAUTH_CLIENT_SECRET` | Google sign-in unavailable. (`CLIENT_SECRET` is accepted as an alias for the secret) |
| `OPENAI_API_KEY` | Adaptive-quiz AI narration + hints fall back to static content |
| `JUDGE0_URL` / `JUDGE0_AUTH_TOKEN` | Coding run/submit return "not configured" |
| `VIMEO_API_TOKEN` | Admin Vimeo catalog picker returns "not configured". **Embedding never needs it** — embeds are public player URLs |
| `S3_BUCKET` / `S3_REGION` / `S3_PUBLIC_BASE_URL` | Presign returns 503; admins paste cover URLs instead |

### Feature flags (see §11)

| Var | Default | Meaning |
|---|---|---|
| `PAYWALL_ENABLED` | `false` | Master switch for freemium **enforcement** (5-free meter + content locks) |
| `CALIBRATION_ENABLED` | `false` | First-login calibration-assessment gate |
| `FREEMIUM_SINGLE_SCOPE` | `false` | Aggressive model: one sub-topic per section + one company free, rest locked. Requires `PAYWALL_ENABLED` |
| `SHOW_LOCKED_DRIVES` | `false` | Show non-entitled PLATFORM drives as visible-locked rows instead of hiding them. **Cohort/college drives are never affected.** Requires `PAYWALL_ENABLED`. Flip **last** |

## 7.2 Frontend

Only `NEXT_PUBLIC_*` reaches the browser.

| Var | Local | Production (Netlify) | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | **`https://prephasz.com`** | In prod this must be the **site's own origin** so calls are same-origin and get proxied. Pointing it at the ALB breaks the refresh cookie |
| `BACKEND_ORIGIN` | *unset* | `http://zskillup-load-balancer-122235018.ap-south-1.elb.amazonaws.com` | Enables the `next.config.ts` rewrite. Unset locally |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | dev client id | prod client id | **Must match `OAUTH_CLIENT_ID` on the backend** |

---

# PART 8 — Third-party services checklist

Each row is an account somebody must own, configure, and pay for. **A missing row here is a
silent feature outage, not a crash** — almost every integration is fail-soft.

| Service | Used for | Prod configuration required | Failure mode if missing |
|---|---|---|---|
| **AWS** (acct `511974511619`) | ECS, ALB, RDS, S3, ECR, Secrets Manager, CloudWatch, SNS | Everything in Part 6 | Total outage |
| **Netlify** | Frontend hosting, TLS, edge API proxy | Site connected to `main`; env vars set; `prephasz.com` domain attached | Total frontend outage |
| **Domain registrar** | `prephasz.com` | DNS → Netlify; keep auto-renew ON | Total outage on expiry |
| **AWS SES** (`ap-south-1`) | 17 transactional emails | Verify `no-reply@prephasz.com`; **exit sandbox**; SPF/DKIM/DMARC records; SMTP credentials | Emails silently log instead of send — signup OTP, invites, receipts never arrive |
| **Razorpay** | Payments + subscriptions | Live keys; **`prephasz.com` registered as the business website**; webhook → `POST /api/v1/payments/webhook` with the signing secret | Checkout fails "Business – Website Mismatch"; unverified webhooks drop payment confirmation |
| **Google Cloud (OAuth)** | "Sign in with Google" | OAuth client; authorized origins + redirect URIs for `prephasz.com`; client id must match on both sides | Google button fails |
| **Vimeo** | Course/concept video hosting | PAT (scopes `public`, `private`, `video_files`); **`prephasz.com` added to the Vimeo domain allowlist** | Admin picker degrades to paste-a-link. **Without the domain allowlist, videos will not play on prod at all** |
| **Judge0 CE** (self-hosted, own AWS) | Coding execution | `JUDGE0_URL` (+ token if secured) | Coding run/submit return "not configured" |
| **OpenAI** | Adaptive-quiz narration, resume AI, assistant | `OPENAI_API_KEY` | Falls back to static content |

---

# PART 9 — Deployment pipelines

## 9.1 Backend — GitHub Actions → ECR → ECS

**File:** `.github/workflows/deploy.yml` — "Build & Deploy to ECS"

```
push to main ──> job: test  ──> job: deploy  (needs: test, if: event == push)
pull_request ──> job: test  (deploy skipped)
```

**Job `test`** (the quality gate — deliberately needs **no AWS creds and no database**; the unit
suite is fully mocked and reads no env vars):
1. `npm ci`
2. `npx tsc --noEmit -p tsconfig.build.json`
3. `npm test`

**Job `deploy`:**
1. Configure AWS creds from repo secrets
2. ECR login
3. `docker build -t $ECR_REGISTRY/zskillup-backend:main . && docker push`
4. `aws ecs update-service --cluster zskillup --service zskillup-backend-service --force-new-deployment`

Total runtime ≈ **1.5 minutes.**

**Container start sequence** (`docker-entrypoint.sh`, `set -e`):
```
1. node dist/database/migrate.js     # advisory-locked; non-zero exit kills the container
2. exec node dist/main.js            # app boots; env validated; DI graph resolved
```

> ✅ **A successful workflow run also proves the Nest app booted** — i.e. the whole DI graph
> resolved. That catches provider/module mistakes `nest build` cannot. Unit tests never build the
> Nest graph, so a missing module import used to ship green and roll back in prod; that is now
> gated by `di-graph.spec.ts`.

## 9.2 Frontend — Netlify

```
push to main ──> Netlify build (npm ci && next build) ──> deploy to prephasz.com
```

No test gate. There is no CI on the frontend repo — **run `npm run typecheck` and `npm run lint`
locally before pushing.**

## 9.3 Migration semantics — read this before any schema change

Two mechanisms coexist; know which is which:

| Mechanism | Setting | Behaviour |
|---|---|---|
| TypeORM runtime | `migrationsRun: false` | The **app** never runs migrations on boot |
| Container entrypoint | `docker-entrypoint.sh` → `migrate.js` | The **container** runs them before the app starts |

So since BE commit `98f9b4a` (*"run DB migrations on container start"*), **migrations DO apply
automatically on deploy**, serialised by the advisory lock, with a failed migration aborting the
container so ECS keeps the previous task set.

> ⚠️ **A pre-`98f9b4a` operational note (still in team memory) says migrations do NOT auto-run and
> must be applied by hand before pushing code.** That note is superseded. Do not apply migrations
> manually *and* let the entrypoint apply them — the advisory lock protects concurrent tasks, not
> a human racing the deploy.

**Still true and still important:** a schema-changing deploy is only safe if the new schema is
compatible with the *old* code for the seconds during which both task sets are live. Prefer
additive migrations (`ADD COLUMN … NULL`, `ADD COLUMN IF NOT EXISTS`). Split
destructive changes into two deploys: (1) add + backfill + dual-write, (2) drop.

## 9.4 Deploy ordering when FE and BE share a new contract

**Always deploy the backend first.** The frontend calling an endpoint that does not exist yet is a
broken feature; the backend exposing an endpoint nobody calls yet is harmless.

## 9.5 How to merge (a local workflow quirk)

`gh pr merge` is blocked in this environment. Merge by pushing to `main` directly — GitHub then
auto-marks the open PR as MERGED:

```bash
git checkout main && git merge --ff-only <branch> && git push origin main
```

Run `git push` as a **direct** command — inside a `bash script.sh` it fails with a sandbox DNS
error.

---

# PART 10 — Go-live checklist

Use this to take the system live from scratch, or to audit an existing production environment.
Check off in order — later steps depend on earlier ones.

## Stage 1 — Accounts & domain

- [ ] AWS account active, billing alarm set below the ~$250/mo cap
- [ ] Domain `prephasz.com` registered, **auto-renew ON**, registrar contact reachable
- [ ] Netlify account, site created, connected to `client-lms-zskillup` `main`
- [ ] `prephasz.com` attached to the Netlify site; TLS certificate issued and valid
- [ ] `www` → apex redirect configured
- [ ] Razorpay account KYC-complete; **`prephasz.com` registered as the business website**
- [ ] Google Cloud OAuth client created with `prephasz.com` origins + redirect URIs
- [ ] SES identity `no-reply@prephasz.com` verified; **sandbox exit approved**; SPF + DKIM + DMARC DNS records published
- [ ] Vimeo account with `prephasz.com` on the **domain allowlist** (else no video plays)
- [ ] Judge0 instance reachable from the ECS subnet

## Stage 2 — AWS infrastructure

- [ ] VPC, subnets, security groups (ALB → tasks on the app port; tasks → RDS on 5432; tasks → internet via NAT for SES/Vimeo/OpenAI/Judge0)
- [ ] RDS `zskillup-db`, PostgreSQL 16, `db.m6g.large`, SSL enforced, automated backups + retention set, **snapshot before first launch**
- [ ] The 11 Postgres schemas exist (`auth`, `tenancy`, `students`, `catalog`, `assessments`, `gamification`, `billing`, `community`, `system`, `roadmap`, `admin`)
- [ ] Redis reachable at `REDIS_URL`
- [ ] S3 bucket `zskillup-media`; public-read policy scoped to `live-sessions/*`; CORS for `PUT`/`GET`/`HEAD` from prod + localhost origins
- [ ] ECR repo `zskillup-backend`
- [ ] IAM: `ecsTaskExecutionRole` (pull image, write logs) **and** `zskillup-backend-task-role` (S3 `live-sessions/*`)
- [ ] Secrets Manager `zskillup/backend/prod` populated
- [ ] ECS cluster `zskillup` + service `zskillup-backend-service`, task def with the **task role attached**, `min 2 / max 15`
- [ ] Autoscaling: **both** `ALBRequestCountPerTarget` and `ECSServiceAverageCPUUtilization @ 50%` (60s cooldown)
- [ ] ALB + target group `zskillup-load-tg`, health check `GET /health`
- [ ] CloudWatch log group `/ecs/zskillup-backend`
- [ ] SNS `zskillup-backend-alerts` → real inbox, **subscription confirmed**
- [ ] Alarms `Backend-DbPoolConnectTimeouts` and `Backend-Target5xx` wired to that topic
- [ ] **Fargate On-Demand vCPU quota raised above 8** (blocking for any drive ≥ ~2,500 students)

## Stage 3 — Configuration

- [ ] Every **required** backend var set (§7.1): `DATABASE_URL`, `JWT_ACCESS_SECRET` ≥32, `ARGON2_PEPPER` ≥16
- [ ] `NODE_ENV=production`, `SKIP_DB=false`, `CORS_ORIGIN=https://prephasz.com`, `FRONTEND_URL=https://prephasz.com`
- [ ] SES SMTP vars set; `EMAIL_FROM` matches the verified identity
- [ ] Razorpay key id **and** secret set together; webhook secret set
- [ ] `S3_BUCKET` / `S3_REGION` / `S3_PUBLIC_BASE_URL` set
- [ ] Feature flags at their **launch** values (see §11) — all `false` unless you have decided otherwise
- [ ] Netlify env: `NEXT_PUBLIC_API_URL=https://prephasz.com`, `BACKEND_ORIGIN=http://<alb-dns>`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- [ ] `netlify.toml` ALB host matches the **actual** ALB DNS
- [ ] GitHub secrets `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` on the backend repo

## Stage 4 — First deploy

- [ ] Backend: push to `main`, workflow green (test → build → deploy)
- [ ] `aws ecs describe-services … --query 'services[0].deployments[0].rolloutState'` → `COMPLETED`
- [ ] `curl https://prephasz.com/health` → `{"status":"ok"}`
- [ ] `curl https://prephasz.com/ready` → `{"ready":true,"checks":{"database":"ok","migrations":"applied"}}`
- [ ] All 104 migrations applied (`/ready` says `applied`, not `pending`)
- [ ] Seed the first super-admin: `npm run seed:admin`
- [ ] Frontend: push to `main`, Netlify build green
- [ ] `https://prephasz.com` loads

## Stage 5 — Functional smoke test (do all of these in a real browser)

- [ ] `https://zskilluplms.netlify.app/anything` → **301** to `prephasz.com/anything` (path + query preserved)
- [ ] Signup → email OTP **actually arrives** → verify → onboarding → `/dashboard`
- [ ] Google sign-in works
- [ ] Login → correct role home for each of the four roles
- [ ] Refresh the page while signed in → **still signed in** (refresh cookie round trip)
- [ ] Logout → refresh cookie cleared → `/dashboard` bounces to `/login`
- [ ] Forgot password → reset email arrives → reset works
- [ ] `/practice` on a **first click after login** (this is the historically fragile path — no `/login` bounce)
- [ ] Company hub loads while signed **out** (`/dashboard/company/<slug>`)
- [ ] Practice attempt submits and is **server-graded**
- [ ] Timed mock assessment: start → timer → submit → results
- [ ] Proctoring initialises (camera permission, WebGL) — see §15
- [ ] Coding problem: run + submit hit Judge0
- [ ] Vimeo video **plays** on prod (this fails without the domain allowlist)
- [ ] Certificate issues and its public `/certificate/[id]` page renders
- [ ] `/jobs` and a `/jobs/[slug]` render; apply flow completes; application shows in `/applications`
- [ ] `/sitemap.xml` and `/robots.txt` return correct content
- [ ] Razorpay checkout completes **on `prephasz.com`** with a live key, and the webhook is received and verified
- [ ] Admin console: create a question, a job, a live session; upload a live-session cover (S3 presign)
- [ ] TPO console loads with its own college's students only (**cross-tenant check**)
- [ ] Super-admin: financials, audit logs, impersonation/preview

## Stage 6 — Operational readiness

- [ ] Alarms tested (force one, confirm the email lands)
- [ ] RDS automated backups verified; **a restore has actually been rehearsed**
- [ ] `loadtest/prescale.sh` runs and reports READY
- [ ] Someone other than the author has read Part 12 and Part 14
- [ ] Rollback path decided (see §14.1 — the mutable `:main` tag is a real gap)
- [ ] GitHub **branch protection** enabled on both repos (see §15 — currently NOT set)

---

# PART 11 — Feature flags & staged rollout

All four flags default to `false`, so **deploying the code changes nothing for existing users**.
They are env-var flags on the backend — flipping one means registering a new ECS task definition
revision (or editing the env and forcing a new deployment), not a code deploy.

| Order | Flag | What flipping it does | Reversible? |
|---|---|---|---|
| 1 | `PAYWALL_ENABLED` | Turns on freemium **enforcement**: the 5-free meter + content locks. Purchases and admin work regardless — this only gates access-blocking | Yes, instantly |
| 2 | `CALIBRATION_ENABLED` | Requires a first-login calibration assessment; locks practice/assessments until taken. **Only flip once the calibration assessment is seeded** | Yes |
| 3 | `FREEMIUM_SINGLE_SCOPE` | Switches from the per-scope 5-free meter to the aggressive "one sub-topic per section + one company free, rest locked" model. Requires `PAYWALL_ENABLED` | Yes — **no data migration**, independent of the master flag |
| 4 | `SHOW_LOCKED_DRIVES` | Reveals non-entitled **PLATFORM** drives as visible-locked rows instead of hiding them. **Cohort/college drives are never affected** (cross-college security). Requires `PAYWALL_ENABLED`. **Flip last** | Yes — off reproduces the hard-hide exactly |

**Recommended launch posture:** ship with all four `false`, confirm the product works end-to-end
with real users, then flip `PAYWALL_ENABLED` once Razorpay live keys are verified with a real
transaction. Flip the rest one at a time, days apart, watching support volume between each.

---

# PART 12 — Capacity, scaling & the drive runbook

## 12.1 Certified capacity

Load-tested with k6 (harness in `loadtest/`, report `loadtest/AUDIT-2026-08-14.md`):

| Concurrent students | Success rate | Login p95 | DB CPU | Verdict |
|---|---|---|---|---|
| 2,500 | **99.97%** | 2.3 s | 74% | ✅ certified |
| 3,000 | **99.96%** | 3.4 s | **93%** | ✅ but DB is the limiter |
| 5,000 | — | — | — | ❌ needs a bigger DB + RDS Proxy + read replica |

Requires **15 tasks (7.5 vCPU)** + DB on `m6g.large`.

**Real-world proof (2026-08-16 live college drive):** pre-scaled to 14 tasks, peak ~755 students
actively in-test (~1,500 signed in, 1,117 unique test-takers that day). DB peaked at 20–26% CPU,
app 30–48%, **0 5xx, 0 connect-timeouts** all day.

## 12.2 THE operational rule

> **Pre-scale the app tier ~15 minutes before every drive.**

Autoscaling reacts in 1–2 minutes; the login burst is over in 2. Argon2 password hashing spikes
CPU, and at the 2-task idle baseline the burst pegs the tier before scaling helps. That is exactly
what happened on 2026-08-12 (~5,881 `429`s at **19% CPU** — rate limiting, not capacity) and in
load-test run 1 (failed at ~700 VUs with the DB at only 7% — proving the app tier, not the DB, was
the bottleneck).

```bash
# ~15 min BEFORE the drive
./loadtest/prescale.sh up      # scales to 14–15 tasks, polls target health, prints READY

# Watch during the drive
./loadtest/monitor.sh          # healthy = DB CPU <85%, app CPU <70%, ALB 5xx ~0

# AFTER the drive
./loadtest/prescale.sh down    # back to the 2-task baseline
```

## 12.3 Drive-day rules

1. **Do NOT deploy code during a drive.** While pre-scaled, a rolling deploy needs old+new tasks
   at once and exceeds the 8-vCPU Fargate quota → the deploy fails. Deploy before pre-scaling, or
   after scaling down.
2. **Do not open the assessment until `prescale.sh up` prints `READY`** (≥14 healthy targets).
3. **After a load test, `force-new-deployment`** to cycle fresh task pools. Do not just scale down
   and retain the veteran tasks — a retained load-test-veteran task was implicated in the
   2026-08-15 incident.

## 12.4 Frontend behaviour under load

Client-rendered pages are load-independent (each student's own browser) and held flat — dashboard
LCP 2.0 → 1.7 s under 2,500 concurrent. Live-assessment, adaptive, and mock-interview are CLIENT or
static-shell, hence immune.

The **only** degradation was `force-dynamic` Server Components awaiting the *public* catalog
(`/practice`, `/dashboard/section`, company hubs) — TTFB ballooned 1.1 → 3.3 s because the shared
catalog was re-fetched per view. **Fixed** by `PUBLIC_READ = { auth: 'public', next: { revalidate: 300 } }`
on the 7 public catalog reads in `lib/api/catalog.ts` (Next Data Cache). Per-user PYQ/community
reads stay uncached. Those pages now render at the ~440–520 ms `force-dynamic` floor.

> If you add a new public catalog read to a `force-dynamic` page, **use `PUBLIC_READ`** or you will
> reintroduce this.

## 12.5 Getting past 3,000

| Need | Change | Cost |
|---|---|---|
| App headroom | Fargate vCPU quota 8 → 32; then more tasks or 1-vCPU tasks (task-def rev 14 is registered and ready) | — |
| DB headroom | `r6g.xlarge` | ~$400/mo |
| Connection multiplexing | RDS Proxy | + |
| Read scaling | Read replica, route reads | + |
| HA | Multi-AZ | + |
| Cheap win | Cache the shared question fetch — 5,000 students load the same ~50 questions ⇒ 1 DB read | free |

---

# PART 13 — Monitoring & production verification

## 13.1 Verifying a deploy landed

| Check | Command |
|---|---|
| Backend workflow | `gh run list --workflow "Build & Deploy to ECS"` |
| ECS rollout | `aws ecs describe-services --cluster zskillup --services zskillup-backend-service --region ap-south-1 --profile zskillup --query 'services[0].deployments[0].rolloutState'` → **`COMPLETED`** |
| Liveness | `curl -s https://prephasz.com/health` |
| Readiness | `curl -s https://prephasz.com/ready` |
| A new gated endpoint shipped | `curl -s -o /dev/null -w "%{http_code}" https://prephasz.com/api/v1/<route>` → **`401` = route is live and RBAC is firing** |

> There is **no** `api.prephasz.com` — probing it returns HTTP 000. The site and API share one
> host. Always test the backend through `https://prephasz.com/api/v1/…`.

## 13.2 Testing an authenticated endpoint without a password

Mint an HS256 access JWT from the app secret:

1. Pull `JWT_ACCESS_SECRET` + `DATABASE_URL` from Secrets Manager `zskillup/backend/prod`
2. Look up the target user id
3. Sign `{ sub: userId, role, collegeId, jti: <uuid>, iat, exp }` (claims per `token.service.ts`)
4. Send as `Authorization: Bearer …`

`JwtAuthGuard` only calls `verifyAsync` — there is no jti-store check — so a self-signed token with
the right secret is accepted. Unwrap `.data` from the `{ data, meta }` envelope when asserting.

> ⚠️ That last sentence is also a **finding**: possession of `JWT_ACCESS_SECRET` grants
> impersonation of any user with no revocation check on the access token. Protect the secret
> accordingly, and keep `JWT_ACCESS_TTL` short (`15m`).

## 13.3 Logs & diagnostics

| Signal | Where |
|---|---|
| App logs | CloudWatch `/ecs/zskillup-backend` — bucket by `logStreamName` to isolate a single task |
| Pool exhaustion | filter `timeout exceeded when trying to connect` |
| DB state | `pg_stat_activity` grouped by `client_addr` (= per ECS task) with `max(now()-state_change)` and `left(max(query),60)` |
| ALB | `HTTPCode_Target_5XX_Count`, `TargetResponseTime`, `RequestCountPerTarget` |
| ECS | `CPUUtilization`, `MemoryUtilization`, running task count |
| RDS | `CPUUtilization`, `DatabaseConnections`, `FreeableMemory` |
| Alarms | SNS `zskillup-backend-alerts` → `zskilluptech@gmail.com` |

## 13.4 Prod database access

Direct reads/writes run with `node` + the repo's `pg`, using `DATABASE_URL` from Secrets Manager
and `ssl: { rejectUnauthorized: false }`. `SELECT`/`UPDATE`/`INSERT` and `BEGIN…COMMIT` all work.

> The dev seed credentials (`admin@zskillup.dev / Admin@1234`) **do not work on prod** — that
> password was rotated. Do not rely on it.

---

# PART 14 — Incident & rollback runbooks

## 14.1 Rolling back a bad backend deploy

> ⚠️ **This is the weakest part of the setup.** The image tag `main` is **mutable** — the previous
> image is overwritten every deploy, so there is no immutable artifact to point back at.

Options, best first:

1. **Revert the commit and redeploy.** `git revert <sha> && git push origin main` → the pipeline
   rebuilds from the reverted source (~1.5 min). This is the only reliable path today.
2. **If the bad deploy never became healthy**, ECS has already kept the previous task set — no
   action needed beyond stopping the rollout.
3. **A migration that failed** aborted its container, so the old tasks are still serving. Fix the
   migration, then redeploy.
4. **A migration that succeeded but is wrong** needs a forward-fix migration. `migration:revert`
   against prod is a last resort and must be done deliberately, with a snapshot taken first.

**Recommended fix (not yet done):** tag images with the commit SHA in addition to `main`, so a
rollback is a task-def update rather than a rebuild. See §15.

## 14.2 "Everything 500s / connect timeouts, but RDS looks healthy"

**Signature:** `Error: timeout exceeded when trying to connect`, concentrated on **one** task
(e.g. 336 errors on one stream vs 1 on the others), while RDS reports available, low connection
count, low CPU, plenty of free memory.

**Root cause found 2026-08-16:** a connection leak in `bustQueryCache()` — one leaked pool
connection per admin content edit; ~15 leaks over ~9h exhausted a task's pool. Fixed in `3ba9d04`.

**Response:**
1. `aws ecs update-service … --force-new-deployment` — a rolling restart gives every task a fresh
   pool. This resolves the symptom immediately.
2. Confirm with `pg_stat_activity` grouped by `client_addr`: if the wedged task's connections are
   all idle with `last query = TRUNCATE query_result_cache`, it is the leak class again.
3. If it recurs, look for any code path calling a TypeORM API that creates a QueryRunner
   internally without releasing it.

## 14.3 "Rate limited during a drive" (429 storm)

**Signature:** mass `ThrottlerException: Too Many Requests` at low CPU.

**Already fixed:** `trust proxy` is on, and `UserOrIpThrottlerGuard` keys per verified user, per
real client IP for anonymous, and **per email on `/auth/login`** so one college behind one NAT
doesn't share a bucket.

**If it recurs:** confirm `trust proxy` is still enabled and that `X-Forwarded-For` survives the
Netlify → ALB hop. A per-route limit can be raised at its controller (refresh is already 1500/min).

## 14.4 "Users bounce to /login on the first click, a hard refresh fixes it"

This is the **cached-redirect** class. A session-dependent redirect got cached by Next's router
cache or Netlify's Durable cache and replayed once the cookie was present.

**Check, in order:**
1. Is the redirect going through `sessionRedirect()` (which sets `no-store` + `Vary: Cookie, RSC`)?
2. Is the route `force-dynamic` **and** newly added to `PROTECTED_PREFIXES`? Middleware should not
   redirect RSC requests (`rsc: 1`) — verify that check is intact.
3. Is the user hitting `zskilluplms.netlify.app` instead of `prephasz.com`? Cookies are host-scoped;
   mixing the domains logs them out.

## 14.5 "Payments fail: Business – Website Mismatch"

The checkout ran on a domain not registered with Razorpay. Only `prephasz.com` is registered.
Confirm the canonical-host redirect is working in **both** places — `netlify.toml` (edge) **and**
`middleware.ts` (which shadows the edge rule on protected paths).

## 14.6 "Emails aren't arriving"

1. SES still in **sandbox**? Only verified recipients receive mail.
2. `EMAIL_FROM` must exactly match a verified SES identity.
3. SMTP unreachable ⇒ `EmailService` **silently falls back to logging** — check CloudWatch, and
   check the `system.email_deliveries` table.
4. SPF/DKIM/DMARC missing ⇒ delivered but spam-foldered.

## 14.7 "Videos don't play on prod"

`prephasz.com` is not on the Vimeo domain allowlist. Embedding does **not** need
`VIMEO_API_TOKEN` — that token is only for the admin catalog picker.

## 14.8 Scheduled-assessment window bug (known, open)

During the 2026-08-16 drive a scheduled assessment **disappeared from the student UI at
`start + duration` instead of at `ends_at`** — a frontend bug; the backend was correct. Also seen:
bulk student invite returns 500 per batch and 504 on large batches. **Both were still unfixed as of
that date.** If a drive is imminent, verify these first.

---

# PART 15 — Risk register / known gaps

Ordered by how much they would hurt.

| # | Gap | Impact | Fix |
|---|---|---|---|
| 1 | **No infrastructure-as-code.** All of Part 6 exists only in the AWS console | Account loss or a bad manual change is unrecoverable from the repos | Write Terraform/CDK for VPC, ECS, ALB, RDS, S3, IAM, alarms |
| 2 | **Mutable `:main` image tag** | No artifact-level rollback; every rollback is a rebuild | Also tag with the commit SHA; roll back via task-def update |
| 3 | **Fargate vCPU quota still 8** (raise to 32 `CASE_OPENED` since 2026-08-14) | Hard ceiling of 7.5 vCPU; **cannot deploy during a drive**; no headroom for a restart at 3,000 students | Chase the AWS support case |
| 4 | **Branch protection NOT enabled** on either repo | A red PR can be merged; the CI gate is advisory | Enable required status checks on `main` |
| 5 | **RDS is single-AZ, no replica, no RDS Proxy, gp2 20GB** | An AZ failure or storage exhaustion is a full outage | Multi-AZ + replica when budget allows |
| 6 | **Swagger UI is mounted at `/api` in all environments** | The full API surface is publicly enumerable in prod | Gate `SwaggerModule.setup()` behind `NODE_ENV !== 'production'` or auth |
| 7 | **ALB is HTTP-only**; TLS terminates at Netlify | Traffic between Netlify's edge and the ALB crosses the public internet unencrypted | Put ACM TLS on the ALB and switch the rewrites to `https://` |
| 8 | **`JWT_ACCESS_SECRET` grants full impersonation**; `JwtAuthGuard` does no jti-store check | Secret compromise = silent access as any user, unrevocable until expiry | Keep TTL at `15m`; consider a jti denylist for high-value routes |
| 9 | **Frontend has no CI** | Type errors and lint failures reach `main` | Add a typecheck+lint workflow mirroring the backend's `test` job |
| 10 | **`src/shared/` is duplicated by hand** across two repos | Silent contract drift | A sync check in CI, or publish it as a package |
| 11 | **Design drift between `CLAUDE.md` and `globals.css`** (Inter/navy/orange vs Prephasz 2026 yellow/black) | A future session will "fix" the theme backwards | Update `CLAUDE.md` §1/§4 to the shipped palette and fonts |
| 12 | **`amplify.yml` present but Netlify is live** | Ambiguity about the real host during an incident | Delete `amplify.yml` or document it as a fallback |
| 13 | **Open product bugs** — scheduled-assessment window, bulk-invite 500/504 (§14.8) | Visible during drives | Fix before the next drive |
| 14 | Only **23 backend unit specs** for 71 controllers; frontend has no test suite | Regressions ship green | Grow coverage on the assessment engine and billing paths first |
| 15 | **`docker-compose.yml` (backend) contains Dockerfile content, not a compose file** — a stale duplicate of an older Dockerfile with no entrypoint | `docker compose up` fails confusingly; someone may build from the wrong recipe and get an image that skips migrations | Delete it; `docker-compose.dev.yml` is the real one |
| 16 | **`.env.example` documents a Mailhog service that does not exist** in either compose file | New devs chase a container that was never defined | Add a mailhog service, or fix the comment |

---

# APPENDIX A — Command quick reference

```bash
# ── Local development ────────────────────────────────────────────────────────
# Frontend (:3000)
cd ~/Developer/client-lms-zskillup
npm install && cp .env.example .env.local && npm run dev
npm run typecheck && npm run lint          # ALWAYS before pushing — there is no FE CI

# Backend (:3001)
cd ~/Developer/client-lms-zskillup-backend
npm install && cp .env.example .env && npm run dev
docker compose -f docker-compose.dev.yml up -d   # Postgres :5432 + Redis :6379
#   NOTE: .env.example tells you to start Mailhog — there is NO mailhog service in either
#   compose file. Email falls back to logging locally, which is fine for signup/OTP.
npm run migration:run
npm run seed:admin
npm test && npm run typecheck && npm run lint

# ── Migrations ───────────────────────────────────────────────────────────────
npm run migration:generate                 # diff entities → migration file
npm run migration:run
npm run migration:revert

# ── Deploy ───────────────────────────────────────────────────────────────────
git checkout main && git merge --ff-only <branch> && git push origin main   # BE first, then FE
gh run list --workflow "Build & Deploy to ECS"

# ── Verify prod ──────────────────────────────────────────────────────────────
curl -s https://prephasz.com/health
curl -s https://prephasz.com/ready
curl -s -o /dev/null -w "%{http_code}\n" https://prephasz.com/api/v1/<route>   # 401 = live
aws ecs describe-services --cluster zskillup --services zskillup-backend-service \
  --region ap-south-1 --profile zskillup \
  --query 'services[0].deployments[0].rolloutState'

# ── Drive operations ─────────────────────────────────────────────────────────
./loadtest/prescale.sh up          # ~15 min before — wait for READY
./loadtest/monitor.sh              # during
./loadtest/prescale.sh down        # after

# ── Incident ─────────────────────────────────────────────────────────────────
aws ecs update-service --cluster zskillup --service zskillup-backend-service \
  --force-new-deployment --region ap-south-1 --profile zskillup    # fresh task pools
aws logs filter-log-events --log-group-name /ecs/zskillup-backend \
  --filter-pattern "timeout exceeded when trying to connect" \
  --region ap-south-1 --profile zskillup
```

# APPENDIX B — Key file index

| File | What it governs |
|---|---|
| `CLAUDE.md` (frontend) | The design law + hard stops. Read before any UI change |
| `src/middleware.ts` | Canonical host, route-group RBAC, cached-redirect defences |
| `src/app/globals.css` | Design tokens (the **real** palette) |
| `src/lib/api/client.ts` | The only path to the backend; 401 → refresh → retry |
| `src/store/auth.ts` | Access token in memory; preview layer |
| `src/app/api/auth/refresh/route.ts` | HttpOnly cookie → access token exchange |
| `next.config.ts` | Fallback API rewrite, redirects, standalone output |
| `netlify.toml` | **Edge API proxy + canonical redirect — contains the ALB DNS** |
| `src/config/validation.ts` (backend) | Every env var, its rule, and its default |
| `src/app.module.ts` | Module list + global guard chain |
| `src/main.ts` | Bootstrap contract (trust proxy, CORS, prefix, validation) |
| `src/database/database.module.ts` | Pool, SSL, query cache |
| `src/database/migrate.ts` | Advisory-locked migration runner |
| `src/database/schemas.ts` | The 11 Postgres schemas |
| `src/modules/auth/auth.cookies.ts` | Refresh cookie attributes |
| `docker-entrypoint.sh` | migrate → boot |
| `.github/workflows/deploy.yml` | The whole backend pipeline |
| `loadtest/DRIVE-RUNBOOK.md` · `prescale.sh` · `monitor.sh` | Drive operations |
| `loadtest/AUDIT-2026-08-14.md` | The capacity certification |

---

## Maintaining this document

Update it in the same change set as any of these:

- a new route group, or a route added to `PROTECTED_PREFIXES`
- a new env var in `config/validation.ts`
- any AWS resource created, resized, or renamed — **especially the ALB DNS**
- a feature-flag flip in production
- a new third-party integration
- an incident with a root cause worth remembering (add it to Part 14)
- anything in the risk register getting fixed (delete the row; don't leave it stale)
