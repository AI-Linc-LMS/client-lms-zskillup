import { Suspense } from 'react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { MocksAdmin } from '@/components/superadmin/MocksAdmin';

/** Admin console — Mock tests (company-wise + sectional mocks). */
export default function AdminMocksPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Platform Admin', href: '/admin/dashboard' }, { label: 'Mock tests' }]} />
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Assessment library</p>
        <h1 className="mt-1 text-[28px] font-extrabold tracking-tight text-navy">Mock tests</h1>
        <p className="mt-1 text-sm text-slate-600">Assemble timed mock assessments from the question + coding banks.</p>
      </header>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl border border-slate-200 bg-white shadow-sm" />}>
        <MocksAdmin />
      </Suspense>
    </div>
  );
}
