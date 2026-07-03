import { use } from 'react';
import { InterviewRunner } from '@/components/mock-interview/InterviewRunner';

export default function TakeInterviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <div className="py-2">
      <InterviewRunner id={id} />
    </div>
  );
}
