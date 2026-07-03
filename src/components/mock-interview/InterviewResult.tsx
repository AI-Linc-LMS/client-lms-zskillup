'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getInterview } from '@/lib/api/mock-interviews';
import type { MockInterviewDetailDto } from '@/shared/dto/mock-interview.dto';
import { ArrowLeft, CheckCircle2, Loader2, Target, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

function scoreColor(n: number): string {
  if (n >= 70) return 'text-green-600';
  if (n >= 45) return 'text-amber-600';
  return 'text-red-500';
}

export function InterviewResult({ id }: { id: string }) {
  const [data, setData] = useState<MockInterviewDetailDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    let tries = 0;
    const poll = async () => {
      try {
        const d = await getInterview(id);
        if (!alive) return;
        setData(d);
        // Evaluation is inline on submit, but poll a few times just in case.
        if (!d.evaluation && d.status === 'completed' && tries < 8) {
          tries++;
          setTimeout(poll, 1500);
        }
      } catch {
        if (alive) setError('Could not load the result.');
      }
    };
    poll();
    return () => {
      alive = false;
    };
  }, [id]);

  if (error) return <div className="py-24 text-center text-sm text-red-500">{error}</div>;
  if (!data) return <div className="flex items-center justify-center py-24"><Loader2 className="size-7 animate-spin text-slate-400" /></div>;

  if (data.status !== 'completed') {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-slate-500">This interview isn&apos;t finished yet.</p>
        <Link href={`/mock-interview/${id}/take`} className="mt-3 inline-block rounded-lg bg-orange px-4 py-2 text-sm font-semibold text-white">Resume interview</Link>
      </div>
    );
  }

  const evalv = data.evaluation;
  const answersById = new Map(data.transcript.responses.map((r) => [r.question_id, r.answer]));

  if (!evalv) {
    return (
      <div className="flex flex-col items-center gap-3 py-20">
        <Loader2 className="size-7 animate-spin text-slate-400" />
        <p className="text-sm text-slate-500">Evaluating your interview…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/mock-interview" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-navy">
        <ArrowLeft className="size-4" /> All interviews
      </Link>

      {/* Overall */}
      <section className="flex flex-col items-center gap-5 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:flex-row sm:text-left">
        <div className="relative grid size-28 place-items-center">
          <svg viewBox="0 0 36 36" className="size-28 -rotate-90">
            <circle cx="18" cy="18" r="16" fill="none" stroke="#e2e8f0" strokeWidth="3" />
            <circle cx="18" cy="18" r="16" fill="none" strokeWidth="3" strokeLinecap="round" stroke={evalv.overall_percentage >= 70 ? '#16a34a' : evalv.overall_percentage >= 45 ? '#d97706' : '#ef4444'} strokeDasharray={`${(evalv.overall_percentage / 100) * 100.5} 100.5`} />
          </svg>
          <span className={cn('absolute text-3xl font-black', scoreColor(evalv.overall_percentage))}>{evalv.overall_percentage}</span>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">{data.topic} · {data.difficulty}</p>
          <h2 className="mt-1 text-xl font-black text-navy">Interview complete</h2>
          <p className="mt-1 max-w-xl text-sm text-slate-600">{evalv.overall_feedback}</p>
        </div>
      </section>

      {/* Strengths / improvements */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-green-200 bg-green-50/50 p-4">
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-green-700"><TrendingUp className="size-3.5" /> Strengths</p>
          {evalv.strengths.length ? <ul className="list-disc space-y-1 pl-4 text-sm text-slate-700">{evalv.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul> : <p className="text-sm text-slate-400">—</p>}
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-amber-700"><Target className="size-3.5" /> Areas to improve</p>
          {evalv.areas_for_improvement.length ? <ul className="list-disc space-y-1 pl-4 text-sm text-slate-700">{evalv.areas_for_improvement.map((s, i) => <li key={i}>{s}</li>)}</ul> : <p className="text-sm text-slate-400">—</p>}
        </div>
      </div>

      {/* Per-question */}
      <section className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">Question breakdown</h3>
        {data.questions.map((q) => {
          const qs = evalv.question_scores[String(q.id)];
          const ans = answersById.get(q.id) ?? '';
          return (
            <div key={q.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-navy">{q.id}. {q.question_text}</p>
                {qs && <span className={cn('shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold', scoreColor(qs.percentage))}>{qs.percentage}%</span>}
              </div>
              <p className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-50 p-2.5 text-[13px] text-slate-600">{ans || <span className="italic text-slate-400">No answer</span>}</p>
              {qs?.feedback && <p className="mt-2 text-sm text-slate-700">{qs.feedback}</p>}
              {qs && (qs.strengths.length > 0 || qs.improvements.length > 0) && (
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {qs.strengths.length > 0 && <div className="text-xs text-slate-600"><span className="font-semibold text-green-700">+ </span>{qs.strengths.join('; ')}</div>}
                  {qs.improvements.length > 0 && <div className="text-xs text-slate-600"><span className="font-semibold text-amber-700">△ </span>{qs.improvements.join('; ')}</div>}
                </div>
              )}
            </div>
          );
        })}
      </section>

      <div className="flex justify-center">
        <Link href="/mock-interview" className="inline-flex items-center gap-2 rounded-lg bg-navy px-5 py-2.5 text-sm font-bold text-white hover:bg-navy/90">
          <CheckCircle2 className="size-4" /> Practise another
        </Link>
      </div>
    </div>
  );
}
