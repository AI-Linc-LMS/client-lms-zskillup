import { Ticket } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ConsoleHero } from '@/components/layout/ConsoleHero';
import { CouponsManager } from '@/components/admin/CouponsManager';

export const metadata = { title: 'Coupons & Campaigns' };

export default function AdminCouponsPage() {
  return (
    <div className="w-full">
      <Breadcrumb items={[{ label: 'Dashboard', href: '/admin/dashboard' }, { label: 'Coupons' }]} />
      <ConsoleHero
        className="mt-4"
        icon={Ticket}
        eyebrow="Growth"
        title="Coupons & campaigns"
        description="Create discount codes, group them into campaigns, and track redemptions, discounts, and revenue. Admins manage their own coupons; super-admins see and override all."
      />
      <CouponsManager />
    </div>
  );
}
