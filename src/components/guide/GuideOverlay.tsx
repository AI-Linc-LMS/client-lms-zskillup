'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Sparkles, X } from 'lucide-react';
import type { GuideStep } from '@/lib/guide/types';

const CARD_W = 340;
const GAP = 14; // px between target and card
const MARGIN = 12; // viewport clamp margin

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** Poll for the target element (it may still be mounting after a route change),
 *  scroll it into view, and keep its rect fresh on scroll/resize. */
function useTargetRect(target?: string) {
  const [rect, setRect] = useState<Rect | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!target || target === 'center') {
      setRect(null);
      setReady(true);
      return;
    }
    setReady(false);
    setRect(null);
    let raf = 0;
    let tries = 0;
    let cancelled = false;
    const sel = `[data-tour="${CSS.escape(target)}"]`;

    const read = (el: HTMLElement): Rect => {
      const r = el.getBoundingClientRect();
      return { top: r.top, left: r.left, width: r.width, height: r.height };
    };
    const tick = () => {
      if (cancelled) return;
      const el = document.querySelector<HTMLElement>(sel);
      if (el && el.getBoundingClientRect().width > 0) {
        el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
        setRect(read(el));
        setReady(true);
        return;
      }
      if (++tries > 90) {
        // ~1.5s — give up and let the card center itself.
        setReady(true);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [target]);

  useEffect(() => {
    if (!target || target === 'center') return;
    const sel = `[data-tour="${CSS.escape(target)}"]`;
    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = document.querySelector<HTMLElement>(sel);
        if (el) {
          const r = el.getBoundingClientRect();
          setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
        }
      });
    };
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [target]);

  return { rect, ready };
}

/** Resolve the card's fixed position from the target rect + preferred placement. */
function cardPosition(
  rect: Rect | null,
  placement: GuideStep['placement'],
  cardH: number,
  vw: number,
  vh: number,
): { top: number; left: number; centered: boolean } {
  // On very narrow viewports the card can be wider than the usable width; use an
  // effective width so horizontal clamping never pushes it partly off-screen.
  const cw = Math.min(CARD_W, vw - 2 * MARGIN);
  if (!rect || placement === 'center') {
    return { top: Math.max(MARGIN, (vh - cardH) / 2), left: Math.max(MARGIN, (vw - cw) / 2), centered: true };
  }
  const spaceBelow = vh - (rect.top + rect.height);
  const spaceAbove = rect.top;
  const spaceRight = vw - (rect.left + rect.width);
  const spaceLeft = rect.left;

  let side = placement && placement !== 'auto' ? placement : 'bottom';
  if (!placement || placement === 'auto') {
    if (spaceBelow > cardH + GAP + MARGIN) side = 'bottom';
    else if (spaceAbove > cardH + GAP + MARGIN) side = 'top';
    else if (spaceRight > CARD_W + GAP + MARGIN) side = 'right';
    else if (spaceLeft > CARD_W + GAP + MARGIN) side = 'left';
    else side = 'bottom';
  }

  let top: number;
  let left: number;
  if (side === 'bottom') {
    top = rect.top + rect.height + GAP;
    left = rect.left + rect.width / 2 - cw / 2;
  } else if (side === 'top') {
    top = rect.top - GAP - cardH;
    left = rect.left + rect.width / 2 - cw / 2;
  } else if (side === 'right') {
    top = rect.top + rect.height / 2 - cardH / 2;
    left = rect.left + rect.width + GAP;
  } else {
    top = rect.top + rect.height / 2 - cardH / 2;
    left = rect.left - GAP - cw;
  }
  top = Math.min(Math.max(MARGIN, top), Math.max(MARGIN, vh - cardH - MARGIN));
  left = Math.min(Math.max(MARGIN, left), Math.max(MARGIN, vw - cw - MARGIN));
  return { top, left, centered: false };
}

