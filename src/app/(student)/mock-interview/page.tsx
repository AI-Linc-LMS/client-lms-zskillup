import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { MockInterviewHome } from '@/components/mock-interview/MockInterviewHome';

export const metadata = {
  title: 'Mock Interview · ZSkillup',
  description: 'Practise with an AI interviewer — adaptive questions, instant feedback, no proctoring.',
};

export default function MockInterviewPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Home', href: '/dashboard' }, { label: 'Mock Interview' }]} />
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Career</p>
        <h1 className="mt-1 text-[28px] font-extrabold tracking-tight text-navy">AI Mock Interview</h1>
        <p className="mt-1 text-sm text-slate-500">
          Pick a topic and difficulty, then have a real, adaptive conversation with an AI interviewer — with a scored report at the end.
        </p>
      </header>
      <MockInterviewHome />
    </div>
  );
}
