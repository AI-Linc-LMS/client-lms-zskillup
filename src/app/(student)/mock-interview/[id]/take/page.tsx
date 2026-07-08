import { use } from 'react';
import { InterviewProctorGate } from '@/components/mock-interview/InterviewProctorGate';

export default function TakeInterviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <div className="py-2">
      <InterviewProctorGate id={id} />
    </div>
  );
}
