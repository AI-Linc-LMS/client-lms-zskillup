# ZSkillup Mobile — Build Plan (React Native)

> **Decisions settled 2026-10-13** (owner): no purchase surface in the app · **no proctored
> assessments** in the app · **no coding questions** in the app · all four roles, one module each.
> Those four answers are what the rest of this document is built on.
>
> Scope: a React Native app on the **same backend and the same APIs**, with all four roles
> present and one real module per role — the student's being **Mock Assessment**.
>
> Everything marked *(verified)* was read out of `client-lms-zskillup` /
> `client-lms-zskillup-backend` on 2026-10-13. Everything marked *(recommendation)* is a
> judgement call open to argument.
>
> **Headline ETA (AI-assisted, 10–14 h/day): ~21 working days of build — submitted to both
> stores ~11 Nov 2026, live late Nov 2026.** The build compresses ~2.5×; store review and
> developer-account enrolment do not compress at all, so **the store accounts are now the
> critical path, not the code.** Full reasoning, what must not be compressed, and the
> conventional-pace fallback: §11.

---

## 0. The one-paragraph version

The backend is already a clean, server-authoritative REST API (`/api/v1`, Bearer JWT, standard
`{data}` / `{error:{code,message}}` envelope, CORS open to any origin) and the mock engine is
designed so the client owns nothing that matters — the server issues the attempt, the deadline,
the questions, the grading. A native client is therefore **a re-skin of a known contract, not a
re-architecture**: no business logic moves. Excluding proctoring and coding removes the two
hardest and riskiest parts of the port — no camera, no on-device ML, no Monaco — and with them
most of the store-review risk. What remains hard is exactly two things: **session handling on a
device** (the refresh flow is cookie-only today, so a native client needs a body channel and
secure storage) and **translating the design law to native** before anyone writes a screen.
Everything else is screens over an API that already behaves.

---

## 1. The four settled decisions

### D1. No purchase surface in v1 ✅
The app is **entitlement-aware but purchase-free**. It reads access state from the server and,
where something is locked, says so plainly — no buy button, no price, no link to the web store on
iOS. Students upgrade on the web; the app picks it up on next load. This sidesteps App Store
§3.1.1 and Play billing entirely for launch, which is the difference between a clean review and
a rejection discovered after the whole project is built. Revisit post-launch as its own project
(IAP means receipt validation on the backend and a price-parity decision).

### D2. No proctored assessments, and no coding questions ✅
This is the decision that shrinks the project most, and it lands better than expected:

**The engine already runs unproctored.** `?mock=<id>` renders `<MockRunner mockId={mock} />` with
no proctoring; proctoring is opt-in, added by `ProctoredAssessmentHost` (`proctored`) or carried
by a sitting's `proctored` flag *(verified: `src/app/(quiz)/dashboard/quiz/page.tsx`)*. The
submit body takes `proctoring` as optional and the report's `proctoring` is nullable *(verified)*.
So the app runs the **same server-timed, server-graded mock engine, unproctored, with no backend
change at all.**

What that buys us, beyond the ~1.5–2 weeks of build it removes:
- **No camera permission anywhere in the app.** No `NSCameraUsageDescription`, no camera-use
  justification at review, a far simpler App Privacy / Data Safety disclosure, and none of the
  privacy scrutiny a proctoring app attracts.
- **No on-device ML.** No VisionCamera, no ML Kit frame processors, no device-tier switch, no
  low-end-Android frame budget — which also deletes the worst possible bug class (a frozen exam
  on a 3 GB phone; it has happened once already on web).
- **No snapshot payloads**, so no new load shape on drive days and no 2 MB body-limit worry.
- **MCQ / MULTI_SELECT / NUMERIC only**, so no Monaco, no mobile code editor, no Judge0 path.

**What the app still does with proctored drives and coding papers:** shows them. The assessments
list is read-only for anything it cannot run, with an honest state — *"Proctored — sit this on a
laptop"*, *"Has a coding section — laptop required"* — plus the window, the duration and (Phase 3)
a push reminder. That is genuinely useful: the phone becomes where you **see** your drive, the
laptop where you **sit** it. It needs one small backend field (§3.2) so a coding paper can be
refused *before* `start` — starting and bailing creates a live attempt and, on a drive, burns the
one allowed sitting.

