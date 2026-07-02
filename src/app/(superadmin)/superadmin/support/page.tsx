import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { SupportInbox } from '@/components/admin/SupportInbox';

export default function SuperadminSupportPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Super Admin', href: '/superadmin/dashboard' }, { label: 'Support' }]} />
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Support</p>
        <h1 className="mt-1 text-[28px] font-extrabold tracking-tight text-navy">Support inbox</h1>
        <p className="mt-1 text-sm text-slate-500">Triage and respond to user tickets.</p>
      </header>
      <SupportInbox />
    </div>
  );
}
