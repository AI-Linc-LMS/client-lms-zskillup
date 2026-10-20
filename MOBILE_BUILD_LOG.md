# ZSkillup Mobile — Build Log

> **Purpose: pick this up cold.** The plan is in `MOBILE_APP_PLAN.md`; this file is what has
> actually been built, where it lives, what was learned from the code that the plan got wrong,
> and the exact next action. Append to it at every checkpoint — newest status at the top of each
> section, not a diary.
>
> Last updated: **2026-10-14**, end of Sprint A day 2.

---

## 1. Where everything is

| Thing | Location |
|---|---|
| Plan (the "law" for this project) | `client-lms-zskillup/MOBILE_APP_PLAN.md` |
| This log | `client-lms-zskillup/MOBILE_BUILD_LOG.md` |
| Backend | `client-lms-zskillup-backend` → `AI-Linc-LMS/client-lms-zskillup-backend` |
| Web frontend (the port source) | `client-lms-zskillup` → `AI-Linc-LMS/client-lms-zskillup` |
| Mobile app repo | `client-lms-zskillup-mobile` → `AI-Linc-LMS/client-lms-zskillup-mobile` ✅ |

GitHub CLI is authenticated as `utkarshsingx` with `repo` + `workflow` scope, org `AI-Linc-LMS`.

---

## 2. Settled decisions (owner, 2026-10-13)

| # | Decision | Consequence |
|---|---|---|
| **D1** | **No purchase surface in the app.** Entitlement-aware, no buy button, no price, no link out on iOS. | Sidesteps App Store §3.1.1 / Play billing for launch. Students upgrade on the web. |
| **D2** | **No proctored assessments and no coding questions in the app.** | No camera, no on-device ML, no Monaco. Proctored sittings and coding papers appear **read-only** ("sit this on a laptop"). |
| **D3** | **`api.prephasz.com` → the same ALB** for the app *(assumed, not yet built)*. | App traffic does not go through the Netlify proxy. Fallback: `prephasz.com/api/v1`. |
| **D4** | **All four roles, one module each.** | Student = Mock Assessment vertical. TPO = drive-day roster. Admin/Super-admin = live drive monitor. |

---

## 3. What the code said that the plan got wrong

Both found by reading the backend on 2026-10-13. **Both reduce risk** — worth knowing before
re-planning anything.

### 3.1 Refresh is NON-ROTATING (so the "family burn" risk does not exist)
`auth.service.refresh()` returns `refreshToken: presentedToken` — the *same* token — and has done
since **2026-08-08**. The comment is explicit about why: rotating on every refresh plus reuse
detection *was* logging students out mid-assessment at the ~15-minute access-token boundary.

Consequences:
- The mobile client holds **one** refresh token until its `REFRESH_TTL_DAYS` expiry.
- "Persist the rotated token before using it" is good hygiene but no longer load-bearing.
- Single-flight refresh is still worth doing (thundering herd), but is no longer a *correctness*
  requirement.
- Reuse detection still fires on an explicitly **revoked** token (logout / suspend / password
  reset) and still burns the family. That behaviour is unchanged.

The plan's risk table ranked "refresh-family burn" #1. **It should be struck.**

### 3.2 The mock engine already runs unproctored (so D2 costs us nothing)
`?mock=<id>` renders `<MockRunner mockId={mock} />` with no proctoring; proctoring is opt-in via
`ProctoredAssessmentHost` or a sitting's `proctored` flag. `submit` takes `proctoring` as
optional, and the report's `proctoring` is nullable.

So the app runs the same server-timed, server-graded engine with **zero backend change**. D2 is a
pure subtraction.

### 3.3 Smaller notes
- `refresh_tokens` already has a nullable `device_fingerprint` column — available for stamping
  native sessions later, no migration needed.
- `REFRESH_TTL_DAYS` defaults to **7** (validator allows up to 90). On mobile that means a
  student who doesn't open the app for a week logs in again. It is a **global env var**, so
  raising it affects the web too. **Open product/config call — not changed.**
- `CLAUDE.md` references `project-brain/**` for standards and ADRs. **That directory is not in
  the repo and never has been** (not tracked, not ignored). The ADR-006 mobile amendment has
  nowhere canonical to go until someone says where those docs live. **Open question.**
- Pre-existing, unrelated: `tsc --noEmit` on the backend fails in
  `gamification/services/daily-quest.service.integration-spec.ts` (`QueueService` vs `XpService`),
  last touched by `c5b0a1d`. Not caused by this work; don't be alarmed by it.

---

## 4. Sprint A status

Sprint A = foundations, **Tue 13 Oct → Mon 19 Oct**. No feature screens.

