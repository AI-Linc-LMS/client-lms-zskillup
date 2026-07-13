import { Suspense } from 'react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { SchedulingAdmin } from '@/components/superadmin/SchedulingAdmin';

/** Admin console — scheduled (company/campus) assessments. */
export default function AdminScheduledAssessmentsPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Platform Admin', href: '/admin/dashboard' }, { label: 'Assessments' }]} />
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Assessment library</p>
        <h1 className="mt-1 text-[28px] font-extrabold tracking-tight text-navy">Scheduled assessments</h1>
        <p className="mt-1 text-sm text-slate-600">Create, schedule, and track company/campus assessments and view results.</p>
      </header>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl border border-slate-200 bg-white shadow-sm" />}>
        <SchedulingAdmin />
      </Suspense>
    </div>
  );
}
