import { LineChart } from 'lucide-react';
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
        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-indigo-600 ring-1 ring-inset ring-indigo-100">
          <LineChart className="size-3.5" /> Your report
        </span>
        <h1 className="mt-2.5 text-2xl font-black tracking-tight text-navy sm:text-3xl">Performance &amp; readiness</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-slate-500 sm:text-base">
          How placement-ready you are — overall, per company, and per topic — with your practice and
          assessment trends.
        </p>
      </div>

      <PerformanceDashboard />
    </div>
  );
}
