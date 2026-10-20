# prephasz Mobile App — Business Requirements Document

| | |
|---|---|
| **Product** | prephasz mobile (iOS + Android), React Native |
| **Platform** | Same backend, same APIs as prephasz.com — no second source of truth |
| **Version** | 1.0 — **DRAFT FOR SIGN-OFF** |
| **Date** | 2026-10-13 |
| **Companion documents** | `MOBILE_APP_PLAN.md` (engineering plan, timeline), `MOBILE_BUILD_LOG.md` (what has been built) |
| **Status of the four scope decisions** | Settled by the owner, 2026-10-13 — see §4 |

> **How to read this.** §6 is the complete inventory of every feature the web platform has today
> and what happens to it on mobile — that is the "all features, all modules, all roles" answer.
> §7 is the detailed requirement set for what is actually being built first. Everything else is
> context, constraints and acceptance criteria.
>
> **What this document is not.** It is not a design spec. Screen layouts here are structural
> (what is on the screen and in what order), not visual. The visual system is `MOBILE_DESIGN_LAW.md`,
> which is written before any screen is built.

---

## 1. Executive summary

prephasz is a placement-preparation platform used by students, their college placement officers
(TPOs) and the platform's own staff. The web product is large — **139 pages across four roles** —
and is in production with live drives, payments and proctored assessments.

The mobile app is **not a port of that product**. It is a deliberately narrow companion that does
the handful of things a phone is genuinely better at:

- a student can **practise on a real, server-timed mock** anywhere, in the gap between classes;
- a student can **see their upcoming drives** and get told when one starts;
- a TPO can **see who has and has not shown up** while standing in the lab on drive day;
- platform staff can **watch a live drive and publish results** without being at a desk.

Everything else routes to the web.

The three things that make this cheap and safe to build, all verified in the codebase:

1. **The backend is already server-authoritative.** It issues the attempt, the deadline, the
   questions and the grading. No business logic moves to the client.
2. **The mock engine already runs unproctored**, so excluding proctoring costs nothing but the
   camera.
3. **The API is directly callable** by a native client — standard `{data}` / `{error}` envelope,
   typed error codes for every gate, and CORS open to any origin.

**Commercial position for v1: the app sells nothing.** It reads entitlement state and shows locked
surfaces honestly, with no purchase path. This removes the single largest launch risk (App Store
§3.1.1 / Play billing) and is revisited as its own project after launch.

---

## 2. Business objectives

| # | Objective | How the app serves it | How we will know |
|---|---|---|---|
| **B1** | Increase practice frequency per student | Practice becomes a 2-minute phone activity instead of a laptop session | Mock attempts per active student per week, mobile vs web |
| **B2** | Reduce drive-day no-shows | Students see their drive schedule on the device they actually carry; push reminders in Phase 3 | Participation rate per sitting, before vs after |
| **B3** | Give TPOs live visibility without a desk | Drive-day roster and readiness on a phone | TPO weekly active users; support requests asking "who has started?" |
| **B4** | Shorten platform staff response time during a drive | Live drive monitor + publish results from anywhere | Time from drive end to results published |
| **B5** | Strengthen the institutional sales story | "There is an app" is a procurement checkbox for colleges | Named in college deals closed post-launch |

**Explicit non-objective for v1:** revenue through the app. See §4 D1.

---

## 3. Users and roles

Four roles exist in the system (`UserRole`), and all four can sign in to the app from day one.

| Role | Who they are | What they do today on web | App v1 |
|---|---|---|---|
| **STUDENT** | A student at a partner college, or an individual subscriber | Practice, mocks, company prep, drives, jobs, resume, certificates | **Full first module** — Mock Assessment + schedule visibility |
| **COLLEGE_ADMIN** (TPO) | Placement officer at a college | Roster, analytics, readiness, assessment scheduling, reports | **Drive day** — participation + readiness, read-only |
| **ADMIN** | prephasz operations staff | Content, colleges, users, jobs, marketing, catalogue | **Live drive monitor** + publish results |
| **SUPER_ADMIN** | Platform owner | Everything ADMIN can do, plus finance, audit, access control | Same as ADMIN in v1 |

Account states (`UserStatus`): `INVITED`, `ACTIVE`, `SUSPENDED`. The app must handle all three —
a suspended account cannot refresh into a session, which the backend already enforces.

