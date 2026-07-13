import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { MockInterviewHome } from '@/components/mock-interview/MockInterviewHome';
import { SubscriptionLockGate } from '@/components/billing/SubscriptionLockGate';
import { Bot, ShieldCheck, Sparkles, Zap } from 'lucide-react';

export const metadata = {
  title: 'Mock Interview · ZSkillup',
  description:
    'Practise with an AI interviewer - adaptive questions, instant scored feedback, fullscreen proctoring, no camera.',
};

// The interview IS proctored: InterviewProctorGate puts it behind a fullscreen gate and
// tracks tab switches + fullscreen exits, blocking until the candidate returns. This copy
// predates that gate and still promised "no proctoring" — which was simply false, and a
// nasty surprise for a student who starts the interview expecting none.
// "No camera" stays: that part is true, and it's the reassuring half.
const PILLS = [
  { icon: Sparkles, label: 'Adaptive AI questions' },
  { icon: Zap, label: 'Instant scored feedback' },
  { icon: ShieldCheck, label: 'Fullscreen proctored · no camera' },
];

export default function MockInterviewPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Home', href: '/dashboard' }, { label: 'Mock Interview' }]} />

      {/* Hero */}
      <header data-tour="mi:hero" className="night-hero rounded-2xl p-6 shadow-sm sm:p-8">
        <div className="relative z-[1]">
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
            Pick a topic and difficulty, then have a real, adaptive conversation with an AI interviewer - and get a
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

      <SubscriptionLockGate tool="mock-interview" feature="Mock Interview">
        <MockInterviewHome />
      </SubscriptionLockGate>
    </div>
  );
}
