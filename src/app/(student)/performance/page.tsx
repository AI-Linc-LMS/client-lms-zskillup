import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { PerformanceLive } from '@/components/student/PerformanceLive';

/**
 * Performance — fully live report (Sprint 3 exit: "reports show accuracy" +
 * Sprint 4 mock results). All numbers come from the practice-accuracy and
 * mock-history endpoints via the client leaf; the PPS readiness score joins
 * in Sprint 7 when the calculator ships.
 */
export default function PerformancePage() {
  return (
    <div className="space-y-8">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Performance' },
        ]}
      />

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Your report
        </p>
        <h1 className="mt-1 text-[28px] font-extrabold tracking-tight text-navy">Performance</h1>
        <p className="mt-1 text-sm text-slate-500">
          Server-graded practice accuracy, topic-by-topic breakdown, and your timed mock results.
        </p>
      </div>

      <PerformanceLive />
    </div>
  );
}