**Authorisation is the server's job, always.** The app's role-aware navigation is a convenience so
people land somewhere sensible; it is never a security boundary. Every screen is protected by the
backend guard behind its endpoint.

---

## 4. Scope decisions (settled)

### D1 — The app has no purchase surface
It reads entitlement state from the server. Where something is locked it says so plainly: no buy
button, no price, no link to the web store on iOS. Students upgrade on the web and the app picks it
up on next load.

*Rationale:* digital content sold outside IAP is the classic App Store §3.1.1 rejection, discovered
at review — after the whole project is built. Play has its own billing rules with India-specific
carve-outs. Both policies move. Revisit post-launch with the then-current guidelines; doing it
properly means backend receipt validation and a price-parity decision.

### D2 — No proctored assessments, and no coding questions
Proctored sittings and papers containing coding questions are **visible but not startable** in the
app, shown with an honest state: *"Proctored — sit this on a laptop"*, *"Has a coding section —
laptop required"*.

*Rationale and consequence:* this removes the camera from the app entirely — no camera permission,
no on-device ML, no snapshot uploads, no device-tier frame budget, and none of the review scrutiny a
proctoring app attracts. It also removes the worst bug class in this product (a frozen exam on a
low-end Android). It costs almost nothing, because the mock engine's **default path is already
unproctored**.

Positioning to be precise about with colleges: **the app is for practice and visibility.**
High-stakes proctored sittings remain web + invigilator. The app is not an equivalent surface for an
evaluated drive, and nobody should be told otherwise.

### D3 — The app talks to `api.prephasz.com`
A dedicated subdomain pointing at the same load balancer, rather than routing app traffic through
the web host's proxy. Infrastructure task, not app work. Fallback: `prephasz.com/api/v1`.

### D4 — All four roles, one module each
Parity with 139 web pages is not a v1; a login that dead-ends for three of four roles is not a
launch. Each role gets the one thing a phone is genuinely good for. Everything else gets a single
"Open on web" path.

---

## 5. Constraints and assumptions

### Constraints
| ID | Constraint | Implication |
|---|---|---|
| C1 | Same backend, same APIs — no mobile-only business logic | Any new behaviour needs a backend change, reviewed like any other |
| C2 | Business values (XP, PPS, percentile, rank, score) are **rendered, never computed** | The app displays what the server returns, always |
| C3 | Access token is short-lived; the refresh token lives in Keychain / Keystore only | No plain storage, no logging, no analytics payloads |
| C4 | Store review is wall-clock and outside our control | Remote config + OTA updates are mandatory, not optional |
| C5 | Students are on low-end Android (2–3 GB RAM) on campus wifi | Performance budget and offline tolerance are requirements, not polish |
| C6 | WCAG 2.1 AA is a launch gate on web | It remains one here |

### Assumptions (to be confirmed)
| ID | Assumption | Owner | Risk if wrong |
|---|---|---|---|
| A1 | Apple + Google developer accounts can be enrolled in parallel with the build | Owner | Launch slips to whenever the accounts clear |
| A2 | Play Console account is an **organisation** account | Owner | Personal accounts need ~12 testers × 14 days before production — 2–3 weeks |
| A3 | A 7-day session (`REFRESH_TTL_DAYS`) is acceptable on mobile | Owner | Students re-login weekly; raising it changes the web's posture too |
| A4 | Test devices (1 iPhone, 1 low-end Android) available from week 1 | Owner | Device QA cannot start |

---

## 6. Complete module catalogue

Every module the platform has today, by role, with its mobile verdict. This is the master scope list.

**Verdict key:** **V1** = in the first release · **P2** = planned next · **P3** = later ·
**WEB** = stays on web by design, reachable via "Open on web".

### 6.1 Public / marketing (no login)

| Module | Web route | What it does | Verdict | Note |
|---|---|---|---|---|
| Home / landing | `/` | Marketing, company logos, testimonials, funnel | **WEB** | An app store listing is the app's front door; a marketing page inside an app adds nothing |
| Prepare | `/prepare` | Preparation overview, SEO surface | **WEB** | |
| Roadmap | `/roadmap` | Placement roadmap content | **P3** | Good phone content, not v1 |
| About | `/about` | Company page | **WEB** | |
| Blog | `/blog`, `/blog/[slug]` | Content marketing, SEO | **WEB** | |
| Job detail (public) | `/jobs/[slug]` | A single public job posting | **P2** | Deep-link target when push lands |
| Certificate verify | `/certificate/[id]`, `/verify` | Third-party verification of a certificate | **WEB** | Verifier is never the student |

