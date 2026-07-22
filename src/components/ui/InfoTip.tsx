'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Info } from 'lucide-react';

export interface TipContent {
  title: string;
  body?: string;
  /** "What you get" lines, rendered as ticks. */
  bullets?: string[];
}

interface Pos {
  top: number;
  left: number;
  arrowLeft: number;
  placement: 'top' | 'bottom';
}

const GAP = 10; // anchor ↔ tooltip
const EDGE = 8; // min distance from the viewport edge
const OPEN_DELAY = 120; // debounce so sweeping the cursor across a grid doesn't strobe

/**
 * Hover/focus/tap tooltip describing what a purchasable item includes.
 *
 * Rendered through a PORTAL with `position: fixed`, not absolutely inside the
 * anchor. That isn't a stylistic choice: the sub-section table lives in an
 * `overflow-x-auto` wrapper, and CSS computes `overflow-y` to `auto` whenever
 * the other axis isn't `visible` - so an in-flow tooltip gets clipped by (and
 * scrolls with) that container. Fixed + portal escapes it entirely.
 *
 * Three ways in, because the anchors are `<button>` cards:
 *   - hover anywhere on the anchor (the whole card is the target, not a 12px dot)
 *   - keyboard focus (focusin/focusout bubble, so the wrapper catches both the
 *     card and the ⓘ; `relatedTarget` keeps it open while focus moves between them)
 *   - tap the ⓘ, which is a SIBLING of the card button, never a child - nesting a
 *     button inside a button is invalid HTML and swallows the card's own click.
 *     Touch devices have no hover, so without this they'd get nothing.
 */
export function InfoTip({
  content,
  children,
  className = 'relative block',
  dotClassName = 'absolute left-1.5 top-1.5',
  label,
}: {
  content: TipContent;
  children: React.ReactNode;
  /** The anchor box. Cards stretch to fill their grid cell; table rows run inline. */
  className?: string;
  /** Where the ⓘ sits inside the anchor. Cards use a corner; table rows sit inline. */
  dotClassName?: string;
  /** Accessible name for the ⓘ trigger. Defaults to the tip title. */
  label?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<Pos | null>(null);
  const [mounted, setMounted] = useState(false);
  const anchorRef = useRef<HTMLSpanElement | null>(null);
  const tipRef = useRef<HTMLDivElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setMounted(true), []);

  const show = useCallback((immediate = false) => {
    if (timer.current) clearTimeout(timer.current);
    if (immediate) setOpen(true);
    else timer.current = setTimeout(() => setOpen(true), OPEN_DELAY);
  }, []);

  const hide = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setOpen(false);
    setPos(null); // force a re-measure next open - the grid reflows behind us
  }, []);

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  // Measure AFTER paint so we know the tooltip's real size, then flip/clamp it.
  useLayoutEffect(() => {
    if (!open || !anchorRef.current || !tipRef.current) return;
    const a = anchorRef.current.getBoundingClientRect();
    const t = tipRef.current.getBoundingClientRect();
    const aboveTop = a.top - t.height - GAP;
    const placement: Pos['placement'] = aboveTop >= EDGE ? 'top' : 'bottom';
    const top = placement === 'top' ? aboveTop : a.bottom + GAP;
    const wanted = a.left + a.width / 2 - t.width / 2;
    const left = Math.max(EDGE, Math.min(wanted, window.innerWidth - t.width - EDGE));
    setPos({ top, left, arrowLeft: a.left + a.width / 2 - left, placement });
  }, [open]);

  // Escape closes; scroll/resize closes (cheaper and less jittery than tracking).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && hide();
    const onAway = (e: Event) => {
      if (!anchorRef.current?.contains(e.target as Node)) hide();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    document.addEventListener('pointerdown', onAway);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('resize', hide);
      document.removeEventListener('pointerdown', onAway);
    };
  }, [open, hide]);

  return (
    <span
      ref={anchorRef}
      className={className}
      onMouseEnter={() => show()}
      onMouseLeave={hide}
      onFocus={() => show(true)}
      // focusout bubbles, so moving focus card → ⓘ would close it. Only close when
      // focus actually leaves the anchor.
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) hide();
      }}
    >
      {children}

      <button
        type="button"
        aria-label={`What's included in ${label ?? content.title}`}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation(); // never let the ⓘ toggle the card's selection
          if (open) hide();
          else show(true);
        }}
        className={`${dotClassName} z-10 grid size-4 place-items-center rounded-full text-slate-400 transition hover:text-indigo-500 focus-visible:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40`}
      >
        <Info className="size-3.5" />
      </button>

      {mounted &&
        open &&
        createPortal(
          <div
            ref={tipRef}
            id={id}
            role="tooltip"
            style={{ top: pos?.top ?? 0, left: pos?.left ?? 0 }}
            className={`pointer-events-none fixed z-[70] w-[16rem] rounded-xl bg-navy px-3.5 py-3 text-left shadow-xl ring-1 ring-white/10 transition-opacity duration-100 motion-reduce:transition-none ${
              pos ? 'opacity-100' : 'opacity-0' // hidden for the one frame before we've measured
            }`}
          >
            <p className="text-xs font-black text-white">{content.title}</p>
            {content.body && <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{content.body}</p>}
            {content.bullets?.length ? (
              <ul className="mt-2 space-y-1">
                {content.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-200">
                    <Check className="mt-0.5 size-3 shrink-0 text-emerald-400" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            ) : null}

            {pos && (
              <span
                aria-hidden
                style={{ left: Math.max(10, Math.min(pos.arrowLeft, 246)) }}
                className={`absolute size-2 -translate-x-1/2 rotate-45 bg-navy ${
                  pos.placement === 'top' ? '-bottom-1' : '-top-1'
                }`}
              />
            )}
          </div>,
          document.body,
        )}
    </span>
  );
}
