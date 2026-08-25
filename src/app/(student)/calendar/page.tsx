import type { Metadata } from 'next';
import { CalendarView } from '@/components/calendar/CalendarView';

export const metadata: Metadata = {
  title: 'My calendar',
  description: 'Live sessions, assessments and application deadlines in one place.',
};

export default function CalendarPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Workspace
        </p>
        <h1 className="mt-1 text-[28px] font-extrabold tracking-tight text-navy">My calendar</h1>
        <p className="mt-1 text-sm text-slate-500">
          Every live session, assessment and application deadline that applies to you - and a way
          to put each one in your own calendar.
        </p>
      </div>
      <CalendarView />
    </div>
  );
}
