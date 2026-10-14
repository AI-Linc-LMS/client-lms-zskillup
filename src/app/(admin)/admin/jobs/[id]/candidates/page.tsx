import { Target } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ConsoleHero } from '@/components/layout/ConsoleHero';
import { CandidateFitScreen } from '@/components/admin/jobs/CandidateFitScreen';

export default async function CandidatesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Platform Admin', href: '/admin/dashboard' },
          { label: 'Jobs', href: '/admin/jobs' },
          { label: 'Candidate fit' },
        ]}
      />
      <ConsoleHero
        icon={Target}
        eyebrow="Job board"
        title="Candidate fit"
        description="Who may be considered, and how they look. Eligibility and match are separate — a high score never overrides a failed criterion."
      />
      <CandidateFitScreen jobId={id} />
    </div>
  );
}
