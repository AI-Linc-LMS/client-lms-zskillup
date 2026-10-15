import { UserRound } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ConsoleHero } from '@/components/layout/ConsoleHero';
import { StudentReportScreen } from '@/components/admin/analytics/StudentReportScreen';

/** One student: applications, the whole move history, and every offer (PRD §14, §7). */
export default async function StudentPlacementReportPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Platform Admin', href: '/admin/dashboard' },
          { label: 'Placement report', href: '/admin/placement-report' },
          { label: 'Student' },
        ]}
      />
      <ConsoleHero
        icon={UserRound}
        eyebrow="Placement"
        title="Student report"
        description="Where this student keeps stopping — the one question a status column cannot answer. Declined and lapsed offers stay on the record rather than becoming an absence."
      />
      <StudentReportScreen userId={userId} />
    </div>
  );
}