export function GuideOverlay({
  step,
  index,
  total,
  onNext,
  onPrev,
  onClose,
}: {
  step: GuideStep;
  index: number;
  total: number;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
}) {
  const reduce = useReducedMotion();
  const { rect, ready } = useTargetRect(step.target);
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardH, setCardH] = useState(190);
  const [vp, setVp] = useState({ w: 1200, h: 800 });

  useLayoutEffect(() => {
    if (cardRef.current) setCardH(cardRef.current.offsetHeight);
  }, [step.id, ready, rect?.top]);

  useEffect(() => {
    const onResize = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Keyboard: ← → to move, Esc to exit.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') onNext();
      else if (e.key === 'ArrowLeft' && index > 0) onPrev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onNext, onPrev, onClose, index]);

  const isLast = index === total - 1;
  const pad = step.pad ?? 8;
  const hasSpot = !!rect && step.target && step.target !== 'center';
  const pos = cardPosition(hasSpot ? rect : null, step.placement, cardH, vp.w, vp.h);

  const spring = reduce ? { duration: 0 } : { type: 'spring' as const, stiffness: 320, damping: 32, mass: 0.8 };

  return (
    <div className="fixed inset-0 z-[80]" aria-live="polite" role="dialog" aria-modal="true">
      {/* Click blocker (transparent) — the dim comes from the spotlight box-shadow,
          or from this layer when there's no target. */}
      <div
        className={hasSpot ? 'absolute inset-0' : 'absolute inset-0 bg-slate-900/60 backdrop-blur-[2px]'}
        onClick={onClose}
        aria-hidden
      />

      {/* Spotlight cut-out */}
      {hasSpot && rect && (
        <motion.div
          className="pointer-events-none absolute rounded-2xl ring-2 ring-orange/90"
          initial={false}
          animate={{ top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }}
          transition={spring}
          style={{ boxShadow: '0 0 0 9999px rgba(15,23,42,0.62)' }}
        />
      )}

      {/* Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step.id}
          ref={cardRef}
          className="absolute w-[340px] max-w-[calc(100vw-24px)] rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_30px_80px_-24px_rgba(11,18,32,0.55)]"
          style={{ top: pos.top, left: pos.left }}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
          animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
          transition={{ duration: 0.22 }}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 grid size-7 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Exit tour"
          >
            <X className="size-4" />
          </button>

          {step.eyebrow ? (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-orange">
              <Sparkles className="size-3" /> {step.eyebrow}
            </span>
          ) : index === 0 ? (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-orange">
              <Sparkles className="size-3" /> Platform guide
            </span>
          ) : null}

          <h3 className="mt-1.5 pr-6 font-display text-base font-bold leading-snug tracking-tight text-navy">
            {step.title}
          </h3>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-slate-600">{step.body}</p>

          {/* Progress dots */}
          <div className="mt-4 flex items-center gap-1" aria-hidden>
            {Array.from({ length: total }).map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? 'w-5 bg-orange' : i < index ? 'w-1.5 bg-orange/40' : 'w-1.5 bg-slate-200'
                }`}
              />
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-semibold text-slate-400 transition hover:text-slate-600"
            >
              Skip tour
            </button>
            <div className="flex items-center gap-2">
              {index > 0 && (
                <button
                  type="button"
                  onClick={onPrev}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
                >
                  <ArrowLeft className="size-3.5" /> Back
                </button>
              )}
              <button
                type="button"
                onClick={onNext}
                className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#f7a14e] to-[#f37021] px-4 py-1.5 text-xs font-extrabold text-white shadow-sm transition hover:brightness-105"
              >
                {isLast ? (
                  <>
                    Done <Check className="size-3.5" />
                  </>
                ) : (
                  <>
                    {index === 0 ? 'Start' : 'Next'} <ArrowRight className="size-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>

          <p className="mt-2 text-center text-[10px] font-medium text-slate-300">
            {index + 1} of {total} · use ← → keys
          </p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
