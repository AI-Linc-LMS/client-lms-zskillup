import { Breadcrumb } from '@/components/layout/Breadcrumb';
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
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Engagement</p>
        <h1 className="mt-1 text-[28px] font-extrabold tracking-tight text-navy">Broadcasts</h1>
        <p className="mt-1 text-sm text-slate-600">
          Send an in-app notification to all students or a specific college.
        </p>
      </header>
      <BroadcastComposer />
    </div>
  );
}
