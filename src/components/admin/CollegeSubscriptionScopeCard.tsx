'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Pencil, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  EMPTY_SCOPE,
  isScopeComplete,
  SubscriptionScopePicker,
  type SubscriptionScopeValue,
} from '@/components/admin/SubscriptionScopePicker';
import {
  getCollegeSubscriptionScope,
  updateCollegeSubscriptionScope,
  type CollegeEntitlementSyncResult,
  type CollegeSubscriptionScope,
} from '@/lib/api/college-subscriptions';
import { getMe } from '@/lib/api/me';
import { CollegeSubscriptionKind } from '@/shared/enums';

/**
 * The college's subscription on its profile page - what its students inherit,
 * and the one place to change it (spec point 11). Saving re-projects the scope
 * onto every student of the college immediately: added companies unlock on their
 * next request, removed ones lock. Personal purchases students made themselves,
 * and any company the college bought separately through Razorpay, are untouched.
 *
 * Reading is role-gated; EDITING additionally needs `canManageSubscriptions`, so
 * the card checks the capability up front and renders read-only without it -
 * rather than letting an admin build a change and only discover the 403 after
 * being told it would apply to every student.
 */

const STATUS_TONE: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  EXPIRED: 'bg-red-50 text-red-700 ring-1 ring-red-200',
  CANCELLED: 'bg-slate-50 text-slate-600 ring-1 ring-slate-200',
};

function formatDate(iso: string | null): string {
  if (!iso) return 'No expiry';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function CollegeSubscriptionScopeCard({
  collegeId,
  onChange,
}: {
  collegeId: string;
  onChange?: () => void;
}) {
  const [scope, setScope] = useState<CollegeSubscriptionScope | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<SubscriptionScopeValue>(EMPTY_SCOPE);
  const [months, setMonths] = useState<number | ''>('');
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [result, setResult] = useState<CollegeEntitlementSyncResult | null>(null);
  const [canEdit, setCanEdit] = useState(false);

  const load = useCallback(async () => {
    try {
      setScope(await getCollegeSubscriptionScope(collegeId));
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Could not load the subscription.');
    }
  }, [collegeId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let alive = true;
    getMe()
      .then((me) => alive && setCanEdit(me.capabilities?.canManageSubscriptions ?? false))
      .catch(() => alive && setCanEdit(false));
    return () => {
      alive = false;
    };
  }, []);

  function startEdit() {
    if (!scope) return;
    setDraft({ kind: scope.kind ?? '', companySlugs: scope.companySlugs });
    setMonths('');
    setSaveError(null);
    setResult(null);
    setEditing(true);
  }

  async function save() {
    if (!isScopeComplete(draft) || draft.kind === '') return;
    setBusy(true);
    setSaveError(null);
    try {
      const out = await updateCollegeSubscriptionScope(collegeId, {
        kind: draft.kind,
        companySlugs:
          draft.kind === CollegeSubscriptionKind.COMPANY ? draft.companySlugs : undefined,
        durationMonths: months === '' ? undefined : Number(months),
      });
      setScope(out.scope);
      setResult(out.result);
      setEditing(false);
      onChange?.();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Could not save the subscription.');
    } finally {
      setBusy(false);
    }
  }

  if (loadError) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <p role="alert" className="text-sm text-red-600">
          {loadError}
        </p>
      </section>
    );
  }

  if (!scope) {
    return (
      <section className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-10">
        <Loader2 className="size-5 animate-spin text-slate-400" />
      </section>
    );
  }

  const platform = scope.kind === CollegeSubscriptionKind.PLATFORM;
  const activeGrants = scope.entitlements.filter((e) => e.status === 'ACTIVE');

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
            <ShieldCheck className="size-5" />
          </span>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              College subscription
            </p>
            <h2 className="text-base font-bold text-navy">
              {scope.kind === null
                ? 'Not set'
                : platform
                  ? 'Full Platform'
                  : `Company Access · ${scope.companySlugs.length} ${
                      scope.companySlugs.length === 1 ? 'company' : 'companies'
                    }`}
            </h2>
            <p className="mt-0.5 text-sm text-slate-600">
              {scope.kind === null
                ? 'Students of this college inherit no access until a subscription is set.'
                : platform
                  ? 'Every student of this college gets all companies and premium features.'
                  : 'Every student of this college gets these hubs. All other companies stay locked.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {scope.status ? (
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                STATUS_TONE[scope.status] ?? STATUS_TONE.CANCELLED
              }`}
            >
              {scope.status}
            </span>
          ) : null}
          {!editing && canEdit ? (
            <Button variant="outline" size="sm" onClick={startEdit}>
              <Pencil className="mr-1.5 size-3.5" /> Edit
            </Button>
          ) : null}
        </div>
      </div>

      {!editing ? (
        <>
          {scope.companies.length > 0 ? (
            <ul className="mt-4 flex flex-wrap gap-2">
              {scope.companies.map((c) => (
                <li
                  key={c.slug}
                  className="rounded-full bg-sky-50 px-2.5 py-0.5 text-[11px] font-semibold text-sky-700 ring-1 ring-sky-200"
                >
                  {c.name}
                </li>
              ))}
            </ul>
          ) : null}

          <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Plan" value={scope.planName ?? '-'} />
            <Stat label="Valid until" value={formatDate(scope.expiresAt)} />
            <Stat
              label="Seats"
              value={scope.seatLimit === 0 ? `${scope.seatsUsed} / ∞` : `${scope.seatsUsed} / ${scope.seatLimit}`}
            />
            <Stat label="Active grants" value={String(activeGrants.length)} />
          </dl>

          {!canEdit ? (
            <p className="mt-4 text-xs text-slate-500">
              Read-only - ask a Super Admin for the &ldquo;Manage subscriptions&rdquo; capability to
              change what this college&apos;s students get.
            </p>
          ) : null}

          {result ? (
            <p className="mt-4 flex items-start gap-2 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800 ring-1 ring-emerald-200">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
              <span>
                Applied to every student of this college.
                {result.granted.length > 0 ? ` Granted: ${result.granted.join(', ')}.` : ''}
                {result.revoked.length > 0 ? ` Revoked: ${result.revoked.join(', ')}.` : ''}
                {result.granted.length === 0 && result.revoked.length === 0
                  ? ' No access changed.'
                  : ''}
              </span>
            </p>
          ) : null}
        </>
      ) : (
        <div className="mt-5 space-y-4">
          <SubscriptionScopePicker value={draft} onChange={setDraft} disabled={busy} />

          <label className="block">
            <span className="text-xs font-semibold text-slate-600">Extend validity (months)</span>
            <input
              type="number"
              min={1}
              max={120}
              value={months}
              onChange={(e) => setMonths(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="Leave empty to keep the current expiry"
              className="mt-1 h-10 w-full max-w-xs rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy focus:border-orange focus:outline-none focus-visible:ring-2 focus-visible:ring-orange/30"
            />
            <span className="mt-0.5 block text-[11px] text-slate-500">
              Currently valid until {formatDate(scope.expiresAt).toLowerCase()}.
            </span>
          </label>

          {saveError ? (
            <p role="alert" className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200">
              <AlertCircle className="size-4 shrink-0" /> {saveError}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button disabled={busy || !isScopeComplete(draft)} onClick={save}>
              {busy ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null}
              Save & apply to all students
            </Button>
            <Button variant="outline" disabled={busy} onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
      <dt className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm font-bold text-navy">{value}</dd>
    </div>
  );
}
