'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
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
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SkillMasteryHeatmap } from '@/components/adaptive/SkillMasteryHeatmap';
import { MisconceptionCallout } from '@/components/adaptive/MisconceptionCallout';
import { RemediationPath } from '@/components/adaptive/RemediationPath';
import { PerQuestionBreakdown } from '@/components/adaptive/PerQuestionBreakdown';
import { AccuracyDonut, MagicLoader, SkillRadar, Typewriter } from '@/components/adaptive/ResultsVisuals';
import {
  getAdaptiveResults,
  getNarrationSection,
  type AdaptiveResults,
  type NarrationHeadline,
  type NarrationMisconceptions,
  type NarrationPerQuestion,
  type NarrationRemediationPath,
} from '@/lib/api/adaptive';

const BRAND_GRAD = 'linear-gradient(135deg,#f7a14e 0%,#f37021 100%)';

/** Humanise an engine skill key for a button label. */
const prettySkill = (s: string) =>
  (s || 'skills')
    .replace(/^section-\d+-[a-z-]+--/, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (m) => m.toUpperCase())
    .trim()
    .slice(0, 24);

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
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background text-navy">
        <p className="text-rose-600">{loadError}</p>
        <Button variant="secondary" onClick={() => router.replace('/practice')}>Back</Button>
      </div>
    );
  }
  if (!results) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-7 animate-spin" /> Loading your results…
        </div>
      </div>
    );
  }

  const incorrect = results.total - results.correct;
  const timeMin = Math.max(1, Math.round(results.questions.reduce((s, q) => s + (q.timeMs ?? 0), 0) / 60000));
  // Send them BACK where they came from. This used to hardcode /practice, so a quiz
  // launched from a Company Hub (Study Material → Adaptive Quiz) still said
  // "Back to Practice" and dumped you on the wrong page.
  const back = results.companySlug
    ? { href: `/dashboard/company/${results.companySlug}`, label: 'Back to Company Hubs' }
    : { href: '/practice', label: 'Back to Practice' };
  // Weakest skills (lowest mastery) — labels the re-quiz CTA. The weak skill is
  // resolved to a topic server-side by the requiz endpoint (skill name → slug).
  const weakSkills = [...results.skillMastery].sort((a, b) => a.masteryPct - b.masteryPct);
  const requizHref = `/dashboard/quiz/adaptive?requiz=${sessionId}`;
  // A section is "settled" once it resolves to data OR an error — gating the
  // composer on data alone hangs the loader forever if any section errors.
  const settled = [headline, perQuestion, misconceptions, remediation].filter(
    (s) => s.data || s.error,
  ).length;
  const SECTIONS = [
    { label: 'Headline read', s: headline },
    { label: 'Per-question rationale', s: perQuestion },
    { label: 'Misconception patterns', s: misconceptions },
    { label: 'Next 15 minutes', s: remediation },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Results hero (dark navy so the accuracy donut + headline read) ── */}
      <div className="relative overflow-hidden border-b border-white/10 bg-gradient-to-br from-[#1f2d4d] via-[#16223f] to-[#0b1220] text-white">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -left-1/4 -top-1/3 size-[55vw] rounded-full bg-[#f37021]/15 blur-[120px]" />
          <div className="absolute -right-1/4 -top-1/4 size-[50vw] rounded-full bg-[#2563eb]/15 blur-[120px]" />
        </div>
        <div className="relative z-10 mx-auto max-w-5xl px-5 pb-8 pt-6 sm:px-6">
          <div className="flex items-center justify-between">
            <Link href={back.href} className="inline-flex items-center gap-1.5 text-xs text-white/60 transition-colors hover:text-white">
              <ArrowLeft className="size-3.5" /> {back.label}
            </Link>
            <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#ffb877]">
              Session results
            </span>
          </div>

          <div className="mt-5 flex flex-col items-center gap-4 sm:flex-row sm:items-center">
            <div className="shrink-0">
              <AccuracyDonut accuracy={results.accuracy} />
            </div>
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-widest text-white" style={{ background: BRAND_GRAD }}>
                <Sparkles className="size-3" /> Your results read
              </div>
              {headline.loading ? (
                <p className="flex items-center justify-center gap-2 text-sm text-white/60 sm:justify-start">
                  <Loader2 className="size-4 animate-spin" /> Reading your accuracy curve…
                </p>
              ) : headline.data?.headline ? (
                <h1 className="text-lg font-extrabold leading-snug sm:text-xl">
                  <Typewriter text={headline.data.headline} />
                </h1>
              ) : (
                <h1 className="text-lg font-extrabold leading-snug sm:text-xl">
                  {results.correct}/{results.total} correct across {results.questions.length} questions.
                </h1>
              )}
            </div>
          </div>

          {/* KPI rail */}
          <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 shadow-sm sm:grid-cols-3 lg:grid-cols-6">
            <Kpi icon={Target} label="Accuracy" value={`${results.accuracy}%`} tone="#10b981" />
            <Kpi icon={Zap} label="Points" value={results.pointsTotal ?? 0} tone="#f59e0b" />
            <Kpi icon={CheckCircle2} label="Correct" value={results.correct} tone="#10b981" />
            <Kpi icon={XCircle} label="Incorrect" value={incorrect} tone="#ef4444" />
            <Kpi icon={Brain} label="Questions" value={results.questions.length} tone="#6366f1" />
            <Kpi icon={Clock} label="Time" value={`${timeMin}m`} tone="#a855f7" />
          </div>
        </div>
      </div>

      {/* ── Magic streaming composer ─────────────────────────────────────── */}
      {settled < 4 ? (
        <div className="mx-auto max-w-5xl space-y-3 px-5 pt-6 sm:px-6">
          <MagicLoader />
          <div className="flex flex-wrap gap-2">
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
        </div>
      ) : null}

      {/* ── Single-scroll sections ───────────────────────────────────────── */}
      <div className="mx-auto max-w-5xl space-y-6 px-5 py-6 sm:px-6">
        <Section title="Skill mastery" icon={Brain}>
          {results.skillMastery.length >= 3 ? (
            <div className="mb-4 space-y-4">
              {/* Skill radar - its own prominent card so every skill + score is
                  clearly visible (full names, no truncation). */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <p className="mb-2 text-center text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  Skill radar
                </p>
                <SkillRadar skills={results.skillMastery} size={380} />
              </div>
              <SkillMasteryHeatmap skillMastery={results.skillMastery} />
            </div>
          ) : (
            <SkillMasteryHeatmap skillMastery={results.skillMastery} />
          )}
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
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold text-navy">Ready to close the gap?</p>
            <p className="mt-0.5 text-xs text-slate-500">
              Re-quiz your weakest skill{weakSkills[0] ? ` (${prettySkill(weakSkills[0].skill)})` : ''} or head back to Practice.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" asChild>
              <Link href={back.href}>{back.label}</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href={requizHref}>
                <RefreshCw className="mr-1 size-3.5" /> Re-quiz weakest skill
              </Link>
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
    <div className="bg-[#16223f] px-4 py-3.5">
      <span className="flex items-center gap-1.5 text-2xl font-black tabular-nums" style={{ color: tone }}>
        <Icon className="size-4" /> {value}
      </span>
      <span className="mt-1 block text-[10px] font-semibold uppercase tracking-wider text-white/50">{label}</span>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: typeof Brain; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-extrabold uppercase tracking-widest text-navy">
        <Icon className="size-4 text-orange" /> {title}
      </h2>
      {children}
    </section>
  );
}
function Loading({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 py-4 text-sm text-slate-500">
      <Loader2 className="size-4 animate-spin text-orange" /> {text}
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
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background text-navy">
        <p className="text-slate-400">No session specified.</p>
        <Button asChild variant="secondary"><Link href="/practice">Back to Practice</Link></Button>
      </div>
    );
  }
  return <AdaptiveResultsView sessionId={sessionId} />;
}

export default function AdaptiveResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center bg-background">
          <Loader2 className="size-8 animate-spin text-slate-400" />
        </div>
      }
    >
      <ResultsPage />
    </Suspense>
  );
}
