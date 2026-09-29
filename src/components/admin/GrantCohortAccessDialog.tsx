'use client';

import { useEffect, useId, useState } from 'react';
import { Gift, Loader2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import { describeApiError } from '@/lib/api/types';
import { listAdminCompanies, type AdminCompanyRow } from '@/lib/api/admin';
import {
  grantCohortAccess,
  previewCohortAccess,
  type CohortAccessPreview,
} from '@/lib/api/individual-cohorts';

const eyebrow = 'text-[10px] font-semibold uppercase tracking-widest text-slate-400';
const field =
  'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy focus:border-orange focus-visible:ring-2 focus-visible:ring-orange/30';

/**
 * GIVE A WHOLE COHORT THE SAME ACCESS.
 *
 * Granting was one student at a time — find them, open the form, pick the scope,
 * submit, repeat. A session roster of 175 meant 175 rounds of that, so in practice
 * it was done with SQL, outside the audit trail. A cohort already IS the group, so
 * the grant belongs here.
 *
 * The count is fetched before the button is offered, and it distinguishes the two
 * numbers that matter: how many this reaches, and how many already have it. Someone
 * who already holds the access is skipped rather than re-granted — re-granting would
 * extend their expiry, and quietly moving one student's renewal date because they
 * happened to be in a group is not what "grant the cohort" should mean.
 */
export function GrantCohortAccessDialog({
  cohortId,
  cohortName,
  onClose,
  onGranted,
}: {
  cohortId: string;
  cohortName: string;
  onClose: () => void;
  onGranted: () => void;
}) {
  const titleId = useId();
  const scopeId = useId();
  const refId = useId();
  const daysId = useId();

  const [scope, setScope] = useState<'COMPANY' | 'PLATFORM'>('COMPANY');
  const [scopeRef, setScopeRef] = useState('');
  const [expiry, setExpiry] = useState<'lifetime' | 'custom'>('lifetime');
  const [days, setDays] = useState('365');
  const [companies, setCompanies] = useState<AdminCompanyRow[] | null>(null);
  const [preview, setPreview] = useState<CohortAccessPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listAdminCompanies()
      .then((c) => setCompanies(c))
      .catch(() => setCompanies([]));
  }, []);

  // Re-ask whenever the scope changes: "how many does this reach" is only meaningful
  // for the scope actually being granted.
  useEffect(() => {
    if (scope === 'COMPANY' && !scopeRef) {
      setPreview(null);
      return;
    }
    let alive = true;
    setPreview(null);
    previewCohortAccess(cohortId, scope, scope === 'COMPANY' ? scopeRef : undefined)
      .then((p) => alive && setPreview(p))
      .catch((e: unknown) => alive && setError(describeApiError(e, 'Could not work out who this reaches.')));
    return () => {
      alive = false;
    };
  }, [cohortId, scope, scopeRef]);

  const ready = scope === 'PLATFORM' || !!scopeRef;

  const submit = async () => {
    if (!ready) return;
    setBusy(true);
    setError(null);
    try {
      const out = await grantCohortAccess(cohortId, {
        scope,
        scopeRef: scope === 'COMPANY' ? scopeRef : undefined,
        durationDays: expiry === 'custom' ? Number(days) || undefined : undefined,
      });
      toast.success(
        out.granted === 0
          ? 'Everyone in this cohort already had that access.'
          : `${out.granted} student${out.granted === 1 ? '' : 's'} granted access.` +
              (out.alreadyHad ? ` ${out.alreadyHad} already had it.` : ''),
      );
      onGranted();
    } catch (e) {
      setError(describeApiError(e, 'Could not grant access to this cohort.'));
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={busy ? () => {} : onClose} maxWidth="max-w-md">
      <div className="space-y-5 p-6">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
            <Gift className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className={eyebrow}>Cohort access</p>
            <h2 id={titleId} className="mt-1 text-base font-bold text-navy">
              Grant access to everyone
            </h2>
            <p className="truncate text-sm text-slate-500">{cohortName}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor={scopeId} className={eyebrow}>
              What they get
            </label>
            <select
              id={scopeId}
              value={scope}
              onChange={(e) => setScope(e.target.value as 'COMPANY' | 'PLATFORM')}
              className={cn(field, 'mt-1.5')}
            >
              <option value="COMPANY">One company</option>
              <option value="PLATFORM">Full platform</option>
            </select>
          </div>

          {scope === 'COMPANY' && (
            <div>
              <label htmlFor={refId} className={eyebrow}>
                Company
              </label>
              <select
                id={refId}
                value={scopeRef}
                onChange={(e) => setScopeRef(e.target.value)}
                className={cn(field, 'mt-1.5')}
              >
                <option value="">Choose a company…</option>
                {(companies ?? []).map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-slate-400">
                Other companies stay locked. Shared aptitude, technical and coding practice
                opens too — that content is not tagged per company yet.
              </p>
            </div>
          )}

          <div>
            <span className={eyebrow}>For how long</span>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {(['lifetime', 'custom'] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setExpiry(k)}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-semibold transition-colors',
                    expiry === k ? 'bg-navy text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                  )}
                >
                  {k === 'lifetime' ? 'No expiry' : 'Set a limit'}
                </button>
              ))}
              {expiry === 'custom' && (
                <span className="flex items-center gap-1.5">
                  <input
                    id={daysId}
                    type="number"
                    min={1}
                    max={3650}
                    value={days}
                    onChange={(e) => setDays(e.target.value)}
                    className={cn(field, 'h-8 w-24')}
                    aria-label="Days of access"
                  />
                  <span className="text-xs text-slate-500">days</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {ready && (
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            {preview ? (
              <>
                <p className={eyebrow}>Will grant to</p>
                <p className="mt-1 flex items-baseline gap-2">
                  <span className="text-[26px] font-extrabold leading-none text-navy">
                    {preview.wouldGrant.toLocaleString('en-IN')}
                  </span>
                  <span className="text-sm text-slate-500">
                    of {preview.members.toLocaleString('en-IN')} students
                  </span>
                </p>
                {preview.alreadyHave > 0 && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
                    <Users className="size-3.5 shrink-0" aria-hidden />
                    {preview.alreadyHave.toLocaleString('en-IN')} already have it and are left
                    untouched.
                  </p>
                )}
              </>
            ) : (
              <p className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="size-4 animate-spin" aria-hidden /> Counting…
              </p>
            )}
          </div>
        )}

        {error && (
          <p role="alert" className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200">
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={!ready || busy || preview?.wouldGrant === 0}>
            {busy ? <Loader2 className="animate-spin" /> : <Gift />}
            {preview && preview.wouldGrant > 0
              ? `Grant to ${preview.wouldGrant.toLocaleString('en-IN')}`
              : 'Grant access'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
