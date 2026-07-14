'use client';

import { useState, type ReactNode } from 'react';
import { BadgeCheck, CheckCircle2, ChevronDown, ShieldCheck, Sparkles, Zap, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type IconType = LucideIcon;

/**
 * Shared chrome for the plans/checkout surfaces (Explore Plans, Full Platform,
 * Build Your Own, Cart, Upgrade & Renew). Palette convention for these screens:
 *   • violet/indigo — the plan-commerce accent ("choose / add / checkout")
 *   • orange        — the final commit CTA ("Proceed to Payment") + brand chrome
 *   • emerald       — savings + success (checks, "Best Value", "Save 37%")
 *   • navy          — text + structure
 * This keeps a distinct "premium" language on billing while the rest of the app
 * stays navy+orange.
 */

/** A checkmark feature row. `tone` picks the tick colour. */
export function FeatureItem({
  children,
  tone = 'violet',
  className,
}: {
  children: ReactNode;
  tone?: 'violet' | 'emerald' | 'slate';
  className?: string;
}) {
  const tick =
    tone === 'emerald' ? 'text-emerald-500' : tone === 'slate' ? 'text-slate-500' : 'text-[#f5b400]';
  return (
    <li className={cn('flex items-start gap-2.5 text-sm text-slate-600', className)}>
      <CheckCircle2 className={cn('mt-0.5 size-4 shrink-0', tick)} />
      <span className="min-w-0 flex-1">{children}</span>
    </li>
  );
}

/** "Best Value" / "Most Popular" / "Save 37%" pill. */
export function PlanPill({
  children,
  tone = 'emerald',
}: {
  children: ReactNode;
  tone?: 'emerald' | 'violet' | 'amber';
}) {
  const cls =
    tone === 'violet'
      ? 'bg-navy text-white'
      : tone === 'amber'
        ? 'bg-amber-100 text-amber-700'
        : 'bg-emerald-100 text-emerald-700';
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold', cls)}>
      {children}
    </span>
  );
}

/** The three trust badges shown at the foot of the plan surfaces. */
export function TrustBadges({ className }: { className?: string }) {
  const items = [
    { icon: ShieldCheck, title: 'Secure Payments', sub: '100% safe & secure transactions', tint: 'text-emerald-600 bg-emerald-50' },
    { icon: BadgeCheck, title: 'Best Value', sub: 'Save more with full platform access', tint: 'text-amber-600 bg-amber-50' },
    { icon: Zap, title: 'Instant Access', sub: 'Get started immediately after purchase', tint: 'text-[#a16207] bg-[#fff5ea]' },
  ];
  return (
    <div
      className={cn(
        'grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-3',
        className,
      )}
    >
      {items.map((it) => (
        <div key={it.title} className="flex items-center gap-3">
          <span className={cn('grid size-10 shrink-0 place-items-center rounded-xl', it.tint)}>
            <it.icon className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-navy">{it.title}</p>
            <p className="text-xs text-slate-600">{it.sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Slim centered "100% Secure Payments" reassurance chip. */
export function SecurePaymentsNote({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center', className)}>
      <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600">
        <ShieldCheck className="size-4 text-emerald-500" /> 100% Secure Payments
      </span>
    </div>
  );
}

/** A full-width band of headline stats (companies / questions / mocks …). */
export function StatBand({
  stats,
  className,
}: {
  stats: { icon: IconType; value: string; label: string; tint: string }[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:grid-cols-4',
        className,
      )}
    >
      {stats.map((s) => (
        <div key={s.label} className="flex items-center gap-3 rounded-2xl px-2 py-1.5">
          <span className={cn('grid size-11 shrink-0 place-items-center rounded-2xl', s.tint)}>
            <s.icon className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xl font-black tabular-nums tracking-tight text-navy">{s.value}</p>
            <p className="truncate text-xs font-medium text-slate-600">{s.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/** "Everything includes" grid — icon cards describing what a plan unlocks. */
export function IncludedGrid({
  items,
  className,
}: {
  items: { icon: IconType; title: string; desc: string }[];
  className?: string;
}) {
  return (
    <div className={cn('grid gap-3 sm:grid-cols-2 lg:grid-cols-3', className)}>
      {items.map((it) => (
        <div
          key={it.title}
          className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-[#ffc42d]/40 hover:shadow-md"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#fff5ea] text-[#a16207]">
            <it.icon className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-navy">{it.title}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{it.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Three (or more) value props in a row — icon tile + title + one line. */
export function ValueProps({
  items,
  className,
}: {
  items: { icon: IconType; title: string; desc: string; tint: string }[];
  className?: string;
}) {
  return (
    <div className={cn('grid gap-4 sm:grid-cols-3', className)}>
      {items.map((v) => (
        <div key={v.title} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className={cn('grid size-11 place-items-center rounded-2xl', v.tint)}>
            <v.icon className="size-5" />
          </span>
          <p className="mt-3 text-sm font-black text-navy">{v.title}</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">{v.desc}</p>
        </div>
      ))}
    </div>
  );
}

/** Lightweight FAQ accordion for the plan pages. */
export function FaqAccordion({ items, className }: { items: { q: string; a: string }[]; className?: string }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className={cn('divide-y divide-slate-100 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm', className)}>
      {items.map((it, i) => {
        const isOpen = open === i;
        return (
          <div key={it.q}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-slate-50/60"
            >
              <span className="text-sm font-bold text-navy">{it.q}</span>
              <ChevronDown className={cn('size-4 shrink-0 text-slate-500 transition-transform', isOpen && 'rotate-180')} />
            </button>
            {isOpen && <p className="px-5 pb-4 text-sm leading-relaxed text-slate-600">{it.a}</p>}
          </div>
        );
      })}
    </div>
  );
}

/** A section eyebrow + title used across the plan pages. */
export function PlanSectionTitle({
  eyebrow,
  title,
  icon: Icon = Sparkles,
}: {
  eyebrow?: string;
  title: string;
  icon?: typeof Sparkles;
}) {
  return (
    <div className="mb-4">
      {eyebrow ? (
        <p className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#f5b400]">
          <Icon className="size-3.5" /> {eyebrow}
        </p>
      ) : null}
      <h2 className="text-lg font-black tracking-tight text-navy">{title}</h2>
    </div>
  );
}
