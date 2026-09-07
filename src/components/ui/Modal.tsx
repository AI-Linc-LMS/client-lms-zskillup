'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Minimal centered modal - a fixed translucent backdrop + a card. Esc + backdrop
 * click close it when `dismissible`.
 *
 * It portals to <body>, and it has to. `position: fixed` is only "top level" when
 * no ancestor creates a stacking context, and plenty do - `transform`, `filter`,
 * `will-change`, `contain`, and `position: sticky`, which creates one whatever its
 * z-index. Rendered in place, this dialog opened inside the job page's `lg:sticky`
 * apply rail, so `z-[60]` was measured against that rail's siblings rather than the
 * page - and the "other openings" marquee, which comes later in the DOM, painted
 * straight over the dialog and its backdrop on desktop only.
 */
export function Modal({
  open,
  onClose,
  children,
  dismissible = true,
  maxWidth = 'max-w-lg',
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  dismissible?: boolean;
  maxWidth?: string;
}) {
  // Portals need a DOM, so nothing renders until after hydration.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open || !dismissible) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, dismissible, onClose]);

  // Hold the page still underneath. Scrolling behind an open dialog is how the
  // stacking bug above got noticed in the first place.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        aria-hidden
        onClick={dismissible ? onClose : undefined}
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        className={`relative max-h-[90vh] w-full overflow-y-auto ${maxWidth} rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_40px_100px_-30px_rgba(11,18,32,0.6)] sm:p-8`}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
