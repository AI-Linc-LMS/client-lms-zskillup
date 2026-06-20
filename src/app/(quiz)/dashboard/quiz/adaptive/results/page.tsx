'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Brain,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  Sparkles,
  Target,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SkillMasteryHeatmap } from '@/components/adaptive/SkillMasteryHeatmap';
import { MisconceptionCallout } from '@/components/adaptive/MisconceptionCallout';
import { RemediationPath } from '@/components/adaptive/RemediationPath';
import { PerQuestionBreakdown } from '@/components/adaptive/PerQuestionBreakdown';
import {
  getAdaptiveResults,
  getNarrationSection,
  type AdaptiveResults,
  type NarrationHeadline,
  type NarrationMisconceptions,
  type NarrationPerQuestion,
  type NarrationRemediationPath,
} from '@/lib/api/adaptive';

const AI_GRAD = 'linear-gradient(135deg,#6366f1 0%,#a855f7 55%,#ec4899 100%)';

type NarrationState<T> = { loading: boolean; data: T | null; error: string | null };
function useNarrationSection<T>(
  sessionId: string | null,
  section: 'headline' | 'per_question' | 'misconceptions' | 'remediation_path',
  enabled: boolean,
): NarrationState<T> {
  const [state, setState] = useState<NarrationState<T>>({ loading: false, data: null, error: null });
  useEffect(() => {
    if (!sessionId || !enabled) return;
    let cancelled = false;
    setState({ loading: true, data: null, error: null });
    getNarrationSection(sessionId, section)
      .then((raw) => !cancelled && setState({ loading: false, data: raw as T, error: null }))
      .catch((err: Error) => !cancelled && setState({ loading: false, data: null, error: err.message }));
    return () => {
      cancelled = true;
    };
  }, [sessionId, section, enabled]);
  return state;
}

function AccuracyRing({ accuracy }: { accuracy: number }) {
  const r = 42;
  const circ = 2 * Math.PI * r;
  const dash = (accuracy / 100) * circ;
  const color = accuracy >= 80 ? '#10b981' : accuracy >= 60 ? '#6366f1' : accuracy >= 40 ? '#f59e0b' : '#ef4444';
  return (
    <svg width={112} height={112} viewBox="0 0 112 112" className="-rotate-90">
      <circle cx={56} cy={56} r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={9} />
      <circle
        cx={56} cy={56} r={r} fill="none" stroke={color} strokeWidth={9}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" className="transition-all duration-1000"
      />
    </svg>
  );
}

