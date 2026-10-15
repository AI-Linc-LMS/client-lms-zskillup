import { BarChart3 } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ConsoleHero } from '@/components/layout/ConsoleHero';
import { DriveAnalyticsScreen } from '@/components/admin/jobs/DriveAnalyticsScreen';
import { DriveTabs } from '@/components/admin/jobs/DriveTabs';

/** One drive's funnel, conversion, offers and biggest losses (PRD §14). */
export default async function DriveReportPage({
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
          { label: 'Jobs', href: '/admin/jobs' },
          { label: 'Report' },
        ]}
      />
      <ConsoleHero
        icon={BarChart3}
        eyebrow="Job board"
        title="Drive report"
        description="Where candidates are lost, and what each rate is a rate of. Counts are ever-reached rather than currently-at, so they never fall as decisions get made."
      />
      <DriveTabs driveId={id} />
      <DriveAnalyticsScreen driveId={id} />
    </div>
  );
}
