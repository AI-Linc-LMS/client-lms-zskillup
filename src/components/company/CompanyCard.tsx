'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { ArrowRight, ArrowUpRight, Check, ClipboardList, Code2, History, Lock, ShoppingCart } from 'lucide-react';
import { useCartOptional } from '@/components/billing/CartProvider';
import { PriceTag } from '@/components/billing/PriceTag';
import { formatPrice } from '@/lib/api/subscriptions';
import { BillingPeriod, EntitlementScope } from '@/shared/enums';
import type { PriceBookEntryDto } from '@/shared/dto/payments.dto';
import { cn } from '@/lib/utils';

/**
 * Card display shape - accepts either a live API company (most fields nullable)
 * or a fully-hydrated demo company. The footer surfaces REAL counts from the
 * question/coding banks (questionCount/pyqCount/codingCount) and renders the
 * real company logo when available (monogram fallback on missing/broken image).
 */
export interface CompanyCardData {
  slug: string;
  name: string;
  tagline: string | null;
  accent: string | null;
  badge?: string | null;
  difficulty?: string;
  logoUrl?: string | null;
  rounds?: number;
  questionCount?: number;
  pyqCount?: number;
  codingCount?: number;
  /** When true the hub isn't available yet - the card renders locked + non-navigating. */
  locked?: boolean;
}

/** Two-letter monogram from the company name (e.g. "TCS" → "TC", "Capgemini" → "Ca"). */
function monogramOf(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.trim().slice(0, 2).toUpperCase();
}

/** Difficulty → tonal pill classes (emerald / amber / red). */
const DIFFICULTY_TONE: Record<string, string> = {
  Easy: 'bg-emerald-50 text-emerald-700 ring-emerald-200/70',
  Medium: 'bg-amber-50 text-amber-700 ring-amber-200/70',
  Hard: 'bg-red-50 text-red-700 ring-red-200/70',
};

/**
 * "Add to cart" on a purchasable company card. It renders INSIDE the card's
 * `<Link>`, so the click must be swallowed (preventDefault stops the anchor's
 * navigation; stopPropagation stops Next's Link handler) - otherwise adding to the
 * cart would also navigate you into the hub. Adds the 1-Month plan (the price the
 * card leads with); the plan length is changeable in the cart.
 */
function CardCartAction({
  company,
  owned,
  priceEntry,
}: {
  company: CompanyCardData;
  owned?: boolean;
  priceEntry?: PriceBookEntryDto | null;
}) {
  const cart = useCartOptional();

  // Already unlocked (Full Platform, or this hub) - nothing to buy.
  if (owned) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200/70">
        <Check className="size-3" /> Owned
      </span>
    );
  }
  if (!cart) return null; // rendered outside a CartProvider (e.g. marketing pages)

  const inCart = cart.has(EntitlementScope.COMPANY, company.slug);

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (inCart) return;
    cart.add({
      scope: EntitlementScope.COMPANY,
      scopeRef: company.slug,
      period: BillingPeriod.MONTHLY,
      label: company.name,
    });
    toast.success(`${company.name} added to cart`, {
      description: 'Keep browsing - change the plan length any time in your cart.',
    });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={inCart}
      aria-label={inCart ? `${company.name} is in your cart` : `Add ${company.name} to cart`}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-bold transition',
        inCart
          ? 'cursor-default bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200/70'
          : 'bg-gradient-to-r from-[#ffd24d] via-[#ffc42d] to-[#f5b400] text-[#171717] shadow-sm hover:brightness-105',
      )}
    >
      {inCart ? (
        <>
          <Check className="size-3" /> In cart
        </>
      ) : (
        <>
          <ShoppingCart className="size-3" />
          {priceEntry ? `Add · ${formatPrice(priceEntry.amountCents, 'INR')}` : 'Add to cart'}
        </>
      )}
    </button>
  );
}

