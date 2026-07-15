import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ConsoleHero } from '@/components/layout/ConsoleHero';
import { LifeBuoy } from 'lucide-react';
import { SupportInbox } from '@/components/admin/SupportInbox';

export default function AdminSupportPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Platform Admin', href: '/admin/dashboard' }, { label: 'Support' }]} />
      <ConsoleHero
        icon={LifeBuoy}
        eyebrow="Platform Admin"
        title="Support inbox"
        description="Triage and respond to user tickets."
      />
      <SupportInbox />
    </div>
  );
}
