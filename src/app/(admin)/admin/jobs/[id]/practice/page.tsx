import { GraduationCap } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ConsoleHero } from '@/components/layout/ConsoleHero';
import { JdPracticeScreen } from '@/components/admin/jobs/JdPracticeScreen';
import { DriveTabs } from '@/components/admin/jobs/DriveTabs';

/** Read a JD into a round plan, and see each round's practice (PRD §23.1, §23.2). */
export default async function DrivePracticePage({
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
          { label: 'Practice' },
        ]}
      />
      <ConsoleHero
        icon={GraduationCap}
        eyebrow="Job board"
        title="JD to practice"
        description="Turn the employer's description into the rounds they actually named, then plan the preparation for each. Nothing is guessed — if the JD does not describe its process, the plan comes back empty and says so."
      />
      <DriveTabs driveId={id} />
      <JdPracticeScreen driveId={id} />
    </div>
  );
}
