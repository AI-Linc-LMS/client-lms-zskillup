'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Loader2, Mail, MailX } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { describeError } from '@/lib/api/errors';
import { label } from '@/components/admin/analytics/rate';
import {
  getStageNotifications,
  setStageNotification,
  type StageNotificationsDto,
} from '@/lib/api/jobs';

/**
 * WHICH STAGE CHANGES EMAIL THE CANDIDATE (PRD §11).
 *
 * The map behind this has been honoured by the mailer since stage emails shipped. There
 * was simply no way to write it, so the promise that an admin could stop emailing
 * rejections described something nobody could do.
 *
 * EVERY STAGE IS ON BY DEFAULT, including stages added later — an absent key means send.
 * A student who hears nothing concludes they were ignored, and silence is the most common
 * complaint about campus hiring, so the default has to fail towards telling them.
 *
 * FOUR STAGES CARRY A WARNING rather than a block. Turning off "assessment invited" is
 * allowed — a college running its own WhatsApp comms may genuinely want it — but the
 * failure is silent and lands on the student rather than on the person who flipped it, so
 * the screen says what it costs at the moment of flipping it.
 */
export function StageNotificationsScreen() {
  const [data, setData] = useState<StageNotificationsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getStageNotifications());
    } catch (e) {
      setError(describeError(e, 'Could not load notification settings.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = async (stage: string, next: boolean, actionRequired: boolean) => {
    setBusy(stage);
    try {
      setData(await setStageNotification(stage, next));
      if (!next && actionRequired) {
        toast.warning(
          'Turned off. Candidates at this stage have something to do and will no longer be told to do it — make sure another channel covers it.',
          { duration: 11000 },
        );
      }
    } catch (e) {
      toast.error(describeError(e, 'Could not change that setting.'));
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <p className="flex items-center gap-2 py-10 text-sm text-slate-500">
        <Loader2 className="size-5 animate-spin text-slate-300" aria-hidden /> Loading
        notification settings…
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

  const off = data.stages.filter((s) => !s.enabled).length;

  return (
    <section className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { k: 'Stages', v: data.stages.length, hint: 'The pipeline’s full vocabulary' },
          { k: 'Emailing', v: data.stages.length - off, hint: 'Candidate is told' },
          { k: 'Silenced', v: off, hint: 'Candidate hears nothing' },
        ].map((c) => (
          <div key={c.k} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className={label}>{c.k}</p>
            <p className="mt-1 text-[26px] font-extrabold leading-none text-navy tabular-nums">{c.v}</p>
            <p className="mt-1 text-xs text-slate-500">{c.hint}</p>
          </div>
        ))}
      </div>

      {/* The server's own framing, rendered rather than paraphrased. */}
      <p className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm leading-relaxed text-sky-900">
        {data.note}
      </p>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <p className={label}>Stage emails</p>
          <p className="mt-0.5 text-base font-bold text-navy">What a candidate hears about</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            On by default, including any stage added later — a student who hears nothing
            concludes they were ignored.
          </p>
        </div>
        <ul className="divide-y divide-slate-100">
          {data.stages.map((s) => (
            <li key={s.stage} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-semibold text-navy">
                  {s.enabled ? (
                    <Mail className="size-3.5 text-emerald-600" aria-hidden />
                  ) : (
                    <MailX className="size-3.5 text-slate-400" aria-hidden />
                  )}
                  {s.label}
                </p>
                {s.actionRequired ? (
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-amber-700">
                    <AlertTriangle className="size-3" aria-hidden />
                    The candidate has something to do at this stage
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={s.enabled}
                aria-label={`Email candidates when moved to ${s.label}`}
                disabled={busy === s.stage}
                onClick={() => void toggle(s.stage, !s.enabled, s.actionRequired)}
                className={cn(
                  'relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-orange/40 focus-visible:ring-offset-2 disabled:opacity-50',
                  s.enabled ? 'bg-emerald-500' : 'bg-slate-300',
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 size-5 rounded-full bg-white transition-all',
                    s.enabled ? 'left-[22px]' : 'left-0.5',
                  )}
                />
              </button>
            </li>
          ))}
        </ul>
        {off > 0 ? (
          <p className="flex items-start gap-2 border-t border-slate-200 bg-amber-50 px-5 py-3 text-xs leading-relaxed text-amber-900">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <span>
              {off} stage{off === 1 ? '' : 's'} will not tell the candidate anything. Their
              application still moves — they simply will not hear about it here, so another
              channel needs to cover it.
            </span>
          </p>
        ) : null}
      </div>
    </section>
  );
}
