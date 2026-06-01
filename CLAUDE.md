# CLAUDE.md — ZSkillup Frontend Operating Manual

> **This file is law.** Every Claude Code session touching this repo must read it before writing
> code. If a request conflicts with anything here, stop and name the conflict — do not silently
> violate it. This file operationalises FRONTEND_STANDARDS.md, SECURITY_STANDARDS.md,
> ENGINEERING_PRINCIPLES.md, and ADRs 002, 003, 006, 007, 011. The backend is the only source of
> truth for business values. The frontend renders; it never owns.
>
> **Current build state:** Day 1 + Day 2 complete and verified end-to-end against a live backend
> (`admin@zskillup.dev / Admin@1234` logs in successfully). Full status in
> `project-brain/Roadmap/BUILD_STATUS.md`. Next phase = Sprint 3.

---

## 0. Read before touching any file

Load these before generating or editing any code. Do not rely on session memory — context resets.

| Document | Read when |
|---|---|
| `project-brain/Architecture/SYSTEM_OVERVIEW.md` | Any feature that crosses layers |
| `project-brain/Architecture/TECH_STACK.md` | Before adding any dependency |
| `project-brain/Architecture/DATA_FLOW.md` | Any API call, event, or job |
| `project-brain/Standards/FRONTEND_STANDARDS.md` | Any component or page |
| `project-brain/Standards/SECURITY_STANDARDS.md` | Auth, tokens, tenant data, exports |
| `project-brain/Product/STUDENT_JOURNEY_SPEC.md` | Auth flows, routing, nav, purchase states |
| `project-brain/Product/COMPANY_HUB_SPEC.md` | Company hub screens |
| `project-brain/Roadmap/BUILD_STATUS.md` | Start of every session — current progress |
| Relevant ADR | Before touching its governed domain |

---

## 1. The stack is fixed — do not change it

- **Next.js 16.x (App Router)**, **React 19**, **TypeScript `strict`**, **Node 22 LTS**
- **Tailwind CSS v4 + shadcn/ui** for all styling. **No exceptions.**
- **Inter** as the sans-serif (loaded via `next/font/google` in `app/layout.tsx`). No other display fonts.
- **Recharts** for charts. **react-hook-form + Zod** for forms. **Zustand** for auth token + toast queue only.
- Types generated from the backend OpenAPI spec via `openapi-typescript` — never hand-written.
- **Polyrepo** (ADR-011): frontend at `repo's/frontend-repo`, shared contracts at `src/shared/`.

---

## 2. Server Components are the default

- Every component is a React Server Component unless it has a concrete reason to be a client component.
- Valid `"use client"` reasons: tabs, dropdowns, modals, browser-only APIs, forms with live validation, charts with hover, the mock timer, toast queue.
- Push `"use client"` to the **leaf** that needs it, not the page or layout.

---

## 3. Folder structure — follow exactly

```
src/
├── app/
│   ├── (public)/          # Marketing + leaderboard + roadmap — SSG/ISR
│   ├── (auth)/            # Login, signup (3 steps), forgot-password
│   ├── (student)/         # Role = STUDENT — wraps in AppShell
│   ├── (tpo)/             # Role = COLLEGE_ADMIN — wraps in AppShell
│   ├── (superadmin)/      # Role = SUPER_ADMIN — wraps in AppShell
│   ├── (quiz)/            # Full-screen quiz — own route group, NO AppShell
│   └── api/auth/          # Proxy route handlers only (refresh, logout)
├── components/{ui,layout,student,company,prepare,charts}/
├── lib/{api,demo-data.ts,demo-data-pages.ts,utils.ts}/
├── shared/                # Zod schemas + enums (duplicated per ADR-011)
├── store/                 # auth.ts (Zustand — access token only)
└── middleware.ts          # Route-group RBAC + role redirect
```

Demo data lives in `lib/demo-data*.ts` only — never inline in components.

---

# 4. THE DESIGN LAW — premium EdTech SaaS aesthetic

The product should feel like a hybrid of **Coursera, Linear, Stripe Dashboard, Notion**, and a
modern university placement portal — enterprise-grade but approachable. Confident, structured,
data-rich without being crowded. Built for students who use it for hours every week.

### 4.1 What the UI must AVOID (instant rejection)

