import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { MockInterviewHome } from '@/components/mock-interview/MockInterviewHome';
import { Bot, ShieldOff, Sparkles, Zap } from 'lucide-react';

export const metadata = {
  title: 'Mock Interview · ZSkillup',
  description: 'Practise with an AI interviewer — adaptive questions, instant feedback, no proctoring.',
};

const PILLS = [
  { icon: Sparkles, label: 'Adaptive AI questions' },
  { icon: Zap, label: 'Instant scored feedback' },
  { icon: ShieldOff, label: 'No camera · no proctoring' },
];

export default function MockInterviewPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Home', href: '/dashboard' }, { label: 'Mock Interview' }]} />

      {/* Hero */}
      <header className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#101a30] via-navy to-[#1c2b4a] p-6 text-white shadow-sm sm:p-8">
        <span aria-hidden className="pointer-events-none absolute -right-10 -top-10 size-48 rounded-full bg-orange/20 blur-3xl" />
        <span aria-hidden className="pointer-events-none absolute -bottom-16 left-1/3 size-48 rounded-full bg-orange/10 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-xl bg-white/10 ring-1 ring-white/20 backdrop-blur">
              <Bot className="size-6 text-orange" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/50">Career</p>
              <h1 className="text-[26px] font-extrabold tracking-tight sm:text-[28px]">AI Mock Interview</h1>
            </div>
          </div>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/70">
            Pick a topic and difficulty, then have a real, adaptive conversation with an AI interviewer — and get a
            scored report with strengths and next steps at the end.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {PILLS.map((p) => {
              const Icon = p.icon;
              return (
                <span key={p.label} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80 ring-1 ring-white/15">
                  <Icon className="size-3.5 text-orange" /> {p.label}
                </span>
              );
            })}
          </div>
        </div>
      </header>

      <MockInterviewHome />
    </div>
  );
}