### D3. The app talks to `api.prephasz.com` *(assumed — infra ticket, not app work)*
In the production browser the API base URL is the empty string: the web calls
`prephasz.com/api/v1/*` on its own origin and Netlify proxies to the ALB, deliberately, so the
refresh cookie stays first-party *(verified: `src/lib/api/base.ts`)*. A native app has no such
constraint and no reason to push its traffic through the web host. Stand up
`api.prephasz.com` → the same ALB (DNS + certificate + listener rule). If it slips, the app ships
against `prephasz.com/api/v1` as a fallback — it reads one constant.

### D4. All four roles, one module each ✅
The web app is **139 pages** *(verified: 41 student, 34 admin, 33 super-admin, 16 TPO, 7 auth,
8 public)*. Parity is not a v1; a login that dead-ends for three of four roles is not a launch.
So each role gets what it actually needs *on a phone, standing up*:

| Role | v1 module | Why this one |
|---|---|---|
| `STUDENT` | **Mock Assessment** (full vertical, unproctored) + read-only schedule | The reason the app exists. Practise anywhere, on the real engine. |
| `COLLEGE_ADMIN` (TPO) | **Drive day** — roster participation + readiness, read-only | A TPO walking the lab wants "who hasn't started yet", not CSV exports. |
| `ADMIN` / `SUPER_ADMIN` | **Live drive monitor** — sittings, live attempt state, proctoring warnings (web-sat), publish results | The one admin job that is genuinely mobile. The rest is a desk job on a 27-inch screen. |

Everything else is out of v1 (§9) and reached by a single "Open on web" affordance.

---

## 2. What the backend already gives us (verified)

This is the good news, and it is most of the project.

- **`/api/v1` + Bearer JWT.** `enableCors({ origin: true, credentials: true })` — no CORS work,
  no proxy needed.
- **Standard envelope + typed error codes.** Gates surface as codes, not prose:
  `SITTING_REQUIRED`, `PAYWALL`, `PROFILE_DETAILS_REQUIRED`. The app does **error-code-driven
  navigation** (§6.3) and re-derives *no* gate logic locally.
- **The mock engine is already mobile-shaped:**
  - `POST /mocks/:id/start` returns `attemptId`, `startedAt`, **`expiresAt` (server-authoritative)**,
    **every question up front**, plus `savedAnswers`. One call and the paper is in hand — ideal on
    a flaky campus network.
  - `POST /mocks/attempts/:id/answer` per answer, `.../submit`, `.../report`,
    `GET /mocks/attempts/mine?scope=assessment|custom`.
  - **Resume is built in.** `start` finds the live attempt and returns it, and that path
    deliberately bypasses the meter, the paywall and the profile lock so nobody mid-exam is
    stranded *(verified: `mocks.service.ts` `liveResume`)*. **This is our crash-recovery
    primitive:** app killed → relaunch → `start` → same attempt, same deadline, answers already
    on the server.
  - **Unproctored is the engine default** (D2) — nothing to build, nothing to disable.
- **Server-side entitlements, feature locks and paywall.** The app inherits all of it for free.
- **In-app notifications exist** (`GET /notifications`, `POST /notifications/:id/read`) — a
  notification *feed* needs no backend work. Push does (§3.4).

## 3. Backend changes v1 needs (four, in priority order)

### 3.1 Native-client session — the only hard blocker
Today `POST /auth/refresh` reads the refresh token **only from the HttpOnly cookie**, and login
returns it exclusively as a `Set-Cookie` *(verified: `auth.controller.ts`, `auth.cookies.ts`)*.
Relying on React Native's native cookie jar to carry a `SameSite=None; Secure` cookie across cold
starts and Android process death is not a foundation to put a timed assessment on.

**Change:** when a request identifies itself as the native client (an `X-Client` header), the
session-establishing endpoints (`login`, `verify-email`, `google`, `refresh`) additionally return
`refreshToken` + `refreshExpiresAt` **in the body**, and `refresh` / `logout` accept the token
from the body for those clients. Web behaviour must be untouched — a browser must never receive a
refresh token in a response body; that would be an ADR-006 regression and a real token leak. The
app stores it in the Keychain / Keystore via `expo-secure-store`.

