import { Eye } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { DriveTabs } from '@/components/admin/jobs/DriveTabs';
import { ConsoleHero } from '@/components/layout/ConsoleHero';
import { TargetPicker } from '@/components/admin/jobs/TargetPicker';
import { TPO_JOBS_BASE } from '@/lib/api/jobs';

/**
 * Who can see and apply for this drive (TPO requirement 7).
 *
 * Individual students, a batch, a branch, a cohort — or the whole college. Rows are
 * OR-ed to WIDEN reach and exclusions are applied last, so "the 2027 batch except CSE"
 * is two rows rather than a list of names.
 *
 * The server confines every row to this college: another college, or a student who is
 * not yours, is refused rather than quietly dropped — saving a narrower audience than
 * the screen showed would be the worse failure.
 */
export default async function TpoDriveAudiencePage({
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
          { label: 'Audience' },
        ]}
      />
      <ConsoleHero
        icon={Eye}
        eyebrow="Placement cell"
        title="Who sees this drive"
        description="Pick students individually, or open it to a batch, branch or cohort."
      />
      <DriveTabs driveId={id} console="tpo" />
      <TargetPicker jobId={id} base={TPO_JOBS_BASE} />
    </div>
  );
}
