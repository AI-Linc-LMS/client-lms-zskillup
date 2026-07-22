'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  CalendarClock,
  CalendarX,
  Clock,
  ListChecks,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Trophy,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { SystemCheck } from '@/components/assessment/SystemCheck';
import type { ApiMockSummary } from '@/lib/api/mocks';
import type { ApiScheduledAssessment } from '@/lib/api/scheduling';

/**
 * Pre-assessment instructions gate (ITEM 29) — the dedicated Zone-B dark premium
 * screen shown BEFORE a scheduled mock assessment starts. It carries the details,
 * the instructions checklist, a required acknowledgement, and the SystemCheck.
 *
 * The server timer does NOT start here: the parent only mounts the runner on
 * `onBegin`, and the runner starts the attempt exactly then.
 */

function fmt(iso: string): string {
  return new Date(iso).toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

interface Detail {
  key: string;
  icon: typeof Clock;
  label: string;
  value: string;
}

export function AssessmentInstructionsGate({
  mock,
  sched,
  proctored,
  onBegin,
}: {
  mock: ApiMockSummary | null;
  sched: ApiScheduledAssessment | null;
  proctored: boolean;
  onBegin: () => void;
}) {
  const [ack, setAck] = useState(false);
  const [starting, setStarting] = useState(false);

  const title = mock?.title ?? sched?.title ?? 'Assessment';
  const duration = mock?.durationMinutes ?? sched?.durationMinutes ?? null;

  // Details grid — omit any field we cannot show truthfully (never fabricated).
  const details: Detail[] = [
    duration != null
      ? { key: 'duration', icon: Clock, label: 'Duration', value: `${duration} min` }
      : null,
    mock?.totalQuestions != null
      ? { key: 'questions', icon: ListChecks, label: 'Questions', value: String(mock.totalQuestions) }
      : null,
    mock?.totalMarks != null
      ? { key: 'marks', icon: Star, label: 'Total marks', value: String(mock.totalMarks) }
      : null,
    mock?.passingScore != null
      ? { key: 'pass', icon: Target, label: 'Pass mark', value: `${mock.passingScore}%` }
      : null,
    sched?.scheduledAt
      ? { key: 'start', icon: CalendarClock, label: 'Starts', value: fmt(sched.scheduledAt) }
      : null,
    sched?.endsAt
      ? { key: 'end', icon: CalendarX, label: 'Closes', value: fmt(sched.endsAt) }
      : null,
  ].filter((d): d is Detail => d !== null);

  const instructions: string[] = [
    'Read every instruction carefully before you begin.',
    'The timer starts only when you press Begin and is enforced by our server — it auto-submits at zero.',
    'Do not refresh, close, or navigate away — the attempt cannot be resumed.',
    'Keep your internet connection stable throughout.',
    'Keep your device charged or plugged in.',
    ...(proctored
      ? [
          'Do not switch tabs or exit fullscreen — this is monitored and logged.',
          'Your webcam and microphone must stay on for the full assessment.',
        ]
      : []),
    'Any suspicious activity may be flagged for review.',
    'Once you submit, the assessment cannot be reopened.',
    'Grant all requested permissions before you start.',
  ];

  const begin = () => {
    if (starting) return;
    setStarting(true);
    onBegin();
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-navy text-white">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -left-1/4 -top-1/3 size-[48vw] rounded-full bg-orange/15 blur-[130px]" />
        <div className="absolute -right-1/4 top-1/4 size-[42vw] rounded-full bg-sky-500/10 blur-[130px]" />
      </div>

      {/* Top bar */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 px-5 py-6 sm:px-10">
        <Button variant="outline" size="sm" asChild>
          <Link href="/assessments">
            <ArrowLeft className="size-3.5" aria-hidden="true" /> Exit to assessments
          </Link>
        </Button>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ring-1 ring-inset',
            proctored
              ? 'bg-violet-500/15 text-violet-200 ring-violet-400/30'
              : 'bg-white/[0.06] text-white/70 ring-white/15',
          )}
        >
          {proctored ? <ShieldCheck className="size-3" aria-hidden="true" /> : <Sparkles className="size-3 text-orange" aria-hidden="true" />}
          {proctored ? 'Proctored Assessment' : 'Assessment'}
        </span>
      </div>

      <main className="relative z-10 mx-auto max-w-5xl px-5 pb-16 pt-2 sm:px-10">
        <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr] lg:gap-10">
          {/* Left column — details + instructions + acknowledgement */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange">
              Pre-assessment briefing
            </p>
            <h1 className="mt-3 text-3xl font-black leading-[1.08] tracking-tight sm:text-4xl">
              {title}
            </h1>

            {sched?.companyName ? (
              <div className="mt-4 inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                <span className="grid size-6 shrink-0 place-items-center overflow-hidden rounded-md bg-white">
                  {sched.companyLogoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={sched.companyLogoUrl} alt="" className="max-h-4 max-w-full object-contain" />
                  ) : (
                    <span className="text-[9px] font-bold text-slate-600">
                      {sched.companyName.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </span>
                <span className="text-sm font-bold text-white/85">{sched.companyName}</span>
              </div>
            ) : null}

            {sched?.description ? (
              <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-white/65">{sched.description}</p>
            ) : null}

            {/* Details grid */}
            {details.length > 0 ? (
              <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {details.map(({ key, icon: Icon, label, value }) => (
                  <div key={key} className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <Icon className="size-4 text-orange" aria-hidden="true" />
                    <p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-white/45">{label}</p>
                    <p className="mt-1 text-lg font-black text-white">{value}</p>
                  </div>
                ))}
              </div>
            ) : null}

            {/* Instructions checklist */}
            <div className="mt-8 rounded-xl border border-white/10 bg-white/5 p-5">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/45">
                <ListChecks className="size-3.5" aria-hidden="true" /> Instructions
              </p>
              <ul className="mt-3 space-y-2.5 text-[13px] leading-snug text-white/75">
                {instructions.map((line) => (
                  <li key={line} className="flex gap-2.5">
                    <BadgeCheck className="mt-0.5 size-4 shrink-0 text-orange" aria-hidden="true" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>

              {sched?.instructions ? (
                <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.04] p-3.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/45">
                    From the organiser
                  </p>
                  <p className="mt-1.5 whitespace-pre-line text-[13px] leading-relaxed text-white/75">
                    {sched.instructions}
                  </p>
                </div>
              ) : null}
            </div>

            {/* Acknowledgement */}
            <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4 focus-within:ring-2 focus-within:ring-orange/40">
              <input
                type="checkbox"
                checked={ack}
                onChange={(e) => setAck(e.target.checked)}
                className="mt-0.5 size-4 shrink-0 rounded border-white/30 bg-transparent text-orange accent-orange focus-visible:ring-2 focus-visible:ring-orange/40 focus-visible:ring-offset-2 focus-visible:ring-offset-navy"
              />
              <span className="text-sm font-semibold text-white/85">
                I have read and understood the instructions, and I am ready to begin.
              </span>
            </label>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button size="lg" onClick={begin} disabled={!ack || starting}>
                {proctored ? <ShieldCheck className="size-4" aria-hidden="true" /> : <Trophy className="size-4" aria-hidden="true" />}
                {starting ? 'Starting…' : 'Begin Assessment'}
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/assessments">Maybe later</Link>
              </Button>
            </div>

            <p className="mt-3 flex items-center gap-1.5 text-[11px] text-white/45">
              <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />
              Once you begin, the timer cannot be paused and the final submit is one-way.
            </p>
          </div>

          {/* Right column — system check */}
          <aside>
            <SystemCheck proctored={proctored} />
          </aside>
        </div>
      </main>
    </div>
  );
}