**This needs an ADR amendment, not just a PR.** `CLAUDE.md §7/§12` says, correctly, that a token
outside in-memory storage is an instant rejection. On a device, hardware-backed secure storage
*is* the equivalent of the web's HttpOnly cookie, and the rule has to say so explicitly — or the
next session to read this repo will refuse the work, and be right to.

**The client half is easier than it first looked.** Refresh has been deliberately
**NON-ROTATING since 2026-08-08** — `refresh()` returns `refreshToken: presentedToken`, the same
token, because rotating on every refresh *was* logging students out mid-assessment at the
~15-minute access-token boundary *(verified: `auth.service.refresh`)*. So the mobile client holds
**one** token until its `REFRESH_TTL_DAYS` expiry, and the "lost rotation logs a student out
mid-exam" class of bug does not exist. Reuse detection still burns the family, but only for an
explicitly **revoked** token (logout / suspend / password reset). Client rules, in what is now
their true order of importance:

1. **Proactive refresh, like the web's 12-minute timer** — the access token is 15 minutes and an
   attempt is 20–90, so a reactive-401 at a boundary is the only logout trigger. Anchor it to
   foreground state, and **never refresh during a submit**. This is the one that still matters.
2. A tested answer to "what if the session dies mid-attempt?" The honest answer is good: answers
   are already on the server, so re-login → `start` → resume. That must be an automated test, not
   a hope.
3. **One refresh at a time, process-wide.** No longer a correctness requirement, but still worth
   it: an app resuming from background should not fire five refreshes at once.
4. **Persist before use.** Hygiene rather than a load-bearing rule now that the token does not
   change — keep it anyway, it costs nothing.

### 3.2 `codingCount` on the mock summary
One field on `GET /mocks` / `GET /mocks/:id` — `ApiMockSummary` exposes `totalQuestions` and
`isAdaptive` but nothing about coding *(verified)* — so the app can refuse a coding paper
**before** `start` (D2). Trivial, but it is the difference between a clear "use a laptop" message
and a burned attempt.

### 3.3 Mobile config + kill switch
A tiny public endpoint — `GET /system/mobile-config` returning `minSupportedVersion` and a few
feature flags. This is what lets you force-upgrade clients or disable a misbehaving surface
**during** a drive instead of waiting on a store review. The `platform-settings` module is the
natural home. Cheap now, invaluable later.

### 3.4 Push notifications (Phase 3)
There is **no push infrastructure today** — no FCM, no APNs, no device-token table *(verified)*.
Phase 3: a `device_tokens` table + register/unregister routes, a send path off the existing
notification dispatch, and the two obvious triggers ("your drive starts in 30 minutes",
"results published"). Deliberately after the core: push needs store-approved certificates and is
the easiest thing to get wrong in a way users notice.

### 3.5 Optional hardening (not v1, worth a ticket)
The app refuses proctored sittings outright, so it does not weaken drive integrity. But note that
proctor data has always been client-reported with a server-side backstop — if you want the server
to *enforce* that a proctored sitting can only be sat by a proctoring client (e.g. require a
heartbeat within N seconds of `start`, else void the attempt), that is a separate backend ticket
that would harden web too.

---

## 4. App architecture

### 4.1 Repo and contracts
**A new repo: `client-lms-zskillup-mobile`** — polyrepo, consistent with ADR-011. The contract
types under `src/shared/` are duplicated into it exactly as the web duplicates them today, plus
**a CI check that diffs the mirrored `shared/` against the web repo and fails on drift.** Without
that check, duplication is just rot with extra steps. (Publishing the contracts as a private
package is the cleaner long-term answer and needs its own ADR; not a v1 fight.)

Note while we are here: `CLAUDE.md` points at `project-brain/**` for the standards, ADRs and
`BUILD_STATUS.md`, and **none of it is in this repo or its history** — not tracked, not ignored.
Whoever holds those docs should confirm where they live before we add a mobile ADR to them.

