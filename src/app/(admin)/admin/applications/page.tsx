import { Search } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ConsoleHero } from '@/components/layout/ConsoleHero';
import { ApplicationSearchScreen } from '@/components/admin/jobs/ApplicationSearchScreen';

export default function AdminApplicationSearchPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Platform Admin', href: '/admin/dashboard' },
          { label: 'Student search' },
        ]}
      />
      <ConsoleHero
        icon={Search}
        eyebrow="Across every drive"
        title="Student search"
        description="Who applied to a company, who is in a round, who holds an offer. An export carries exactly what is on screen."
      />
      <ApplicationSearchScreen basePath="/admin" />
    </div>
  );
}
