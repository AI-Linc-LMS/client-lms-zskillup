'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { ArrowRight, Check, Crown, Lock, X } from 'lucide-react';

const INCLUDED = [
  'Every recommended company, section and topic',
  'Adaptive practice + full previous-year banks',
  'Mock assessments, analytics and All-India rankings',
  'Mock Interview and Resume Builder included',
];

/**
 * Upgrade prompt shown when a free student activates a CTA they aren't entitled to.
 *
 * A modal rather than a page gate on purpose: the recommendations themselves stay fully
 * visible and readable — that's the whole point of recommending something — and the wall
 * only appears at the moment they try to act on one.
 *
 * Portalled to <body> with position:fixed. The recommendation cards live inside rounded,
 * overflow-hidden sections; rendered in-flow, the dialog would be clipped by its own card.
 */
export function UpgradeModal({
  open,
  onClose,
  feature = 'this',
  title = 'Upgrade to start preparing',
  message,
}: {
  open: boolean;
  onClose: () => void;
  /** What they just tried to open — makes the prompt specific rather than generic. */
  feature?: string;
  title?: string;
  /** The server's own paywall message (403 PAYWALL). Preferred over the generic line —
   *  it already says exactly which allowance ran out. */
  message?: string;
}) {
  const id = useId();
  const [mounted, setMounted] = useState(false);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => setMounted(true), []);

  const stop = useCallback((e: React.MouseEvent) => e.stopPropagation(), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    // Move focus into the dialog so keyboard and screen-reader users land inside it.
    closeRef.current?.focus();
    // Freeze the page behind the modal.
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${id}-title`}
      onClick={onClose}
      className="fixed inset-0 z-[80] grid place-items-center bg-navy/60 p-4 backdrop-blur-sm"
    >
      <div
        onClick={stop}
        className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/5"
      >
        <div className="relative bg-gradient-to-br from-indigo-600 to-indigo-700 px-6 py-6 text-white">
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 grid size-8 place-items-center rounded-full bg-white/15 text-white transition hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            <X className="size-4" />
          </button>
          <span className="grid size-11 place-items-center rounded-2xl bg-white/15">
            <Crown className="size-6" />
          </span>
          <h2 id={`${id}-title`} className="mt-3 text-lg font-black tracking-tight">
            {title}
          </h2>
          <p className="mt-1 text-sm text-white/80">
            {message ?? `Opening ${feature} needs a plan.`}
          </p>
        </div>

        <div className="px-6 py-5">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">What you unlock</p>
          <ul className="mt-2.5 space-y-1.5">
            {INCLUDED.map((line) => (
              <li key={line} className="flex items-start gap-2 text-sm text-slate-600">
                <Check className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                <span>{line}</span>
              </li>
            ))}
          </ul>

          <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
            <Link
              href="/shop"
              onClick={onClose}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-navy transition hover:bg-slate-50"
            >
              Explore Plans
            </Link>
            <Link
              href="/shop/full"
              onClick={onClose}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700"
            >
              Get Full Access <ArrowRight className="size-3.5" />
            </Link>
          </div>

          <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <Lock className="size-3" /> You keep your calibration results and progress either way.
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
