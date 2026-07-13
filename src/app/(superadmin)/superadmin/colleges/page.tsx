import { Suspense } from 'react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { CollegesAdmin } from '@/components/superadmin/CollegesAdmin';

/**
 * Super-admin: Colleges management (Implementation Plan §4 / Sprint 8 polish
 * pulled forward to Day 3.5). Lists every college (including SUSPENDED) and
 * lets the operator add a new one or suspend an existing tenant.
 *
 * Endpoint surface (already shipped on the backend):
 *   GET    /api/v1/admin/colleges     — full list (ACTIVE + SUSPENDED)
 *   POST   /api/v1/admin/colleges     — create (409 on duplicate slug)
 *   PATCH  /api/v1/admin/colleges/:id — update (slug uniqueness enforced)
 *   DELETE /api/v1/admin/colleges/:id — soft delete (sets status=SUSPENDED)
 *
 * The page itself is a Server Component; the interactive table + form is a
 * client leaf (`CollegesAdmin`). Auth + role gating is handled by the
 * (superadmin) route group's middleware.
 */
export default function AdminCollegesPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Super-admin', href: '/superadmin/dashboard' },
          { label: 'Colleges' },
        ]}
      />

      <header>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Tenants
        </p>
        <h1 className="mt-1 text-[28px] font-extrabold tracking-tight text-navy">
          Colleges
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Onboard a new partner institution or suspend an existing one. Suspended
          colleges keep their data - student profiles aren&rsquo;t deleted - but new
          sign-ins from their cohort are blocked.
        </p>
      </header>

      <Suspense
        fallback={
          <div className="h-96 animate-pulse rounded-xl border border-slate-200 bg-white shadow-sm" />
        }
      >
        <CollegesAdmin />
      </Suspense>
    </div>
  );
}
