import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ConsoleHero } from '@/components/layout/ConsoleHero';
import { Quote } from 'lucide-react';
import { TestimonialsManager } from '@/components/admin/TestimonialsManager';

export default function AdminTestimonialsPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Platform Admin', href: '/admin/dashboard' }, { label: 'Testimonials' }]} />
      <ConsoleHero
        icon={Quote}
        eyebrow="Platform Admin"
        title="Testimonials"
        description="Curate the testimonials shown on the public site."
      />
      <TestimonialsManager />
    </div>
  );
}
