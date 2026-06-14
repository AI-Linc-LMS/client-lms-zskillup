import { Suspense } from 'react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { CompaniesAdmin } from '@/components/superadmin/CompaniesAdmin';

/**
 * Super-admin: Companies management (Implementation Plan §4 / Sprint 2 —
 * "superadmin can author content"). Lists every recruiter hub (including
 * unpublished drafts) and lets the operator add a new one or toggle publish.
 *
 * Endpoint surface (backend):
 *   GET   /api/v1/admin/companies      — full list (published + draft)
 *   POST  /api/v1/admin/companies      — create (409 on duplicate slug)
 *   PATCH /api/v1/admin/companies/:id  — update / publish toggle
 */
export default function AdminCompaniesPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Super-admin', href: '/superadmin/dashboard' },
          { label: 'Companies' },
        ]}
      />

      <header>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Catalog</p>
        <h1 className="mt-1 text-[28px] font-extrabold tracking-tight text-navy">Companies</h1>
        <p className="mt-1 text-sm text-slate-500">
          Add a recruiter hub or change what students can see. Drafts stay hidden until you publish
          them.
        </p>
      </header>

      <Suspense
        fallback={
          <div className="h-96 animate-pulse rounded-xl border border-slate-200 bg-white shadow-sm" />
        }
      >
        <CompaniesAdmin />
      </Suspense>
    </div>
  );
}