### 4.2 Stack *(recommendation)*
Pin exact versions at scaffold time and pull current docs rather than trusting any version
written here:

| Concern | Choice | Note |
|---|---|---|
| Runtime | **Expo** (current stable SDK) + **EAS Build** | With no camera/ML native modules, a managed workflow is now viable — a dev client is still the safer default. |
| Navigation | **expo-router** | File-based; closest mental model to App Router, so route-group → role-shell thinking carries over. |
| Server state | **@tanstack/react-query** | The web hand-rolls hooks; on a phone you want caching, retry and offline semantics for free. |
| Auth state | **zustand** + **expo-secure-store** | Same as web for the access token; secure storage for the refresh token. |
| Styling | **NativeWind v4** *(fallback: a plain `theme.ts` token module)* | Only reason: the §4 design tokens survive the port. If it is not solid on the pinned SDK, use the token module — do **not** fight the tooling. |
| OTA | **EAS Update** | A runner bug can be fixed mid-drive without a store review. Must not change app purpose — that is a guideline violation. |
| Crash/errors | **Sentry** | With the attempt id on every exam-path breadcrumb. |
| E2E | **Maestro** | One flow matters most: start → answer → background → resume → submit. |

### 4.3 The API client is a port, not a rewrite
`src/lib/api/client.ts` is 500 lines of hard-won behaviour — the three auth postures
(`default` / `login` / `public`), the three-way refresh verdict where a *network* failure must
never tear down a session, single-flight refresh, the "never retry or redirect on 403" rule —
each traceable to a production incident. **Port that file deliberately, keeping the comments**,
and change only what the platform forces:

- base URL from one constant (D3) instead of origin sniffing;
- refresh reads the token from secure storage and writes the rotation back (§3.1);
- `endSessionAndRedirect` becomes a navigation reset to the login stack, not `window.location`;
- no `document.visibilityState` — use `AppState`;
- drop the super-admin "view as student" preview path from v1.

Then the per-domain modules (`mocks.ts`, `scheduling.ts`, `me.ts`, `tpo.ts`) copy over nearly
verbatim, because they are thin typed wrappers over paths. That is the cheapest large win here.

### 4.4 The design law needs a native translation *first*
`CLAUDE.md §4` is the thing that stops this product looking generic, and it is written in
Tailwind: `shadow-sm`, `hover:`, `rounded-xl`, `backdrop-blur` bans, a sidebar. Half of it has no
meaning on a phone. **Before any screen is built**, write `MOBILE_DESIGN_LAW.md` + a tokens
module that states, concretely:

- the type scale in RN units, including the uppercase `tracking-widest` label that is the brand's
  signature;
- the four card patterns as RN styles — border-first, `borderRadius: 12`, elevation used sparingly
  and only where iOS and Android can both honour it;
- **what replaces hover**: pressed states, since §4.13's "colour change only, no scale" rule
  still applies and matters more on touch;
- navigation: bottom tabs per role instead of a sidebar; the TopBar's streak/coins/bell as a
  compact header;
- safe areas, a 44pt minimum touch target, Dynamic Type behaviour, and the
  `prefers-reduced-motion` equivalent;
- the §4.1 rejection list rewritten for mobile — the mobile equivalent of "generic admin
  dashboard" is the default RN look: stock `Button`, platform-blue links, flat lists with no
  surface.

Budget this as real work — about a week — and review it like a design deliverable. A beautiful
web product with a stock-RN app reads as a worse product overall.

---

## 5. Phases

> **The operative schedule is §11.1** (compressed, AI-assisted: Sprints A–D, submit ~11 Nov).
> The four phases below are the same work at conventional pace — keep them as the effort
> breakdown and the fallback if that cadence is not sustained. Phase 0 ≡ Sprint A, Phase 1 ≡ B,
> Phase 2 ≡ C, Phase 3 ≡ D; the contents and exit criteria are unchanged either way.

Two engineers. One can carry it at roughly 1.7× the elapsed time. Calendar assumes a start of
**Tue 2026-10-13** and is working weeks, no holiday buffer (see §11 for why that matters).

