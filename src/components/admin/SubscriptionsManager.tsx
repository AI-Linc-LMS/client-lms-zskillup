'use client';

import { useCallback, useEffect, useState } from 'react';
import { getMe } from '@/lib/api/me';
import { listAdminColleges, type AdminCollegeRow } from '@/lib/api/admin';
import {
  assignSubscription,
  cancelSubscription,
  createSubscriptionPlan,
  extendSubscription,
  formatPrice,
  listSubscriptionPlans,
  listSubscriptions,
  startTrial,
  updateSubscriptionPlan,
} from '@/lib/api/subscriptions';
import type { CollegeSubscriptionDto, SubscriptionPlanDto } from '@/shared/dto/subscription.dto';
import { describeError } from '@/lib/api/errors';
import { BadgeCheck, Loader2, Lock, Plus, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_STYLE: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  EXPIRED: 'bg-amber-100 text-amber-700',
  CANCELLED: 'bg-red-100 text-red-600',
};

type Tab = 'plans' | 'subscriptions';

export function SubscriptionsManager() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>('subscriptions');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const me = await getMe();
        if (alive) setAllowed(me.capabilities?.canManageSubscriptions ?? false);
      } catch {
        if (alive) setAllowed(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const flash = (msg: string) => {
    setSuccess(msg);
    setError(null);
    setTimeout(() => setSuccess(null), 3500);
  };

  if (allowed === null) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-16">
        <Loader2 className="size-6 animate-spin text-slate-400" />
      </div>
    );
  }
  if (!allowed) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-white py-16 text-center">
        <Lock className="size-8 text-slate-300" />
        <p className="max-w-sm text-sm text-slate-500">
          You don&apos;t have the <span className="font-semibold">Manage subscriptions</span>{' '}
          capability. Ask a super-admin to grant it.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 text-sm font-semibold">
        {(['subscriptions', 'plans'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'flex-1 rounded-md px-4 py-2 capitalize transition-colors',
              tab === t ? 'bg-white text-navy' : 'text-slate-500 hover:text-slate-700',
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          <BadgeCheck className="size-4 shrink-0" /> {success}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <XCircle className="size-4 shrink-0" /> {error}
        </div>
      )}

      {tab === 'plans' ? (
        <PlansTab onError={setError} onFlash={flash} />
      ) : (
        <SubscriptionsTab onError={setError} onFlash={flash} />
      )}
    </div>
  );
}

// ── Plans tab ────────────────────────────────────────────────────────────────

const EMPTY_PLAN = {
  name: '',
  description: '',
  priceRupees: 0,
  seatLimit: 0,
  durationDays: '' as number | '',
  features: '',
};

