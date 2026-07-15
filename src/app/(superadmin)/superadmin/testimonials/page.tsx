import { Quote } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ConsoleHero } from '@/components/layout/ConsoleHero';
import { TestimonialsManager } from '@/components/admin/TestimonialsManager';

export default function SuperadminTestimonialsPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Super Admin', href: '/superadmin/dashboard' }, { label: 'Testimonials' }]} />
      <ConsoleHero
        icon={Quote}
        eyebrow="Super Admin"
        title="Testimonials"
        description="Curate the testimonials shown on the public site."
      />
      <TestimonialsManager />
    </div>
  );
}
