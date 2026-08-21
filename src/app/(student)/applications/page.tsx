import type { Metadata } from 'next';
import { MyApplications } from '@/components/jobs/MyApplications';

export const metadata: Metadata = {
  title: 'My applications',
  description: 'Every role you have applied to through ZSkillup, and where each one stands.',
};

export default function ApplicationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Placement
        </p>
        <h1 className="mt-1 text-[28px] font-extrabold tracking-tight text-navy">
          My applications
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Every role you have applied to here, newest first. We email you whenever one of
          them moves.
        </p>
      </div>
      <MyApplications />
    </div>
  );
}