### Phase 0 — Foundations · 2 weeks · Oct 13 → Oct 23 · no feature screens
ADR-006 mobile amendment · **backend §3.1 native-session PR merged and deployed** · §3.2
`codingCount` · §3.3 mobile-config endpoint · `api.prephasz.com` live · repo scaffolded with EAS
building on both platforms · `MOBILE_DESIGN_LAW.md` + tokens · API client ported · login →
role-aware home for all four roles · Sentry · **Apple + Google accounts enrolled (start day 1)**.
**Exit:** a signed build on a real iPhone and a real low-end Android, logging in as each of the
four roles, landing on a correct (empty) role home, with a session that survives force-quit.

### Phase 1 — Student: Mock Assessment · 2.5 weeks · Oct 26 → Nov 13
The whole chain in §6: list, detail, details gate, pre-start screen, runner, server-anchored
timer, durable answer queue, submit, report, history, plus the read-only states for proctored and
coding papers.
**Exit:** a real student account sits a full mock end-to-end on a real device on campus-grade
wifi, with the app force-quit mid-attempt and resumed, and the report matching the web's for the
same attempt.

### Phase 2 — The other three roles · 2.5 weeks · Nov 16 → Dec 2
TPO drive-day view (endpoints behind `src/lib/api/tpo.ts`, `admin-college-analytics.ts`) ·
admin/super-admin live drive monitor (`scheduling.ts`, incl. `releaseAssessmentResults` for
publish) · "Open on web" affordance everywhere else.
**Exit:** a TPO and an admin each get through a simulated drive day using only the phone.

### Phase 3 — Hardening, store, launch · 2.5 weeks · Dec 3 → Dec 18
Push (§3.4) · min-version gate wired to the kill switch · k6 scenario updated for the mobile
client profile (lighter than feared now that heartbeats are gone, but drives still get pre-scaled)
· accessibility pass (WCAG 2.1 AA is a launch gate on web; it does not stop being one here) ·
low-end Android device matrix · **store submission** with a reviewer demo account · **pilot: one
real college drive with the app in students' hands for practice alongside the web sitting**.
**Exit:** submitted to both stores; one drive week survived with no sev-1.

**Dev complete / submitted: ~Fri 18 Dec 2026.**

---

## 6. The student module, in detail

### 6.1 Screens
1. **Mock Assessment home** — build-your-own (sections/topics, size, duration via
   `createCustomMock`) + the catalog, with the allowance/entitlement state honestly shown (D1: no
   buy button).
2. **Assessments list** — upcoming / live / past sittings from `getMySchedule()`, **read-only**:
   window, duration, and for anything the app cannot run, *"Proctored — sit on a laptop"* or
   *"Has a coding section"*. The ever-present trap: a row's end time comes from the sitting's real
   `ends_at`, never `start + duration` — that exact bug once made a live drive's assessment vanish
   from students' lists.
3. **Details gate** — the one-time name / college / department / email / phone collection. The
   rules are a shared contract *(verified: `src/shared/assessment-details.ts`, mirrored server-side
   at `src/shared/profile-details.ts`)*; mirror the file, do not re-type the regexes, and keep the
   "a correct value is never cleared" behaviour.
4. **Pre-start screen** — what it is, how long, how many questions, one primary action. Much
   lighter than the web's instructions + `SystemCheck` now that there is no camera: reachability
   and a battery warning, not device capability checks.
5. **The runner** — the big one. The web's `MockRunner.tsx` is **1,879 lines**; do not
   transliterate it. Rebuild from its behaviour list: section tabs, question palette with
   answered/flagged state, per-question answer POST, countdown, submit confirmation, auto-submit
   at zero.
6. **Report** — score, percentile, topic breakdown, per-question review with explanations. All
   server-computed; the app renders and never calculates.
7. **History** — `getMockHistory('custom' | 'assessment')`.

### 6.2 The runner's five hard requirements
1. **The timer is the server's.** Drive the countdown from `expiresAt`, re-anchored on every
   foreground and every successful request. Never from an accumulating local tick — a phone that
   sleeps will lie to you.