### 6.2 Authentication and onboarding

| Module | Web route | What it does | Verdict | Note |
|---|---|---|---|---|
| Login (email + password) | `/login` | Session establishment | **V1** | |
| Google sign-in | `/login` | Google ID token → session | **V1** | Native Google sign-in, not a web view |
| Signup step 1 — account | `/signup` | Name, email, phone, password | **V1** | |
| Signup step 2 — verify | `/signup/verify` | 6-digit email OTP | **V1** | |
| Signup step 3 — onboarding | `/signup/onboarding` | College, city, passout year, target companies | **V1** | |
| Forgot / reset password | `/forgot-password`, `/reset-password` | OTP or token reset | **V1** | |
| Set password (invited user) | `/set-password` | College-invited student first login | **V1** | Colleges bulk-invite; those students must be able to start on a phone |

### 6.3 Student modules

| # | Module | Web route | What it does | Verdict |
|---|---|---|---|---|
| **WORKSPACE** |
| S1 | Dashboard | `/dashboard` | Progress, streak, readiness, next best step | **P2** |
| S2 | Study Plan | `/study-plan` | Day-by-day plan generated from the readiness test | **P2** |
| S3 | Performance | `/performance` | Accuracy, speed, readiness by section and topic | **P2** |
| S4 | Leaderboard | `/leaderboard` | Rank nationally, by college, company, city | **P2** |
| S5 | Community | `/community`, `/community/[id]` | Discussion threads, doubts | **P3** |
| S6 | Live Sessions | `/live-sessions` | Scheduled live classes and webinars | **P3** |
| S7 | My Calendar | `/calendar` | Sessions, assessments, deadlines | **P2** |
| **ASSESSMENT** |
| S8 | **Mock Assessment** | `/mock-assessment` | Build a custom mock: sections, topics, count, duration | **V1** |
| S9 | **Mock runner** | `/dashboard/quiz` | The timed, server-graded engine | **V1** |
| S10 | **Mock report** | `/dashboard/quiz?report=` | Score, percentile, topic breakdown, answer review | **V1** |
| S11 | **Mock history** | within `/mock-assessment` | Past attempts | **V1** |
| S12 | **Assessments (drives)** | `/assessments`, `/assessments/[id]` | Scheduled / assigned sittings | **V1 — read-only** |
| S13 | Assessment leaderboard | `/assessments/[id]/leaderboard` | Rank within a sitting | **P2** |
| **PRACTICE** |
| S14 | Adaptive practice | `/practice` | Difficulty adapts as you answer | **P2** |
| S15 | Non-adaptive practice | `/practice-wish` | Fixed difficulty | **P2** |
| S16 | Practice review | `/practice/review` | Review past practice answers | **P2** |
| S17 | Adaptive quiz runner + results | `/dashboard/quiz/adaptive` | IRT engine session | **P2** |
| **HUBS** |
| S18 | Company Hubs | `/dashboard/company`, `/[slug]` | 7-tab company prep: overview, syllabus, material, practice, mock, formula sheet, interview experience | **P2** |
| S19 | Company topic prep / PYQs | `/.../prep/[topicSlug]`, `/.../pyqs/[topicSlug]` | Topic drills, previous-year questions | **P2** |
| S20 | Sectional Hubs | `/dashboard/section`, `/[slug]` | Section syllabus, material, topic practice | **P2** |
| **JOBS & CAREER** |
| S21 | Job board | `/jobs` | Partner roles, browse and apply | **P2** |
| S22 | My applications | `/applications` | Application tracking | **P2** |
| S23 | Resume Builder | `/resume-builder` | ATS resume, AI tailoring, PDF export | **WEB** |
| S24 | Mock Interview | `/mock-interview`, `/[id]/take`, `/[id]/result` | AI interview with rubric feedback | **P3** |
| S25 | Certificates | `/certificates` | Earn, download, share verifiable certificates | **P2** |
| S26 | Coding practice | `/coding`, `/coding/[slug]` | Judge0-graded coding problems | **WEB** |
| **ACCOUNT** |
| S27 | Profile | `/profile` | Personal details, college, preferences | **V1 — minimal** |
| S28 | My Learning | `/my-learning` | Enrolled content progress | **P2** |
| S29 | Recommendations | `/recommendations` | What to do next | **P2** |
| S30 | How XP works | `/how-xp-works` | Gamification explainer | **P3** |
| S31 | Plans / Upgrade / Cart | `/shop`, `/shop/build`, `/shop/full`, `/upgrade`, `/cart` | Purchase and renewal | **WEB** — D1 |
| S32 | Help & Support | `/support` | Tickets, contact | **V1 — minimal** |

