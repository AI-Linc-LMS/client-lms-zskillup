import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ConsoleHero } from '@/components/layout/ConsoleHero';
import { Briefcase } from 'lucide-react';
import { JobsManager } from '@/components/admin/JobsManager';

export default function AdminJobsPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Platform Admin', href: '/admin/dashboard' }, { label: 'Jobs' }]} />
      <ConsoleHero
        icon={Briefcase}
        eyebrow="Platform Admin"
        title="Job board"
        description="Post openings, publish them to the public board, and share each job's own link."
      />
      <JobsManager />
    </div>
  );
}