| # | Item | Status |
|---|---|---|
| 1 | Backend: native-client session | ✅ **merged** (#236) — ⛔ **NOT DEPLOYED**, see §4.1 |
| 2 | Backend: `codingCount` + mobile remote config | ✅ **merged** (#237) — ⛔ **NOT DEPLOYED**, see §4.1 |
| 3 | ADR-006 mobile amendment | ⛔ **blocked** — no `project-brain/` in the repo (§3.3) |
| 4 | `api.prephasz.com` → ALB | ⬜ not started — **and I cannot do it**, see §4.2 |
| 5 | Mobile repo scaffold + bundle | ✅ Expo SDK 57 / RN 0.86 / expo-router 57; `expo export` produces a 2.5 MB iOS bundle |
| 6 | `MOBILE_DESIGN_LAW.md` + tokens | ✅ `src/theme/tokens.ts` + the doc + six primitives |
| 7 | `client.ts` ported | ✅ three postures, three-way refresh verdict, single-flight, submit lock |
| 8 | Login → role-aware home, all four roles | ✅ code complete — **unverified on a device** (§4.3) |
| 9 | Sentry | ⬜ not started |
| 10 | Apple + Google developer enrolment | ⬜ **owner — day-one critical path** |
| 11 | Confirm Play account type | ⬜ **owner — worth ~2–3 weeks** |
| 12 | Test devices: one iPhone, one 2–3 GB Android | ⬜ **owner** |

### 4.1 ⛔ BLOCKER — the backend CI deploy will not start
Both PRs merged cleanly (checks green: typecheck, unit tests, real-Postgres API smoke). Both
`push`-to-main deploy runs then failed with **`startup_failure`** — the workflow never
initialised, so **nothing deployed**. Evidence:

- Runs `38514661868` (6f40e2c) and `38514752751` (d40f93c), both `conclusion: startup_failure`,
  `path: "BuildFailed"`, empty workflow name, **zero jobs**.
- `.github/workflows/deploy.yml` is **byte-identical** to the version that deployed successfully
  on 2026-10-06 (`git diff dbf664a 6f40e2c -- .github/workflows/deploy.yml` is empty).
- Repo Actions are enabled, all actions allowed, no `environment:` on the deploy job.
- The same workflow file passed on the `pull_request` event for both PRs **the day before**.
- `gh run rerun` refuses: *"This workflow run cannot be retried."*

PR-event runs pass and push-event runs fail to start, with an unchanged file. That points at an
**account-level Actions problem** — a spending limit, a quota, or an org policy change — which
needs org-admin visibility. `gh api orgs/AI-Linc-LMS/actions/permissions` returns 403 for this
token, so it cannot be confirmed from here.

**Impact is contained:** production still serves the previous image, and nothing is broken. The
two commits sit on main undeployed. Mobile work continues against the current API for everything
except the native session and mobile-config, which cannot be exercised against production until
this clears.

### 4.2 ⛔ A manual deploy is not available to me
`aws sts get-caller-identity` resolves to account **584435903341**, but the deploy targets ECR
registry **511974511619** and the `zskillup` ECS cluster is not found in the account I can reach.
Different AWS account. The same constraint blocks the `api.prephasz.com` DNS work (item 4).

### 4.3 Not yet verified on a device
The login → role-home flow typechecks and bundles, but has not been run against a real backend on
real hardware. That is the Sprint A exit criterion and it is **not met**. It needs either the
deploy above, or a dev build pointed at a local backend.

---

## 5. What shipped, in detail

### The mobile app (new repo, commit `25d3b25`)
```
src/theme/tokens.ts        the design law in code — colour, type, radius, spacing,
                           elevation, 44pt touch minimum, status map
MOBILE_DESIGN_LAW.md       why; what carries over from web and what changes
src/components/ui/         Text, Card, Button, StatusPill, ProgressBar, Screen
src/lib/api/client.ts      the port: 3 postures, 3-way refresh verdict,
                           single-flight, 403 never retried, submit lock
src/lib/api/auth.ts        login/google/verify/register/logout/me
src/lib/session.ts         refresh token in Keychain / Keystore
src/store/auth.ts          access token in MEMORY ONLY
src/app/                   _layout (providers + session-ended handler),
                           index (cold-start restore), login, 3 role homes
```
**Deliberate deviation:** NativeWind was the plan's first choice and is **not** used. On a
just-released SDK, coupling the design system to a styling library's compatibility window buys
nothing the tokens module does not already give. The plan allowed for exactly this fallback.

**Verified:** `npm run typecheck` clean; `npx expo export --platform ios` produces a 2.5 MB
Hermes bundle. **Not verified:** anything on a device.


### PR #236 — `feat(auth): let the mobile app hold its own session`
Branch `feat/native-session`. Files: `auth/native-client.ts` *(new)*,
`auth/auth.native-session.spec.ts` *(new)*, `auth/auth.controller.ts`, `auth/dto/swagger.dto.ts`.

A native client sends `X-Client: zskillup-mobile[/version]` and additionally receives
`refreshToken` + `refreshExpiresAt` **in the response body** from `login` / `verify-email` /
`google` / `refresh`; `refresh` and `logout` accept the token from the body. It goes in the
Keychain / Keystore.

**The guard is the interesting part.** `X-Client` alone is spoofable by script on our own origin,
and a refresh token is worth far more than a 15-minute access token — an XSS able to set that
header would escalate from a 15-minute window to a `REFRESH_TTL_DAYS` one. So native means: the
header is present **and** the request carries neither `Origin` nor `Referer`. Every browser fetch
sends at least one; a native fetch sends neither. It fails **closed**.

**The web path is deliberately untouched:** cookie read first on refresh/logout, body only as a
native fallback, and the token is read straight off `req.body` rather than through an `@Body()`
DTO — `POST /auth/refresh` has never had a body and a 401 there logs every session out at once
(hence its 1500/min throttle), so it does not acquire a validation pipe it never had.

17 tests. The release-blocking ones are **negative**: a browser gets no refresh token in any
response body, including when it spoofs the header.

### PR #237 — `feat(mobile): a remote config for the app, and a coding count on every mock`
Branch `feat/mobile-config`. Files: `modules/mobile/*` *(new module)*,
`shared/dto/mobile.dto.ts` *(new)*, `app.module.ts`, `mocks/{dto/mock.dto,mocks.repository,mocks.service,mocks.service.spec}.ts`.

```
GET   /api/v1/system/mobile-config    public
PATCH /api/v1/admin/mobile-config     ADMIN + SUPER_ADMIN
→ { minSupportedVersion, latestVersion, outage:{active,message}, features:{...} }
```

Public because the app reads it on cold start before it has a session — a force-upgrade or outage
screen has to work for someone who cannot log in. Defaults live **in code**, not a seeded row.
15s TTL cache. On a settings-store error it holds the **last-known-good** value: a DB blip must
not invent an outage (bricking every install) nor lift one an admin set.

`codingCount` is now on `MockSummaryDto` — the list path counts every row in one grouped query
(`countCodingForMocks`), the single-get path reuses the per-mock count. The app refuses a coding
paper on this field *before* `start`, because starting and backing out leaves a live attempt and,
on a drive, spends the student's one sitting.

12 tests. Full suite 108 suites / **1685 tests pass** (was 107/1673). `di-graph.spec.ts` passes —
which is the gate that catches an unreachable new module, since unit tests never build the graph.

---

## 6. How to verify what is here

```bash
cd /Users/utkarshsingh/Developer/client-lms-zskillup-backend

npx jest src/modules/auth/auth.native-session.spec.ts   # 17 — PR #236
npx jest src/modules/mobile                             #  9 — PR #237
npx jest src/modules/mocks/mocks.service.spec.ts        # 44 — incl. 3 codingCount
npx jest di-graph                                       # module reachability gate
npx jest                                                # 108 suites / 1685 tests
npx tsc --noEmit                                        # 1 PRE-EXISTING failure, see §3.3
```

---

## 7. Next action

**Owner first — two of these are blocking and neither is code:**
1. **Get GitHub Actions deploying again** (§4.1). Check the org's Actions billing / spending limit
   and policy. Until this clears, no backend change reaches production.
2. **AWS access to account 511974511619**, or someone who has it, for `api.prephasz.com` (§4.2).
3. Apple + Google enrolment, Play account type, test devices — still the launch critical path.

**Then, unblocked:**

**Merge order does not matter** — #236 and #237 are independent and touch disjoint files.

1. **Merge #236 and #237, deploy, verify.** Deploy is standing-authorized. Verification is not
   optional: ECS rollout is ~9–12 min and a green pipeline is not a serving task. Then probe
   `GET /api/v1/system/mobile-config` (expect the in-code defaults) and confirm a web login still
   returns **no** `refreshToken` in its body.
2. **Write `MOBILE_DESIGN_LAW.md` + the tokens module.** This gates every screen and is the thing
   most likely to get skipped under speed pressure. One day, reviewed like a design deliverable.
3. **Scaffold `AI-Linc-LMS/client-lms-zskillup-mobile`**, Expo + expo-router, EAS dev client
   building on both platforms.
4. **Port `client.ts`** — keep its comments; they are incident history.
5. **Login → role-aware home for all four roles**, with a session that survives force-quit.

Owner, in parallel and on the critical path: items 10–12 in §4.

### Open questions for the owner
1. Where do the `project-brain/**` standards and ADRs actually live? (Blocks the ADR-006 amendment.)
2. `REFRESH_TTL_DAYS` is 7 days, globally. Leave it, or raise it for a better mobile experience,
   accepting that it changes the web's posture too?
3. Play Console account type — organisation or personal? (Worth ~2–3 weeks of calendar.)
