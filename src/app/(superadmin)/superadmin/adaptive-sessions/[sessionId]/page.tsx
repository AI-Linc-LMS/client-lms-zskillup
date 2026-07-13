'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { use } from 'react';
import { ArrowLeft, Brain, Loader2 } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { SkillMasteryHeatmap } from '@/components/adaptive/SkillMasteryHeatmap';
import { PerQuestionBreakdown } from '@/components/adaptive/PerQuestionBreakdown';
import { adminGetAdaptiveSession, type AdaptiveResults } from '@/lib/api/adaptive';

export default function AdminAdaptiveSessionDetailPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);
  const [result, setResult] = useState<(AdaptiveResults & { userId: string }) | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminGetAdaptiveSession(sessionId)
      .then(setResult)
      .catch((e: Error) => setError(e.message));
  }, [sessionId]);

  const crumbs = [
    { label: 'Home', href: '/' },
    { label: 'Super-admin', href: '/superadmin/dashboard' },
    { label: 'Adaptive Sessions', href: '/superadmin/adaptive-sessions' },
    { label: sessionId.slice(0, 8) + '…' },
  ];

  if (error) {
    return (
      <div className="space-y-4">
        <Breadcrumb items={crumbs} />
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex items-center gap-3 p-8 text-sm text-slate-500">
        <Loader2 className="size-5 animate-spin text-[#f5b400]" />
        Loading session…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={crumbs} />

      <header className="flex items-start gap-4">
        <Link
          href="/superadmin/adaptive-sessions"
          className="mt-1 inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-[#1a1d29]"
        >
          <ArrowLeft className="size-3.5" /> All sessions
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <Brain className="size-5 text-[#f5b400]" />
            <h1 className="text-2xl font-extrabold text-navy">Session Report</h1>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Student <span className="font-mono">{result.userId}</span> ·{' '}
            {result.total} questions answered ·{' '}
            <span className="font-semibold text-navy">{result.accuracy}% accuracy</span>
          </p>
        </div>
      </header>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Correct', value: `${result.correct}/${result.total}` },
          { label: 'Accuracy', value: `${result.accuracy}%` },
          { label: 'Status', value: result.status },
          { label: 'Hints used', value: String(result.questions.filter((q) => q.confidence !== null).length) },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border bg-white p-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">{label}</p>
            <p className="mt-1 text-xl font-extrabold text-navy">{value}</p>
          </div>
        ))}
      </div>

      {/* Skill mastery */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold text-navy uppercase tracking-widest">Skill Mastery</h2>
        <SkillMasteryHeatmap skillMastery={result.skillMastery} />
      </section>

      {/* Question breakdown */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold text-navy uppercase tracking-widest">Question Breakdown</h2>
        <PerQuestionBreakdown questions={result.questions} />
      </section>
    </div>
  );
}