2. **Answers are durable.** Write each answer locally *and* POST it; on failure, retry with
   backoff from a queue that survives a cold start. `savedAnswers` from `start` is the reconcile
   source of truth on resume.
3. **Resume is a first-class path, not an error path.** Force-quit, phone call, OS update prompt,
   battery death → relaunch → `start` → same attempt. Test it as a scenario.
4. **Submit is loud and retried.** A submit failing on a dying network must retry, and the student
   must never be left guessing whether the paper went in. The post-submit state is re-derivable
   from `getMockReport`.
5. **Nothing blocks the paper.** The established rule from the web's proctoring work — the exam
   outranks everything else — still holds, now applied to the network layer and the answer queue.

### 6.3 Error-code-driven navigation
The server already decides every gate. The app maps code → destination and invents nothing:

| Code | Where the app goes |
|---|---|
| `SITTING_REQUIRED` | Back to the list (the app should not be starting drive mocks at all) |
| `PROFILE_DETAILS_REQUIRED` | Details gate, pre-filled from `details.missing` |
| `PAYWALL` | Locked state, honest copy, **no purchase CTA** (D1) |
| `403` | Forbidden/empty state. Never a login bounce — that rule is load-bearing on web and it stays |
| `401` (twice) | Session teardown → login stack |

---

## 7. Why there is no proctoring section any more

Out of scope by decision (D2), and the app is better for it: no camera permission, no on-device
ML, no snapshot uploads, no device-tier frame budget, no proctoring-app review scrutiny, and none
of the "frozen exam on a low-end Android" risk that is the worst bug class in this product.

The app does not weaken drive integrity, because it **refuses proctored sittings entirely** rather
than running them loosely. If you later want the server to enforce that, see §3.5.

Positioning to be precise about with clients: the app is for **practice and visibility**.
High-stakes proctored sittings remain web + invigilator. Nobody should be told the app is an
equivalent surface for an evaluated drive.

---

## 8. The parallel track that actually gates launch

Start these on day one. None of it is code and all of it has lead time.

- **Apple Developer Program** — organisation enrolment needs a D-U-N-S number and can take weeks.
- **Google Play Console** — **and establish which account type you have.** An *organisation*
  account can go straight to production review. A *personal* account created after Nov 2023 must
  run a closed test with ~12 testers for ~14 days before it can even apply for production. That
  single fact is worth ~2–3 weeks of calendar (§11). Verify both policies as they stand now; they
  change.
- **Privacy policy + Play Data Safety + App Privacy answers** — much simpler with no camera, but
  still covers the student data the platform already handles.
- **Reviewer package:** a demo student with a sittable mock, a demo admin, and a short note on
  what the app is. Reviewers reject what they cannot run.
- **Age rating**, and if any users are minors, the stricter data rules that follow.
- **App identity:** name, icon, screenshots, store copy matching the web brand.
- **Support + rollback story:** an EAS Update channel per release, the §3.3 kill switch, and a
  decision about who may trigger either during a drive.

---

## 9. Explicitly out of v1

So nobody has to guess: **proctored assessments** · **coding questions** · any purchase flow ·
practice and adaptive quizzes · company hubs and Vimeo video · jobs and applications · resume
builder · community · live sessions · certificates · gamification beyond what the report returns
· leaderboards · every admin and super-admin surface except the live drive monitor · the
super-admin "view as student" preview · offline content download · tablet layouts.

Each gets an "Open on web" path. "Build further" starts with **practice / adaptive**, because it
is the same engine shape as the mock runner and therefore the cheapest second module.

---

## 10. Top risks, with the mitigation

| Risk | Why it bites | Mitigation |
|---|---|---|
| **~~Refresh-family burn~~** — **STRUCK 2026-10-13** | Ranked #1 until the code was read: refresh is non-rotating, so there is no rotation to lose (§3.1). Left here as a record of a corrected assumption. | n/a — proactive refresh + the resume test still carry their own weight |
| **Play account type** | A personal account's closed-testing requirement can add 2–3 weeks of calendar | Confirm in week 1; if personal, run the closed test *during* Phases 2–3 so it burns in parallel |
| **Holiday store review** | An ~18 Dec submission lands in the slowest review window of the year | Either tighten to submit by ~11 Dec or plan for mid-January go-live (§11) |
| **Design drift to stock RN** | The product's edge is that it does not look generated | §4.4 design law doc **before** screens; design review as a gate |
| **Scope creep to parity** | 139 pages is an infinite backlog | D4: one module per role; §9 published as a non-goal list |
| **BE native-session PR slips** | It is on the critical path for every authenticated screen | It is the first ticket in Phase 0, not a later one |

