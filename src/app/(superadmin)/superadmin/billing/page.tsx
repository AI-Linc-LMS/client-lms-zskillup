'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  BadgeIndianRupee,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  Loader2,
  Save,
  Search,
  TrendingUp,
  Users,
  XCircle,
} from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { formatPrice } from '@/lib/api/subscriptions';
import { getFinancialsPayments } from '@/lib/api/financials';
import {
  getPriceBook,
  updatePrice,
  listEntitlements,
  revokeEntitlement,
  grantEntitlement,
} from '@/lib/api/admin-payments';
import type { FinancialsPaymentsDto } from '@/shared/dto/financials.dto';
import type { EntitlementDto, PriceBookEntryDto } from '@/shared/dto/payments.dto';
import { BillingPeriod, EntitlementScope, EntitlementSubject } from '@/shared/enums';
import { cn } from '@/lib/utils';

export default function SuperAdminBillingPage() {
  return (
    <div className="w-full">
      <Breadcrumb items={[{ label: 'Dashboard', href: '/superadmin/dashboard' }, { label: 'Billing' }]} />
      <div className="mt-4">
        <h1 className="text-2xl font-black tracking-tight text-navy">Billing &amp; revenue</h1>
        <p className="text-sm text-slate-500">Real payments, configurable pricing, and student access — Super Admin.</p>
      </div>
      <PaymentsSection />
      <PricingSection />
      <EntitlementsSection />
    </div>
  );
}

/* ── Payments metrics ──────────────────────────────────────────────────────── */
function PaymentsSection() {
  const [data, setData] = useState<FinancialsPaymentsDto | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    getFinancialsPayments()
      .then(setData)
      .catch(() => setErr('You need Super Admin access to view revenue.'));
  }, []);

  if (err) {
    return <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">{err}</div>;
  }
  if (!data) {
    return <div className="mt-6 grid h-40 place-items-center"><Loader2 className="size-5 animate-spin text-slate-400" /></div>;
  }

  return (
    <section className="mt-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Kpi icon={BadgeIndianRupee} label="This month" value={formatPrice(data.monthlyRevenueCents)} tone="orange" />
        <Kpi icon={TrendingUp} label="This year" value={formatPrice(data.annualRevenueCents)} tone="navy" />
        <Kpi icon={CreditCard} label="Lifetime collected" value={formatPrice(data.lifetimeRevenueCents)} tone="navy" />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Mini label="Successful" value={data.successfulPayments} tone="emerald" icon={CheckCircle2} />
        <Mini label="Failed" value={data.failedPayments} tone="rose" icon={XCircle} />
        <Mini label="Pending" value={data.pendingPayments} tone="amber" icon={CalendarClock} />
        <Mini label="Active plans" value={data.activeEntitlements} tone="slate" icon={CheckCircle2} />
        <Mini label="Subscribers" value={data.activeSubscribers} tone="slate" icon={Users} />
        <Mini label="Expiring ≤7d" value={data.expiringSoon} tone="amber" icon={CalendarClock} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Revenue by plan (B2C)">
          {data.revenueByScope.length === 0 ? (
            <Empty>No student purchases yet.</Empty>
          ) : (
            <BreakdownTable
              rows={data.revenueByScope.map((r) => ({
                label: scopeName(r.scope),
                sub: `${r.count} order${r.count === 1 ? '' : 's'}`,
                value: formatPrice(r.amountCents),
              }))}
            />
          )}
        </Panel>
        <Panel title="Revenue by college (B2B)">
          {data.revenueByCollege.length === 0 ? (
            <Empty>No college subscriptions yet.</Empty>
          ) : (
            <BreakdownTable
              rows={data.revenueByCollege.map((r) => ({
                label: r.collegeName,
                sub: `${r.subscriptions} sub${r.subscriptions === 1 ? '' : 's'}`,
                value: formatPrice(r.amountCents),
              }))}
            />
          )}
        </Panel>
      </div>
    </section>
  );
}