### 6.4 TPO (COLLEGE_ADMIN) modules

| # | Module | Web route | What it does | Verdict |
|---|---|---|---|---|
| T1 | Executive Dashboard | `/tpo/dashboard` | College-level summary | **P2** |
| T2 | **Drive day — participation** | from `/tpo/assessments` + roster | Who has started, who has submitted, who has not shown up | **V1** |
| T3 | **Placement Readiness** | `/tpo/placement-readiness` | Readiness distribution across the cohort | **V1 — read-only** |
| T4 | Student Analytics | `/tpo/analytics` | Per-student accuracy, activity | **P2** |
| T5 | Company Readiness | `/tpo/company-readiness` | Roster readiness per target company | **P2** |
| T6 | Skill Gap Analytics | `/tpo/skill-gaps` | Where the cohort is weak | **P2** |
| T7 | Coding Analytics | `/tpo/coding-analytics` | Coding performance | **WEB** |
| T8 | Interview Analytics | `/tpo/interview-analytics` | Mock interview outcomes | **WEB** |
| T9 | Student Management | `/tpo/students`, `/tpo/students/[id]` | Roster administration | **P2 — read-only** |
| T10 | Assessment Center | `/tpo/assessments` | Schedule and manage sittings | **WEB** — scheduling is a desk task |
| T11 | Cohorts | `/tpo/cohorts` | Group management | **WEB** |
| T12 | Invitations | `/tpo/invitations` | Bulk student invites | **WEB** |
| T13 | Reports & Exports | `/tpo/reports` | CSV and report generation | **WEB** |
| T14 | Subscription / Billing | `/tpo/subscription`, `/tpo/billing` | College plan | **WEB** |
| T15 | Settings | `/tpo/settings` | College configuration | **WEB** |

### 6.5 ADMIN and SUPER_ADMIN modules

The two consoles total **67 pages**. Almost all of it is dense tables, CSV exports and
large-screen charts — desk work, and a phone version would be worse at the job than the web one
that already exists. One slice is genuinely mobile.

| # | Module | Web route | Verdict |
|---|---|---|---|
| A1 | **Live drive monitor** — sittings, live attempt state, proctoring warnings, submissions | `/admin/scheduled-assessments`, `/superadmin/scheduled-assessments` | **V1** |
| A2 | **Publish results** for a sitting | same | **V1** |
| A3 | Platform dashboard / analytics | `/admin/dashboard`, `/admin/analytics`, `/superadmin/dashboard`, `/superadmin/analytics` | **P2 — headline figures only** |
| A4 | Support inbox | `/admin/support`, `/superadmin/support` | **P2** |
| A5 | Broadcasts | `/admin/broadcasts` | **P3** |
| A6 | User management, colleges, college requests, access, cohorts | `/admin/users`, `/admin/colleges`, `/admin/college-requests`, `/superadmin/college-access`, `/admin/individual-cohorts` | **WEB** |
| A7 | Catalogue: companies, question bank, coding bank, mock tests, assessments, courses, study material, concept videos, challenges | `/admin/*`, `/superadmin/*` | **WEB** |
| A8 | Commerce: subscriptions, billing, financials, coupons, autopay | `/superadmin/*`, `/admin/coupons`, `/admin/autopay` | **WEB** |
| A9 | Marketing: blog, testimonials, SEO, tips | `/admin/*`, `/superadmin/*` | **WEB** |
| A10 | Jobs administration + applicants | `/admin/jobs/*` | **WEB** |
| A11 | Feature locks, calibration config | `/admin/settings`, `/admin/calibration` | **WEB** |
| A12 | Audit log, user sheet, adaptive sessions, reports | `/superadmin/*` | **WEB** |
| A13 | Live sessions, WhatsApp community | `/admin/*` | **WEB** |
| A14 | **Mobile remote config** — version floor, outage stop, feature flags | `/admin/mobile-config` *(new)* | **WEB** (controls the app) |

