import { Users } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ConsoleHero } from '@/components/layout/ConsoleHero';
import { IndividualCohortsManager } from '@/components/admin/IndividualCohortsManager';

export const dynamic = 'force-dynamic';

export default function IndividualCohortsPage() {
  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'Admin' }, { label: 'Individual Cohorts' }]} />
      <ConsoleHero
        icon={Users}
        eyebrow="Platform Admin"
        title="Individual Cohorts"
        description="Group arbitrary users - not tied to any college - and assign assessments to them. Separate from college batches."
      />
      <IndividualCohortsManager />
    </div>
  );
}
