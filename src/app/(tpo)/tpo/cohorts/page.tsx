import Link from 'next/link';
import { GraduationCap, LayoutDashboard } from 'lucide-react';

/**
 * Cohort configuration moved to the Platform Admin (per-college). TPOs keep
 * read-only cohort access via the dashboard's batch filter, so this page is now
 * an informational surface rather than a management screen.
 */
export default function TpoCohortsPage() {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#fff5ea] text-[#f5b400]">
        <GraduationCap className="size-6" aria-hidden />
      </span>
      <h1 className="mt-4 text-lg font-extrabold text-navy">Cohorts are managed by your admin</h1>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600">
        Your batches and student roster are configured by the Platform Admin. You can still segment
        your dashboards and reports by batch using the <span className="font-semibold">All batches</span> filter.
      </p>
      <Link
        href="/tpo/dashboard"
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-navy px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110"
      >
        <LayoutDashboard className="size-4" /> Back to dashboard
      </Link>
    </div>
  );
}