### 6.6 Scope summary

| Area | V1 | P2 | P3 | Web-only | Modules |
|---|---|---|---|---|---|
| Public | 0 | 1 | 1 | 5 | 7 |
| Auth | 7 | 0 | 0 | 0 | 7 |
| Student | 7 | 18 | 4 | 3 | 32 |
| TPO | 2 | 5 | 0 | 8 | 15 |
| Admin / Super-admin | 2 | 2 | 1 | 9 | 14 |
| **Total** | **18** | **26** | **6** | **25** | **75** |

**18 modules in v1, out of 75.** That ratio is the point of this document: the app is narrow on
purpose, and §6 is the record of what was consciously left out rather than forgotten.

---

## 7. V1 functional requirements

Requirement IDs are stable. Screen layouts are **structural**, not visual.

### 7.0 Shell and navigation

**FR-0.1 — Role-aware bottom tabs.** The web's left sidebar does not translate to a phone. Each
role gets its own bottom tab bar, maximum five tabs:

| Role | Tabs |
|---|---|
| STUDENT | Practice · Assessments · Profile |
| COLLEGE_ADMIN | Drive Day · Readiness · Profile |
| ADMIN / SUPER_ADMIN | Drives · Profile |

**FR-0.2 — Header.** Compact: screen title, and on student screens the streak and coin chips the
web shows in its top bar. No hamburger menu — anything not in the tab bar is reached from a screen.

**FR-0.3 — "Open on web".** Every module marked WEB or P2 that a user could reasonably look for is
reachable as a labelled row that opens the web app in the system browser, signed in where the
session allows. It never pretends to be a feature that is missing.

**FR-0.4 — Remote config gate.** On every cold start, before rendering anything else, the app reads
`GET /api/v1/system/mobile-config`:
- build below `minSupportedVersion` → blocking force-upgrade screen with a store link;
- `outage.active` → blocking screen showing `outage.message` verbatim;
- a `features.*` flag off → that surface is hidden, not broken.
A failed read must never block the app; the last known config, else the shipped defaults, applies.

### 7.1 Authentication (FR-1)

| ID | Requirement | Acceptance |
|---|---|---|
| FR-1.1 | Email + password sign-in | Valid credentials land on the role home; invalid shows the server's message and does **not** clear the form |
| FR-1.2 | Google sign-in via the native SDK | Returns to the role home with a live session; a cancelled flow returns to login with no error state |
| FR-1.3 | Three-step signup: account → email OTP → onboarding | A new student completes all three on-device and lands on the student home |
| FR-1.4 | Resend OTP, with the server's rate limit surfaced honestly | Hitting the limit shows when to retry, not a generic failure |
| FR-1.5 | Forgot password (OTP and token paths) | A reset started on the phone completes on the phone |
| FR-1.6 | Invited-student set-password | A college-invited student can activate entirely on-device |
| FR-1.7 | Session survives force-quit and device restart | Kill the app mid-session, reopen → still signed in, no re-login |
| FR-1.8 | Sign-out revokes server-side | After sign-out the stored token is gone and reuse is refused by the server |
| FR-1.9 | A suspended account cannot sign in or refresh | Server refusal is shown as an account message, not a network error |
| FR-1.10 | Role-aware landing | STUDENT → Practice; COLLEGE_ADMIN → Drive Day; ADMIN/SUPER_ADMIN → Drives |

### 7.2 Mock Assessment — build and start (FR-2)

**Screen: Practice (student home)**
```
Header            prephasz · streak · coins
Section           CONTINUE  — resume card, only when an attempt is open
Section           BUILD A MOCK
                  · Sections / topics  (multi-select)
                  · Number of questions (stepper)
                  · Duration            (stepper)
                  · [ Build and start ]  ← single primary action
Section           READY TO TAKE — catalogue mocks: title, duration, question count
                  · coding papers render disabled with "Laptop required"
Section           RECENT ATTEMPTS — last 3, score + date, tap for the report
Footer tabs       Practice · Assessments · Profile
```

