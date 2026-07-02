import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { SubscriptionsManager } from '@/components/admin/SubscriptionsManager';

/** Admin console — subscription plans + college lifecycle (requires canManageSubscriptions). */
export default function AdminSubscriptionsPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Platform Admin', href: '/admin/dashboard' },
          { label: 'Subscriptions' },
        ]}
      />
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Commercial</p>
        <h1 className="mt-1 text-[28px] font-extrabold tracking-tight text-navy">Subscriptions</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage the plan catalog and each college&apos;s subscription lifecycle.
        </p>
      </header>
      <SubscriptionsManager />
    </div>
  );
}
