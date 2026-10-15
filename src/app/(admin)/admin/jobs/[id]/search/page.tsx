import { Users } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ConsoleHero } from '@/components/layout/ConsoleHero';
import { CandidateSearchScreen } from '@/components/admin/jobs/CandidateSearchScreen';

/**
 * Searching and acting on a drive's candidates (PRD §15).
 *
 * A separate page from candidate fit rather than another tab on it: fit answers "how do
 * these people look", and this answers "who do I act on today". They are read at
 * different moments and the second one is where the work happens.
 */
export default async function CandidateSearchPage({
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
          { label: 'Candidate search' },
        ]}
      />
      <ConsoleHero
        icon={Users}
        eyebrow="Job board"
        title="Candidate search"
        description="Saved views answer the questions asked every week — eligible and unplaced, high match but not applied, applied and not reviewed. A blank score means nobody has measured that student, not that they scored badly."
      />
      <CandidateSearchScreen driveId={id} />
    </div>
  );
}
