import { Briefcase } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ConsoleHero } from '@/components/layout/ConsoleHero';
import { JobComposer } from '@/components/admin/jobs/JobComposer';

export default function NewJobPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Platform Admin', href: '/admin/dashboard' },
          { label: 'Jobs', href: '/admin/jobs' },
          { label: 'New posting' },
        ]}
      />
      <ConsoleHero
        icon={Briefcase}
        eyebrow="Job board"
        title="New posting"
        description="Saved as a draft as you go - nothing is visible to students until you publish."
      />
      <JobComposer />
    </div>
  );
}
