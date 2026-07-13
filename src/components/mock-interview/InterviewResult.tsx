'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { animate, motion } from 'framer-motion';
import { getInterview } from '@/lib/api/mock-interviews';
import type { MockInterviewDetailDto } from '@/shared/dto/mock-interview.dto';
import { ArrowLeft, CheckCircle2, Loader2, RotateCcw, Target, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

function scoreColor(n: number): string {
  if (n >= 70) return 'text-green-600';
  if (n >= 45) return 'text-amber-600';
  return 'text-red-500';
}

function scoreChip(n: number): string {
  if (n >= 70) return 'bg-green-100 text-green-700';
  if (n >= 45) return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-600';
}

function scoreBorder(n: number): string {
  if (n >= 70) return 'border-l-green-400';
  if (n >= 45) return 'border-l-amber-400';
  return 'border-l-red-400';
}

function band(n: number): { label: string; sub: string } {
  if (n >= 80) return { label: 'Strong', sub: 'Interview-ready - polish the edges.' };
  if (n >= 65) return { label: 'Solid', sub: 'A good showing - keep sharpening.' };
  if (n >= 45) return { label: 'Developing', sub: 'Good foundation to build on.' };
  return { label: 'Early days', sub: 'Keep practising - you improve fast here.' };
}

function ringStroke(n: number): string {
  return n >= 70 ? '#16a34a' : n >= 45 ? '#d97706' : '#ef4444';
}

export function InterviewResult({ id }: { id: string }) {
  const [data, setData] = useState<MockInterviewDetailDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [display, setDisplay] = useState(0);

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

  // Animated count-up + ring fill once the score lands.
  const target = data?.evaluation?.overall_percentage ?? null;
  useEffect(() => {
    if (target === null) return;
    const controls = animate(0, target, { duration: 1.1, ease: 'easeOut', onUpdate: (v) => setDisplay(Math.round(v)) });
    return () => controls.stop();
  }, [target]);

  if (error) return <div className="py-24 text-center text-sm text-red-500">{error}</div>;
  if (!data) return <div className="flex items-center justify-center py-24"><Loader2 className="size-7 animate-spin text-slate-400" /></div>;

  if (data.status !== 'completed') {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-slate-500">This interview isn&apos;t finished yet.</p>
        <Link href={`/mock-interview/${id}/take`} className="mt-3 inline-block rounded-lg bg-orange px-4 py-2 text-sm font-semibold text-[#171717]">Resume interview</Link>
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

  const b = band(evalv.overall_percentage);
  const dash = (display / 100) * 100.5;

  return (
    <div className="space-y-6">
      <Link href="/mock-interview" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-navy">
        <ArrowLeft className="size-4" /> All interviews
      </Link>

      {/* Overall */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative flex flex-col items-center gap-6 overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:flex-row sm:text-left"
      >
        <span aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-52 rounded-full bg-orange/5 blur-3xl" />
        <div className="relative grid size-32 shrink-0 place-items-center">
          <svg viewBox="0 0 36 36" className="size-32 -rotate-90">
            <circle cx="18" cy="18" r="16" fill="none" stroke="#e2e8f0" strokeWidth="3" />
            <circle cx="18" cy="18" r="16" fill="none" strokeWidth="3" strokeLinecap="round" stroke={ringStroke(evalv.overall_percentage)} strokeDasharray={`${dash} 100.5`} />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className={cn('text-4xl font-black tabular-nums', scoreColor(evalv.overall_percentage))}>{display}</span>
            <span className="-mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">out of 100</span>
          </div>
        </div>
        <div className="relative">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">{data.topic} · {data.difficulty} · {data.interviewType}</p>
          <div className="mt-1 flex items-center justify-center gap-2 sm:justify-start">
            <h2 className="text-xl font-black text-navy">Interview complete</h2>
            <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-bold', scoreChip(evalv.overall_percentage))}>{b.label}</span>
          </div>
          <p className="mt-0.5 text-xs text-slate-400">{b.sub}</p>
          <p className="mt-2 max-w-xl text-sm text-slate-600">{evalv.overall_feedback}</p>
        </div>
      </motion.section>

      {/* Strengths / improvements */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-green-200 bg-green-50/50 p-4">
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-green-700"><TrendingUp className="size-3.5" /> Strengths</p>
          {evalv.strengths.length ? <ul className="list-disc space-y-1 pl-4 text-sm text-slate-700">{evalv.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul> : <p className="text-sm text-slate-400">-</p>}
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-amber-700"><Target className="size-3.5" /> Areas to improve</p>
          {evalv.areas_for_improvement.length ? <ul className="list-disc space-y-1 pl-4 text-sm text-slate-700">{evalv.areas_for_improvement.map((s, i) => <li key={i}>{s}</li>)}</ul> : <p className="text-sm text-slate-400">-</p>}
        </div>
      </div>

      {/* Per-question */}
      <section className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">Question breakdown</h3>
        {data.questions.map((q, i) => {
          const qs = evalv.question_scores[String(q.id)];
          const ans = answersById.get(q.id) ?? '';
          return (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.3) }}
              className={cn('rounded-xl border border-l-4 border-slate-200 bg-white p-4 shadow-sm', qs ? scoreBorder(qs.percentage) : 'border-l-slate-200')}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-navy">{q.id}. {q.question_text}</p>
                {qs && <span className={cn('shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold', scoreChip(qs.percentage))}>{qs.percentage}%</span>}
              </div>
              <p className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-50 p-2.5 text-[13px] text-slate-600">{ans || <span className="italic text-slate-400">No answer</span>}</p>
              {qs?.feedback && <p className="mt-2 text-sm text-slate-700">{qs.feedback}</p>}
              {qs && (qs.strengths.length > 0 || qs.improvements.length > 0) && (
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {qs.strengths.length > 0 && <div className="text-xs text-slate-600"><span className="font-semibold text-green-700">+ </span>{qs.strengths.join('; ')}</div>}
                  {qs.improvements.length > 0 && <div className="text-xs text-slate-600"><span className="font-semibold text-amber-700">△ </span>{qs.improvements.join('; ')}</div>}
                </div>
              )}
            </motion.div>
          );
        })}
      </section>

      <div className="flex justify-center">
        <Link href="/mock-interview" className="inline-flex items-center gap-2 rounded-xl bg-navy px-6 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-navy/90 hover:shadow">
          <RotateCcw className="size-4" /> Practise another
        </Link>
      </div>
    </div>
  );
}
