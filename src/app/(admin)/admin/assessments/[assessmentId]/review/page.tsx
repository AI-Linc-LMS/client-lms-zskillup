import { FileSearch } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ConsoleHero } from '@/components/layout/ConsoleHero';
import { QuestionReviewScreen } from '@/components/admin/jobs/QuestionReviewScreen';

/** Read a paper before students do (PRD §23.8). */
export default async function QuestionReviewPage({
  params,
}: {
  params: Promise<{ assessmentId: string }>;
}) {
  const { assessmentId } = await params;
  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Platform Admin', href: '/admin/dashboard' },
          { label: 'Assessments', href: '/admin/scheduled-assessments' },
          { label: 'Question review' },
        ]}
      />
      <ConsoleHero
        icon={FileSearch}
        eyebrow="Assessments"
        title="Question review"
        description="Blocking issues cannot be answered correctly as written. Review flags are prompts to re-read — some are deliberate. “No issues” means the text is well formed, not that the paper is good."
      />
      <QuestionReviewScreen assessmentId={assessmentId} />
    </div>
  );
}
