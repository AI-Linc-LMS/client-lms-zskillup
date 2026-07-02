import { Suspense } from 'react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { QuestionsAdmin } from '@/components/superadmin/QuestionsAdmin';

/** Admin console — Question bank (aptitude/technical MCQs, numeric, coding stems). */
export default function AdminQuestionsPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Platform Admin', href: '/admin/dashboard' }, { label: 'Question bank' }]} />
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Assessment library</p>
        <h1 className="mt-1 text-[28px] font-extrabold tracking-tight text-navy">Question bank</h1>
        <p className="mt-1 text-sm text-slate-500">Author, tag, publish, and archive practice questions. Manage topics, difficulty and import via CSV.</p>
      </header>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl border border-slate-200 bg-white shadow-sm" />}>
        <QuestionsAdmin />
      </Suspense>
    </div>
  );
}
