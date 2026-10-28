import { Briefcase } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ConsoleHero } from '@/components/layout/ConsoleHero';
import { JobComposer } from '@/components/admin/jobs/JobComposer';
import { TPO_JOBS_BASE } from '@/lib/api/jobs';

/** The admin composer, writing through the college-scoped controller. A drive created
 *  here is targeted at this college automatically — server side, because a drive with no
 *  target reaches nobody, including the officer who just created it. */
export default function TpoNewJobPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Placement cell', href: '/tpo/dashboard' },
          { label: 'Drives', href: '/tpo/jobs' },
          { label: 'New' },
        ]}
      />
      <ConsoleHero
        icon={Briefcase}
        eyebrow="Placement cell"
        title="New drive"
        description="Everything the platform's own job composer offers, scoped to your college."
      />
      <JobComposer base={TPO_JOBS_BASE} />
    </div>
  );
}
