import { CalendarClock } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ConsoleHero } from '@/components/layout/ConsoleHero';
import { SubscriptionsManager } from '@/components/admin/SubscriptionsManager';

/** Super-admin — subscription plans + college lifecycle. */
export default function SuperadminSubscriptionsPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Super Admin', href: '/superadmin/dashboard' },
          { label: 'Subscriptions' },
        ]}
      />
      <ConsoleHero
        icon={CalendarClock}
        eyebrow="Super Admin"
        title="Subscriptions"
        description="Manage the plan catalog and each college's subscription lifecycle."
      />
      <SubscriptionsManager />
    </div>
  );
}