- ❌ Generic admin-dashboard styling (Material UI / Ant Design / Bootstrap aesthetic)
- ❌ Excessive gradients (use one gradient per hero, never decorative)
- ❌ Glassmorphism — no `backdrop-blur`, no translucent panels stacked on backgrounds
- ❌ Heavy shadows — `shadow-lg` / `shadow-xl` / `shadow-2xl` forbidden except on dropdowns
- ❌ Oversized rounded corners — nothing larger than `rounded-2xl` (16px) on any element
- ❌ Playful startup visuals (emoji-soup, jelly hover effects, bouncing icons)
- ❌ Flashy transitions — no scale-1.1, no bounce, no spring physics
- ❌ Mixing 5 weights of the same font on one screen

### 4.2 Color philosophy — restraint is the point

| Token | Hex | Used for |
|---|---|---|
| Page background | `#f8f9fc` (`bg-background`) | Soft gray-blue. Every workspace page. Never stark white. |
| Surface | `#ffffff` (`bg-white` or `bg-card`) | Cards, panels, table rows. The reading surface. |
| **Navy** `--navy` | `#1e3a8a` (`text-navy` / `bg-navy`) | Brand identity. Hero sections. Premium experiences (quiz, certificate). Major callouts. Sidebar active. |
| **Orange** `--orange` | `#f37021` (`text-orange` / `bg-orange`) | **Primary actions. Rewards. XP. Streaks. Progress.** Used SELECTIVELY — orange feels valuable only because it's rare. Roughly one orange element per visible section. |
| Emerald 600 | green | Positive trends ("+4 pts"), completion, "Selected" verdict, low-urgency status. **Status communication only.** |
| Sky 700 | blue | Information / rank chips / "Active learner" chip. **Status only.** |
| Amber 600/700 | gold | Coins balance / medium-urgency deadlines / "Speedster" rewards. **Status only.** |
| Red 600/700 | red | At-risk / overdue / destructive actions / errors. **Status only.** |
| Slate 400 | gray | UPPERCASE section labels, placeholder text, secondary metadata, inactive nav. |
| Slate 500 | gray | Body text. Inactive nav items. |
| Slate 600/700 | gray | Strong body text. Table cells. |

**Never** allow status colors (green/sky/amber/red) to dominate. They are signals, not decoration.
**Never** use raw hex in className. `text-[#1e3a8a]` is forbidden — `text-navy` is the only correct way.

### 4.3 Typography — Inter, hierarchical, premium

Inter is loaded in `app/layout.tsx` via `next/font/google` and exposed as `--font-inter` →
`font-sans`. Use these classes verbatim:

| Use | Class |
|---|---|
| Hero heading (homepage, prepare, premium intro) | `text-3xl font-extrabold tracking-tight sm:text-[42px] leading-tight` |
| Page heading (dashboard top) | `text-[28px] font-extrabold tracking-tight text-navy` |
| Section title (within a page) | `text-lg font-bold text-navy` |
| Card heading | `text-base font-bold text-navy` |
| KPI value (large numeric) | `text-[26px] font-extrabold leading-none text-navy` |
| **Uppercase label** (the premium tell) | `text-[10px] font-semibold uppercase tracking-widest text-slate-400` |
| Body | `text-sm leading-relaxed text-slate-600` |
| Secondary body | `text-sm text-slate-500` |
| Metadata | `text-xs text-slate-400` |

**Uppercase labels are part of the brand.** They appear above headings (`STUDENT WORKSPACE`,
`UPCOMING DEADLINES`, `HOUSE RULES`, `MOST ENROLLED`, `RECRUITER ENDORSED`) and create the
"enterprise-EdTech" feel. Use `tracking-widest` (`letter-spacing: 0.1em`) on every one.

### 4.4 Cards — the foundation, four patterns only

Every card on every page must be ONE of these four. No improvising.

**a) Standard surface** — the workhorse. Used for KPIs, list rows, content blocks, sidebars.
```
rounded-xl border border-slate-200 bg-white p-{4|5|6} shadow-sm
```

**b) Hero card** — top of a workspace page (dashboard hero, page header banner).
```
rounded-2xl border border-slate-200 bg-white p-6 shadow-sm
```
Use `p-6` minimum. `p-8` on larger heroes. Never `shadow-md` or above.

**c) Dark premium surface** — hero/banner ON a dark navy background only. Used inside the navy
hero blocks (homepage hero, prepare hero, quiz pre-start). Translucent enough to read against navy,
but NO `backdrop-blur`.
```
rounded-xl border border-white/10 bg-white/5 p-{4|5}
```

**d) Tinted accent** — Daily Quest, Quest Reward callout. Subtle gradient, never decorative.
```
rounded-xl border border-orange/25 bg-gradient-to-r from-orange/5 to-amber-50/60 px-5 py-4 shadow-sm
```

