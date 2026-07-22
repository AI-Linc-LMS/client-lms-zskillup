import { Suspense } from 'react';
import { ClipboardList } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ConsoleHero } from '@/components/layout/ConsoleHero';
import { QuestionsAdmin } from '@/components/superadmin/QuestionsAdmin';

/** Admin console - Question bank (aptitude/technical MCQs, numeric, coding stems). */
export default function AdminQuestionsPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Platform Admin', href: '/admin/dashboard' }, { label: 'Question bank' }]} />
      <ConsoleHero
        icon={ClipboardList}
        eyebrow="Platform Admin"
        title="Question bank"
        description="Author, tag, publish, and archive practice questions. Manage topics, difficulty and import via CSV."
      />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl border border-slate-200 bg-white shadow-sm" />}>
        <QuestionsAdmin />
      </Suspense>
    </div>
  );
}
