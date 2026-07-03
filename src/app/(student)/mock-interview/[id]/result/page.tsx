import { use } from 'react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { InterviewResult } from '@/components/mock-interview/InterviewResult';

export default function InterviewResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Home', href: '/dashboard' }, { label: 'Mock Interview', href: '/mock-interview' }, { label: 'Result' }]} />
      <InterviewResult id={id} />
    </div>
  );
}
