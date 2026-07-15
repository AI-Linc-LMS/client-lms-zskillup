import { LifeBuoy } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ConsoleHero } from '@/components/layout/ConsoleHero';
import { SupportInbox } from '@/components/admin/SupportInbox';

export default function SuperadminSupportPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Super Admin', href: '/superadmin/dashboard' }, { label: 'Support' }]} />
      <ConsoleHero
        icon={LifeBuoy}
        eyebrow="Super Admin"
        title="Support inbox"
        description="Triage and respond to user tickets."
      />
      <SupportInbox />
    </div>
  );
}
