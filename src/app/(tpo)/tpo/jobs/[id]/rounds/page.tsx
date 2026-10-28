import { ListChecks } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ConsoleHero } from '@/components/layout/ConsoleHero';
import { JdPracticeScreen } from '@/components/admin/jobs/JdPracticeScreen';
import { TPO_JOBS_BASE } from '@/lib/api/jobs';

/**
 * A drive's rounds and the assessment behind each (TPO requirement 3).
 *
 * The round taxonomy already covers every type the brief lists — aptitude, technical
 * MCQ, coding, technical interview, HR interview, and an employer-defined "other" for
 * custom assessments — so this is the platform's own §23.2 planner pointed at the
 * college-scoped controller, not a second one built for TPOs.
 *
 * Readable for any drive this college can see, because a placement officer preparing
 * students for a national drive needs to know what its rounds are. Writing a plan needs
 * ownership: it changes what every college in a shared drive practises against.
 */
export default async function TpoDriveRoundsPage({
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
          { label: 'Placement cell', href: '/tpo/dashboard' },
          { label: 'Drives', href: '/tpo/jobs' },
          { label: 'Rounds' },
        ]}
      />
      <ConsoleHero
        icon={ListChecks}
        eyebrow="Placement cell"
        title="Rounds & assessments"
        description="What each round of this drive tests, and what your students practise against."
      />
      <JdPracticeScreen driveId={id} base={TPO_JOBS_BASE} />
    </div>
  );
}
