# ZSkillup Mobile — Build Log

> **Purpose: pick this up cold.** The plan is in `MOBILE_APP_PLAN.md`; this file is what has
> actually been built, where it lives, what was learned from the code that the plan got wrong,
> and the exact next action. Append to it at every checkpoint — newest status at the top of each
> section, not a diary.
>
> Last updated: **2026-10-13**, end of Sprint A day 1.

---

## 1. Where everything is

| Thing | Location |
|---|---|
| Plan (the "law" for this project) | `client-lms-zskillup/MOBILE_APP_PLAN.md` |
| This log | `client-lms-zskillup/MOBILE_BUILD_LOG.md` |
| Backend | `client-lms-zskillup-backend` → `AI-Linc-LMS/client-lms-zskillup-backend` |
| Web frontend (the port source) | `client-lms-zskillup` → `AI-Linc-LMS/client-lms-zskillup` |
| Mobile app repo | **not created yet** — will be `AI-Linc-LMS/client-lms-zskillup-mobile` |

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
| 1 | Backend: native-client session | ✅ **PR [#236](https://github.com/AI-Linc-LMS/client-lms-zskillup-backend/pull/236)** — open, not merged |
| 2 | Backend: `codingCount` + mobile remote config | ✅ **PR [#237](https://github.com/AI-Linc-LMS/client-lms-zskillup-backend/pull/237)** — open, not merged |
| 3 | ADR-006 mobile amendment | ⛔ **blocked** — no `project-brain/` in the repo (§3.3) |
| 4 | `api.prephasz.com` → ALB | ⬜ not started (AWS) |
| 5 | Mobile repo scaffold + EAS build on both platforms | ⬜ not started |
| 6 | `MOBILE_DESIGN_LAW.md` + tokens module | ⬜ not started — **gates every screen** |
| 7 | `client.ts` ported | ⬜ not started |
| 8 | Login → role-aware home, all four roles | ⬜ not started |
| 9 | Sentry | ⬜ not started |
| 10 | Apple + Google developer enrolment | ⬜ **owner action — day-one critical path** |
| 11 | Confirm Play account type (org vs personal) | ⬜ **owner action — worth ~2–3 weeks** |
| 12 | Test devices: one iPhone, one 2–3 GB Android | ⬜ **owner action** |

---

## 5. What shipped, in detail

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
