import { use } from 'react';
import { InterviewProctorGate } from '@/components/mock-interview/InterviewProctorGate';
import { SubscriptionLockGate } from '@/components/billing/SubscriptionLockGate';

export default function TakeInterviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <div className="py-2">
      {/* Run the subscription check BEFORE the proctor gate mounts, so an unpaid
          student sees the upsell lock immediately - never the camera/mic permission
          prompt or the loaded interview first. */}
      <SubscriptionLockGate tool="mock-interview" feature="Mock Interview">
        <InterviewProctorGate id={id} />
      </SubscriptionLockGate>
    </div>
  );
}
