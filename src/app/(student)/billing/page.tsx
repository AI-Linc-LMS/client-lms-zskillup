import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { PurchaseHistory } from '@/components/billing/PurchaseHistory';
import { REFUND_WINDOW_DAYS } from '@/shared/refund-window';

export const metadata = {
  title: 'Purchases & refunds · ZSkillup',
  description: `Your purchase history, invoices and the ${REFUND_WINDOW_DAYS}-day refund window.`,
};

export default function BillingPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Home', href: '/dashboard' }, { label: 'Purchases' }]} />
      <PurchaseHistory />
    </div>
  );
}
