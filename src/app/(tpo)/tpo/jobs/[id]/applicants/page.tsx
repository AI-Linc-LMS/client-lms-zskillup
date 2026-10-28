import { Users } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ConsoleHero } from '@/components/layout/ConsoleHero';
import { ApplicantsScreen } from '@/components/admin/jobs/ApplicantsScreen';
import { TPO_JOBS_BASE } from '@/lib/api/jobs';

/**
 * Candidate management for one drive — shortlist, reject, select, offer, joined.
 *
 * Shows THIS college's applicants only, filtered inside the query rather than after it,
 * so the pagination and the total both count the same people. The stage machine is the
 * platform's, not a second implementation behind a different role.
 */
export default async function TpoDriveApplicantsPage({
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
          { label: 'Applicants' },
        ]}
      />
      <ConsoleHero
        icon={Users}
        eyebrow="Placement cell"
        title="Applicants"
        description="Move your students through the drive — shortlisted, interviewed, offered, joined."
      />
      <ApplicantsScreen jobId={id} base={TPO_JOBS_BASE} />
    </div>
  );
}