---

## 11. ETA and timeline

Two timelines below. **11.1 is the plan** — AI-assisted at 10–14 h/day with the owner in the
review loop. 11.4 keeps the conventional-pace numbers as the fallback if that cadence is not
sustained.

### 11.0 What compresses, and what does not

This is the whole answer. Writing code compresses enormously; **nothing that waits on another
party compresses at all.**

**Compresses hard (roughly 2.5–3×):** porting `client.ts` and the per-domain API modules
(mechanical ports of known behaviour) · rebuilding the runner from a behaviour list · every
read-mostly screen over an endpoint that already exists (all of Sprint C) · the three small
backend PRs, against a codebase with established patterns and tests · scaffolding, tokens,
boilerplate · and — because the owner is in the loop all day — decision and review latency, which
is normally the biggest hidden cost in a plan like this.

**Does not compress at all:**
- **Store review.** 24 h to ~7 days per submission, plus any resubmit round. Wall clock.
- **Developer-account enrolment.** Apple organisation enrolment + D-U-N-S verification is days to
  weeks of somebody else's process.
- **The Play closed-testing requirement**, if the account is personal: ~12 testers × ~14 days is a
  literal calendar rule. It can only be *overlapped*, never shortened.
- **Real-device QA on real networks.** "Does the timer survive a phone call on a Redmi on campus
  wifi" needs a device, a network and elapsed time. Fix cycles get faster; the testing does not.
- **Backend deploy + verify.** ECS rollout is ~9–12 minutes, and the standing owner rule is that
  every deploy is verified (rollout → role probes → browser sweep → CloudWatch check). Three
  backend PRs means three verify cycles, and that rule stays.
- **The drive pilot.** A real college drive happens when it happens.

**So the critical path moves.** At conventional pace, engineering was the constraint and the
store accounts had slack. At this pace, **the store accounts are the constraint** — if Apple
enrolment starts in week three because everyone was busy building, the accounts become the launch
date and all the saved engineering time is given straight back.

### 11.1 The compressed plan

Working days only (Mon–Fri) from **Tue 13 Oct 2026**. A 7-day cadence pulls this in by roughly a
further week, but spending the entire buffer is not advisable — device QA and review feedback are
exactly where slack is needed.

| Sprint | Dates | Working days | Contents |
|---|---|---|---|
| **A — Foundations** | Tue 13 → Mon 19 Oct | 5 | ADR-006 amendment · the three backend PRs (§3.1, §3.2, §3.3) merged, deployed **and verified** · `api.prephasz.com` · repo + EAS building on both platforms · `MOBILE_DESIGN_LAW.md` + tokens · `client.ts` ported · login → role-aware home for all four roles · Sentry |
| **B — Student mock module** | Tue 20 → Wed 28 Oct | 7 | The whole §6 chain: list, detail, details gate, pre-start, runner, server-anchored timer, durable answer queue, submit, report, history, read-only states for proctored/coding papers. Includes the force-quit/resume and flaky-network testing, which is the slow part. |
| **C — The other three roles** | Thu 29 Oct → Wed 4 Nov | 5 | TPO drive-day view · admin/super-admin live drive monitor · "Open on web" everywhere else. The fastest sprint — read-mostly screens over endpoints that already exist. |
| **D — Hardening + submit** | Thu 5 → Wed 11 Nov | 5 | Push (§3.4) · min-version gate · k6 mobile profile · accessibility pass · low-end Android device matrix · store assets, reviewer demo account, **submission** |