**Forbidden card patterns:**
- ❌ `bg-card` (replace with explicit `bg-white border-slate-200`)
- ❌ `bg-muted`, `bg-gray-50`, `bg-slate-50` as content card background
- ❌ Cards without a border (border defines the surface — shadow is secondary)
- ❌ `shadow-md` or larger on workspace cards
- ❌ `backdrop-blur-*` anywhere

### 4.5 Border radius — moderate, never extreme

| Element | Class |
|---|---|
| Inputs, dropdowns, small chips | `rounded-lg` (10px) |
| **All cards** | `rounded-xl` (12px) |
| Heroes, premium feature cards | `rounded-2xl` (16px) |
| Pills (status, badges, CTAs) | `rounded-full` |
| Tiny inline chips | `rounded-full` (same — pills, not squircles) |

Never `rounded-3xl` or anything larger. Never bare `rounded-md` for cards.

### 4.6 Shadows — minimal, structural

The system relies on **borders + whitespace**, not shadows, for depth. Use only:

| Use | Class |
|---|---|
| Resting card | `shadow-sm` |
| Card hover (optional, only where interactive) | `hover:shadow-md` (the only place `shadow-md` is allowed) |
| Dropdowns and popovers (floating) | `shadow-md` |
| Modal | `shadow-lg` (the only place `shadow-lg` is allowed) |

**Forbidden:** `shadow-xl`, `shadow-2xl`, `shadow-orange/25`, colored shadows, drop-shadows.

### 4.7 Buttons — the three-tier hierarchy

Use the `<Button>` component (`components/ui/button.tsx`) — it encodes the system. The cva variants:

| Variant | When |
|---|---|
| `default` (orange pill) | The ONE primary action per visible section (Start quest, Resume, Enroll). |
| `secondary` (navy pill) | Identity actions: "Sign in to placement portal", "Continue", "Search". |
| `outline` (white + slate border) | Supportive: "Maybe later", "Back", "Cancel". |
| `ghost` (text only) | Lowest weight: "Skip", "Dismiss", inline table actions. |
| `link` (text + underline-on-hover) | Inline navigation: "View all →", "Forgot password?". |
| `destructive` (red pill) | Used sparingly: "Delete account", "Revoke session". |

Sizes: `default` (h-10), `sm` (h-8, `rounded-lg`), `lg` (h-12), `icon` (h-10 w-10).

**Never** hand-roll a button. Compose from `<Button>`. Never `rounded-md` for CTAs. Never
`shadow-lg shadow-orange/25` — that's startup-launch-page aesthetic.

### 4.8 Icon tiles (the Practice Hub pattern, reusable)

When a card has an icon-led layout (Practice Hub, Topic Mastery categories, support channels):

```
<span className="grid size-11 place-items-center rounded-xl bg-{color}-50 text-{color}-600 ring-1 ring-{color}-100">
  <Icon className="size-5" />
</span>
```

Accent colour mapping (use these, never random):
- **Sky** → Company / business / external
- **Orange** → Practice / active CTA / rewards / progress
- **Violet** → Topics / drills / mastery
- **Emerald** → Learning / certifications / positive states
- **Amber** → Coins / formulas / time-related rewards
- **Red** → At-risk / overdue / destructive

### 4.9 Spacing — generous, never cramped

