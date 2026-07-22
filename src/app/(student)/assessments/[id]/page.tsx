'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarClock, CheckCircle2, Clock, Loader2, PlayCircle, ShieldCheck, Trophy } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ProfileLockGate } from '@/components/student/ProfileLockGate';
import { getMySchedule, getScheduledAssessment, type ApiScheduledAssessment } from '@/lib/api/scheduling';
import { getMockHistory } from '@/lib/api/mocks';
import { Button } from '@/components/ui/button';
import { StatusPill } from '@/components/student/StatusPill';

const fmt = (iso: string) =>
  new Date(iso).toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

/** Split ms remaining into a d/h/m/s countdown string. */
function countdownParts(ms: number): { d: number; h: number; m: number; s: number } {
  const t = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(t / 86400), h: Math.floor((t % 86400) / 3600), m: Math.floor((t % 3600) / 60), s: t % 60 };
}

/**
 * Per-assessment landing + live countdown (#4c). This is the target of the emailed
 * deep-link (a pure path, so it survives the login bounce). Shows the details, a
 * ticking countdown, and a Start button that stays disabled until the scheduled
 * time and enables inside the live window - then routes through the instructions
 * gate (#29). Already-attempted shows "View result"; ended shows the leaderboard.
 */
export default function AssessmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [assessment, setAssessment] = useState<ApiScheduledAssessment | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const [a, hist] = await Promise.all([
        getScheduledAssessment(id).catch(() =>
          getMySchedule()
            .then((list) => list.find((x) => x.id === id) ?? null)
            .catch(() => null),
        ),
        getMockHistory('assessment').catch(() => [] as Array<{ mockTestId: string; attemptId: string }>),
      ]);
      if (!alive) return;
      setAssessment(a);
      if (a?.mockTestId) setAttemptId(hist.find((h) => h.mockTestId === a.mockTestId)?.attemptId ?? null);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  const startMs = assessment ? new Date(assessment.scheduledAt).getTime() : 0;
  const endMs = assessment ? startMs + assessment.durationMinutes * 60_000 : 0;
  const isLive = assessment ? now >= startMs && now <= endMs : false;
  const isEnded = assessment ? now > endMs : false;
  const startHref =
    assessment && assessment.mockTestId
      ? `/dashboard/quiz?mock=${assessment.mockTestId}&assessment=${assessment.id}${assessment.proctored ? '&proctored=1' : ''}`
      : null;
  const cp = countdownParts(startMs - now);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <Breadcrumb
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Assessments', href: '/assessments' },
          { label: assessment?.title ?? 'Assessment' },
        ]}
      />
      <ProfileLockGate feature="Assessments">
        {loading ? (
          <div className="grid min-h-[40vh] place-items-center">
            <Loader2 className="size-6 animate-spin text-orange" />
          </div>
        ) : !assessment ? (
          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-sm font-bold text-navy">This assessment isn&apos;t available to you.</p>
            <p className="mt-1 text-sm text-slate-600">It may not be assigned to you, or the link has expired.</p>
            <Link href="/assessments" className="mt-4 inline-block text-sm font-semibold text-orange hover:underline">
              Back to my assessments →
            </Link>
          </div>
        ) : (
          <div className="mt-4 space-y-5">
            {/* Hero with countdown */}
            <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-[#0a0a0c] via-[#0d0e13] to-[#141a2e] p-6 text-white shadow-sm sm:p-8">
              <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-52 rounded-full bg-[#f5b400]/15 blur-3xl" />
              <div className="relative">
                <div className="flex items-center gap-3">
                  {assessment.companyLogoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={assessment.companyLogoUrl} alt={assessment.companyName} className="size-10 rounded-lg bg-white/95 object-contain p-1" />
                  ) : null}
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-white/50">{assessment.companyName}</p>
                    <h1 className="text-[22px] font-extrabold tracking-tight sm:text-[26px]">{assessment.title}</h1>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-white/70">
                  <span className="inline-flex items-center gap-1.5"><CalendarClock className="size-3.5 text-[#ffc42d]" /> {fmt(assessment.scheduledAt)}</span>
                  <span className="inline-flex items-center gap-1.5"><Clock className="size-3.5 text-[#ffc42d]" /> {assessment.durationMinutes} min</span>
                  {assessment.proctored ? (
                    <span className="inline-flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-[#ffc42d]" /> Proctored</span>
                  ) : null}
                </div>

                {!isLive && !isEnded ? (
                  <div className="mt-6">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-white/50">Starts in</p>
                    <div className="mt-1.5 flex items-end gap-2 tabular-nums">
                      {[
                        { v: cp.d, l: 'days' },
                        { v: cp.h, l: 'hrs' },
                        { v: cp.m, l: 'min' },
                        { v: cp.s, l: 'sec' },
                      ].map((u) => (
                        <div key={u.l} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center">
                          <span className="block text-2xl font-extrabold leading-none">{String(u.v).padStart(2, '0')}</span>
                          <span className="mt-1 block text-[9px] font-semibold uppercase tracking-widest text-white/50">{u.l}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="mt-6">
                  {attemptId ? (
                    <Button size="lg" variant="secondary" asChild>
                      <Link href={`/dashboard/quiz?report=${attemptId}`}>
                        <CheckCircle2 className="size-4" /> Completed · View result
                      </Link>
                    </Button>
                  ) : isEnded ? (
                    <Button size="lg" variant="secondary" asChild>
                      <Link href={`/assessments/${assessment.id}/leaderboard`}>
                        <Trophy className="size-4" /> View leaderboard
                      </Link>
                    </Button>
                  ) : isLive && startHref ? (
                    <Button size="lg" asChild>
                      <Link href={startHref}>
                        <PlayCircle className="size-4" /> Start Assessment
                      </Link>
                    </Button>
                  ) : (
                    <Button size="lg" disabled>
                      <Clock className="size-4" /> Not started yet
                    </Button>
                  )}
                </div>
              </div>
            </section>

            {/* Details / status */}
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-navy">Assessment details</h2>
                {isLive ? (
                  <StatusPill tone="positive" label="Live now" />
                ) : isEnded ? (
                  <StatusPill tone="neutral" label="Closed" />
                ) : (
                  <StatusPill tone="warning" label="Scheduled" />
                )}
              </div>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Company</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-navy">{assessment.companyName}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Duration</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-navy">{assessment.durationMinutes} minutes</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Scheduled</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-navy">{fmt(assessment.scheduledAt)}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Proctoring</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-navy">{assessment.proctored ? 'Camera & mic required' : 'Not proctored'}</dd>
                </div>
              </dl>
              {assessment.companySlug ? (
                <Link href={`/dashboard/company/${assessment.companySlug}`} className="mt-4 inline-block text-sm font-semibold text-orange hover:underline">
                  View {assessment.companyName} hub →
                </Link>
              ) : null}
            </section>
          </div>
        )}
      </ProfileLockGate>
    </div>
  );
}
