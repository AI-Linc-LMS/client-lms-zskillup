import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { Brain, ShieldCheck, Timer } from 'lucide-react';
import { CustomMockBuilder } from '@/components/practice/CustomMockBuilder';
import { MockAllowanceChip } from '@/components/practice/MockAllowanceChip';
import { MockHistory } from '@/components/practice/MockHistory';
import { ProfileLockGate } from '@/components/student/ProfileLockGate';
import { Reveal } from '@/components/motion/primitives';

/**
 * Mock Assessment (Mode 3) - student-assembled, non-adaptive, PROCTORED practice
 * assessments. Pick sections/topics, set size + duration, and run under the same
 * proctored assessment UI as the real assessments. Free users get one complimentary
 * mock (enforced server-side); premium unlocks unlimited attempts.
 */
export default function MockAssessmentPage() {
  return (
    <div className="space-y-8">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Mock Assessment' },
        ]}
      />

      <ProfileLockGate feature="Mock Assessment" contentClassName="space-y-8">
      <Reveal>
        <section data-tour="mock:hero" className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#0a0a0c] via-[#0d0e13] to-[#141a2e] p-6 text-white shadow-sm sm:p-8">
          <span aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-[#ffc42d]/25 blur-3xl" />
          <span aria-hidden className="pointer-events-none absolute -bottom-20 left-1/4 size-56 rounded-full bg-[#f5b400]/20 blur-3xl" />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-white/70 ring-1 ring-inset ring-white/15">
              <Brain className="size-3.5" /> Mock assessment
            </span>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Build your own mock, exam-style</h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/60">
              Choose the sections and topics you want, set the length, and sit a full proctored mock -
              the same experience as a real assessment, just for practice.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Feature icon={ShieldCheck} text="Camera-proctored, full-screen" />
              <Feature icon={Timer} text="Server-timed" />
              <MockAllowanceChip />
            </div>
          </div>
        </section>
      </Reveal>

      <CustomMockBuilder />

      <section data-tour="mock:history">
        <h2 className="mb-3 text-lg font-extrabold tracking-tight text-navy sm:text-xl">Your past mock attempts</h2>
        <MockHistory scope="custom" />
      </section>
      </ProfileLockGate>
    </div>
  );
}

function Feature({ icon: Icon, text }: { icon: typeof Timer; text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
      <Icon className="size-4 text-white/40" /> {text}
    </div>
  );
}
