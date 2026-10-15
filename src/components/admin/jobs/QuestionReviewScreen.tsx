'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Eye, Loader2 } from 'lucide-react';
import { describeError } from '@/lib/api/errors';
import { label } from '@/components/admin/analytics/rate';
import { getQuestionReview, type QuestionReviewDto } from '@/lib/api/jobs';

/**
 * READ A PAPER BEFORE STUDENTS DO (PRD §23.8).
 *
 * BLOCKING AND REVIEW ARE DIFFERENT CLAIMS, and collapsing them would waste the
 * distinction. A blocking issue cannot be answered correctly as written — a student who
 * meets one loses the mark for the author's mistake, and that is a defect. A review flag
 * is a prompt to re-read: a negated stem and a near-duplicate pair are both sometimes
 * deliberate, and a screen that calls them errors teaches people to ignore it.
 *
 * WHAT IT CANNOT CHECK IS SAID OUT LOUD, because a clean result is the most dangerous
 * thing here. It does not know whether an answer is factually correct, whether a question
 * is at its stated difficulty, or whether it matches the skills claimed — none of the
 * three can be read from the text, and guessing would be worse than silence. "No issues
 * found" means the text is well formed, not that the paper is good.
 */
export function QuestionReviewScreen({ assessmentId }: { assessmentId: string }) {
  const [data, setData] = useState<QuestionReviewDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getQuestionReview(assessmentId));
    } catch (e) {
      setError(describeError(e, 'Could not review this assessment.'));
    } finally {
      setLoading(false);
    }
  }, [assessmentId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <p className="flex items-center gap-2 py-10 text-sm text-slate-500">
        <Loader2 className="size-5 animate-spin text-slate-300" aria-hidden /> Reading the
        paper…
      </p>
    );
  }
  if (error) {
    return (
      <p role="alert" className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200">
        {error}
      </p>
    );
  }
  if (!data) return null;

  const blocking = data.issues.filter((i) => i.severity === 'BLOCKING');
  const review = data.issues.filter((i) => i.severity !== 'BLOCKING');

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className={label}>Question review</p>
        <h2 className="mt-1 text-lg font-bold text-navy">{data.assessment.title}</h2>
        <p className="text-sm text-slate-500">{data.questions} questions read</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { k: 'Blocking', v: data.blocking, hint: 'Cannot be answered as written', tone: 'text-red-600' },
          { k: 'For review', v: data.review, hint: 'Worth re-reading, not wrong', tone: 'text-amber-600' },
          { k: 'Clean', v: data.clean, hint: 'Well formed', tone: 'text-emerald-600' },
        ].map((c) => (
          <div key={c.k} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className={label}>{c.k}</p>
            <p className={`mt-1 text-[26px] font-extrabold leading-none tabular-nums ${c.tone}`}>
              {c.v}
            </p>
            <p className="mt-1 text-xs text-slate-500">{c.hint}</p>
          </div>
        ))}
      </div>

      {/* The server's own framing, rendered rather than paraphrased — a flag list is very
          easy to read as a verdict, and two of these checks have legitimate exceptions. */}
      <p
        className={`flex items-start gap-2 rounded-xl p-4 text-sm leading-relaxed ring-1 ${
          data.blocking > 0
            ? 'bg-red-50 text-red-900 ring-red-200'
            : data.review > 0
              ? 'bg-amber-50 text-amber-900 ring-amber-200'
              : 'bg-emerald-50 text-emerald-900 ring-emerald-200'
        }`}
      >
        {data.blocking > 0 ? (
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
        ) : data.review > 0 ? (
          <Eye className="mt-0.5 size-4 shrink-0" aria-hidden />
        ) : (
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
        )}
        <span>{data.note}</span>
      </p>

      {blocking.length > 0 ? (
        <IssueList title="Blocking" subtitle="A student meeting these loses the mark for the author’s mistake" issues={blocking} tone="red" />
      ) : null}
      {review.length > 0 ? (
        <IssueList title="For review" subtitle="Prompts to re-read — some of these are deliberate" issues={review} tone="amber" />
      ) : null}
    </section>
  );
}

function IssueList({
  title,
  subtitle,
  issues,
  tone,
}: {
  title: string;
  subtitle: string;
  issues: QuestionReviewDto['issues'];
  tone: 'red' | 'amber';
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <p className={label}>{title}</p>
        <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
      </div>
      <ul className="divide-y divide-slate-100">
        {issues.map((i, n) => (
          <li key={`${i.questionId}-${n}`} className="px-5 py-3.5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <p className="min-w-0 text-sm leading-relaxed text-slate-700">
                {i.stem ?? i.questionId}
              </p>
              <span
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                  tone === 'red'
                    ? 'bg-red-50 text-red-700 ring-1 ring-red-200'
                    : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                }`}
              >
                {i.flag.replace(/_/g, ' ').toLowerCase()}
              </span>
            </div>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">{i.message}</p>
            {i.relatedStem ? (
              <p className="mt-1 rounded-lg bg-slate-50 p-2.5 text-xs leading-relaxed text-slate-500 ring-1 ring-slate-200">
                Near-duplicate of: {i.relatedStem}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
