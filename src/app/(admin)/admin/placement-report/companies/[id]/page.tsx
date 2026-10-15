import { Building2 } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ConsoleHero } from '@/components/layout/ConsoleHero';
import { CompanyReportScreen } from '@/components/admin/analytics/CompanyReportScreen';

/** One employer across every drive they have run (PRD §14). */
export default async function CompanyPlacementReportPage({
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
          { label: 'Platform Admin', href: '/admin/dashboard' },
          { label: 'Placement report', href: '/admin/placement-report' },
          { label: 'Employer' },
        ]}
      />
      <ConsoleHero
        icon={Building2}
        eyebrow="Placement"
        title="Employer report"
        description="What the relationship is actually worth, read across drives — including the declines, no-shows and non-joiners, with the words staff wrote at the time."
      />
      <CompanyReportScreen companyId={id} />
    </div>
  );
}
