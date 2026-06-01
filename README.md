# ZSkillup Frontend (Next.js 16)

App Router, Server Components by default. Governed by `zskillup-brain`
(`frontend/CLAUDE.md`, ADR-003/006/007, Standards). **Read those before changing code.**

## Stack

Next.js 16 · React 19 · TypeScript strict · Tailwind CSS v4 + shadcn/ui · Zustand · Node 22.
Brand tokens: navy `#1e3a8a`, orange `#f37021` (`src/app/globals.css`).

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev            # http://localhost:3000
```

## Routing (route-group RBAC, ADR-003)

| Group | URL | Notes |
|---|---|---|
| `(public)` | `/` | Homepage. The ZSkillup logo always links here. |
| `(auth)` | `/login`, `/signup` | Unauthenticated flows. |
| `(student)` | `/dashboard` | Default authenticated student surface. |
| `(tpo)` | `/tpo/dashboard` | TPO surfaces are prefixed `/tpo/*`. |
| `(superadmin)` | `/superadmin/dashboard` | Prefixed `/superadmin/*`. |

> Route groups in parentheses don't add URL segments, so TPO/super-admin pages
> carry real `tpo/` and `superadmin/` segments to avoid colliding with the
> student `/dashboard` (matches the Block 3 middleware contract).

## Repo topology

Two-repo (polyrepo) setup — see ADR-011. The contract surface in `src/shared/`
is **duplicated** in `backend-repo/src/shared/`; keep the two identical. Backend
**response** types are generated from the OpenAPI spec (Block 4+), never hand-written.
