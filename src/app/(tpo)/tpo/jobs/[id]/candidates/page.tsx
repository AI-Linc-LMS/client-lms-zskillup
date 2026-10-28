import { Target } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ConsoleHero } from '@/components/layout/ConsoleHero';
import { CandidateFitScreen } from '@/components/admin/jobs/CandidateFitScreen';
import { TPO_JOBS_BASE } from '@/lib/api/jobs';

/**
 * Your students, ranked for this drive (TPO requirement 6).
 *
 * The §6 match engine, confined to this college. The score comes from the drive's own
 * weights — which must total 100, so a set that does not is rejected rather than
 * silently rescaling everyone — and an authorised override sits BESIDE the computed
 * score rather than replacing it.
 *
 * The column worth reading first is the one that says a student could not be scored at
 * all: on this platform that number is large, and a ranking that hides it would look
 * far more confident than the data behind it.
 */
export default async function TpoDriveCandidatesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Placement cell', href: '/tpo/dashboard' },
          { label: 'Drives', href: '/tpo/jobs' },
          { label: 'Candidates' },
        ]}
      />
      <ConsoleHero
        icon={Target}
        eyebrow="Placement cell"
        title="Ranked candidates"
        description="Job-fit score, skills match and eligibility for your students on this drive."
      />
      <CandidateFitScreen jobId={id} base={TPO_JOBS_BASE} />
    </div>
  );
}
