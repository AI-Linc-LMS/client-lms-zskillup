'use client';

import { useState } from 'react';
import { Loader2, UserMinus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { describeError } from '@/lib/api/errors';
import { label } from '@/components/admin/analytics/rate';
import { resolveAssignmentAudience, type ResolvedAudienceDto } from '@/lib/api/jobs';
import {
  AUDIENCE_DESCRIPTIONS,
  AUDIENCE_LABELS,
  AssignmentAudience,
  DRIVE_SCOPED_AUDIENCES,
  BLOCKED_LABELS,
} from '@/shared/assignment-audience';

/**
 * WHO WOULD THIS ACTUALLY REACH? (PRD §23.4)
 *
 * THE BLOCKED ARE SHOWN APART FROM THE RECIPIENTS, and `matched` sits beside both. That
 * is the whole point of the preview: an audience of forty that reaches thirty-one because
 * nine have no live access must LOOK like forty minus nine, not like a cohort of
 * thirty-one. Netting them off silently is how a placement team concludes a cohort is
 * smaller than it is, and never finds out that nine students were excluded by billing.
 *
 * Every blocked student is NAMED with the reason. A count tells an operator somebody
 * needs chasing without saying who, so nobody gets chased.
 *
 * The preview resolves AT THIS MOMENT. "Everyone eligible for this drive" is a question
 * about the present, and the answer can change before the assignment is actually sent.
 */
export function AudiencePreviewCard({ driveId }: { driveId: string }) {
  const [audience, setAudience] = useState<AssignmentAudience>(
    AssignmentAudience.DRIVE_APPLICANTS,
  );
  const [data, setData] = useState<ResolvedAudienceDto | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      setData(
        await resolveAssignmentAudience({
          audience,
          driveId: DRIVE_SCOPED_AUDIENCES.includes(audience) ? driveId : null,
        }),
      );
    } catch (e) {
      setError(describeError(e, 'Could not resolve that audience.'));
      setData(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-sky-50 text-sky-600 ring-1 ring-sky-100" aria-hidden>
          <Users className="size-4" />
        </span>
        <div className="min-w-0">
          <p className={label}>Audience</p>
          <p className="mt-0.5 text-base font-bold text-navy">Who would this reach?</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-3">
        <div className="min-w-[240px] flex-1">
          <label htmlFor="aud" className="block text-xs font-medium text-slate-600">
            Send to
          </label>
          <select
            id="aud"
            className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy focus:border-orange focus-visible:ring-2 focus-visible:ring-orange/30"
            value={audience}
            onChange={(e) => {
              setAudience(e.target.value as AssignmentAudience);
              setData(null);
            }}
          >
            {Object.values(AssignmentAudience).map((a) => (
              <option key={a} value={a}>
                {AUDIENCE_LABELS[a]}
              </option>
            ))}
          </select>
        </div>
        <Button variant="secondary" onClick={() => void run()} disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : null} Preview
        </Button>
      </div>

      <p className="mt-2 text-xs leading-relaxed text-slate-500">
        {AUDIENCE_DESCRIPTIONS[audience]}
      </p>

      {error ? (
        <p role="alert" className="mt-3 rounded-md bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200">
          {error}
        </p>
      ) : null}

      {data ? (
        <>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              { k: 'Matched', v: data.matched, hint: 'Before access was considered' },
              { k: 'Would receive', v: data.recipients.length, hint: 'Actually reachable' },
              { k: 'Blocked', v: data.blocked.length, hint: 'Matched, cannot receive' },
            ].map((c) => (
              <div key={c.k} className="rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
                <p className={label}>{c.k}</p>
                <p className="mt-0.5 text-lg font-extrabold text-navy tabular-nums">{c.v}</p>
                <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{c.hint}</p>
              </div>
            ))}
          </div>

          {data.blocked.length > 0 ? (
            <div className="mt-3 overflow-hidden rounded-lg border border-amber-200">
              <p className="flex items-center gap-1.5 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-900">
                <UserMinus className="size-3.5" aria-hidden />
                These {data.blocked.length} matched the audience and would not receive it
              </p>
              <ul className="divide-y divide-slate-100">
                {data.blocked.map((b) => (
                  <li key={b.userId} className="flex items-center justify-between gap-3 px-4 py-2">
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-navy">{b.name ?? b.email}</span>
                      <span className="block truncate text-xs text-slate-400">{b.email}</span>
                    </span>
                    <span className="shrink-0 text-xs font-medium text-amber-700">
                      {BLOCKED_LABELS[b.reason as keyof typeof BLOCKED_LABELS] ?? b.reason}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-3 text-xs text-slate-500">
              Nobody who matched is blocked — the audience and the recipient list are the
              same {data.matched} people.
            </p>
          )}

          <p className="mt-3 text-xs leading-relaxed text-slate-400">
            Resolved just now. An audience like &ldquo;everyone eligible&rdquo; is a
            question about the present, so the answer can change before the assignment is
            actually sent.
          </p>
        </>
      ) : null}
    </div>
  );
}