function PlansTab({
  onError,
  onFlash,
}: {
  onError: (m: string) => void;
  onFlash: (m: string) => void;
}) {
  const [plans, setPlans] = useState<SubscriptionPlanDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_PLAN);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPlans(await listSubscriptionPlans(true));
    } catch {
      onError('Failed to load plans.');
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createSubscriptionPlan({
        name: form.name.trim(),
        description: form.description.trim() || null,
        priceCents: Math.round(Number(form.priceRupees) * 100),
        seatLimit: Number(form.seatLimit),
        durationDays: form.durationDays === '' ? null : Number(form.durationDays),
        features: form.features
          .split('\n')
          .map((f) => f.trim())
          .filter(Boolean),
      });
      onFlash('Plan created.');
      setForm(EMPTY_PLAN);
      setShowForm(false);
      load();
    } catch (err) {
      onError(describeError(err, 'Failed to create the plan.'));
    } finally {
      setSaving(false);
    }
  };

  const toggleArchive = async (p: SubscriptionPlanDto) => {
    try {
      await updateSubscriptionPlan(p.id, { isActive: !p.isActive });
      onFlash(p.isActive ? 'Plan archived.' : 'Plan restored.');
      load();
    } catch (err) {
      onError(describeError(err, 'Failed to update the plan.'));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm((s) => !s)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-3 py-2 text-sm font-semibold text-white hover:bg-navy/90"
        >
          <Plus className="size-4" /> New plan
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
          <Field label="Name">
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Price (₹)">
            <input type="number" min={0} value={form.priceRupees} onChange={(e) => setForm({ ...form, priceRupees: Number(e.target.value) })} className={inputCls} />
          </Field>
          <Field label="Seat limit (0 = unlimited)">
            <input type="number" min={0} value={form.seatLimit} onChange={(e) => setForm({ ...form, seatLimit: Number(e.target.value) })} className={inputCls} />
          </Field>
          <Field label="Duration (days, blank = perpetual)">
            <input type="number" min={1} value={form.durationDays} onChange={(e) => setForm({ ...form, durationDays: e.target.value === '' ? '' : Number(e.target.value) })} className={inputCls} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Description">
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Features (one per line)">
              <textarea rows={3} value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} className={inputCls} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <button type="submit" disabled={saving || !form.name.trim()} className="inline-flex items-center gap-2 rounded-lg btn-brand px-4 py-2 text-sm font-semibold disabled:opacity-50">
              {saving && <Loader2 className="size-4 animate-spin" />} Create plan
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="size-6 animate-spin text-slate-400" /></div>
        ) : plans.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">No plans yet. Create one to get started.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                <tr>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3 text-right">Price</th>
                  <th className="px-4 py-3 text-right">Seats</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {plans.map((p) => (
                  <tr key={p.id} className={cn('hover:bg-slate-50', !p.isActive && 'opacity-60')}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-navy">{p.name}</p>
                      {p.description && <p className="text-xs text-slate-400">{p.description}</p>}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">{formatPrice(p.priceCents, p.currency)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">{p.seatLimit === 0 ? '∞' : p.seatLimit}</td>
                    <td className="px-4 py-3 text-slate-600">{p.durationDays ? `${p.durationDays}d` : 'Perpetual'}</td>
                    <td className="px-4 py-3">
                      <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-semibold', p.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500')}>
                        {p.isActive ? 'Active' : 'Archived'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => toggleArchive(p)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                        {p.isActive ? 'Archive' : 'Restore'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Subscriptions tab ────────────────────────────────────────────────────────

function SubscriptionsTab({
  onError,
  onFlash,
}: {
  onError: (m: string) => void;
  onFlash: (m: string) => void;
}) {
  const [subs, setSubs] = useState<CollegeSubscriptionDto[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlanDto[]>([]);
  const [colleges, setColleges] = useState<AdminCollegeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const [collegeId, setCollegeId] = useState('');
  const [planId, setPlanId] = useState('');
  const [trialDays, setTrialDays] = useState(14);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, p, c] = await Promise.all([
        listSubscriptions(),
        listSubscriptionPlans(false),
        listAdminColleges().catch(() => [] as AdminCollegeRow[]),
      ]);
      setSubs(s);
      setPlans(p);
      setColleges(c.filter((x) => x.status === 'ACTIVE'));
    } catch {
      onError('Failed to load subscriptions.');
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (key: string, fn: () => Promise<unknown>, msg: string) => {
    setBusy(key);
    try {
      await fn();
      onFlash(msg);
      await load();
    } catch (err) {
      onError(describeError(err, 'Action failed.'));
    } finally {
      setBusy(null);
    }
  };

  const assign = () =>
    run('assign', () => assignSubscription({ collegeId, planId }), 'Subscription assigned.');
  const trial = () => {
    // Warn before overwriting an existing active PAID subscription with a trial.
    const current = subs.find((s) => s.collegeId === collegeId);
    if (current && !current.isTrial && current.status === 'ACTIVE') {
      if (
        !window.confirm(
          `This college is on the "${current.planName}" plan. Starting a trial will replace it. Continue?`,
        )
      )
        return;
    }
    run('trial', () => startTrial({ collegeId, planId, days: trialDays }), 'Trial started.');
  };

  return (
    <div className="space-y-4">
      {/* Assign / trial panel */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-slate-400">Assign or trial a college</p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1">
            <label className="mb-1 block text-xs text-slate-500">College</label>
            <select value={collegeId} onChange={(e) => setCollegeId(e.target.value)} className={inputCls}>
              <option value="">Select…</option>
              {colleges.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="min-w-[160px] flex-1">
            <label className="mb-1 block text-xs text-slate-500">Plan</label>
            <select value={planId} onChange={(e) => setPlanId(e.target.value)} className={inputCls}>
              <option value="">{'Select…'}</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>{p.name} · {formatPrice(p.priceCents, p.currency)}</option>
              ))}
            </select>
          </div>
          <button
            onClick={assign}
            disabled={!collegeId || !planId || busy === 'assign'}
            className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy/90 disabled:opacity-50"
          >
            {busy === 'assign' ? '…' : 'Assign'}
          </button>
          <div className="flex items-end gap-1.5">
            <div className="w-20">
              <label className="mb-1 block text-xs text-slate-500">Trial days</label>
              <input type="number" min={1} value={trialDays} onChange={(e) => setTrialDays(Number(e.target.value))} className={inputCls} />
            </div>
            <button
              onClick={trial}
              disabled={!collegeId || !planId || busy === 'trial'}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {busy === 'trial' ? '…' : 'Start trial'}
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="size-6 animate-spin text-slate-400" /></div>
        ) : subs.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">No college subscriptions yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                <tr>
                  <th className="px-4 py-3">College</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Seats</th>
                  <th className="px-4 py-3">Expires</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subs.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-navy">{s.collegeName ?? '(Unknown college)'}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {s.planName}
                      {s.isTrial && <span className="ml-1 rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-semibold text-purple-700">TRIAL</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-semibold', STATUS_STYLE[s.status] ?? 'bg-slate-100 text-slate-600')}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                      {s.seatsUsed}
                      {s.seatLimit > 0 ? ` / ${s.seatLimit}` : ''}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {s.expiresAt ? new Date(s.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          onClick={() => run(`ext-${s.id}`, () => extendSubscription(s.id, { days: 30 }), 'Extended by 30 days.')}
                          disabled={busy === `ext-${s.id}` || s.status === 'CANCELLED'}
                          className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                        >
                          +30d
                        </button>
                        {s.status !== 'CANCELLED' && (
                          <button
                            onClick={() => {
                              if (window.confirm(`Cancel ${s.collegeName ?? 'this'} subscription?`)) {
                                run(`cancel-${s.id}`, () => cancelSubscription(s.id), 'Subscription cancelled.');
                              }
                            }}
                            disabled={busy === `cancel-${s.id}`}
                            className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-40"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-[#ffc42d] focus:outline-none focus:ring-1 focus:ring-[#ffc42d]';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
      {children}
    </label>
  );
}
