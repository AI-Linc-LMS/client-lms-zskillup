import { Megaphone } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ConsoleHero } from '@/components/layout/ConsoleHero';
import { BroadcastComposer } from '@/components/admin/BroadcastComposer';

/** Super-admin — broadcast composer (Phase 3). */
export default function SuperadminBroadcastsPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Super Admin', href: '/superadmin/dashboard' },
          { label: 'Broadcasts' },
        ]}
      />
      <ConsoleHero
        icon={Megaphone}
        eyebrow="Super Admin"
        title="Broadcasts"
        description="Send an in-app notification to all students or a specific college."
      />
      <BroadcastComposer />
    </div>
  );
}
