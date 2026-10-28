import { Briefcase } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ConsoleHero } from '@/components/layout/ConsoleHero';
import { EditJobComposer } from '@/components/admin/jobs/EditJobComposer';
import { DriveTabs } from '@/components/admin/jobs/DriveTabs';
import { TPO_JOBS_BASE } from '@/lib/api/jobs';

/**
 * A drive's own page — edit it, and reach its other screens.
 *
 * This did not exist, which is why the drives list had nothing to open: its rows
 * linked at /admin/jobs/:id, middleware refuses a COLLEGE_ADMIN there, and the click
 * landed on the TPO dashboard instead. The links were the first half of that bug and
 * this page is the second.
 */
export default async function TpoDrivePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Placement cell', href: '/tpo/dashboard' },
          { label: 'Drives', href: '/tpo/jobs' },
          { label: 'Drive' },
        ]}
      />
      <ConsoleHero
        icon={Briefcase}
        eyebrow="Placement cell"
        title="Drive"
        description="Everything about this drive — details, audience, candidates and rounds."
      />
      <DriveTabs driveId={id} console="tpo" />
      <EditJobComposer jobId={id} base={TPO_JOBS_BASE} />
    </div>
  );
}
