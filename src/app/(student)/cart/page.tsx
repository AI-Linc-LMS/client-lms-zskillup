'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Building2,
  Check,
  Crown,
  Layers,
  Loader2,
  Lock,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Tag,
  Target,
  Trash2,
  X,
} from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { useCart, cartKey, type CartItem } from '@/components/billing/CartProvider';
import { parseCartLink } from '@/lib/payments/cart-link';
import { PlanPill } from '@/components/billing/plan-ui';
import { getPricing, previewCoupon } from '@/lib/api/payments';
import { getMe } from '@/lib/api/me';
import { buildPriceMap, PERIODS, retailPrice } from '@/lib/payments/pricing';
import { formatPrice } from '@/lib/api/subscriptions';
import { startCartPurchase } from '@/lib/payments/razorpay-checkout';
import { BillingPeriod, EntitlementScope } from '@/shared/enums';
import type { PriceBookEntryDto } from '@/shared/dto/payments.dto';
import type { CouponPreviewResultDto } from '@/shared/dto/coupons.dto';

const GROUPS: { scope: EntitlementScope; title: string; icon: typeof Building2; tint: string }[] = [
  { scope: EntitlementScope.PLATFORM, title: 'Full Platform Access', icon: Crown, tint: 'bg-indigo-50 text-indigo-600' },
  { scope: EntitlementScope.COMPANY, title: 'Selected Companies', icon: Building2, tint: 'bg-violet-50 text-violet-600' },
  { scope: EntitlementScope.SECTION, title: 'Selected Sections', icon: Layers, tint: 'bg-amber-50 text-amber-600' },
  { scope: EntitlementScope.TOPIC, title: 'Selected Topics / Sub-topics', icon: Target, tint: 'bg-emerald-50 text-emerald-600' },
];

const WILL_UNLOCK = [
  'High quality practice questions',
  'All India & Company specific mocks',
  'Detailed solutions & explanations',
  'Performance analytics & reports',
  'Leaderboards & rankings',
  'Personalized study plan',
  'Access on web & mobile',
  'Future updates & new content',
];