/** A single company card. One template, many instances (DEMO + live API). */
export function CompanyCard({
  company,
  owned,
  priceEntry,
}: {
  company: CompanyCardData;
  /** Student already has this hub (or Full Platform) → show "Owned", not a buy CTA. */
  owned?: boolean;
  /** 1-Month company price entry (selling + MRP) - shown on the card + Add button. */
  priceEntry?: PriceBookEntryDto | null;
}) {
  const accent = company.accent ?? 'from-slate-700 to-slate-900';
  const monogram = monogramOf(company.name);
  const [logoFailed, setLogoFailed] = useState(false);
  const showLogo = Boolean(company.logoUrl) && !logoFailed;
  const difficultyTone =
    (company.difficulty && DIFFICULTY_TONE[company.difficulty]) ??
    'bg-slate-50 text-slate-600 ring-slate-200/70';

  // What's inside - surfaced as content-type chips (no counts), so students see
  // what they get without the offering being reduced to a raw question tally.
  const feats: Array<{ icon: typeof ClipboardList; label: string }> = [];
  if ((company.questionCount ?? 0) > 0) feats.push({ icon: ClipboardList, label: 'Practice Qs' });
  if ((company.pyqCount ?? 0) > 0) feats.push({ icon: History, label: 'Previous-year' });
  if ((company.codingCount ?? 0) > 0) feats.push({ icon: Code2, label: 'Coding' });

  const cardClass =
    'relative flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white shadow-[0_10px_34px_-20px_rgba(15,23,42,0.4)]';

  const body = (
    <>
        {/* ── Logo banner (landing-page style) ───────────────────────────── */}
        <div className="relative flex h-36 items-center justify-center border-b border-slate-100 bg-gradient-to-br from-slate-50/90 via-white to-slate-50/50 px-8">
          {/* accent bar keyed to the brand */}
          <span
            aria-hidden
            className={cn('absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r', accent)}
          />
          {/* soft brand glow */}
          <span
            aria-hidden
            className={cn(
              'pointer-events-none absolute -right-10 -top-12 size-32 rounded-full bg-gradient-to-br opacity-[0.10] blur-2xl transition-opacity duration-500 group-hover:opacity-25',
              accent,
            )}
          />
          {company.badge ? (
            <span className="absolute left-4 top-4 inline-flex items-center rounded-full bg-gradient-to-r from-[#fff1e6] to-[#ffe6cf] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#c2540f] ring-1 ring-inset ring-orange/20">
              {company.badge}
            </span>
          ) : null}
          <span
            aria-hidden
            className="absolute right-4 top-4 grid size-8 place-items-center rounded-full border border-slate-200/80 bg-white text-slate-500 transition-all duration-300 group-hover:border-transparent group-hover:bg-gradient-to-br group-hover:from-[#ffd24d] group-hover:to-[#f5b400] group-hover:text-[#171717] group-hover:shadow-[0_8px_20px_-8px_rgba(245,180,0,0.8)]"
          >
            <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:translate-x-px group-hover:-translate-y-px" />
          </span>

          {showLogo ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={company.logoUrl as string}
              alt={`${company.name} logo`}
              className="max-h-14 w-auto max-w-[72%] object-contain transition-transform duration-300 group-hover:scale-[1.04]"
              loading="lazy"
              onError={() => setLogoFailed(true)}
            />
          ) : (
            <span
              className={cn(
                'grid size-20 place-items-center rounded-2xl bg-gradient-to-br text-2xl font-extrabold text-white shadow-[0_14px_30px_-12px_rgba(15,23,42,0.55)] ring-1 ring-inset ring-white/25 transition-transform duration-300 group-hover:scale-[1.05]',
                accent,
              )}
            >
              {monogram}
            </span>
          )}
        </div>

        {/* ── Body ───────────────────────────────────────────────────────── */}
        <div className="flex flex-1 flex-col p-5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-lg font-extrabold leading-tight tracking-tight text-navy">
              {company.name}
            </h3>
            {company.difficulty ? (
              <span
                className={cn(
                  'shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset',
                  difficultyTone,
                )}
              >
                {company.difficulty}
              </span>
            ) : null}
          </div>

          {company.tagline ? (
            <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-slate-600">
              {company.tagline}
            </p>
          ) : null}

          {company.rounds ? (
            <span className="mt-3 inline-flex w-fit items-center rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600 ring-1 ring-inset ring-slate-200/70">
              {company.rounds} rounds
            </span>
          ) : null}

          {/* spacer keeps the footer pinned to the bottom for even card heights */}
          <div className="flex-1" />

          {/* what's inside - content types available (no counts) */}
          {feats.length > 0 ? (
            <div className="mt-5 flex flex-wrap gap-1.5 border-t border-slate-100 pt-4">
              {feats.map((f) => (
                <span
                  key={f.label}
                  className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-inset ring-slate-200/70"
                >
                  <f.icon className="size-3 text-slate-500" aria-hidden="true" /> {f.label}
                </span>
              ))}
            </div>
          ) : null}

          {/* 1-Month plan price with struck MRP (hidden once owned or locked) */}
          {!owned && !company.locked && priceEntry ? (
            <div className="mt-4 flex items-baseline gap-1">
              <PriceTag sellingCents={priceEntry.amountCents} mrpCents={priceEntry.mrpCents} size="sm" />
              <span className="text-[11px] font-semibold text-slate-500">/mo · 1-Month plan</span>
            </div>
          ) : null}

          {/* CTA + buy action. Locked ("coming soon") hubs never offer a cart action. */}
          <div className="mt-4 flex items-center justify-between gap-2">
            <span className="flex items-center gap-1 text-[13px] font-bold text-orange transition-colors group-hover:text-[#d9610f]">
              Prepare now
              <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </span>
            {!company.locked && (
              <CardCartAction company={company} owned={owned} priceEntry={priceEntry} />
            )}
          </div>
        </div>
    </>
  );

  return (
    <motion.article
      whileHover={company.locked ? undefined : { y: -8 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      className="group relative h-full"
    >
      {company.locked ? (
        <div className={cn(cardClass, 'cursor-default')} aria-disabled="true">
          <div className="pointer-events-none opacity-[0.55] grayscale">{body}</div>
          {/* lock overlay */}
          <div className="absolute inset-0 grid place-items-center rounded-[1.75rem] bg-white/30 backdrop-blur-[1px]">
            <div className="flex flex-col items-center gap-1.5 rounded-2xl bg-white/95 px-5 py-4 text-center shadow-lg ring-1 ring-slate-200">
              <span className="grid size-10 place-items-center rounded-full bg-navy text-white">
                <Lock className="size-4" />
              </span>
              <span className="text-xs font-bold text-navy">Locked</span>
              <span className="text-[11px] text-slate-600">Coming soon</span>
            </div>
          </div>
        </div>
      ) : (
        <Link
          data-tour="company:card"
          href={`/dashboard/company/${company.slug}`}
          className={cn(
            cardClass,
            'transition-shadow duration-300 hover:shadow-[0_36px_70px_-30px_rgba(15,23,42,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/40 focus-visible:ring-offset-2',
          )}
        >
          {body}
        </Link>
      )}
    </motion.article>
  );
}
