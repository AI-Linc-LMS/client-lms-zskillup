'use client';

import { useEffect, type ReactNode } from 'react';

/**
 * Minimal centered modal - a fixed translucent backdrop + a card. No portal
 * (a top-level fixed overlay is enough) and no external deps. Esc + backdrop
 * click close it when `dismissible`. First reusable dialog primitive in the app.
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
  useEffect(() => {
    if (!open || !dismissible) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, dismissible, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        aria-hidden
        onClick={dismissible ? onClose : undefined}
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        className={`relative w-full ${maxWidth} rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_40px_100px_-30px_rgba(11,18,32,0.6)] sm:p-8`}
      >
        {children}
      </div>
    </div>
  );
}