| ID | Requirement | Acceptance |
|---|---|---|
| FR-2.1 | Build a custom mock (sections, topics, count, duration) via `POST /mocks/custom` | The mock is created and starts in one flow |
| FR-2.2 | Report what was **actually** built when it differs from the request | Asking for 20 and getting 12 explains why, before the timer starts |
| FR-2.3 | List catalogue mocks with title, duration, question count | Matches the web for the same account |
| FR-2.4 | A paper with `codingCount > 0` cannot be started | Row is disabled with "Has a coding section — open on a laptop"; **no attempt is created** |
| FR-2.5 | Entitlement state is honest | Locked shows what is locked and that it is managed on the web. **No price, no buy button, no store link on iOS** |
| FR-2.6 | Pre-assessment details gate | If the server returns `PROFILE_DETAILS_REQUIRED`, collect exactly the missing fields using the shared validation rules, then continue automatically |
| FR-2.7 | A live attempt is always offered for resume first | An open attempt is resumable from the home screen before anything new can be started |

### 7.3 Mock runner (FR-3) — the core of v1

**Screen: Runner**
```
Header      [Exit]   Question 7 of 25        ⏱ 18:42
Progress    ▓▓▓▓▓▓▓░░░░░░░░░░░
Body        Section chip · difficulty chip
            Question stem (supports images and maths)
            ( ) Option A
            ( ) Option B      ← large touch targets, single column
            ( ) Option C
            ( ) Option D
Actions     [ Flag ]        [ Previous ]  [ Next ]
Sheet       "Questions" → grid palette: answered / flagged / unseen
Footer      [ Submit assessment ]  → confirmation sheet with unanswered count
```

| ID | Requirement | Acceptance |
|---|---|---|
| FR-3.1 | **The timer is the server's.** Countdown derives from `expiresAt`, re-anchored on every foreground and every successful request | Changing the device clock does not change the time remaining |
| FR-3.2 | Question types: MCQ, MULTI_SELECT, NUMERIC | Each renders and records correctly; CODING never appears (FR-2.4) |
| FR-3.3 | Free navigation between questions, answers changeable until submit | Matches web behaviour |
| FR-3.4 | Every answer is persisted locally **and** POSTed; failures retry from a queue that survives a cold start | Airplane mode for 60s mid-attempt loses no answers |
| FR-3.5 | **Resume is a first-class path.** Force-quit → reopen → same attempt, same deadline, answers intact | Verified as an automated test, not a manual check |
| FR-3.6 | Auto-submit at zero | At `expiresAt` the attempt submits and the report opens |
| FR-3.7 | Submit is retried and never ambiguous | A submit on a dying network either completes or says plainly it has not, and recovers on reconnect |
| FR-3.8 | Question palette showing answered / flagged / unseen | Reachable in one tap from the runner |
| FR-3.9 | Backgrounding the app does not end the attempt | A phone call mid-attempt returns to the same question |
| FR-3.10 | Nothing blocks the paper | Network, sync or telemetry failure degrades silently; the candidate keeps answering |
| FR-3.11 | Exit asks for confirmation and leaves the attempt open | Leaving is never accidental and never destructive |

### 7.4 Report and history (FR-4)

| ID | Requirement | Acceptance |
|---|---|---|
| FR-4.1 | Report shows score, percentage, pass verdict, percentile, time taken | Every value comes from the server; none is computed on device |
| FR-4.2 | Topic breakdown | Matches the web report for the same attempt |
| FR-4.3 | Per-question review: your answer, correct answer, explanation | Complete for every question in the paper |
| FR-4.4 | XP / streak / level changes from the attempt are shown | Rendered from the submit response, never calculated |
| FR-4.5 | History list of finalised attempts, newest first | Tapping one reopens its full report |

### 7.5 Assessments — drives, read-only (FR-5)

