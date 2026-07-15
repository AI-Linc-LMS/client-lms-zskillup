import { Suspense } from 'react';
import { CalendarClock } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ConsoleHero } from '@/components/layout/ConsoleHero';
import { SchedulingAdmin } from '@/components/superadmin/SchedulingAdmin';

/** Admin console — scheduled (company/campus) assessments. */
export default function AdminScheduledAssessmentsPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Platform Admin', href: '/admin/dashboard' }, { label: 'Assessments' }]} />
      <ConsoleHero
        icon={CalendarClock}
        eyebrow="Platform Admin"
        title="Scheduled assessments"
        description="Create, schedule, and track company/campus assessments and view results."
      />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl border border-slate-200 bg-white shadow-sm" />}>
        <SchedulingAdmin />
      </Suspense>
    </div>
  );
}