/* ── Price book editor ─────────────────────────────────────────────────────── */
function PricingSection() {
  const [rows, setRows] = useState<PriceBookEntryDto[] | null>(null);
  const [draft, setDraft] = useState<Record<string, { rupees: string; days: string; active: boolean }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = () =>
    getPriceBook()
      .then((r) => {
        setRows(r);
        const d: Record<string, { rupees: string; days: string; active: boolean }> = {};
        for (const p of r) d[p.id] = { rupees: String(p.amountCents / 100), days: String(p.durationDays), active: p.isActive };
        setDraft(d);
      })
      .catch(() => setRows([]));

  useEffect(() => {
    void load();
  }, []);

  const save = async (p: PriceBookEntryDto) => {
    const d = draft[p.id];
    if (!d) return;
    const amountCents = Math.round(Number(d.rupees) * 100);
    if (!Number.isFinite(amountCents) || amountCents < 0) {
      toast.error('Enter a valid amount');
      return;
    }
    setSavingId(p.id);
    try {
      await updatePrice(p.id, { amountCents, durationDays: Number(d.days) || p.durationDays, isActive: d.active });
      toast.success('Price updated');
      await load();
    } catch {
      toast.error('Could not update the price');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <section className="mt-8">
      <h2 className="text-lg font-black tracking-tight text-navy">Pricing</h2>
      <p className="text-sm text-slate-500">Edit any price — it applies to new purchases immediately.</p>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <th className="p-3">Scope</th>
              <th className="p-3">Tier</th>
              <th className="p-3">Period</th>
              <th className="p-3">Amount (₹)</th>
              <th className="p-3">Days</th>
              <th className="p-3">Active</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows === null ? (
              <tr><td colSpan={7} className="p-8 text-center"><Loader2 className="mx-auto size-5 animate-spin text-slate-400" /></td></tr>
            ) : (
              rows.map((p) => {
                const d = draft[p.id] ?? { rupees: '', days: '', active: p.isActive };
                return (
                  <tr key={p.id} className="text-navy">
                    <td className="p-3 font-semibold">{scopeName(p.scopeType)}</td>
                    <td className="p-3 text-slate-500">{p.tier}</td>
                    <td className="p-3 capitalize text-slate-500">{p.period.toLowerCase()}</td>
                    <td className="p-3">
                      <input
                        value={d.rupees}
                        onChange={(e) => setDraft((s) => ({ ...s, [p.id]: { ...d, rupees: e.target.value } }))}
                        inputMode="decimal"
                        className="h-9 w-24 rounded-lg border border-slate-200 px-2 text-sm tabular-nums focus:border-orange focus:outline-none"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        value={d.days}
                        onChange={(e) => setDraft((s) => ({ ...s, [p.id]: { ...d, days: e.target.value } }))}
                        inputMode="numeric"
                        className="h-9 w-20 rounded-lg border border-slate-200 px-2 text-sm tabular-nums focus:border-orange focus:outline-none"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={d.active}
                        onChange={(e) => setDraft((s) => ({ ...s, [p.id]: { ...d, active: e.target.checked } }))}
                        className="size-4 accent-orange"
                      />
                    </td>
                    <td className="p-3">
                      <button
                        type="button"
                        onClick={() => void save(p)}
                        disabled={savingId === p.id}
                        className="inline-flex items-center gap-1.5 rounded-full bg-navy px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
                      >
                        {savingId === p.id ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />} Save
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ── Entitlements browser + grant ──────────────────────────────────────────── */
function EntitlementsSection() {
  const [userId, setUserId] = useState('');
  const [rows, setRows] = useState<EntitlementDto[] | null>(null);
  const [busy, setBusy] = useState(false);

  const search = async () => {
    if (!userId.trim()) return;
    setBusy(true);
    try {
      setRows(await listEntitlements({ userId: userId.trim() }));
    } catch {
      toast.error('Could not load entitlements');
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (id: string) => {
    if (!window.confirm('Revoke this entitlement? The student loses access immediately.')) return;
    try {
      await revokeEntitlement(id);
      toast.success('Entitlement revoked');
      await search();
    } catch {
      toast.error('Could not revoke');
    }
  };

  return (
    <section className="mt-8">
      <h2 className="text-lg font-black tracking-tight text-navy">Entitlements</h2>
      <p className="text-sm text-slate-500">Look up and manage what a student or college can access.</p>

      <div className="mt-4 flex flex-wrap items-end gap-2">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">Student user ID</label>
          <input
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void search()}
            placeholder="uuid"
            className="mt-1 h-10 w-72 rounded-lg border border-slate-200 px-3 text-sm focus:border-orange focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={() => void search()}
          disabled={busy || !userId.trim()}
          className="inline-flex h-10 items-center gap-1.5 rounded-full bg-navy px-4 text-sm font-bold text-white disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />} Look up
        </button>
        <GrantForm onGranted={() => void search()} />
      </div>

      {rows !== null && (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="p-3">Scope</th>
                <th className="p-3">Source</th>
                <th className="p-3">Status</th>
                <th className="p-3">Expires</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 ? (
                <tr><td colSpan={5} className="p-6 text-center text-slate-400">No entitlements for this user.</td></tr>
              ) : (
                rows.map((e) => (
                  <tr key={e.id} className="text-navy">
                    <td className="p-3 font-semibold">
                      {scopeName(e.scopeType)}
                      {e.scopeRef ? <span className="text-slate-400"> · {e.scopeRef}</span> : null}
                    </td>
                    <td className="p-3 text-slate-500">{e.source}</td>
                    <td className="p-3">
                      <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold', e.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500')}>
                        {e.status}
                      </span>
                    </td>
                    <td className="p-3 tabular-nums text-slate-500">
                      {e.daysRemaining != null ? `${e.daysRemaining}d` : e.expiresAt ? new Date(e.expiresAt).toLocaleDateString() : 'Lifetime'}
                    </td>
                    <td className="p-3">
                      {e.status === 'ACTIVE' ? (
                        <button type="button" onClick={() => void revoke(e.id)} className="text-xs font-bold text-rose-600 hover:underline">
                          Revoke
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function GrantForm({ onGranted }: { onGranted: () => void }) {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState<EntitlementSubject>(EntitlementSubject.USER);
  const [uid, setUid] = useState('');
  const [scope, setScope] = useState<EntitlementScope>(EntitlementScope.PLATFORM);
  const [ref, setRef] = useState('');
  const [days, setDays] = useState('365');
  const [busy, setBusy] = useState(false);

  const isCollege = subject === EntitlementSubject.COLLEGE;

  const submit = async () => {
    setBusy(true);
    try {
      await grantEntitlement({
        subjectType: subject,
        userId: isCollege ? undefined : uid.trim(),
        collegeId: isCollege ? uid.trim() : undefined,
        scope,
        scopeRef: scope === EntitlementScope.PLATFORM ? undefined : ref.trim() || undefined,
        durationDays: days ? Number(days) : null,
      });
      toast.success(isCollege ? 'College-wide access granted' : 'Access granted');
      setOpen(false);
      setUid('');
      setRef('');
      onGranted();
    } catch {
      toast.error('Could not grant access (check the IDs / scope)');
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="inline-flex h-10 items-center gap-1.5 rounded-full border border-slate-200 px-4 text-sm font-bold text-navy hover:border-orange">
        + Grant access
      </button>
    );
  }
  return (
    <div className="flex w-full flex-wrap items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <select value={subject} onChange={(e) => setSubject(e.target.value as EntitlementSubject)} className="h-9 rounded-lg border border-slate-200 px-2 text-sm">
        <option value={EntitlementSubject.USER}>Student</option>
        <option value={EntitlementSubject.COLLEGE}>College</option>
      </select>
      <input value={uid} onChange={(e) => setUid(e.target.value)} placeholder={isCollege ? 'college ID' : 'student user ID'} className="h-9 w-56 rounded-lg border border-slate-200 px-2 text-sm" />
      <select value={scope} onChange={(e) => setScope(e.target.value as EntitlementScope)} className="h-9 rounded-lg border border-slate-200 px-2 text-sm">
        {Object.values(EntitlementScope).map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      {scope !== EntitlementScope.PLATFORM && (
        <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="slug (topic/section/company)" className="h-9 w-48 rounded-lg border border-slate-200 px-2 text-sm" />
      )}
      <input value={days} onChange={(e) => setDays(e.target.value)} placeholder="days" inputMode="numeric" className="h-9 w-20 rounded-lg border border-slate-200 px-2 text-sm" />
      <button type="button" onClick={() => void submit()} disabled={busy || !uid.trim()} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-orange px-4 text-sm font-bold text-white disabled:opacity-60">
        {busy ? <Loader2 className="size-4 animate-spin" /> : 'Grant'}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="h-9 px-2 text-sm font-semibold text-slate-500">Cancel</button>
    </div>
  );
}

/* ── Small presentational helpers ──────────────────────────────────────────── */
function scopeName(scope: string): string {
  switch (scope) {
    case EntitlementScope.PLATFORM: return 'Full platform';
    case EntitlementScope.SECTION: return 'Section';
    case EntitlementScope.TOPIC: return 'Topic';
    case EntitlementScope.COMPANY: return 'Company';
    default: return scope;
  }
}

function Kpi({ icon: Icon, label, value, tone }: { icon: typeof CreditCard; label: string; value: string; tone: 'orange' | 'navy' }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">
        <span className={cn('grid size-6 place-items-center rounded-lg text-white', tone === 'orange' ? 'bg-gradient-to-br from-[#f7a14e] to-[#f37021]' : 'bg-navy')}>
          <Icon className="size-3.5" />
        </span>
        {label}
      </div>
      <p className="mt-2 text-2xl font-black tracking-tight text-navy tabular-nums">{value}</p>
    </div>
  );
}

const MINI_TONE: Record<string, string> = {
  emerald: 'text-emerald-600', rose: 'text-rose-600', amber: 'text-amber-600', slate: 'text-slate-500',
};
function Mini({ icon: Icon, label, value, tone }: { icon: typeof CreditCard; label: string; value: number; tone: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 text-center shadow-sm">
      <Icon className={cn('mx-auto size-4', MINI_TONE[tone])} />
      <p className="mt-1 text-lg font-black tabular-nums text-navy">{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">{title}</h3>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function BreakdownTable({ rows }: { rows: { label: string; sub: string; value: string }[] }) {
  return (
    <ul className="space-y-2">
      {rows.map((r, i) => (
        <li key={i} className="flex items-center justify-between gap-3 border-b border-slate-50 pb-2 last:border-0">
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-navy">{r.label}</span>
            <span className="text-xs text-slate-400">{r.sub}</span>
          </span>
          <span className="shrink-0 text-sm font-black tabular-nums text-navy">{r.value}</span>
        </li>
      ))}
    </ul>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-sm text-slate-400">{children}</p>;
}