| ID | Requirement | Acceptance |
|---|---|---|
| FR-5.1 | List the student's sittings: upcoming, live, past | Matches `getMySchedule()` |
| FR-5.2 | Each row shows window, duration, question count and state | **The end time comes from the sitting's real `ends_at`, never `start + duration`** — this exact bug once made a live drive vanish from students' lists |
| FR-5.3 | A proctored sitting shows "Proctored — sit this on a laptop" and cannot be started | No attempt is created from the app |
| FR-5.4 | A sitting with coding shows "Has a coding section — laptop required" | As above |
| FR-5.5 | An unproctored, MCQ-only sitting **is** startable | Runs the FR-3 runner, launched with its sitting id |
| FR-5.6 | Past sittings link to their report where results are published | An embargoed result says so rather than failing |

### 7.6 TPO — drive day (FR-6)

| ID | Requirement | Acceptance |
|---|---|---|
| FR-6.1 | List the college's sittings, live ones first | Matches the TPO web view |
| FR-6.2 | For a live sitting: not started / in progress / submitted counts | Refreshes on pull and on foreground |
| FR-6.3 | Drill into the not-started list by student name | Enough to walk the lab and find them |
| FR-6.4 | Placement readiness distribution for the college | Read-only, server-computed |
| FR-6.5 | Everything else routes to the web | One clear "Open TPO console" action |

### 7.7 Admin / Super-admin — live drive monitor (FR-7)

| ID | Requirement | Acceptance |
|---|---|---|
| FR-7.1 | List scheduled assessments across colleges, live first | Matches the admin web list |
| FR-7.2 | For a sitting: participation, submissions, average score as it lands | Read-only |
| FR-7.3 | Proctoring warnings raised during a sitting are visible | Includes web-sat attempts — the app monitors, it does not proctor |
| FR-7.4 | **Publish results** for a sitting | Calls the existing release endpoint; confirmed before it fires, since it is visible to every student at once |
| FR-7.5 | Everything else routes to the web | One clear "Open admin console" action |

### 7.8 Profile and support (FR-8)

| ID | Requirement | Acceptance |
|---|---|---|
| FR-8.1 | View name, email, college, role, plan state | Read from `/me` |
| FR-8.2 | Edit the pre-assessment detail fields | Same shared validation as the gate; a correct value is never cleared |
| FR-8.3 | Sign out | FR-1.8 |
| FR-8.4 | Help: contact route and app version | Version string must be visible for support triage |
| FR-8.5 | Links: privacy policy, terms, delete-account path | Store requirement, not optional |

---

## 8. Cross-cutting requirements

### 8.1 Error handling is error-code-driven
The server decides every gate and returns a typed code. The app maps code → destination and
**re-derives no gate logic locally**:

| Code | App behaviour |
|---|---|
| `PROFILE_DETAILS_REQUIRED` | Details gate, pre-filled from `details.missing`, then continue |
| `PAYWALL` | Locked state, honest copy, no purchase CTA (D1) |
| `SITTING_REQUIRED` | Return to the assessments list; always launch a drive with its sitting id |
| `403` | Forbidden / empty state. **Never a bounce to login** |
| `401` twice | Session teardown → login |
| Network failure | Transient. Keep the session, show a retry. A refresh that cannot reach the server is **not** a logout |

### 8.2 Session
Access token in memory; refresh token in Keychain / Keystore only — never plain storage, never a
log line, never an analytics payload. Refresh is single-flight, proactive ahead of expiry, anchored
to foreground, and **never fires during a submit**.

### 8.3 Offline and flaky networks
Campus wifi is the design target. The app must: hold queued answers across a cold start; distinguish
"not loaded yet" from "empty"; never show a destructive error for a transient failure; and never
lose an in-progress attempt, because the server already holds it.

### 8.4 Accessibility — WCAG 2.1 AA
Minimum 44pt touch targets; every control labelled for screen readers; colour never the only signal;
Dynamic Type respected without clipping; reduced-motion honoured; focus order follows reading order.

### 8.5 Analytics and privacy
Crash reporting with the attempt id on exam-path breadcrumbs. **No question content, no answers, no
personal data in any telemetry payload.** Store privacy disclosures must match what is collected —
and with D2 there is no camera, which makes that disclosure materially simpler.

---

## 9. Non-functional requirements

