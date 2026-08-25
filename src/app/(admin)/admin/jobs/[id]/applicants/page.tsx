import { Users } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ConsoleHero } from '@/components/layout/ConsoleHero';
import { ApplicantsScreen } from '@/components/admin/jobs/ApplicantsScreen';

export default async function ApplicantsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Platform Admin', href: '/admin/dashboard' },
          { label: 'Jobs', href: '/admin/jobs' },
          { label: 'Applicants' },
        ]}
      />
      <ConsoleHero
        icon={Users}
        eyebrow="Job board"
        title="Applicants"
        description="Move people through the pipeline. Every status change emails the candidate."
      />
      <ApplicantsScreen jobId={id} />
    </div>
  );
}