function AdaptiveResultsView({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [results, setResults] = useState<AdaptiveResults | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getAdaptiveResults(sessionId)
      .then((r) => !cancelled && setResults(r))
      .catch((e: Error) => !cancelled && setLoadError(e.message));
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  // Fire all four sections in parallel (AI Linc streams them in).
  const headline = useNarrationSection<NarrationHeadline>(sessionId, 'headline', !!results);
  const perQuestion = useNarrationSection<NarrationPerQuestion>(sessionId, 'per_question', !!results);
  const misconceptions = useNarrationSection<NarrationMisconceptions>(sessionId, 'misconceptions', !!results);
  const remediation = useNarrationSection<NarrationRemediationPath>(sessionId, 'remediation_path', !!results);

  if (loadError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0a0a14] text-white">
        <p className="text-rose-300">{loadError}</p>
        <Button variant="secondary" onClick={() => router.replace('/mock-tests')}>Back</Button>
      </div>
    );
  }
  if (!results) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#0a0a14] text-white/60">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-7 animate-spin" /> Loading your diagnostic…
        </div>
      </div>
    );
  }

  const incorrect = results.total - results.correct;
  const timeMin = Math.max(1, Math.round(results.questions.reduce((s, q) => s + (q.timeMs ?? 0), 0) / 60000));
  const ready = [headline, perQuestion, misconceptions, remediation].filter((s) => s.data).length;
  const SECTIONS = [
    { label: 'Headline read', s: headline },
    { label: 'Per-question rationale', s: perQuestion },
    { label: 'Misconception patterns', s: misconceptions },
    { label: 'Next 15 minutes', s: remediation },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Diagnostic hero (dark glass) ─────────────────────────────────── */}
      <div className="relative overflow-hidden bg-[#0a0a14] text-white">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -left-1/4 -top-1/3 size-[55vw] rounded-full bg-indigo-600/25 blur-[120px]" />
          <div className="absolute -right-1/4 -top-1/4 size-[50vw] rounded-full bg-pink-600/20 blur-[120px]" />
          <div className="absolute bottom-0 left-1/3 size-[45vw] rounded-full bg-purple-600/20 blur-[120px]" />
        </div>
        <div className="relative z-10 mx-auto max-w-5xl px-5 pb-8 pt-6 sm:px-6">
          <div className="flex items-center justify-between">
            <Link href="/mock-tests" className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white">
              <ArrowLeft className="size-3.5" /> Back to mock quizzes
            </Link>
            <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-pink-300">
              Results · Diagnostic
            </span>
          </div>

          <div className="mt-5 flex flex-col items-center gap-4 sm:flex-row sm:items-center">
            <div className="relative shrink-0">
              <AccuracyRing accuracy={results.accuracy} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black">{results.accuracy}%</span>
                <span className="text-[10px] text-white/50">accuracy</span>
              </div>
            </div>
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-widest text-white" style={{ background: AI_GRAD }}>
                <Sparkles className="size-3" /> AI Tutor&apos;s read
              </div>
              {headline.loading ? (
                <p className="flex items-center justify-center gap-2 text-sm text-white/50 sm:justify-start">
                  <Loader2 className="size-4 animate-spin" /> Reading your accuracy curve…
                </p>
              ) : (
                <h1 className="text-lg font-extrabold leading-snug sm:text-xl">
                  {headline.data?.headline ??
                    `${results.correct}/${results.total} correct across ${results.questions.length} adaptive questions.`}
                </h1>
              )}
            </div>
          </div>

          {/* KPI rail */}
          <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] sm:grid-cols-4 lg:grid-cols-5">
            <Kpi icon={Target} label="Accuracy" value={`${results.accuracy}%`} tone="#10b981" />
            <Kpi icon={CheckCircle2} label="Correct" value={results.correct} tone="#10b981" />
            <Kpi icon={XCircle} label="Incorrect" value={incorrect} tone="#ef4444" />
            <Kpi icon={Brain} label="Questions" value={results.questions.length} tone="#6366f1" />
            <Kpi icon={Clock} label="Time" value={`${timeMin}m`} tone="#a855f7" />
          </div>
        </div>
      </div>

      {/* ── Streaming composer ───────────────────────────────────────────── */}
      <div className="mx-auto max-w-5xl px-5 pt-6 sm:px-6">
        {ready < 4 ? (
          <div className="overflow-hidden rounded-2xl border border-indigo-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-bold text-navy">
                <Loader2 className="size-4 animate-spin text-indigo-500" /> Composing your diagnostic
              </p>
              <span className="text-xs font-bold text-slate-400">{ready}/4 sections</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {SECTIONS.map(({ label, s }) => (
                <span
                  key={label}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset',
                    s.data
                      ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                      : s.error
                        ? 'bg-rose-50 text-rose-700 ring-rose-200'
                        : 'bg-slate-50 text-slate-500 ring-slate-200',
                  )}
                >
                  {s.data ? <CheckCircle2 className="size-3.5" /> : s.loading ? <Loader2 className="size-3.5 animate-spin" /> : null}
                  {label}
                </span>
              ))}
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <motion.div
                className="h-full rounded-full"
                style={{ background: AI_GRAD }}
                initial={false}
                animate={{ width: `${(ready / 4) * 100}%` }}
                transition={{ type: 'spring', stiffness: 120, damping: 22 }}
              />
            </div>
          </div>
        ) : null}
      </div>

      {/* ── Single-scroll sections ───────────────────────────────────────── */}
      <div className="mx-auto max-w-5xl space-y-6 px-5 py-6 sm:px-6">
        <Section title="Skill mastery" icon={Brain}>
          <SkillMasteryHeatmap skillMastery={results.skillMastery} />
        </Section>

        <Section title="Your next 15 minutes" icon={TrendingUp}>
          {remediation.loading ? (
            <Loading text="Plotting a path forward…" />
          ) : remediation.data ? (
            <RemediationPath steps={remediation.data.remediation_path} />
          ) : remediation.error ? (
            <RetryNote msg={remediation.error} />
          ) : null}
        </Section>

        {misconceptions.data && misconceptions.data.misconceptions.length > 0 ? (
          <Section title="Misconception patterns" icon={Target}>
            <MisconceptionCallout misconceptions={misconceptions.data.misconceptions} />
          </Section>
        ) : misconceptions.loading ? (
          <Section title="Misconception patterns" icon={Target}>
            <Loading text="Clustering wrong answers…" />
          </Section>
        ) : null}

        <Section title="Question by question" icon={CheckCircle2}>
          {perQuestion.loading ? <Loading text="Annotating each answer…" /> : null}
          <PerQuestionBreakdown questions={results.questions} perQuestionNarration={perQuestion.data?.per_question} />
        </Section>

        {/* CTA */}
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5">
          <div>
            <p className="text-sm font-bold text-navy">Ready to close the gap?</p>
            <p className="mt-0.5 text-xs text-slate-500">Practise your weak skills or take another adaptive quiz.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" asChild>
              <Link href="/practice">Practise skills</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/mock-tests"><RefreshCw className="mr-1 size-3.5" /> Retake</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Target;
  label: string;
  value: string | number;
  tone: string;
}) {
  return (
    <div className="bg-[#0a0a14]/40 px-4 py-3.5">
      <span className="flex items-center gap-1.5 text-2xl font-black tabular-nums" style={{ color: tone }}>
        <Icon className="size-4" /> {value}
      </span>
      <span className="mt-1 block text-[10px] font-semibold uppercase tracking-wider text-white/45">{label}</span>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: typeof Brain; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-extrabold uppercase tracking-widest text-navy">
        <Icon className="size-4 text-indigo-500" /> {title}
      </h2>
      {children}
    </section>
  );
}
function Loading({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 py-4 text-sm text-slate-500">
      <Loader2 className="size-4 animate-spin text-indigo-500" /> {text}
    </div>
  );
}
function RetryNote({ msg }: { msg: string }) {
  return <p className="py-4 text-sm text-rose-500">{msg}</p>;
}

function ResultsPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session');
  if (!sessionId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0a0a14] text-white">
        <p className="text-white/60">No session specified.</p>
        <Button asChild variant="secondary"><Link href="/mock-tests">Back to mock quizzes</Link></Button>
      </div>
    );
  }
  return <AdaptiveResultsView sessionId={sessionId} />;
}

export default function AdaptiveResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center bg-[#0a0a14]">
          <Loader2 className="size-8 animate-spin text-white/40" />
        </div>
      }
    >
      <ResultsPage />
    </Suspense>
  );
}