export default function CartPage() {
  const { items, remove, clear, setPeriod, add, applyCampaignLink, count, hydrated } = useCart();

  // Campaign pre-fill: /cart?add=PLATFORM:MONTHLY&add=COMPANY:accenture:ANNUAL
  //
  // Runs ONCE, and only after the stored cart has loaded - the storage load replaces
  // `items` wholesale, so adding before it lands would be silently discarded.
  // Reads window.location rather than useSearchParams() deliberately: this is a
  // client-only concern, and useSearchParams() would drag the whole page behind a
  // Suspense boundary for no benefit.
  const prefilled = useRef(false);
  useEffect(() => {
    if (!hydrated || prefilled.current) return;
    prefilled.current = true;
    const parsed = parseCartLink(window.location.search);
    if (!parsed.length) return;
    // One batched pass with deterministic rules - never the conflict popup. Adding
    // these one at a time evaluated every rule against a stale cart, and a declined
    // popup silently consumed the link because the params are stripped either way.
    applyCampaignLink(parsed);
    if (items.length > 0) setPrefillNotice(true);
    // Drop the params so a refresh (or a back-navigation) does not re-add items the
    // student has since removed - the cart itself is now the source of truth.
    const url = new URL(window.location.href);
    url.searchParams.delete('add');
    window.history.replaceState({}, '', url.pathname + url.search + url.hash);
    // `items` is read only to decide whether the cart was already non-empty at the
    // moment the link landed; re-running on every cart change would re-apply the link.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, applyCampaignLink]);
  const [prefillNotice, setPrefillNotice] = useState(false);
  const [prices, setPrices] = useState<PriceBookEntryDto[]>([]);
  const [prefill, setPrefill] = useState<{ name?: string | null; email?: string | null }>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [done, setDone] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<CouponPreviewResultDto | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  useEffect(() => {
    void getPricing().then(setPrices).catch(() => setPrices([]));
    void getMe()
      .then((m) => setPrefill({ name: m.fullName, email: m.email }))
      .catch(() => {});
  }, []);

  const priceMap = useMemo(() => buildPriceMap(prices), [prices]);
  const priceOf = (i: CartItem) => retailPrice(priceMap, i.scope, i.period)?.amountCents ?? null;
  const total = useMemo(() => items.reduce((sum, i) => sum + (priceOf(i) ?? 0), 0), [items, priceMap]);
  const byScope = (scope: EntitlementScope) => items.filter((i) => i.scope === scope);

  // A coupon's discount depends on the cart's exact contents, so a change invalidates
  // any previewed coupon — clear it and let the student re-apply.
  const cartSig = useMemo(
    () => items.map((i) => `${i.scope}:${i.scopeRef ?? ''}:${i.period}`).join('|'),
    [items],
  );
  useEffect(() => {
    setAppliedCoupon(null);
    setCouponError(null);
  }, [cartSig]);

  const discountCents = appliedCoupon?.valid ? appliedCoupon.discountCents : 0;
  // When a coupon is applied the server returns the AUTHORITATIVE resolved cart total
  // (after dedupe / platform-collapse / already-owned drops), so the shown total is
  // exactly what will be charged. Without a coupon we fall back to the client subtotal.
  const authoritativeSubtotal = appliedCoupon?.valid ? appliedCoupon.cartTotalCents : total;
  const rawPayable = Math.max(0, authoritativeSubtotal - discountCents);
  // A coupon that clears the charge below the ₹1 gateway minimum is fulfilled FREE
  // server-side (no widget), so present it as ₹0 rather than a payable sub-₹1 residue.
  const willBeFree = !!appliedCoupon?.valid && rawPayable < 100;
  const payable = willBeFree ? 0 : rawPayable;

  async function applyCoupon() {
    const code = couponInput.trim();
    if (!code || items.length === 0) return;
    setCouponBusy(true);
    setCouponError(null);
    try {
      const res = await previewCoupon({
        code,
        items: items.map((i) => ({ scope: i.scope, scopeRef: i.scopeRef ?? undefined, period: i.period })),
      });
      if (res.valid) {
        setAppliedCoupon(res);
        setCouponError(null);
      } else {
        setAppliedCoupon(null);
        setCouponError(res.reason ?? 'This coupon can’t be applied.');
      }
    } catch {
      setAppliedCoupon(null);
      setCouponError('Could not check that coupon right now. Please try again.');
    } finally {
      setCouponBusy(false);
    }
  }

  function removeCoupon() {
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponError(null);
  }

  // Upgrade nudge - the gap to Full Platform (annual), unless it's already carted.
  const hasPlatform = items.some((i) => i.scope === EntitlementScope.PLATFORM);
  const platformAnnual = retailPrice(priceMap, EntitlementScope.PLATFORM, BillingPeriod.ANNUAL)?.amountCents ?? null;
  const gap = platformAnnual != null ? platformAnnual - total : null;
  const showNudge = !hasPlatform && items.length > 0 && gap != null && gap > 0;

  const switchToPlatform = () => {
    clear();
    add({ scope: EntitlementScope.PLATFORM, scopeRef: null, period: BillingPeriod.ANNUAL, label: 'Full Platform Access' });
  };

  async function checkout() {
    if (items.length === 0) return;
    setBusy(true);
    setMsg(null);
    const res = await startCartPurchase(
      items.map((i) => ({ scope: i.scope, scopeRef: i.scopeRef ?? undefined, period: i.period })),
      prefill,
      appliedCoupon?.valid ? appliedCoupon.code : undefined,
    );
    setBusy(false);
    if (res.ok) {
      clear();
      setDone(true);
      setMsg({
        kind: 'ok',
        text:
          res.skipped && res.skipped > 0
            ? `Unlocked! (${res.skipped} item${res.skipped === 1 ? '' : 's'} you already owned weren't charged.)`
            : 'Unlocked! Your new access is active.',
      });
    } else if (res.dismissed) {
      setMsg({ kind: 'err', text: 'Checkout cancelled - your cart is saved.' });
    } else {
      setMsg({ kind: 'err', text: res.error ?? 'Something went wrong. Please try again.' });
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumb items={[{ label: 'Explore Plans', href: '/shop' }, { label: 'Review Your Plan' }]} />

      {done ? (
        <div className="mx-auto mt-8 max-w-lg rounded-3xl border border-emerald-200 bg-emerald-50 p-8 text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-emerald-100 text-emerald-700">
            <Check className="size-6" />
          </div>
          <p className="mt-4 text-lg font-bold text-emerald-900">{msg?.text}</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/practice" className="rounded-xl bg-navy px-5 py-2.5 text-sm font-bold text-white">
              Start practising
            </Link>
            <Link href="/upgrade" className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-navy">
              My plan
            </Link>
          </div>
        </div>
      ) : count === 0 ? (
        <div className="mx-auto mt-8 max-w-lg rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-500">
            <ShoppingCart className="size-6" />
          </div>
          <p className="mt-4 font-bold text-navy">Your cart is empty</p>
          <p className="mt-1 text-sm text-slate-600">Choose a plan to start unlocking your preparation.</p>
          <Link href="/shop" className="mt-6 inline-block rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white">
            Explore Plans
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-2xl bg-orange/10 text-orange">
                <ShoppingCart className="size-6" />
              </span>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-navy">Review Your Preparation Plan</h1>
                <p className="text-sm text-slate-600">Review your selections before checkout.</p>
              </div>
            </div>
            <PlanPill tone="emerald">{hasPlatform ? 'Full Platform' : '100% Custom Plan'}</PlanPill>
          </div>

          {/* The link changed a cart the student had already built. Saying so beats
              them noticing a different plan at checkout and wondering why. */}
          {prefillNotice ? (
            <p className="mt-4 rounded-lg bg-sky-50 p-3 text-sm font-medium text-sky-800 ring-1 ring-sky-200">
              We updated your cart from the link you opened. Everything below is
              editable before you pay.
            </p>
          ) : null}

          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
            {/* Left - grouped items + footer */}
            <div className="space-y-4">
              {GROUPS.map((g) => {
                const rows = byScope(g.scope);
                if (!rows.length) return null;
                return (
                  <section key={g.scope} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-3 flex items-center gap-2.5">
                      <span className={`grid size-9 place-items-center rounded-xl ${g.tint}`}>
                        <g.icon className="size-5" />
                      </span>
                      <h2 className="flex-1 text-sm font-black text-navy">
                        {g.title} <span className="text-slate-500">({rows.length})</span>
                      </h2>
                    </div>
                    <div className="space-y-3">
                      {rows.map((i) => {
                        const key = cartKey(i);
                        const amt = priceOf(i);
                        return (
                          <div
                            key={key}
                            className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/50 px-3.5 py-3"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-bold text-navy">{i.label}</p>
                              <p className="text-xs uppercase tracking-wide text-slate-500">
                                {i.scope === EntitlementScope.PLATFORM
                                  ? 'All-access'
                                  : `${i.scope.charAt(0)}${i.scope.slice(1).toLowerCase()} access`}
                              </p>
                            </div>
                            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
                              {PERIODS.map((p) => (
                                <button
                                  key={p.period}
                                  type="button"
                                  onClick={() => setPeriod(key, p.period)}
                                  className={`rounded-md px-2.5 py-1 text-xs font-bold transition ${
                                    i.period === p.period
                                      ? 'bg-indigo-600 text-white'
                                      : 'text-slate-600 hover:text-navy'
                                  }`}
                                >
                                  {p.label}
                                </button>
                              ))}
                            </div>
                            <span className="w-20 text-right font-bold tabular-nums text-navy">
                              {amt != null ? formatPrice(amt, 'INR') : '-'}
                            </span>
                            <button
                              type="button"
                              onClick={() => remove(key)}
                              className="rounded-lg p-2 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"
                              aria-label={`Remove ${i.label}`}
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              })}

              <p className="flex items-center gap-2 rounded-2xl border border-indigo-100 bg-indigo-50/50 px-4 py-2.5 text-xs font-semibold text-indigo-600">
                <Sparkles className="size-4" /> You can remove any item or change its access plan duration.
              </p>

              {/* Footer - subtotal + pay */}
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-600">
                    Subtotal ({count} item{count === 1 ? '' : 's'})
                  </span>
                  <span className="text-2xl font-black tabular-nums text-navy">{formatPrice(total, 'INR')}</span>
                </div>
                {msg && (
                  <p className={`mt-3 text-sm font-semibold ${msg.kind === 'ok' ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {msg.text}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => void checkout()}
                  disabled={busy || total === 0}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-orange px-5 py-3.5 text-base font-bold text-[#171717] transition hover:brightness-105 disabled:opacity-60"
                >
                  {busy ? <Loader2 className="size-5 animate-spin" /> : <Lock className="size-5" />}
                  {busy ? 'Opening checkout…' : 'Proceed to Payment'}
                </button>
                <p className="mt-2.5 flex items-center justify-center gap-1.5 text-center text-xs text-slate-500">
                  <ShieldCheck className="size-3.5 text-emerald-500" /> Secured by Razorpay · 256-bit SSL Encrypted
                </p>
              </div>
            </div>

            {/* Right - order summary + unlocks + upgrade nudge */}
            <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-base font-black text-navy">Order Summary</h2>
                <dl className="mt-4 space-y-2.5 text-sm">
                  {hasPlatform ? (
                    <Row icon={<Crown className="size-4 text-indigo-500" />} label="Full Platform" value="1" />
                  ) : (
                    <>
                      <Row icon={<Building2 className="size-4 text-violet-500" />} label="Companies" value={byScope(EntitlementScope.COMPANY).length} />
                      <Row icon={<Layers className="size-4 text-amber-500" />} label="Sections" value={byScope(EntitlementScope.SECTION).length} />
                      <Row icon={<Target className="size-4 text-emerald-500" />} label="Topics / Sub-topics" value={byScope(EntitlementScope.TOPIC).length} />
                    </>
                  )}
                </dl>
                <div className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Subtotal</span>
                    <span className="font-bold tabular-nums text-navy">
                      {formatPrice(authoritativeSubtotal, 'INR')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">GST (Included)</span>
                    <span className="font-bold tabular-nums text-navy">₹0</span>
                  </div>
                </div>

                {/* Coupon */}
                <div className="mt-4 border-t border-slate-100 pt-4">
                  {appliedCoupon?.valid ? (
                    <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                      <span className="flex items-center gap-2 text-sm">
                        <Tag className="size-4 text-emerald-600" />
                        <span className="font-bold text-emerald-800">{appliedCoupon.code}</span>
                        {appliedCoupon.label ? (
                          <span className="text-emerald-700">{appliedCoupon.label}</span>
                        ) : null}
                      </span>
                      <button
                        type="button"
                        onClick={removeCoupon}
                        className="rounded-lg p-1.5 text-emerald-700 transition hover:bg-emerald-100"
                        aria-label="Remove coupon"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            void applyCoupon();
                          }
                        }}
                        placeholder="Have a coupon code?"
                        aria-label="Coupon code"
                        maxLength={40}
                        className="h-10 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold uppercase tracking-wide text-navy placeholder:font-normal placeholder:normal-case placeholder:tracking-normal placeholder:text-slate-400 focus:border-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/30"
                      />
                      <button
                        type="button"
                        onClick={() => void applyCoupon()}
                        disabled={couponBusy || !couponInput.trim()}
                        className="inline-flex h-10 items-center justify-center rounded-lg bg-navy px-4 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
                      >
                        {couponBusy ? <Loader2 className="size-4 animate-spin" /> : 'Apply'}
                      </button>
                    </div>
                  )}
                  {couponError ? (
                    <p className="mt-2 text-xs font-medium text-rose-600">{couponError}</p>
                  ) : null}
                </div>

                {discountCents > 0 ? (
                  <div className="mt-3 flex justify-between text-sm">
                    <span className="text-emerald-700">
                      Discount{appliedCoupon?.code ? ` (${appliedCoupon.code})` : ''}
                    </span>
                    <span className="font-bold tabular-nums text-emerald-700">
                      -{formatPrice(discountCents, 'INR')}
                    </span>
                  </div>
                ) : null}

                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="font-black text-navy">Total</span>
                  <span className="text-2xl font-black tabular-nums text-indigo-600">
                    {willBeFree ? 'FREE' : formatPrice(payable, 'INR')}
                  </span>
                </div>
                <div className="mt-4 flex items-start gap-2.5 rounded-2xl bg-emerald-50 p-3">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                  <div>
                    <p className="text-sm font-bold text-emerald-800">100% Secure Payments</p>
                    <p className="text-xs text-emerald-700/80">Your payment information is safe with us.</p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-base font-black text-navy">You Will Unlock</h3>
                <ul className="mt-3 space-y-2">
                  {WILL_UNLOCK.map((u) => (
                    <li key={u} className="flex items-start gap-2 text-sm text-slate-600">
                      <Check className="mt-0.5 size-4 shrink-0 text-indigo-500" /> {u}
                    </li>
                  ))}
                </ul>
              </div>

              {showNudge && (
                <div className="rounded-3xl border border-amber-200 bg-amber-50/70 p-5">
                  <div className="flex items-center gap-2.5">
                    <span className="grid size-9 place-items-center rounded-xl bg-amber-100 text-amber-600">
                      <Crown className="size-5" />
                    </span>
                    <div>
                      <p className="text-sm font-black text-navy">Upgrade to Full Platform</p>
                      <p className="text-xs text-amber-700">
                        Only {formatPrice(gap!, 'INR')} more than your current selection.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={switchToPlatform}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-sm font-bold text-amber-700 transition hover:bg-amber-50"
                  >
                    <Crown className="size-4" /> Switch to Full Platform · {formatPrice(platformAnnual!, 'INR')}
                  </button>
                  <p className="mt-2 text-center text-[11px] text-amber-700/80">
                    Unlock all companies, sections, topics &amp; premium features.
                  </p>
                </div>
              )}

              <Link
                href="/shop"
                className="flex items-center justify-center gap-1.5 text-sm font-semibold text-slate-600 transition hover:text-navy"
              >
                Add more to your plan <ArrowRight className="size-4" />
              </Link>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-slate-600">
        {icon} {label}
      </span>
      <span className="font-bold tabular-nums text-navy">{value}</span>
    </div>
  );
}
