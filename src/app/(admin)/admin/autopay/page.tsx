import { Repeat } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ConsoleHero } from '@/components/layout/ConsoleHero';
import { AutopayLedger } from '@/components/admin/AutopayLedger';

export const metadata = { title: 'Autopay' };

export default function AdminAutopayPage() {
  return (
    <div className="w-full">
      <Breadcrumb items={[{ label: 'Dashboard', href: '/admin/dashboard' }, { label: 'Autopay' }]} />
      <ConsoleHero
        className="mt-4"
        icon={Repeat}
        eyebrow="Billing"
        title="Autopay"
        description="Every student’s recurring renewal: what it renews, whether it is charging, every paid, failed and refunded attempt, and what it has collected. Stopping a mandate keeps the access already paid for and is audited."
      />
      <AutopayLedger />
    </div>
  );
}
