'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Copy,
  Loader2,
  Lock,
  Megaphone,
  Percent,
  Plus,
  Tag,
  Ticket,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { getMe } from '@/lib/api/me';
import {
  createCampaign,
  createCoupon,
  deleteCampaign,
  deleteCoupon,
  getCouponUsage,
  listCampaigns,
  listCoupons,
  updateCoupon,
} from '@/lib/api/admin-coupons';
import { formatPrice } from '@/lib/api/subscriptions';
import { describeError } from '@/lib/api/errors';
import {
  BillingPeriod,
  CouponAudience,
  CouponCampaignChannel,
  CouponDiscountType,
  EntitlementScope,
} from '@/shared/enums';
import type {
  CouponCampaignDto,
  CouponDto,
  CouponUsageStatsDto,
  CreateCouponDto,
} from '@/shared/dto/coupons.dto';
import { cn } from '@/lib/utils';

type Tab = 'coupons' | 'campaigns' | 'usage';

const AUDIENCE_LABEL: Record<CouponAudience, string> = {
  [CouponAudience.ALL]: 'Everyone',
  [CouponAudience.NEW_USERS]: 'New users (first purchase)',
  [CouponAudience.EXISTING_USERS]: 'Existing customers',
  [CouponAudience.USER]: 'Specific users',
};

const SCOPE_LABEL: Record<EntitlementScope, string> = {
  [EntitlementScope.PLATFORM]: 'Full platform',
  [EntitlementScope.COMPANY]: 'Any company hub',
  [EntitlementScope.SECTION]: 'Any section',
  [EntitlementScope.TOPIC]: 'Any topic / sub-topic',
};

const SCOPE_ORDER: EntitlementScope[] = [
  EntitlementScope.PLATFORM,
  EntitlementScope.COMPANY,
  EntitlementScope.SECTION,
  EntitlementScope.TOPIC,
];

// The only purchasable plan durations. There is deliberately no 6-month plan — the
// billing engine sells 1 / 3 / 12 months only, so a coupon can't target one.
const PERIOD_LABEL: Record<BillingPeriod, string> = {
  [BillingPeriod.MONTHLY]: '1 Month',
  [BillingPeriod.QUARTERLY]: '3 Months',
  [BillingPeriod.ANNUAL]: '12 Months',
};

const PERIOD_ORDER: BillingPeriod[] = [
  BillingPeriod.MONTHLY,
  BillingPeriod.QUARTERLY,
  BillingPeriod.ANNUAL,
];

const CHANNEL_LABEL: Record<CouponCampaignChannel, string> = {
  [CouponCampaignChannel.EMAIL]: 'Email',
  [CouponCampaignChannel.WHATSAPP]: 'WhatsApp',
  [CouponCampaignChannel.STUDENT]: 'Student',
  [CouponCampaignChannel.COLLEGE]: 'College',
  [CouponCampaignChannel.LAUNCH]: 'Launch',
  [CouponCampaignChannel.SPECIAL_OFFER]: 'Special offer',
  [CouponCampaignChannel.GENERAL]: 'General',
};

const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-navy focus:border-orange focus:outline-none focus:ring-2 focus:ring-orange/30';

export function CouponsManager() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>('coupons');
  const [campaigns, setCampaigns] = useState<CouponCampaignDto[]>([]);

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

  const loadCampaigns = useCallback(async () => {
    try {
      setCampaigns(await listCampaigns());
    } catch {
      /* surfaced by the tab that needs it */
    }
  }, []);

  useEffect(() => {
    if (allowed) void loadCampaigns();
  }, [allowed, loadCampaigns]);

  if (allowed === null) {
    return (
      <div className="mt-6 flex items-center justify-center rounded-xl border border-slate-200 bg-white py-16">
        <Loader2 className="size-6 animate-spin text-slate-500" />
      </div>
    );
  }
  if (!allowed) {
    return (
      <div className="mt-6 flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-white py-16 text-center">
        <Lock className="size-8 text-slate-400" />
        <p className="max-w-sm text-sm text-slate-600">
          You don&apos;t have the <span className="font-semibold">Manage subscriptions</span>{' '}
          capability. Ask a super-admin to grant it.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-5">
      <div className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 text-sm font-semibold">
        {(
          [
            ['coupons', 'Coupons', Ticket],
            ['campaigns', 'Campaigns', Megaphone],
            ['usage', 'Usage & performance', TrendingUp],
          ] as [Tab, string, typeof Ticket][]
        ).map(([t, label, Icon]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-md px-4 py-2 transition-colors',
              tab === t ? 'bg-white text-navy shadow-sm' : 'text-slate-600 hover:text-slate-700',
            )}
          >
            <Icon className="size-4" /> {label}
          </button>
        ))}
      </div>

      {tab === 'coupons' && <CouponsTab campaigns={campaigns} />}
      {tab === 'campaigns' && <CampaignsTab onChanged={loadCampaigns} />}
      {tab === 'usage' && <UsageTab />}
    </div>
  );
}

