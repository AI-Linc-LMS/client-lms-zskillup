import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { TestimonialsManager } from '@/components/admin/TestimonialsManager';

export default function SuperadminTestimonialsPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Super Admin', href: '/superadmin/dashboard' }, { label: 'Testimonials' }]} />
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Marketing</p>
        <h1 className="mt-1 text-[28px] font-extrabold tracking-tight text-navy">Testimonials</h1>
        <p className="mt-1 text-sm text-slate-500">Curate the testimonials shown on the public site.</p>
      </header>
      <TestimonialsManager />
    </div>
  );
}
