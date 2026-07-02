import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { StudentSupport } from '@/components/support/StudentSupport';

export default function SupportPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Home', href: '/dashboard' }, { label: 'Help & Support' }]} />
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Support</p>
        <h1 className="mt-1 text-[28px] font-extrabold tracking-tight text-navy">Help &amp; Support</h1>
        <p className="mt-1 text-sm text-slate-500">Raise a ticket and our team will get back to you.</p>
      </header>
      <StudentSupport />
    </div>
  );
}
