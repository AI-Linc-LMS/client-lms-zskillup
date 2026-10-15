import { Target } from 'lucide-react';
import Link from 'next/link';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ConsoleHero } from '@/components/layout/ConsoleHero';
import { CandidateFitScreen } from '@/components/admin/jobs/CandidateFitScreen';

export default async function CandidatesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Platform Admin', href: '/admin/dashboard' },
          { label: 'Jobs', href: '/admin/jobs' },
          { label: 'Candidate fit' },
        ]}
      />
      <ConsoleHero
        icon={Target}
        eyebrow="Job board"
        title="Candidate fit"
        description="Who may be considered, and how they look. Eligibility and match are separate — a high score never overrides a failed criterion."
      />
      <p className="text-sm text-slate-600">
        Looking to filter, sort or act on a group?{' '}
        <Link
          href={`/admin/jobs/${id}/search`}
          className="font-semibold text-navy underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-orange/40"
        >
          Candidate search
        </Link>{' '}
        has the saved views and bulk actions, and{' '}
        <Link
          href={`/admin/jobs/${id}/report`}
          className="font-semibold text-navy underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-orange/40"
        >
          Report
        </Link>{' '}
        shows the funnel and where people are lost.{' '}
        <Link
          href={`/admin/jobs/${id}/practice`}
          className="font-semibold text-navy underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-orange/40"
        >
          Practice
        </Link>{' '}
        turns the JD into each round&rsquo;s preparation.
      </p>
      <CandidateFitScreen jobId={id} />
    </div>
  );
}