- Card padding: `p-4` (compact tiles), `p-5` (medium), `p-6` (large/hero). Never `p-3` or smaller for cards.
- Section gap inside a page: `space-y-6` between major sections, `space-y-5` between subsections.
- Grid gap: `gap-4` (tight), `gap-5` / `gap-6` (card grids).
- Page outer padding: `px-6 py-6` (set by AppShell — don't double-pad).
- Form field gap: `space-y-4`.

**Whitespace is a feature, not waste.** Important content gets more space; related content groups close.

### 4.10 Progress indicators

- Always use `<ProgressBar variant="default" | "xp">`. Never inline `<div>` bars.
- Default variant: navy fill on `bg-slate-100` track, `h-1.5`, `rounded-full`. Course completion, generic progress.
- XP variant: `bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500`. ONLY for XP — the gradient signals "the rewarded thing".

### 4.11 Status pills

Always use `<StatusPill>`. Never inline status styles. The map:

| State | Treatment |
|---|---|
| In progress | `bg-sky-50 text-sky-700 ring-1 ring-sky-200` |
| Due soon | `bg-amber-50 text-amber-700 ring-1 ring-amber-200` |
| Completed / Active | `bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200` |
| Overdue / At-risk | `bg-red-50 text-red-700 ring-1 ring-red-200` |
| Locked / Pending | `bg-slate-50 text-slate-600 ring-1 ring-slate-200` |

All status pills: `rounded-full px-2.5 py-0.5 text-[11px] font-semibold`.

### 4.12 Filter chips and tabs

- Filters: pill controls — `rounded-full px-3 py-1 text-xs font-semibold`. Selected: `bg-navy text-white`. Unselected: `bg-slate-100 text-slate-600 hover:bg-slate-200`.
- Tabs (course table, company hub): underline tabs only.
  - Active: `border-b-2 border-orange text-navy font-semibold`, count badge `bg-orange text-white`.
  - Inactive: `border-b-2 border-transparent text-slate-400 hover:text-slate-600`, count badge `bg-slate-100 text-slate-500`.

### 4.13 Interactions — subtle, intentional

- Hover: `transition-colors` (150ms default). Color change only — no scale, no translate.
- Active press: `active:translate-y-px` is the most movement allowed.
- Focus rings: `focus-visible:ring-2 focus-visible:ring-orange/40 focus-visible:ring-offset-2`. Same everywhere.
- No `hover:scale-*`. No `hover:rotate-*`. No keyframe animations except `animate-pulse` on skeletons.

---

## 5. The three visual zones

The product has three distinct visual zones. Pages must use the right one — never mix.

### Zone A — Workspace (light, AppShell, the daily-use surface)

Everything inside `(student)/`, `(tpo)/`, `(superadmin)/`. Background `bg-background` (the soft
gray-blue). Composed from §4.4(a) standard cards. AppShell wraps. This is where users live.

### Zone B — Premium dark (no chrome, high-stakes)

`(quiz)/dashboard/quiz` and similar focused screens (future certificate-issued celebration,
on-boarding finale). Full-screen `bg-navy` with one soft radial gradient glow. Composed from
§4.4(c) dark surfaces. No AppShell. The mood is celebratory and concentrated.

### Zone C — Public marketing (mixed: dark navy hero + light body)

Homepage, `/prepare`, `/leaderboard`, `/roadmap`. Each has a **dark navy hero block at the top**
(§4.4(c) styling inside `bg-navy` with radial gradient) and **standard light cards below**
(§4.4(a)). The hero is the brand statement; the body is the workhorse.

---

## 6. Canonical compositions

### 6.1 App shell

**Top bar** (`components/layout/TopBar.tsx`): `h-14 bg-white border-b border-slate-200 shadow-sm`.
Logo + workspace subtitle, Explore mega-menu + Companies, rounded-full search, streak pill, bell, AvatarMenu.

**Sidebar** (`components/layout/Sidebar.tsx`): `w-60 bg-white border-r border-slate-200`. Section
labels per §4.3. Active item: `bg-sky-50 text-navy font-semibold`. Footer: PpsGauge (navy card).

### 6.2 Student dashboard (mandatory composition)

Top → bottom:
1. **DashboardHero** — §4.4(b) hero card, big name heading, status chip, identity line, stat chips, XP bar.
2. **KpiRow** — 4 standard cards, large numeric values, uppercase labels above.
3. **DailyQuest** — §4.4(d) tinted accent. Orange "DAILY QUEST" pill, colored reward text.
4. **ContinueLearning** — standard card, 3 columns of metadata, navy progress bar, orange Resume button.
5. **CourseTable** — standard card, underline tabs, status pills in rows.
6. **PracticeHub** — three §4.8 icon-tile cards. Middle (Mock quiz) is `border-orange/40 ring-1 ring-orange/20`.

**Right rail**: 3 standard cards (Deadlines, This Week, Activity).

### 6.3 Company hub — 7 tabs, one template

Tab order is canonical:
```
Overview | Syllabus | Material | Practice Quiz | Full Mock Assessment | Formula Sheet | Interview Experience
```
Active tab: `border-b-2 border-orange text-navy font-semibold` (NEVER `text-orange`).

### 6.4 Premium dark page (quiz pre-start template)

`bg-navy` container + one radial gradient overlay. Top bar: "Exit to dashboard" pill on left,
streak + coins chips on right. Two columns: title + stats + quest reward + CTAs on left; XP card +
house rules + leaderboard rank on right. Primary CTA = `<Button size="lg">` (orange pill, h-12).

### 6.5 Routing rules (ADR-003)

- Post-login: role-aware → STUDENT → `/dashboard`, COLLEGE_ADMIN → `/tpo/dashboard`, SUPER_ADMIN → `/superadmin/dashboard`.
- Honor `?redirect=` param if present.
- Post-onboarding → `/dashboard`.
- Logo always links to `/`.

---

## 7. Auth — token handling is non-negotiable (ADR-006)

- Access token in **Zustand memory only**. Never localStorage/sessionStorage/readable cookie.
- Refresh token: HttpOnly cookie `zskillup_refresh`, SameSite=Lax, Path=`/`, Secure-in-prod.
- All requests use `credentials: 'include'` so the browser stores `Set-Cookie`.
- On 401 → refresh via `/api/auth/refresh` → retry once → if fails, redirect to login.
- All API calls go through `lib/api/client.ts`. Zero raw `fetch` to backend in components.

---

## 8. Backend communication (ADR-007)

- Types come from OpenAPI-generated types in `src/shared/`. Never hand-write.
- Frontend NEVER touches DB / TypeORM / SQL.
- Standard envelope handling: `{ data, meta }` success / `{ error: { code, message, requestId } }` error.
- Business values (XP, PPS, level, coins, rank, percentile) are **rendered only** — never computed.

---

## 9. Forms

- `react-hook-form + Zod`. Shared schemas from `src/shared/`.
- Inputs: `h-10 rounded-lg border-slate-200 bg-white px-3 text-sm text-navy focus:border-orange focus-visible:ring-2 focus-visible:ring-orange/30`.
- Errors: `rounded-md bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200` with `role="alert"`.

---

## 10. Accessibility (WCAG 2.1 AA — launch gate)

- Semantic HTML first. ARIA only for genuine gaps.
- Keyboard operable everywhere. Visible `focus-visible:ring-2 focus-visible:ring-orange/40`.
- Labels on every input. Errors associated via `aria-describedby`.
- Color is never the only signal. Pair with text/icon.
- `alt` on informational images. Respect `prefers-reduced-motion`.

---

## 11. Performance

- Student dashboard LCP < 2.5s.
- Server Components by default. Heavy client widgets `dynamic(() => import(...), { ssr: false })`.
- Public + hub pages use SSG/ISR.

---

## 12. Hard stops — instant rejection

**Security:**
- ❌ Access token outside Zustand memory
- ❌ Raw `fetch` to backend outside `lib/api/client.ts`
- ❌ Server Action touching a database
- ❌ Hand-writing OpenAPI types

**Architecture:**
- ❌ Re-implementing AppShell/Sidebar/TopBar per page
- ❌ 5-tab company hub (7 is canonical)
- ❌ Post-login to `/` (must go to role workspace)
- ❌ Dashboard without PracticeHub
- ❌ AppShell on a Zone B (dark premium) page
- ❌ Business values computed client-side

**Visual quality (the new bar):**
- ❌ Glassmorphism — any `backdrop-blur-*`
- ❌ Heavy shadows — `shadow-lg`/`shadow-xl`/`shadow-2xl` outside modals/dropdowns
- ❌ Colored shadows — `shadow-orange/25` etc.
- ❌ Excessive rounding — anything > `rounded-2xl` (16px)
- ❌ Square `rounded-md` primary CTAs (pills only)
- ❌ Hardcoded hex in className — `text-[#1e3a8a]` etc.
- ❌ `bg-card`, `bg-muted`, `bg-gray-*` on content cards
- ❌ Logo with Z=navy / Skillup=orange (must be Z=orange / Skillup=navy)
- ❌ Orange active sidebar items (must be `bg-sky-50 text-navy`)
- ❌ Status colors used decoratively instead of for state communication
- ❌ Status badge as plain text (use `<StatusPill>`)
- ❌ Inline `<div>` progress bars (use `<ProgressBar>`)
- ❌ `hover:scale-*` / bouncing / spring physics
- ❌ Tiny `size-4` icons inside large content cards (use §4.8 `size-11` tiles)
- ❌ Mixing card styles on the same page

**Code quality:**
- ❌ `console.log` in committed code
- ❌ `: any` / `as any` to dodge TypeScript
- ❌ `@ts-ignore` without an issue link
- ❌ New state/data/styling library without an ADR
- ❌ Inline demo data in components

---

## 13. When unsure

Stop. State the conflict explicitly, cite the rule. A correct refusal beats a fast change that:
- Leaks a token
- Drifts from the API contract
- Ships UI a client would reject as "AI-generated"
- Mixes the three visual zones
- Breaks one of the four card patterns

**The goal is correctness, maintainability, security, and client-ready quality — never speed.**
