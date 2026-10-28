import { Briefcase } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ConsoleHero } from '@/components/layout/ConsoleHero';
import { JobsListing } from '@/components/admin/jobs/JobsListing';
import { TPO_JOBS_BASE } from '@/lib/api/jobs';

/**
 * The college's own drives — the same listing the platform admin uses, pointed at the
 * college-scoped controller. A TPO sees drives open to their college (including national
 * ones their students applied to) and can edit only the drives they created.
 */
export default function TpoJobsPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Placement cell', href: '/tpo/dashboard' },
          { label: 'Drives' },
        ]}
      />
      <ConsoleHero
        icon={Briefcase}
        eyebrow="Placement cell"
        title="Job drives"
        description="Create a drive for your college, and track everyone who applies to it."
      />
      <JobsListing base={TPO_JOBS_BASE} />
    </div>
  );
}
