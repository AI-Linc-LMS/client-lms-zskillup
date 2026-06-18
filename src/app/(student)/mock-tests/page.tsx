import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { MockTestsCatalog } from '@/components/practice/MockTestsCatalog';
import { MockHistory } from '@/components/practice/MockHistory';
import { AdaptiveMockHistory } from '@/components/practice/AdaptiveMockHistory';

const CRUMBS = [
  { label: 'Home', href: '/' },
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Mock Tests' },
];

/**
 * Mock tests workspace (Sprint 4) — fully live:
 *   - catalog from `GET /mocks`
 *   - KPIs + past results from `GET /mocks/attempts/mine`
 * Each past result deep-links to its persisted server-graded report.
 */
export default function MockTestsPage() {
  return (
    <div>
      <div className="mb-6">
        <Breadcrumb items={CRUMBS} />
        <h1 className="text-[28px] font-extrabold tracking-tight text-navy">Mock Tests</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Timed assessments with server-graded scores, percentile, and a full answer review.
        </p>
      </div>

      <MockHistory />
      <AdaptiveMockHistory />

      <section className="mt-8">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Available Mock Tests
        </p>
        <MockTestsCatalog />
      </section>
    </div>
  );
}
