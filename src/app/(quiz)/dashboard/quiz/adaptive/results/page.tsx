'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Brain,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Sparkles,
  Target,
  TrendingUp,
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

// ── Section loader ─────────────────────────────────────────────────────────────

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
      .then((raw) => {
        if (!cancelled) setState({ loading: false, data: raw as T, error: null });
      })
      .catch((err: Error) => {
        if (!cancelled) setState({ loading: false, data: null, error: err.message });
      });
    return () => { cancelled = true; };
  }, [sessionId, section, enabled]);

  return state;
}

// ── Accuracy ring ──────────────────────────────────────────────────────────────

function AccuracyRing({ accuracy }: { accuracy: number }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const dash = (accuracy / 100) * circ;
  return (
    <svg width={96} height={96} viewBox="0 0 96 96" className="rotate-[-90deg]">
      <circle cx={48} cy={48} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={8} />
      <circle
        cx={48} cy={48} r={r} fill="none"
        stroke={accuracy >= 70 ? '#10b981' : accuracy >= 50 ? '#f59e0b' : '#ef4444'}
        strokeWidth={8} strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round" className="transition-all duration-1000"
      />
    </svg>
  );
}

// ── Main results view ─────────────────────────────────────────────────────────

function AdaptiveResultsView({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [results, setResults] = useState<AdaptiveResults | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'skills' | 'questions' | 'insights' | 'plan'>('skills');

  useEffect(() => {
    let cancelled = false;
    getAdaptiveResults(sessionId)
      .then((r) => { if (!cancelled) setResults(r); })
      .catch((e: Error) => { if (!cancelled) setLoadError(e.message); });
    return () => { cancelled = true; };
  }, [sessionId]);

  const headline = useNarrationSection<NarrationHeadline>(sessionId, 'headline', !!results);
  const perQuestion = useNarrationSection<NarrationPerQuestion>(sessionId, 'per_question', activeTab === 'questions' && !!results);
  const misconceptions = useNarrationSection<NarrationMisconceptions>(sessionId, 'misconceptions', activeTab === 'insights' && !!results);
  const remediation = useNarrationSection<NarrationRemediationPath>(sessionId, 'remediation_path', activeTab === 'plan' && !!results);

  if (loadError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-navy text-white">
        <p className="text-red-300">{loadError}</p>
        <Button variant="secondary" onClick={() => router.replace('/mock-tests')}>Back</Button>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-navy">
        <Loader2 className="size-8 animate-spin text-white/50" />
      </div>
    );
  }

  const TABS = [
    { key: 'skills', label: 'Skills', icon: Brain },
    { key: 'questions', label: 'Questions', icon: CheckCircle2 },
    { key: 'insights', label: 'Insights', icon: Target },
    { key: 'plan', label: 'Study plan', icon: TrendingUp },
  ] as const;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero header */}
      <div className="bg-navy text-white">
        <div className="mx-auto max-w-3xl px-6 pt-6 pb-10">
          <div className="flex items-center justify-between mb-6">
            <Link
              href="/mock-tests"
              className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition-colors"
            >
              <ArrowLeft className="size-3.5" />
              Back to mock tests
            </Link>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-orange/30 bg-orange/10 px-3 py-1 text-[11px] font-semibold text-orange">
              <Sparkles className="size-3" /> AI Report
            </span>
          </div>

          {/* Headline */}
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-4">
              <AccuracyRing accuracy={results.accuracy} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-extrabold">{results.accuracy}%</span>
                <span className="text-[10px] text-white/50">accuracy</span>
              </div>
            </div>

            {headline.loading ? (
              <div className="flex items-center gap-2 text-white/50 text-sm">
                <Loader2 className="size-4 animate-spin" /> Generating AI summary…
              </div>
            ) : headline.data ? (
              <h1 className="text-lg font-bold leading-snug max-w-lg">
                {headline.data.headline}
              </h1>
            ) : (
              <h1 className="text-lg font-bold leading-snug">
                {results.correct}/{results.total} correct · {results.questions.length} questions answered
              </h1>
            )}

            <div className="mt-4 flex flex-wrap justify-center gap-4 text-[11px] text-white/60">
              <span>{results.correct}/{results.total} correct</span>
              <span>{results.questions.length} questions answered</span>
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="border-t border-white/10">
          <div className="mx-auto max-w-3xl px-6 flex gap-0">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as typeof activeTab)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 transition-colors',
                  activeTab === key
                    ? 'border-orange text-orange'
                    : 'border-transparent text-white/50 hover:text-white/80',
                )}
              >
                <Icon className="size-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="mx-auto max-w-3xl px-6 py-6">
        {activeTab === 'skills' && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-navy uppercase tracking-widest">Skill Mastery Profile</h2>
            <SkillMasteryHeatmap skillMastery={results.skillMastery} />
          </div>
        )}

        {activeTab === 'questions' && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-navy uppercase tracking-widest">Question Breakdown</h2>
            {perQuestion.loading && (
              <div className="flex items-center gap-2 text-sm text-slate-500 py-4">
                <Loader2 className="size-4 animate-spin text-orange" />
                Loading AI analysis…
              </div>
            )}
            <PerQuestionBreakdown
              questions={results.questions}
              perQuestionNarration={perQuestion.data?.per_question}
            />
          </div>
        )}

        {activeTab === 'insights' && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-navy uppercase tracking-widest">Misconception Analysis</h2>
            {misconceptions.loading ? (
              <div className="flex items-center gap-2 text-sm text-slate-500 py-4">
                <Loader2 className="size-4 animate-spin text-orange" />
                Analysing your error patterns…
              </div>
            ) : misconceptions.data ? (
              <MisconceptionCallout misconceptions={misconceptions.data.misconceptions} />
            ) : misconceptions.error ? (
              <p className="text-sm text-red-500">{misconceptions.error}</p>
            ) : null}
          </div>
        )}

        {activeTab === 'plan' && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-navy uppercase tracking-widest">Personalised Study Plan</h2>
            {remediation.loading ? (
              <div className="flex items-center gap-2 text-sm text-slate-500 py-4">
                <Loader2 className="size-4 animate-spin text-orange" />
                Building your study plan…
              </div>
            ) : remediation.data ? (
              <RemediationPath steps={remediation.data.remediation_path} />
            ) : remediation.error ? (
              <p className="text-sm text-red-500">{remediation.error}</p>
            ) : null}
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <div className="mx-auto max-w-3xl px-6 pb-10">
        <div className="rounded-xl border bg-white p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-navy">Ready to improve?</p>
            <p className="text-xs text-slate-500 mt-0.5">Retake the quiz or practice your weak skills.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" asChild>
              <Link href="/practice">Practice skills</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/mock-tests">
                <RefreshCw className="size-3.5 mr-1" />
                Retake
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultsPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session');
  if (!sessionId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-navy text-white">
        <p className="text-white/60">No session specified.</p>
        <Button asChild variant="secondary">
          <Link href="/mock-tests">Back to mock tests</Link>
        </Button>
      </div>
    );
  }
  return <AdaptiveResultsView sessionId={sessionId} />;
}

export default function AdaptiveResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-navy">
          <Loader2 className="size-8 animate-spin text-white/50" />
        </div>
      }
    >
      <ResultsPage />
    </Suspense>
  );
}
