import { CalendarClock } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ConsoleHero } from '@/components/layout/ConsoleHero';
import { RoundsScreen } from '@/components/admin/jobs/RoundsScreen';
import { DriveTabs } from '@/components/admin/jobs/DriveTabs';

/** Rounds, invites, RSVPs and the disclosure log (PRD §12, §13, §18.13). */
export default async function DriveRoundsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Platform Admin', href: '/admin/dashboard' },
          { label: 'Jobs', href: '/admin/jobs' },
          { label: 'Rounds' },
        ]}
      />
      <ConsoleHero
        icon={CalendarClock}
        eyebrow="Job board"
        title="Rounds and disclosures"
        description="Who is in each round, who replied, and what candidate data has gone to which employer. Capacity is reported rather than enforced — an over-full round is a decision the team is allowed to make."
      />
      <DriveTabs driveId={id} />
      <RoundsScreen driveId={id} />
    </div>
  );
}
