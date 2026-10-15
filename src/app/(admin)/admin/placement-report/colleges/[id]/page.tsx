import { School } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ConsoleHero } from '@/components/layout/ConsoleHero';
import { CollegeReportScreen } from '@/components/admin/analytics/CollegeReportScreen';

/** One college or cohort: coverage first, then funnel and placement (PRD §14). */
export default async function CollegePlacementReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ cohort?: string; department?: string }>;
}) {
  const { id } = await params;
  const { cohort, department } = await searchParams;
  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Platform Admin', href: '/admin/dashboard' },
          { label: 'Placement report', href: '/admin/placement-report' },
          { label: 'College' },
        ]}
      />
      <ConsoleHero
        icon={School}
        eyebrow="Placement"
        title="College report"
        description="Coverage before outcomes — a placement rate over a cohort whose profiles are half empty measures the data, not the students."
      />
      <CollegeReportScreen collegeId={id} cohort={cohort} department={department} />
    </div>
  );
}