| ID | Requirement | Target |
|---|---|---|
| NFR-1 | Cold start to first usable screen | < 3s on a 3 GB Android over 4G |
| NFR-2 | Runner question transition | < 150ms, no visible jank |
| NFR-3 | Answer POST does not block the UI | Always; answering is never gated on the network |
| NFR-4 | Memory on a 2 GB device during a 60-question attempt | No OS termination |
| NFR-5 | Crash-free sessions | > 99.5% at launch |
| NFR-6 | Drive-day load | The mobile client profile is added to the existing k6 scenarios before any drive uses the app |
| NFR-7 | Minimum OS | iOS 15+, Android 8+ *(to confirm against the student device mix)* |
| NFR-8 | App size | < 60 MB download |
| NFR-9 | Recoverability | A bad release can be stopped via remote config in under 5 minutes, with no store review |

---

## 10. Visual reference — the web at phone width

Captured from live prephasz.com at **390 × 844** (iPhone-class) on 2026-10-13. These are the
responsive web pages as a phone renders them today — the starting point the app improves on, not a
design target.

| Screen | Capture | What the app does differently |
|---|---|---|
| Home | [`home.png`](web-at-phone-width/home.png) | Not in the app — the store listing is the front door |
| Login | [`login.png`](web-at-phone-width/login.png) | Same fields, native keyboard handling, native Google sign-in |
| Signup step 1 | [`signup.png`](web-at-phone-width/signup.png) | Same three steps, native OTP autofill |
| Prepare | [`prepare.png`](web-at-phone-width/prepare.png) | Not in the app |
| Roadmap | [`roadmap.png`](web-at-phone-width/roadmap.png) | P3 |
| Jobs | [`jobs.png`](web-at-phone-width/jobs.png) | See the observation below |

**Authenticated screens are not captured.** The production app needs credentials this document's
author does not hold, and the local environment has no seeded data — empty-state screenshots would
be misleading in a BRD. Two ways to add them: a read-only production student and TPO login, or a
seeded local stack. **Worth doing before design sign-off.**

**Observation while capturing:** `https://prephasz.com/jobs` returns HTTP 200 but a browser lands on
`/login`. The job board index lives in the `(student)` route group behind the app shell, while only
individual job pages (`/jobs/[slug]`) are public. Worth confirming that is intended, since the
public board is described as a marketing surface and appears in the sitemap.

---

## 11. Release plan

| Release | Contents | Target |
|---|---|---|
| **v1.0** | §7 in full — auth, mock assessment, drives read-only, TPO drive day, admin monitor | Submit ~11 Nov 2026, live late Nov 2026 |
| **v1.1** | Push notifications: drive starting, results published | ~2 weeks after v1.0 |
| **v1.2 (P2)** | Student dashboard, performance, calendar, practice/adaptive, company + sectional hubs, jobs, certificates | Dec 2026 – Jan 2027 |
| **v1.3 (P3)** | Community, live sessions, mock interview, roadmap | Q1 2027 |
| **Separate project** | In-app purchase — only after the D1 decision is revisited with current store policy | TBD |

Dependencies outside engineering: Apple and Google developer accounts (§5 A1/A2), test devices
(A4), and store review latency, which is wall-clock and not compressible.

---

## 12. Open items

| # | Item | Needed from | Blocks |
|---|---|---|---|
| 1 | Where do the `project-brain/**` standards and ADRs live? Not in the repo or its history | Owner | The ADR-006 mobile amendment |
| 2 | `REFRESH_TTL_DAYS` is 7 days and global — leave, or raise for mobile and accept the change to the web's posture? | Owner | Session design sign-off |
| 3 | Play Console account type — organisation or personal? | Owner | The launch date (worth 2–3 weeks) |
| 4 | Read-only production logins, or a seeded local stack, for authenticated screen captures | Owner | Design sign-off (§10) |
| 5 | Minimum OS versions against the real student device mix | Owner / data | NFR-7 |
| 6 | Is `/jobs` bouncing anonymous visitors to login intended? | Owner | Nothing in v1; affects the web funnel |
| 7 | Confirm the TPO drive-day endpoints cover "not started" by name | Engineering | FR-6.3 |

---

## 13. Sign-off

| Role | Name | Date | Approved |
|---|---|---|---|
| Product owner | | | ☐ |
| Engineering | | | ☐ |
| Design | | | ☐ |

*Approval here means §4 (scope decisions), §6 (module catalogue) and §7 (v1 requirements) are
agreed. Changes after sign-off go through the same decision log in `MOBILE_BUILD_LOG.md`.*
