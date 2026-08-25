import { Briefcase } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ConsoleHero } from '@/components/layout/ConsoleHero';
import { EditJobComposer } from '@/components/admin/jobs/EditJobComposer';

export default async function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Platform Admin', href: '/admin/dashboard' },
          { label: 'Jobs', href: '/admin/jobs' },
          { label: 'Edit' },
        ]}
      />
      <ConsoleHero
        icon={Briefcase}
        eyebrow="Job board"
        title="Edit posting"
        description="Changes save as you move between steps."
      />
      <EditJobComposer jobId={id} />
    </div>
  );
}
