import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { PerformanceDashboard } from '@/components/student/PerformanceDashboard';

/**
 * Performance — a visual analytics report: placement readiness (overall +
 * per-company + per-topic), practice accuracy, assessment-score trend, and
 * focus areas. All live from the readiness/practice/mock endpoints.
 */
export default function PerformancePage() {
  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Performance' },
        ]}
      />

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Your report</p>
        <h1 className="mt-1 text-[28px] font-extrabold tracking-tight text-navy">Performance &amp; readiness</h1>
        <p className="mt-1 text-sm text-slate-500">
          How placement-ready you are — overall, per company, and per topic — with your practice and
          assessment trends.
        </p>
      </div>

      <PerformanceDashboard />
    </div>
  );
}
