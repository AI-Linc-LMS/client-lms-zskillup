import { Suspense } from 'react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { CompaniesAdmin } from '@/components/superadmin/CompaniesAdmin';

/** Admin console — Companies (recruiter hubs). Same tooling as Super Admin. */
export default function AdminCompaniesPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Platform Admin', href: '/admin/dashboard' }, { label: 'Companies' }]} />
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Catalog</p>
        <h1 className="mt-1 text-[28px] font-extrabold tracking-tight text-navy">Companies</h1>
        <p className="mt-1 text-sm text-slate-500">Add a recruiter hub or change what students can see. Drafts stay hidden until published.</p>
      </header>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl border border-slate-200 bg-white shadow-sm" />}>
        <CompaniesAdmin />
      </Suspense>
    </div>
  );
}
