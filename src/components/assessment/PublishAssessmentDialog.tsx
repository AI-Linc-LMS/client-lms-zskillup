'use client';

import { useEffect, useId, useState } from 'react';
import { Loader2, Send, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DialogShell } from '@/components/superadmin/assessment-wizard/DialogShell';
import { eyebrowCls } from '@/components/superadmin/assessment-wizard/ui';
import { describeApiError } from '@/lib/api/types';
import {
  getAssessmentAudience,
  publishAssessment,
  type AssessmentAudience,
} from '@/lib/api/assessment-builder';

const SCOPE_NOTE: Record<AssessmentAudience['scope'], string> = {
  cohort: 'Only this cohort is emailed.',
  college: 'Every active student at this college is emailed.',
  company: 'Every student registered for this company is emailed.',
  platform: 'This drive is not tied to a college or company, so every active student is emailed.',
};

/**
 * PUBLISH A DRIVE — AND SAY WHO THAT EMAILS, BEFORE IT HAPPENS.
 *
 * Publishing does two things: it marks the drive live, and it emails its audience.
 * The second is not undoable, and for a platform-wide drive the audience is every
 * active student — thousands of people. Nothing in the product showed that number,
 * so the only way to find out how big a send was, was to make it.
 *
 * So the count is fetched first and shown as the headline, with the already-emailed
 * figure beside it: a re-publish is deduped per student, and without saying so,
 * "Publish" on a published drive reads like "email everyone a second time".
 */
export function PublishAssessmentDialog({
  assessmentId,
  title,
  onClose,
  onPublished,
}: {
  assessmentId: string;
  title: string;
  onClose: () => void;
  onPublished: () => void;
}) {
  const titleId = useId();
  const [audience, setAudience] = useState<AssessmentAudience | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getAssessmentAudience(assessmentId)
      .then((a) => alive && setAudience(a))
      .catch((e: unknown) => alive && setError(describeApiError(e, 'Could not work out who this would reach.')));
    return () => {
      alive = false;
    };
  }, [assessmentId]);

  const publish = async () => {
    setPublishing(true);
    setError(null);
    try {
      await publishAssessment(assessmentId);
      onPublished();
    } catch (e) {
      setError(describeApiError(e, 'Could not publish this assessment.'));
      setPublishing(false);
    }
  };

  // A re-publish only reaches students whose first email never landed.
  const remaining = audience ? Math.max(0, audience.recipients - audience.alreadyEmailed) : 0;
  const republish = !!audience?.publishedAt;

  return (
    <DialogShell open onClose={onClose} labelledBy={titleId} dismissible={!publishing} maxWidth="max-w-md">
      <div className="space-y-5 p-6">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-orange-50 text-orange-600 ring-1 ring-orange-100">
            <Send className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className={eyebrowCls}>{republish ? 'Already published' : 'Publish'}</p>
            <h2 id={titleId} className="mt-1 text-base font-bold text-navy">
              {republish ? 'Send to anyone missed' : 'Publish and notify students'}
            </h2>
            <p className="truncate text-sm text-slate-500">{title}</p>
          </div>
        </div>

        {audience ? (
          <>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className={eyebrowCls}>Will email</p>
              <p className="mt-1 flex items-baseline gap-2">
                <span className="text-[26px] font-extrabold leading-none text-navy">
                  {remaining.toLocaleString('en-IN')}
                </span>
                <span className="text-sm text-slate-500">
                  {remaining === 1 ? 'student' : 'students'}
                </span>
              </p>
              <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-600">
                <Users className="size-4 shrink-0 text-slate-400" aria-hidden />
                {audience.scopeLabel}
              </p>
              {audience.alreadyEmailed > 0 && (
                <p className="mt-2 text-xs text-slate-400">
                  {audience.alreadyEmailed.toLocaleString('en-IN')} of{' '}
                  {audience.recipients.toLocaleString('en-IN')} were emailed already and will not
                  be emailed again.
                </p>
              )}
            </div>

            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 ring-1 ring-amber-200">
              {SCOPE_NOTE[audience.scope]} Email cannot be recalled once sent.
            </p>

            {remaining === 0 && (
              <p className="text-sm text-slate-500">
                Everyone in this audience has already been emailed — publishing again changes
                nothing for them.
              </p>
            )}
          </>
        ) : (
          !error && (
            <p className="flex items-center gap-2 py-4 text-sm text-slate-500">
              <Loader2 className="size-4 animate-spin" aria-hidden /> Working out who this reaches…
            </p>
          )
        )}

        {error && (
          <p role="alert" className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200">
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={publishing}>
            Cancel
          </Button>
          <Button onClick={() => void publish()} disabled={!audience || publishing}>
            {publishing ? <Loader2 className="animate-spin" /> : <Send />}
            {remaining > 0 ? `Publish & email ${remaining.toLocaleString('en-IN')}` : 'Publish'}
          </Button>
        </div>
      </div>
    </DialogShell>
  );
}