| Milestone | Date |
|---|---|
| Foundations done, four roles logging in on device | **Mon 19 Oct 2026** |
| Student mock module working end-to-end on real hardware | **Wed 28 Oct 2026** |
| All four role modules complete | **Wed 4 Nov 2026** |
| **Submitted to both stores** | **~Wed 11 Nov 2026** |
| **Live on both stores** | **late Nov 2026** — *if and only if the accounts are ready* |

That is **~21 working days of build**, and it lands the submission five weeks earlier than the
conventional plan — which also means it **clears the holiday review window entirely**, on its own
worth more than the five weeks.

### 11.2 Three things that must happen on day one

Non-code, and they are now the critical path:

1. **Start the Apple and Google enrolments today.** Not week two. Apple organisation enrolment
   with D-U-N-S verification can take 2–4 weeks; the build will be done in ~4. These two timelines
   now finish together, which means either can be the launch date — and only one of them is under
   our control.
2. **Confirm the Play account type today.** Organisation → straight to production review.
   Personal → the ~14-day closed test must start the moment there is an installable build (end of
   Sprint B, ~28 Oct) so it burns during Sprints C and D instead of after them. Getting this wrong
   costs more than the entire compression saves.
3. **Get the test devices now** — one iPhone, one cheap 2–3 GB Android. Device QA cannot start
   without hardware and does not compress once it does.

### 11.3 What must not compress

Under speed pressure these are the first things to get skipped, and each one is load-bearing:

- **The design law doc (§4.4), before any screen.** It is one day of work and it is the only thing
  standing between this and a stock-React-Native look. The web product's edge is that it does not
  look generated; an app that does would undo it. Review it like a design deliverable.
- **The §3.1 session rules and the resume test.** Compressing how fast the auth client gets
  *written* is fine. Skipping persist-before-use, single-flight refresh, or the automated
  force-quit-and-resume test is how a student gets logged out mid-attempt. That test is the single
  most valuable test in the project.
- **Deploy verification on the three backend PRs.** The standing rule exists because a green
  pipeline is not a serving task.
- **The accessibility pass.** WCAG 2.1 AA is a launch gate on web; it does not stop being one here.
- **Real-device testing on a cheap Android.** Simulators will not find the bugs our students hit.

### 11.4 Conventional-pace fallback, and other shapes

| Shape | Submitted | Live |
|---|---|---|
| **Compressed, 4 roles** (the plan) | ~11 Nov 2026 | late Nov 2026 |
| **Compressed, student-only** (drop Sprint C) | ~4 Nov 2026 | mid–late Nov 2026 |
| Conventional pace, 2 engineers, 4 roles | ~18 Dec 2026 | early–mid Jan 2027 |
| Conventional pace, 1 engineer | ~early Feb 2027 | late Feb–Mar 2027 |

In every row the live date is gated on the store accounts, not the code.

### 11.5 "The whole app" — beyond v1

At the compressed cadence, a **feature-complete student app** — practice and adaptive, company
hubs with video, jobs and applications, resume builder, community, live sessions, certificates,
full gamification and leaderboards — is roughly **3–4 further weeks** of build after v1, so
realistically **through December 2026 into January 2027**, allowing for a store review per
release. Payments is separate and only after the IAP decision (D1) is revisited properly: budget
about a week of build plus backend receipt validation, and more review risk than everything else
combined.

Full **139-page parity**, including the admin and super-admin consoles, is **~6–8 further weeks**
even at this pace, and I would still argue against it as a goal: those surfaces are dense tables,
CSV exports and charts built for a large screen, and a phone version would be worse at the job
than the web one that already exists. Keep the staff apps deliberately thin — the drive-day
module, plus whatever a real drive season proves is missing.

## 12. First week, concretely

1. Open the ADR-006 mobile amendment and the backend §3.1 PR — the critical path.
2. Infra ticket for `api.prephasz.com`.
3. Start the Apple and Google enrolments, **and confirm the Play account type** (§11.2).
4. Scaffold the repo; get a build onto one iPhone and one cheap Android.
5. Write `MOBILE_DESIGN_LAW.md` and the tokens module.
6. Port `client.ts` with its comments intact; prove login + resume-after-force-quit for all four
   roles.

Steps 4–6 are not blocked by 1–3, so they run in parallel — but **no screen gets built before
step 5 lands.**
