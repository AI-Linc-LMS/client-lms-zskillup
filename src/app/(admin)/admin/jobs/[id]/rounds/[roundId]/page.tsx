import { Target } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ConsoleHero } from '@/components/layout/ConsoleHero';
import { DriveTabs } from '@/components/admin/jobs/DriveTabs';
import { RoundPracticeScreen } from '@/components/admin/jobs/RoundPracticeScreen';
import { InterviewPlanCard } from '@/components/admin/jobs/InterviewPlanCard';
import { RoundCalibrationCard } from '@/components/admin/jobs/RoundCalibrationCard';
import { AudiencePreviewCard } from '@/components/admin/jobs/AudiencePreviewCard';

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
      {/* §23.6 and §23.7 sit beneath the dashboard rather than on their own pages: all
          three answer a question about THIS round, and splitting them would mean three
          navigations to form one judgement. Each handles its own empty and error state,
          so a round with no interview plan or too little paired data still renders. */}
      <div className="grid gap-4 lg:grid-cols-2">
        <InterviewPlanCard driveId={id} roundId={roundId} />
        <RoundCalibrationCard driveId={id} roundId={roundId} />
      </div>
      <AudiencePreviewCard driveId={id} />
    </div>
  );
}
