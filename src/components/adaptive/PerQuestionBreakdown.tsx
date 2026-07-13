'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock, Sparkles, Target, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Typewriter } from './ResultsVisuals';
import type { AdaptiveQuestionRecord, NarrationPerQuestion } from '@/lib/api/adaptive';

interface PerQuestionBreakdownProps {
  questions: AdaptiveQuestionRecord[];
  perQuestionNarration?: NarrationPerQuestion['per_question'];
}

const prettySkill = (s: string) =>
  (s || '').replace(/[-_]/g, ' ').replace(/section \d+\s*/i, '').replace(/\b\w/g, (m) => m.toUpperCase()).trim();

export function PerQuestionBreakdown({ questions, perQuestionNarration }: PerQuestionBreakdownProps) {
  const [sel, setSel] = useState(0);
  if (questions.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
        No questions to review.
      </div>
    );
  }
  const q = questions[Math.min(sel, questions.length - 1)];
  const narration = perQuestionNarration?.find((n) => n.index === (q.index ?? sel + 1));

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      {/* number pills */}
      <p className="mb-2 text-[11px] text-slate-400">Tap a question to see the explanation.</p>
      <div className="flex flex-wrap gap-2">
        {questions.map((qq, i) => {
          const active = i === sel;
          return (
            <button
              key={qq.questionId}
              type="button"
              onClick={() => setSel(i)}
              aria-label={`Question ${i + 1} - ${qq.isCorrect ? 'correct' : 'wrong'}`}
              className={cn(
                'grid size-9 place-items-center rounded-full text-[12px] font-extrabold transition-all',
                active
                  ? qq.isCorrect
                    ? 'bg-emerald-500 text-white ring-2 ring-emerald-300'
                    : 'bg-rose-500 text-white ring-2 ring-rose-300'
                  : qq.isCorrect
                    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200 hover:bg-emerald-100'
                    : 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200 hover:bg-rose-100',
              )}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
      <div className="mt-2.5 flex gap-3 text-[11px] text-slate-400">
        <span className="flex items-center gap-1">
          <span className="size-2 rounded-full bg-emerald-500" /> Correct
        </span>
        <span className="flex items-center gap-1">
          <span className="size-2 rounded-full bg-rose-500" /> Wrong
        </span>
      </div>

      {/* selected question card */}
      <motion.div
        key={q.questionId}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/50 p-4"
      >
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold',
              q.isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700',
            )}
          >
            {q.isCorrect ? <CheckCircle2 className="size-3.5" /> : <XCircle className="size-3.5" />}
            Question {sel + 1}
          </span>
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
            <span>{q.difficulty}</span>
            <span className="flex items-center gap-1">
              <Target className="size-3" /> {prettySkill(q.targetSkill)}
            </span>
            {q.timeMs ? (
              <span className="flex items-center gap-1">
                <Clock className="size-3" /> {(q.timeMs / 1000).toFixed(1)}s
              </span>
            ) : null}
          </span>
        </div>

        <p className="mt-3 text-sm font-semibold leading-relaxed text-navy break-words">{q.stem}</p>

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className={cn('min-w-0 rounded-lg p-2.5 text-xs', q.isCorrect ? 'bg-emerald-100/70' : 'bg-rose-100/70')}>
            <p className="mb-0.5 font-bold text-slate-500">Your answer</p>
            <p className={cn('break-words', q.isCorrect ? 'text-emerald-800' : 'text-rose-700')}>{q.selectedOption || '-'}</p>
          </div>
          <div className="min-w-0 rounded-lg bg-emerald-100/70 p-2.5 text-xs">
            <p className="mb-0.5 font-bold text-slate-500">Correct answer</p>
            <p className="text-emerald-800 break-words">{q.correctOption}</p>
          </div>
        </div>

        {/* AI rationale - types out word-by-word for the selected question */}
        {narration ? (
          <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3">
            <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#6366f1] to-[#a855f7] px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-widest text-white">
              <Sparkles className="size-2.5" /> Why you got this {q.isCorrect ? 'right' : 'wrong'}
            </span>
            <p className="mt-2 text-sm leading-relaxed text-navy">
              <Typewriter key={`${q.questionId}-r`} text={narration.rationale} wordMs={28} />
            </p>
            {narration.correct_concept ? (
              <p className="mt-2 text-xs text-slate-600">
                <span className="font-semibold text-slate-700">Key concept: </span>
                {narration.correct_concept}
              </p>
            ) : null}
            {narration.your_mistake ? (
              <p className="mt-1.5 text-xs text-rose-600">
                <span className="font-semibold">Where you went off: </span>
                {narration.your_mistake}
              </p>
            ) : null}
          </div>
        ) : q.explanation ? (
          <div className="mt-3 rounded-xl border border-slate-100 bg-white/70 p-3 text-sm text-slate-600">
            {q.explanation}
          </div>
        ) : (
          <p className="mt-3 text-xs text-slate-400">No explanation was authored for this question.</p>
        )}
      </motion.div>
    </div>
  );
}
