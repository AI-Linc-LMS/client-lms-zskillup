import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { FinancialsDashboard } from '@/components/admin/FinancialsDashboard';

export default function AdminFinancialsPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Platform Admin', href: '/admin/dashboard' }, { label: 'Financials' }]} />
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Commercial</p>
        <h1 className="mt-1 text-[28px] font-extrabold tracking-tight text-navy">Financials</h1>
        <p className="mt-1 text-sm text-slate-500">Recurring revenue and plan mix at a glance.</p>
      </header>
      <FinancialsDashboard />
    </div>
  );
}
