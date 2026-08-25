'use client';

import { useEffect, useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';
import { getPublicJobQuestions, applyToJobWith } from '@/lib/api/jobs';
import type { JobApplicationDto, JobPostingQuestionDto } from '@/shared/dto/jobs.dto';
import { JobQuestionKind } from '@/shared/enums';
import { describeError } from '@/lib/api/errors';

const input =
  'mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy focus:border-orange focus-visible:ring-2 focus-visible:ring-orange/30';

/**
 * The application form for one role.
 *
 * The questions come from the POSTING, so two jobs can ask different things. Required
 * ones are marked here and enforced on the server - the answers travel in a request
 * body, so this form is a convenience and the server is the rule.
 *
 * A posting that asks nothing skips straight to submitting: making a student confirm
 * an empty form is a step that exists only because the code has a dialog.
 */
export function ApplyDialog({
  slug,
  jobId,
  jobTitle,
  onClose,
  onApplied,
}: {
  slug: string;
  jobId: string;
  jobTitle: string;
  onClose: () => void;
  onApplied: (a: JobApplicationDto) => void;
}) {
  const [questions, setQuestions] = useState<JobPostingQuestionDto[] | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getPublicJobQuestions(jobId)
      .then((q) => alive && setQuestions(q))
      // Not knowing the questions must not block applying: the server re-checks, so a
      // failed fetch means "ask nothing here" rather than "refuse to submit".
      .catch(() => alive && setQuestions([]));
    return () => {
      alive = false;
    };
  }, [jobId]);

  const missing = (questions ?? [])
    .filter((q) => q.isRequired && !(answers[q.id] ?? '').trim())
    .map((q) => q.label);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const application = await applyToJobWith(slug, {
        answers: Object.entries(answers)
          .filter(([, v]) => v.trim())
          .map(([questionId, answer]) => ({ questionId, answer })),
        note: note.trim() || undefined,
      });
      onApplied(application);
    } catch (err) {
      setError(describeError(err, 'Could not send your application. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const set = (id: string, v: string) => setAnswers((a) => ({ ...a, [id]: v }));

  return (
    <Modal open onClose={onClose} maxWidth="max-w-lg">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Apply</p>
      <h2 className="mt-1 text-lg font-bold text-navy">{jobTitle}</h2>

      {questions === null ? (
        <div className="grid place-items-center py-10">
          <Loader2 className="size-6 animate-spin text-slate-400" />
        </div>
      ) : (
        <>
          {questions.length === 0 ? (
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Nothing else to fill in - we send the profile you have already built here.
            </p>
          ) : (
            <div className="mt-4 max-h-[55vh] space-y-4 overflow-y-auto pr-1">
              {questions.map((q) => (
                <label key={q.id} className="block">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                    {q.label}
                    {q.isRequired ? <span className="ml-1 text-orange">*</span> : null}
                  </span>
                  {q.kind === JobQuestionKind.LONG_TEXT ? (
                    <textarea
                      rows={4}
                      value={answers[q.id] ?? ''}
                      onChange={(e) => set(q.id, e.target.value)}
                      maxLength={4000}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-3 text-sm text-navy focus:border-orange focus-visible:ring-2 focus-visible:ring-orange/30"
                    />
                  ) : q.kind === JobQuestionKind.SELECT ? (
                    <select
                      value={answers[q.id] ?? ''}
                      onChange={(e) => set(q.id, e.target.value)}
                      className={input}
                    >
                      <option value="">Select…</option>
                      {q.options.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={
                        q.kind === JobQuestionKind.NUMBER
                          ? 'number'
                          : q.kind === JobQuestionKind.EMAIL
                            ? 'email'
                            : q.kind === JobQuestionKind.DATE
                              ? 'date'
                              : q.kind === JobQuestionKind.URL
                                ? 'url'
                                : 'text'
                      }
                      value={answers[q.id] ?? ''}
                      onChange={(e) => set(q.id, e.target.value)}
                      maxLength={4000}
                      className={input}
                    />
                  )}
                  {q.helpText ? (
                    <span className="mt-1 block text-xs text-slate-500">{q.helpText}</span>
                  ) : null}
                </label>
              ))}
            </div>
          )}

          <label className="mt-4 block">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              Anything you want them to know (optional)
            </span>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={2000}
              placeholder="A line about why this role, if you like."
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-3 text-sm text-navy focus:border-orange focus-visible:ring-2 focus-visible:ring-orange/30"
            />
          </label>

          {error ? (
            <p
              role="alert"
              className="mt-3 rounded-md bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200"
            >
              {error}
            </p>
          ) : null}

          <div className="mt-5 flex items-center justify-end gap-3">
            <Button variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={submitting || missing.length > 0}>
              {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              Send application
            </Button>
          </div>
          {missing.length > 0 ? (
            <p className="mt-2 text-right text-xs text-slate-500">
              Still needed: {missing.join(', ')}
            </p>
          ) : null}
        </>
      )}
    </Modal>
  );
}