// ── Coupons tab ────────────────────────────────────────────────────────────

function CouponsTab({ campaigns }: { campaigns: CouponCampaignDto[] }) {
  const [coupons, setCoupons] = useState<CouponDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CouponDto | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setCoupons(await listCoupons());
    } catch (err) {
      toast.error(describeError(err, 'Failed to load coupons.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const startCreate = () => {
    setEditing(null);
    setShowForm(true);
  };
  const startEdit = (c: CouponDto) => {
    setEditing(c);
    setShowForm(true);
  };

  const onSaved = () => {
    setShowForm(false);
    setEditing(null);
    void load();
  };

  const toggleActive = async (c: CouponDto) => {
    try {
      await updateCoupon(c.id, { isActive: !c.isActive });
      toast.success(c.isActive ? 'Coupon paused.' : 'Coupon activated.');
      void load();
    } catch (err) {
      toast.error(describeError(err, 'Failed to update the coupon.'));
    }
  };

  const remove = async (c: CouponDto) => {
    if (!window.confirm(`Delete coupon ${c.code}? Past orders keep their record.`)) return;
    try {
      await deleteCoupon(c.id);
      toast.success('Coupon deleted.');
      void load();
    } catch (err) {
      toast.error(describeError(err, 'Failed to delete the coupon.'));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={startCreate}
          className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-3 py-2 text-sm font-semibold text-white transition hover:bg-navy/90"
        >
          <Plus className="size-4" /> New coupon
        </button>
      </div>

      {showForm && (
        <CouponForm
          key={editing?.id ?? 'new'}
          editing={editing}
          campaigns={campaigns}
          onCancel={() => setShowForm(false)}
          onSaved={onSaved}
        />
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-slate-500" />
          </div>
        ) : coupons.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            No coupons yet. Create one to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Discount</th>
                  <th className="px-4 py-3">Applies to</th>
                  <th className="px-4 py-3">Audience</th>
                  <th className="px-4 py-3 text-right">Used</th>
                  <th className="px-4 py-3 text-right">Discount given</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {coupons.map((c) => (
                  <tr key={c.id} className={cn('hover:bg-slate-50', !c.isActive && 'opacity-60')}>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => {
                          void navigator.clipboard?.writeText(c.code);
                          toast.success(`Copied ${c.code}`);
                        }}
                        className="inline-flex items-center gap-1.5 font-bold text-navy"
                        title="Copy code"
                      >
                        <Tag className="size-3.5 text-slate-400" /> {c.code}
                        <Copy className="size-3 text-slate-400" />
                      </button>
                      {c.campaignName ? (
                        <p className="text-xs text-slate-500">{c.campaignName}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 font-semibold text-navy">{discountText(c)}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {appliesToText(c)}
                      {c.applicablePeriods.length > 0 ? (
                        <p className="text-xs text-slate-400">{durationText(c)}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{AUDIENCE_LABEL[c.audience]}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                      {c.redemptions}
                      {c.maxRedemptions != null ? ` / ${c.maxRedemptions}` : ''}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                      {formatPrice(c.discountGivenCents, c.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => void toggleActive(c)}>
                        <span
                          className={cn(
                            'rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                            c.isActive
                              ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                              : 'bg-slate-50 text-slate-600 ring-1 ring-slate-200',
                          )}
                        >
                          {c.isActive ? 'Active' : 'Paused'}
                        </span>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => startEdit(c)}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => void remove(c)}
                          className="rounded-lg border border-red-200 p-1.5 text-red-600 hover:bg-red-50"
                          aria-label={`Delete ${c.code}`}
                        >
                          <Trash2 className="size-4" />
                        </button>
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

// ── Coupon create/edit form ─────────────────────────────────────────────────

function CouponForm({
  editing,
  campaigns,
  onCancel,
  onSaved,
}: {
  editing: CouponDto | null;
  campaigns: CouponCampaignDto[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [code, setCode] = useState(editing?.code ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [campaignId, setCampaignId] = useState(editing?.campaignId ?? '');
  const [discountType, setDiscountType] = useState<CouponDiscountType>(
    editing?.discountType ?? CouponDiscountType.PERCENT,
  );
  const [discountValue, setDiscountValue] = useState<string>(
    editing
      ? editing.discountType === CouponDiscountType.PERCENT
        ? String(editing.discountValue)
        : String(editing.discountValue / 100)
      : '10',
  );
  const [maxDiscount, setMaxDiscount] = useState<string>(
    editing?.maxDiscountCents != null ? String(editing.maxDiscountCents / 100) : '',
  );
  const [minOrder, setMinOrder] = useState<string>(
    editing && editing.minOrderCents > 0 ? String(editing.minOrderCents / 100) : '',
  );
  const [appliesToAll, setAppliesToAll] = useState(editing?.appliesToAll ?? true);
  const [scopes, setScopes] = useState<Set<EntitlementScope>>(
    new Set(editing?.applicability.map((a) => a.scopeType) ?? []),
  );
  // Empty set = "Any duration" (works for every plan length).
  const [periods, setPeriods] = useState<Set<BillingPeriod>>(
    new Set(editing?.applicablePeriods ?? []),
  );
  const [audience, setAudience] = useState<CouponAudience>(editing?.audience ?? CouponAudience.ALL);
  const [targetUsers, setTargetUsers] = useState(editing?.targetUserIds.join('\n') ?? '');
  const [maxRedemptions, setMaxRedemptions] = useState<string>(
    editing?.maxRedemptions != null ? String(editing.maxRedemptions) : '',
  );
  const [perUserLimit, setPerUserLimit] = useState<string>(String(editing?.perUserLimit ?? 1));
  const [startsAt, setStartsAt] = useState<string>(toLocalInput(editing?.startsAt ?? null));
  const [expiresAt, setExpiresAt] = useState<string>(toLocalInput(editing?.expiresAt ?? null));
  const [isActive, setIsActive] = useState(editing?.isActive ?? true);
  const [saving, setSaving] = useState(false);

  const toggleScope = (s: EntitlementScope) => {
    setScopes((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  };

  const togglePeriod = (p: BillingPeriod) => {
    setPeriods((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length < 2) {
      toast.error('Enter a coupon code (at least 2 characters).');
      return;
    }
    if (!appliesToAll && scopes.size === 0) {
      toast.error('Pick at least one product, or set it to apply to everything.');
      return;
    }
    const parsedTargetUsers = targetUsers
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (audience === CouponAudience.USER && parsedTargetUsers.length === 0) {
      toast.error('Add at least one user for a user-targeted coupon.');
      return;
    }
    // Everything except `code` (which is immutable once created). Create adds the code.
    const body = {
      description: description.trim() || null,
      campaignId: campaignId || null,
      discountType,
      discountValue:
        discountType === CouponDiscountType.PERCENT
          ? Math.round(Number(discountValue))
          : Math.round(Number(discountValue) * 100),
      maxDiscountCents:
        discountType === CouponDiscountType.PERCENT && maxDiscount.trim() !== ''
          ? Math.round(Number(maxDiscount) * 100)
          : null,
      minOrderCents: minOrder.trim() !== '' ? Math.round(Number(minOrder) * 100) : 0,
      appliesToAll,
      applicability: appliesToAll
        ? []
        : [...scopes].map((s) => ({ scopeType: s, scopeRef: null })),
      applicablePeriods: [...periods],
      audience,
      targetUserIds: audience === CouponAudience.USER ? parsedTargetUsers : [],
      maxRedemptions: maxRedemptions.trim() !== '' ? Math.round(Number(maxRedemptions)) : null,
      perUserLimit: Math.max(1, Math.round(Number(perUserLimit) || 1)),
      startsAt: startsAt ? new Date(startsAt).toISOString() : null,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      isActive,
    };

    setSaving(true);
    try {
      if (editing) {
        await updateCoupon(editing.id, body);
        toast.success('Coupon updated.');
      } else {
        const payload: CreateCouponDto = { code: trimmed, ...body };
        await createCoupon(payload);
        toast.success('Coupon created.');
      }
      onSaved();
    } catch (err) {
      toast.error(describeError(err, 'Failed to save the coupon.'));
    } finally {
      setSaving(false);
    }
  };

  const isPercent = discountType === CouponDiscountType.PERCENT;

  return (
    <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
        {editing ? `Edit ${editing.code}` : 'New coupon'}
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Code">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            disabled={!!editing}
            placeholder="WELCOME20"
            className={cn(inputCls, 'font-semibold uppercase tracking-wide disabled:bg-slate-50 disabled:text-slate-500')}
          />
        </Field>
        <Field label="Campaign (optional)">
          <select value={campaignId} onChange={(e) => setCampaignId(e.target.value)} className={inputCls}>
            <option value="">— None —</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>

        <div className="sm:col-span-2">
          <Field label="Description (optional)">
            <input value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} />
          </Field>
        </div>

        <Field label="Discount type">
          <div className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
            {[
              [CouponDiscountType.PERCENT, 'Percent', Percent],
              [CouponDiscountType.FLAT, 'Flat ₹', Tag],
            ].map(([t, label, Icon]) => {
              const TIcon = Icon as typeof Percent;
              const active = discountType === t;
              return (
                <button
                  key={t as string}
                  type="button"
                  onClick={() => {
                    const next = t as CouponDiscountType;
                    if (next === discountType) return;
                    setDiscountType(next);
                    // Reset the amount so the same digits aren't reinterpreted under the
                    // new unit (a "20" percent silently becoming a ₹20 flat discount).
                    setDiscountValue(next === CouponDiscountType.PERCENT ? '10' : '');
                    if (next === CouponDiscountType.FLAT) setMaxDiscount('');
                  }}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition',
                    active ? 'bg-white text-navy shadow-sm' : 'text-slate-500',
                  )}
                >
                  <TIcon className="size-3.5" /> {label as string}
                </button>
              );
            })}
          </div>
        </Field>
        <Field label={isPercent ? 'Percent off (1–100)' : 'Amount off (₹)'}>
          <input
            type="number"
            min={isPercent ? 1 : 1}
            max={isPercent ? 100 : undefined}
            value={discountValue}
            onChange={(e) => setDiscountValue(e.target.value)}
            className={inputCls}
          />
        </Field>

        {isPercent && (
          <Field label="Max discount cap (₹, optional)">
            <input
              type="number"
              min={0}
              value={maxDiscount}
              onChange={(e) => setMaxDiscount(e.target.value)}
              placeholder="No cap"
              className={inputCls}
            />
          </Field>
        )}
        <Field label="Minimum order (₹, optional)">
          <input
            type="number"
            min={0}
            value={minOrder}
            onChange={(e) => setMinOrder(e.target.value)}
            placeholder="0"
            className={inputCls}
          />
        </Field>

        {/* Applicability */}
        <div className="sm:col-span-2">
          <label className="mb-2 flex items-center gap-2 text-sm font-medium text-navy">
            <input
              type="checkbox"
              checked={appliesToAll}
              onChange={(e) => setAppliesToAll(e.target.checked)}
              className="size-4 rounded border-slate-300 text-orange focus:ring-orange/30"
            />
            Applies to everything (all products)
          </label>
          {!appliesToAll && (
            <div className="grid grid-cols-2 gap-2 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
              {SCOPE_ORDER.map((s) => (
                <label key={s} className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={scopes.has(s)}
                    onChange={() => toggleScope(s)}
                    className="size-4 rounded border-slate-300 text-orange focus:ring-orange/30"
                  />
                  {SCOPE_LABEL[s]}
                </label>
              ))}
              <p className="col-span-2 text-xs text-slate-500">
                Scope-level targeting. Specific companies/topics can be added later.
              </p>
            </div>
          )}
        </div>

        {/* Plan duration */}
        <div className="sm:col-span-2">
          <span className="mb-2 block text-xs font-medium text-slate-600">
            Applicable plan duration
          </span>
          <div className="grid grid-cols-2 gap-2 rounded-lg border border-slate-200 bg-slate-50/60 p-3 sm:grid-cols-4">
            {PERIOD_ORDER.map((p) => (
              <label key={p} className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={periods.has(p)}
                  onChange={() => togglePeriod(p)}
                  className="size-4 rounded border-slate-300 text-orange focus:ring-orange/30"
                />
                {PERIOD_LABEL[p]}
              </label>
            ))}
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={periods.size === 0}
                onChange={() => setPeriods(new Set())}
                className="size-4 rounded border-slate-300 text-orange focus:ring-orange/30"
              />
              Any duration
            </label>
            <p className="col-span-2 text-xs text-slate-500 sm:col-span-4">
              Select one or more durations — the coupon only applies to those plan lengths.
              Leave as “Any duration” to allow every plan.
            </p>
          </div>
        </div>

        <Field label="Audience">
          <select
            value={audience}
            onChange={(e) => setAudience(e.target.value as CouponAudience)}
            className={inputCls}
          >
            {Object.values(CouponAudience).map((a) => (
              <option key={a} value={a}>
                {AUDIENCE_LABEL[a]}
              </option>
            ))}
          </select>
        </Field>
        {audience === CouponAudience.USER ? (
          <Field label="User IDs (one per line)">
            <textarea
              rows={2}
              value={targetUsers}
              onChange={(e) => setTargetUsers(e.target.value)}
              className={inputCls}
            />
          </Field>
        ) : (
          <div />
        )}

        <Field label="Total redemption limit (blank = unlimited)">
          <input
            type="number"
            min={1}
            value={maxRedemptions}
            onChange={(e) => setMaxRedemptions(e.target.value)}
            placeholder="Unlimited"
            className={inputCls}
          />
        </Field>
        <Field label="Per-user limit">
          <input
            type="number"
            min={1}
            value={perUserLimit}
            onChange={(e) => setPerUserLimit(e.target.value)}
            className={inputCls}
          />
        </Field>

        <Field label="Starts at (optional)">
          <input
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Expires at (optional)">
          <input
            type="datetime-local"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className={inputCls}
          />
        </Field>

        <div className="sm:col-span-2">
          <label className="flex items-center gap-2 text-sm font-medium text-navy">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="size-4 rounded border-slate-300 text-orange focus:ring-orange/30"
            />
            Active (students can use it right away)
          </label>
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg btn-brand px-4 py-2 text-sm font-semibold disabled:opacity-50"
        >
          {saving && <Loader2 className="size-4 animate-spin" />}
          {editing ? 'Save changes' : 'Create coupon'}
        </button>
      </div>
    </form>
  );
}

// ── Campaigns tab ──────────────────────────────────────────────────────────

function CampaignsTab({ onChanged }: { onChanged: () => void }) {
  const [campaigns, setCampaigns] = useState<CouponCampaignDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [channel, setChannel] = useState<CouponCampaignChannel>(CouponCampaignChannel.GENERAL);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setCampaigns(await listCampaigns());
    } catch (err) {
      toast.error(describeError(err, 'Failed to load campaigns.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await createCampaign({ name: name.trim(), description: description.trim() || null, channel });
      toast.success('Campaign created.');
      setName('');
      setDescription('');
      setChannel(CouponCampaignChannel.GENERAL);
      setShowForm(false);
      await load();
      onChanged();
    } catch (err) {
      toast.error(describeError(err, 'Failed to create the campaign.'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (c: CouponCampaignDto) => {
    if (!window.confirm(`Delete campaign "${c.name}"? Its coupons survive, ungrouped.`)) return;
    try {
      await deleteCampaign(c.id);
      toast.success('Campaign deleted.');
      await load();
      onChanged();
    } catch (err) {
      toast.error(describeError(err, 'Failed to delete the campaign.'));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm((s) => !s)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-3 py-2 text-sm font-semibold text-white transition hover:bg-navy/90"
        >
          <Plus className="size-4" /> New campaign
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
          <Field label="Name">
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Channel">
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value as CouponCampaignChannel)}
              className={inputCls}
            >
              {Object.values(CouponCampaignChannel).map((ch) => (
                <option key={ch} value={ch}>
                  {CHANNEL_LABEL[ch]}
                </option>
              ))}
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Description (optional)">
              <input value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="inline-flex items-center gap-2 rounded-lg btn-brand px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              {saving && <Loader2 className="size-4 animate-spin" />} Create campaign
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-slate-500" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            No campaigns yet. Group coupons under a campaign to track performance.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="px-4 py-3">Campaign</th>
                  <th className="px-4 py-3">Channel</th>
                  <th className="px-4 py-3 text-right">Coupons</th>
                  <th className="px-4 py-3 text-right">Redemptions</th>
                  <th className="px-4 py-3 text-right">Revenue</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {campaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-navy">{c.name}</p>
                      {c.description ? <p className="text-xs text-slate-500">{c.description}</p> : null}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{CHANNEL_LABEL[c.channel]}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">{c.couponCount}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">{c.redemptions}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                      {formatPrice(c.revenueCents, 'INR')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => void remove(c)}
                        className="rounded-lg border border-red-200 p-1.5 text-red-600 hover:bg-red-50"
                        aria-label={`Delete ${c.name}`}
                      >
                        <Trash2 className="size-4" />
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

// ── Usage & performance tab ─────────────────────────────────────────────────

function UsageTab() {
  const [stats, setStats] = useState<CouponUsageStatsDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const s = await getCouponUsage();
        if (alive) setStats(s);
      } catch (err) {
        toast.error(describeError(err, 'Failed to load usage.'));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-16">
        <Loader2 className="size-6 animate-spin text-slate-500" />
      </div>
    );
  }
  if (!stats) return null;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Kpi label="Coupons" value={String(stats.totalCoupons)} sub={`${stats.activeCoupons} active`} />
        <Kpi label="Redemptions" value={String(stats.totalRedemptions)} />
        <Kpi label="Discount given" value={formatPrice(stats.totalDiscountCents, stats.currency)} />
        <Kpi label="Coupon revenue" value={formatPrice(stats.totalRevenueCents, stats.currency)} />
        <Kpi
          label="Net after discount"
          value={formatPrice(Math.max(0, stats.totalRevenueCents), stats.currency)}
          sub="collected"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-3 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
          Top coupons
        </div>
        {stats.topCoupons.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-500">No redemptions yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3 text-right">Redemptions</th>
                  <th className="px-4 py-3 text-right">Discount given</th>
                  <th className="px-4 py-3 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.topCoupons.map((c) => (
                  <tr key={c.couponId} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold text-navy">{c.code}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">{c.redemptions}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                      {formatPrice(c.discountCents, stats.currency)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                      {formatPrice(c.revenueCents, stats.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-3 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
          Campaign performance
        </div>
        {stats.campaigns.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-500">No campaigns yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="px-4 py-3">Campaign</th>
                  <th className="px-4 py-3">Channel</th>
                  <th className="px-4 py-3 text-right">Coupons</th>
                  <th className="px-4 py-3 text-right">Redemptions</th>
                  <th className="px-4 py-3 text-right">Discount</th>
                  <th className="px-4 py-3 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.campaigns.map((c) => (
                  <tr key={c.campaignId} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-navy">{c.name}</td>
                    <td className="px-4 py-3 text-slate-600">{CHANNEL_LABEL[c.channel]}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">{c.couponCount}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">{c.redemptions}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                      {formatPrice(c.discountCents, stats.currency)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                      {formatPrice(c.revenueCents, stats.currency)}
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

// ── Bits ─────────────────────────────────────────────────────────────────────

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-1 text-[22px] font-extrabold leading-none tabular-nums text-navy">{value}</p>
      {sub ? <p className="mt-1 text-xs text-slate-500">{sub}</p> : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}

function discountText(c: CouponDto): string {
  return c.discountType === CouponDiscountType.PERCENT
    ? `${c.discountValue}%${c.maxDiscountCents != null ? ` (max ${formatPrice(c.maxDiscountCents, c.currency)})` : ''}`
    : `${formatPrice(c.discountValue, c.currency)} off`;
}

function appliesToText(c: CouponDto): string {
  if (c.appliesToAll) return 'Everything';
  if (c.applicability.length === 0) return '—';
  return c.applicability
    .map((a) => (a.scopeRef ? `${SCOPE_LABEL[a.scopeType]}: ${a.scopeRef}` : SCOPE_LABEL[a.scopeType]))
    .join(', ');
}

/** The plan-duration restriction as a short label; '' when unrestricted (any). */
function durationText(c: CouponDto): string {
  if (c.applicablePeriods.length === 0) return '';
  return c.applicablePeriods
    .map((p) => PERIOD_LABEL[p])
    .filter(Boolean)
    .join(', ');
}

function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  // datetime-local wants local YYYY-MM-DDTHH:mm
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
