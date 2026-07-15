import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ConsoleHero } from '@/components/layout/ConsoleHero';
import { Megaphone } from 'lucide-react';
import { BroadcastComposer } from '@/components/admin/BroadcastComposer';

/** Admin console — broadcast composer (Phase 3, requires canBroadcast). */
export default function AdminBroadcastsPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Platform Admin', href: '/admin/dashboard' },
          { label: 'Broadcasts' },
        ]}
      />
      <ConsoleHero
        icon={Megaphone}
        eyebrow="Platform Admin"
        title="Broadcasts"
        description="Send an in-app notification to all students or a specific college."
      />
      <BroadcastComposer />
    </div>
  );
}
