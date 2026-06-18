'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AdaptiveQuestionRecord } from '@/lib/api/adaptive';
import type { NarrationPerQuestion } from '@/lib/api/adaptive';

interface PerQuestionBreakdownProps {
  questions: AdaptiveQuestionRecord[];
  perQuestionNarration?: NarrationPerQuestion['per_question'];
}

export function PerQuestionBreakdown({ questions, perQuestionNarration }: PerQuestionBreakdownProps) {
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div className="space-y-2">
      {questions.map((q, idx) => {
        const narration = perQuestionNarration?.find((n) => n.index === idx + 1);
        const isOpen = expanded === idx;
        return (
          <div
            key={q.questionId}
            className={cn(
              'rounded-xl border transition-colors',
              q.isCorrect ? 'border-emerald-200 bg-emerald-50' : 'border-red-100 bg-red-50',
            )}
          >
            <button
              className="flex w-full items-center gap-3 p-4 text-left"
              onClick={() => setExpanded(isOpen ? null : idx)}
            >
              {q.isCorrect ? (
                <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
              ) : (
                <XCircle className="size-5 shrink-0 text-red-500" />
              )}
              <span className="flex-1 text-sm font-medium text-navy line-clamp-2">
                Q{idx + 1}. {q.stem}
              </span>
              <span className="text-[10px] text-muted-foreground mr-1">{q.difficulty}</span>
              {isOpen ? (
                <ChevronUp className="size-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="size-4 text-muted-foreground" />
              )}
            </button>

            {isOpen && (
              <div className="border-t px-4 pb-4 pt-3 space-y-3">
                {/* Your vs Correct */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className={cn('rounded-lg p-2', q.isCorrect ? 'bg-emerald-100' : 'bg-red-100')}>
                    <p className="font-semibold mb-1">Your answer</p>
                    <p className={q.isCorrect ? 'text-emerald-800' : 'text-red-700'}>{q.selectedOption}</p>
                  </div>
                  <div className="rounded-lg bg-emerald-100 p-2">
                    <p className="font-semibold mb-1 text-emerald-800">Correct answer</p>
                    <p className="text-emerald-800">{q.correctOption}</p>
                  </div>
                </div>

                {/* AI Narration */}
                {narration && (
                  <div className="rounded-lg bg-white/70 border p-3 text-sm space-y-2">
                    <p className="text-navy">{narration.rationale}</p>
                    {narration.correct_concept && (
                      <div className="text-xs text-muted-foreground">
                        <span className="font-semibold">Key concept: </span>
                        {narration.correct_concept}
                      </div>
                    )}
                    {narration.your_mistake && (
                      <div className="text-xs text-red-600">
                        <span className="font-semibold">What went wrong: </span>
                        {narration.your_mistake}
                      </div>
                    )}
                  </div>
                )}

                {/* Explanation fallback */}
                {!narration && q.explanation && (
                  <div className="rounded-lg bg-white/70 border p-3 text-sm text-muted-foreground">
                    {q.explanation}
                  </div>
                )}

                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>Skill: {q.targetSkill}</span>
                  {q.timeMs && <span>Time: {(q.timeMs / 1000).toFixed(1)}s</span>}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
