'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, MessageSquare, Mic, Smile, Users } from 'lucide-react';
import { getTpoInterviewAnalytics } from '@/lib/api/tpo';
import type { TpoInterviewAnalytics } from '@/shared';
import { useTpoConsole } from '@/components/tpo/TpoConsole';
import { BentoCard, ProvenanceChip } from '@/components/tpo/ui';

function ScoreTile({
  icon: Icon,
  label,
  value,
  source,
}: {
  icon: typeof Mic;
  label: string;
  value: number | null;
  source: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <span className="grid size-9 place-items-center rounded-xl bg-[#fff5ea] text-[#f5b400]">
        <Icon className="size-5" />
      </span>
      {value != null ? (
        <>
          <p className="mt-3 text-2xl font-black tabular-nums text-navy">{value}%</p>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        </>
      ) : (
        <>
          <p className="mt-3 text-sm font-bold text-slate-400">Needs data</p>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
          <p className="mt-1 text-[10px] text-slate-400">Populates as interviews are graded</p>
        </>
      )}
      <p className="mt-2 flex items-center gap-1 text-[10px] text-slate-400">{source}</p>
    </div>
  );
}

export default function InterviewAnalyticsPage() {
  const { cohortId, cohorts } = useTpoConsole();
  const [data, setData] = useState<TpoInterviewAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getTpoInterviewAnalytics(cohortId || undefined)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load interview analytics'))
      .finally(() => setLoading(false));
  }, [cohortId]);

  useEffect(() => {
    load();
  }, [load]);

  const cohortLabel = cohortId ? cohorts.find((c) => c.id === cohortId)?.name ?? 'Batch' : 'All batches';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-7 animate-spin text-slate-400" />
      </div>
    );
  }
  if (error) {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</div>;
  }

  if (!data || data.totalInterviews === 0) {
    return (
      <div className="space-y-4">
        <p className="text-sm font-semibold text-slate-500">
          Interview analytics · <span className="text-navy">{cohortLabel}</span>
        </p>
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#fff5ea] text-[#f5b400]">
            <MessageSquare className="size-6" />
          </span>
          <h2 className="mt-4 text-lg font-extrabold text-navy">No mock interviews yet</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
            Once students complete AI mock interviews, campus interview readiness, communication and
            confidence scores, and the most common weak areas appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm font-semibold text-slate-500">
        Interview analytics · <span className="text-navy">{cohortLabel}</span> ·{' '}
        <span className="text-slate-400">{data.studentsAttempted} students · {data.totalInterviews} interviews</span>
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ScoreTile icon={MessageSquare} label="Interview Readiness" value={data.interviewReadiness} source="Mock-interview overall %" />
        <ScoreTile icon={Mic} label="Communication" value={data.communicationScore} source="AI transcript scoring" />
        <ScoreTile icon={Smile} label="Confidence" value={data.confidenceScore} source="AI transcript scoring" />
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <span className="grid size-9 place-items-center rounded-xl bg-[#fff5ea] text-[#f5b400]">
            <Users className="size-5" />
          </span>
          <p className="mt-3 text-2xl font-black tabular-nums text-navy">{data.studentsAttempted}</p>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Students Practised</p>
        </div>
      </div>

      <BentoCard
        title="Most Common Weaknesses"
        subtitle="Frequent areas for improvement across graded interviews."
        source="Mock-interview evaluations"
      >
        {data.commonWeaknesses.length === 0 ? (
          <p className="text-sm text-slate-400">Not enough graded interviews yet.</p>
        ) : (
          <div className="space-y-2.5">
            {data.commonWeaknesses.map((w) => {
              const max = data.commonWeaknesses[0].count || 1;
              return (
                <div key={w.area} className="flex items-center gap-3">
                  <span className="w-56 shrink-0 truncate text-sm text-navy" title={w.area}>{w.area}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#ffd24d] to-[#f5b400]" style={{ width: `${(w.count / max) * 100}%` }} />
                  </div>
                  <span className="w-8 text-right text-xs font-semibold tabular-nums text-slate-500">{w.count}</span>
                </div>
              );
            })}
          </div>
        )}
      </BentoCard>

      {(data.communicationScore == null || data.confidenceScore == null) && (
        <div className="flex items-start gap-2 rounded-xl border border-[#ffc42d]/30 bg-[#fff5ea] p-4 text-xs text-slate-600">
          <Mic className="mt-0.5 size-4 shrink-0 text-[#f5b400]" />
          <p>
            Communication &amp; confidence scores are graded by AI from each interview transcript. They fill
            in for interviews completed after this scoring shipped - older interviews contribute only to
            interview readiness. <ProvenanceChip source="AI transcript scoring" className="ml-1 align-middle" />
          </p>
        </div>
      )}
    </div>
  );
}
