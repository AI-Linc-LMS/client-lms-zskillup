import { Suspense } from 'react';
import type { Metadata } from 'next';
import { Briefcase } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { JobsTabsShell } from '@/components/jobs/JobsTabsShell';

/**
 * The job board, inside the workspace chrome.
 *
 * It lives in the (student) group so it gets the top bar and sidebar every other page
 * in the product has - the board is somewhere students come back to weekly, and a page
 * with no navigation reads as a different site.
 *
 * Deliberately NOT in middleware's PROTECTED_PREFIXES: the sitemap lists this URL, and
 * bouncing a crawler to /login is worse than serving it the untargeted jobs. A
 * logged-out visitor gets the same shell in its signed-out state.
 */
export const metadata: Metadata = {
  title: 'Jobs & Internships',
  description:
    'Live openings for students and freshers - roles, locations, eligibility and how to apply.',
};

export default function JobsPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Jobs' }]} />

      <header>
        <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-navy">
          <Briefcase className="size-6 text-orange" /> Jobs
        </h1>
        <p className="mt-0.5 text-sm text-slate-600">
          Roles from our hiring partners. Filter by what matters, apply in one click, and track
          every application from the same place.
        </p>
      </header>

      {/* useSearchParams needs a boundary; without it the whole route opts out of
          static rendering for one optional ?tab= param. */}
      <Suspense fallback={null}>
        <JobsTabsShell />
      </Suspense>
    </div>
  );
}
