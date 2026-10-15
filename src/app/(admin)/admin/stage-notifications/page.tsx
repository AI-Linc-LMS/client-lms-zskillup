import { Mail } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ConsoleHero } from '@/components/layout/ConsoleHero';
import { StageNotificationsScreen } from '@/components/admin/StageNotificationsScreen';

/** Which stage changes email the candidate (PRD §11). */
export default function StageNotificationsPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Platform Admin', href: '/admin/dashboard' },
          { label: 'Stage emails' },
        ]}
      />
      <ConsoleHero
        icon={Mail}
        eyebrow="Notifications"
        title="Stage emails"
        description="Every stage is on by default — a student who hears nothing concludes they were ignored. The candidate is told the stage only; the internal reason and any panel feedback never leave the platform."
      />
      <StageNotificationsScreen />
    </div>
  );
}
