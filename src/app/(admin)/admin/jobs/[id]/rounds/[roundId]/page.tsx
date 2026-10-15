import { Target } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ConsoleHero } from '@/components/layout/ConsoleHero';
import { DriveTabs } from '@/components/admin/jobs/DriveTabs';
import { RoundPracticeScreen } from '@/components/admin/jobs/RoundPracticeScreen';

/** One round's practice results and the decisions people made (PRD §23.5). */
export default async function RoundDetailPage({
  params,
}: {
  params: Promise<{ id: string; roundId: string }>;
}) {
  const { id, roundId } = await params;
  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Platform Admin', href: '/admin/dashboard' },
          { label: 'Jobs', href: '/admin/jobs' },
          { label: 'Rounds', href: `/admin/jobs/${id}/rounds` },
          { label: 'Practice' },
        ]}
      />
      <ConsoleHero
        icon={Target}
        eyebrow="Job board"
        title="Round practice and decisions"
        description="What the practice measured, and what a person decided about it — side by side, neither overwriting the other. Nothing here pre-selects a decision from the recommendation."
      />
      <DriveTabs driveId={id} />
      <RoundPracticeScreen driveId={id} roundId={roundId} />
    </div>
  );
}
