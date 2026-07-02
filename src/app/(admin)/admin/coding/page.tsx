import { Suspense } from 'react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { CodingAdmin } from '@/components/superadmin/CodingAdmin';

/** Admin console — Coding bank (Judge0 problems). */
export default function AdminCodingPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Platform Admin', href: '/admin/dashboard' }, { label: 'Coding bank' }]} />
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Assessment library</p>
        <h1 className="mt-1 text-[28px] font-extrabold tracking-tight text-navy">Coding bank</h1>
        <p className="mt-1 text-sm text-slate-500">Author DSA problems, test cases, and starter code; publish or archive.</p>
      </header>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl border border-slate-200 bg-white shadow-sm" />}>
        <CodingAdmin />
      </Suspense>
    </div>
  );
}
