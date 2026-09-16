'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Confirmation dialog for a write the operator cannot undo.
 *
 * A NEW component rather than a use of `components/ui/Modal.tsx`, which predates the
 * current DESIGN LAW and still ships `backdrop-blur-sm` (glassmorphism, §4.4 forbidden),
 * `rounded-3xl` (§4.5 caps rounding at `rounded-2xl`) and a hand-rolled 100px shadow
 * (§4.6 allows `shadow-lg` on a modal and nothing heavier). Those three are load-bearing
 * on several public pages, so this is built to the law instead of retrofitting them here.
 *
 * Behaviour it owns:
 *   - portals to <body>, because `position: fixed` is only "top level" when no ancestor
 *     creates a stacking context, and sticky/transform ancestors routinely do;
 *   - Esc and backdrop click close it while it is not busy (a half-finished delete must
 *     not be dismissable);
 *   - focus moves to the dialog on open and returns to the trigger on close;
 *   - Tab is trapped inside the dialog;
 *   - the page behind is held still.
 */
export function ConfirmDialog({
  open,
  title,
  eyebrow,
  children,
  confirmLabel,
  cancelLabel = 'Cancel',
  tone = 'destructive',
  busy = false,
  busyLabel,
  confirmDisabled = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  /** Small uppercase label above the title. */
  eyebrow?: string;
  /** The body: say plainly what will happen, including what will NOT. */
  children: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  /** `destructive` for a permanent removal, `default` for everything else. */
  tone?: 'destructive' | 'default';
  busy?: boolean;
  busyLabel?: string;
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  // Portals need a DOM, so nothing renders until after hydration.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const panelRef = useRef<HTMLDivElement>(null);
  const returnFocusTo = useRef<HTMLElement | null>(null);

  const requestClose = useCallback(() => {
    if (!busy) onClose();
  }, [busy, onClose]);

  // Esc to dismiss + Tab trapped inside the panel.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        requestClose();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [open, requestClose]);

  // Focus in on open, back to the trigger on close.
  useEffect(() => {
    if (!open) return;
    returnFocusTo.current = document.activeElement as HTMLElement | null;
    const t = window.setTimeout(() => panelRef.current?.focus(), 0);
    return () => {
      window.clearTimeout(t);
      returnFocusTo.current?.focus?.();
    };
  }, [open]);

  // Hold the page still underneath.
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
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div aria-hidden onClick={requestClose} className="absolute inset-0 bg-slate-900/50" />
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        tabIndex={-1}
        className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-lg focus-visible:outline-none"
      >
        {eyebrow ? (
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            {eyebrow}
          </p>
        ) : null}
        <h2 id="confirm-dialog-title" className="text-base font-bold text-navy">
          {title}
        </h2>
        <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-600">{children}</div>
        <div className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 pt-4">
          <Button variant="outline" size="sm" onClick={requestClose} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone}
            size="sm"
            onClick={onConfirm}
            disabled={busy || confirmDisabled}
          >
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
            {busy ? (busyLabel ?? confirmLabel) : confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
