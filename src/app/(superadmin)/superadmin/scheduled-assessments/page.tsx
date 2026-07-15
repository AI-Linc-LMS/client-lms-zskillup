import { Suspense } from 'react';
import { CalendarClock } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ConsoleHero } from '@/components/layout/ConsoleHero';
import { SchedulingAdmin } from '@/components/superadmin/SchedulingAdmin';

/**
 * Super-admin: schedule company assessments (assessment lifecycle, Phase 2).
 * Each scheduled assessment appears on the calendar of every student registered
 * for that company.
 */
export default function AdminScheduledAssessmentsPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Super-admin', href: '/superadmin/dashboard' },
          { label: 'Assessments' },
        ]}
      />

      <ConsoleHero
        icon={CalendarClock}
        eyebrow="Super Admin"
        title="Assessments"
        description="Schedule a company drive's assessment. It blocks the calendar of every student registered for that company and triggers their reminders."
      />

      <Suspense
        fallback={
          <div className="h-96 animate-pulse rounded-xl border border-slate-200 bg-white shadow-sm" />
        }
      >
        <SchedulingAdmin />
      </Suspense>
    </div>
  );
}
