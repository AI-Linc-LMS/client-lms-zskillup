'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Loader2, RefreshCw, Sparkles, X } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { cn } from '@/lib/utils';
import { submitPracticeAttempt, type ApiAttemptResult, type ApiQuestion } from '@/lib/api/practice';
import { getReviewDue } from '@/lib/api/study';

export default function ReviewPage() {
  const [questions, setQuestions] = useState<ApiQuestion[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [result, setResult] = useState<ApiAttemptResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [correct, setCorrect] = useState(0);

  useEffect(() => {
    getReviewDue(20)
      .then((d) => setQuestions(d.questions))
      .catch(() => setQuestions([]));
  }, []);

  const q = questions?.[idx];
  const multi = q?.type === 'MULTI_SELECT';
  const done = !!questions && (questions.length === 0 || idx >= questions.length);

  const toggle = (id: string) => {
    if (result) return;
    setSelected((s) => (multi ? (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]) : [id]));
  };

  const check = async () => {
    if (!q || selected.length === 0) return;
    setSubmitting(true);
    try {
      const r = await submitPracticeAttempt({ questionId: q.id, selectedOptionIds: selected, timeTakenSec: 0, usedHint: false });
      setResult(r);
      setReviewed((n) => n + 1);
      if (r.isCorrect) setCorrect((n) => n + 1);
    } catch {
      /* ignore */
    } finally {
      setSubmitting(false);
    }
  };

  const next = () => {
    setResult(null);
    setSelected([]);
    setIdx((i) => i + 1);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <Breadcrumb
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Study Plan', href: '/study-plan' },
          { label: 'Review' },
        ]}
      />

      {/* Hero */}
      <section className="relative mt-4 overflow-hidden rounded-3xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-[0_18px_50px_-30px_rgba(16,185,129,0.4)]">
        <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-400" />
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-sm">
            <RefreshCw className="size-5" />
          </span>
          <div>
            <h1 className="text-xl font-black tracking-tight text-navy sm:text-2xl">Spaced review</h1>
            <p className="text-sm text-slate-500">Re-test the questions you missed — correct ones come back less often.</p>
          </div>
        </div>
        {questions && questions.length > 0 && !done ? (
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-emerald-100">
            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${(idx / questions.length) * 100}%` }} />
          </div>
        ) : null}
      </section>

      {/* Body */}
      <section className="mt-5">
        {!questions ? (
          <div className="grid h-60 place-items-center"><Loader2 className="size-6 animate-spin text-slate-400" /></div>
        ) : done ? (
          <div className="rounded-3xl border border-slate-200/80 bg-white p-10 text-center shadow-sm">
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
              <Sparkles className="size-7" />
            </span>
            <h2 className="mt-4 text-xl font-black text-navy">
              {reviewed === 0 ? 'All caught up!' : 'Review complete'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {reviewed === 0
                ? 'Nothing is due for review right now. Keep practising — missed questions show up here.'
                : `You reviewed ${reviewed} question${reviewed === 1 ? '' : 's'} and got ${correct} right.`}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link href="/study-plan" className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#f7a14e] to-[#f37021] px-5 py-2.5 text-sm font-extrabold text-white">
                Back to study plan <ArrowRight className="size-4" />
              </Link>
              <Link href="/practice" className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">
                Practice more
              </Link>
            </div>
          </div>
        ) : q ? (
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ring-1', q.difficulty === 'EASY' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : q.difficulty === 'HARD' ? 'bg-rose-50 text-rose-700 ring-rose-200' : 'bg-amber-50 text-amber-700 ring-amber-200')}>
                {q.difficulty.toLowerCase()}
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold tabular-nums text-slate-500">{idx + 1} / {questions.length}</span>
            </div>
            <p className="mt-3 text-lg font-bold leading-relaxed text-navy">{q.stem}</p>
            {multi ? <p className="mt-1 text-xs text-slate-400">Select all that apply.</p> : null}

            <div className="mt-4 space-y-2.5">
              {q.options.map((opt, i) => {
                const isSel = selected.includes(opt.id);
                const isCorrect = result?.correctOptionIds.includes(opt.id);
                const tone = result
                  ? isCorrect
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                    : isSel
                      ? 'border-rose-300 bg-rose-50 text-rose-900'
                      : 'border-slate-200 bg-white text-slate-500'
                  : isSel
                    ? 'border-emerald-400 bg-emerald-50 text-navy ring-1 ring-emerald-200'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/40';
                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={!!result}
                    onClick={() => toggle(opt.id)}
                    className={cn('flex w-full items-center gap-3 rounded-xl border p-3.5 text-left text-[15px] font-medium transition-colors', tone)}
                  >
                    <span className={cn('grid size-7 shrink-0 place-items-center rounded-lg text-xs font-bold', result && isCorrect ? 'bg-emerald-500 text-white' : result && isSel ? 'bg-rose-500 text-white' : isSel ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500')}>
                      {result && isCorrect ? <Check className="size-3.5" /> : result && isSel ? <X className="size-3.5" /> : String.fromCharCode(65 + i)}
                    </span>
                    <span className="flex-1">{opt.text}</span>
                  </button>
                );
              })}
            </div>

            {result?.explanation ? (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 rounded-xl bg-slate-50 p-3 text-sm leading-relaxed text-slate-600">
                <span className="font-bold text-navy">Why: </span>{result.explanation}
              </motion.p>
            ) : null}

            <div className="mt-6 flex items-center justify-between">
              {result ? (
                <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold', result.isCorrect ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700')}>
                  {result.isCorrect ? <Check className="size-4" /> : <X className="size-4" />} {result.isCorrect ? 'Correct' : 'Incorrect'}
                </span>
              ) : <span />}
              {result ? (
                <button onClick={next} className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 py-2.5 text-sm font-extrabold text-white">
                  {idx + 1 < questions.length ? 'Next' : 'Finish'} <ArrowRight className="size-4" />
                </button>
              ) : (
                <button onClick={check} disabled={selected.length === 0 || submitting} className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#f7a14e] to-[#f37021] px-5 py-2.5 text-sm font-extrabold text-white disabled:opacity-50">
                  {submitting ? <Loader2 className="size-4 animate-spin" /> : null} Check
                </button>
              )}
            </div>
          </div>
        ) : null}
      </section>

      <div className="mt-4">
        <Link href="/study-plan" className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-navy">
          <ArrowLeft className="size-4" /> Study plan
        </Link>
      </div>
    </div>
  );
}
