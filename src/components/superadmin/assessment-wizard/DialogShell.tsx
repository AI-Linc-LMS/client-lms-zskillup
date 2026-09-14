'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

/**
 * Accessible dialog shell for the assessment wizard and its nested dialogs (preview
 * drawer, publish confirmation). Portals to <body> (a sticky/transformed ancestor would
 * otherwise trap `position: fixed`), traps Tab focus, closes on Esc / backdrop when
 * `dismissible`, restores focus to the opener, and locks page scroll.
 *
 * Dialogs stack: only the top-most one reacts to Esc and owns the focus trap, so closing
 * a preview drawer never also closes the wizard underneath it.
 */
const stack: string[] = [];
let seq = 0;

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function DialogShell({
  open,
  onClose,
  labelledBy,
  children,
  variant = 'center',
  maxWidth = 'max-w-lg',
  dismissible = true,
  className,
}: {
  open: boolean;
  onClose: () => void;
  /** id of the element that names the dialog. */
  labelledBy: string;
  children: ReactNode;
  /** `center` = modal card; `drawer` = right-hand side panel. */
  variant?: 'center' | 'drawer';
  maxWidth?: string;
  dismissible?: boolean;
  className?: string;
}) {
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const idRef = useRef<string>('');
  const onCloseRef = useRef(onClose);
  const dismissibleRef = useRef(dismissible);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    onCloseRef.current = onClose;
    dismissibleRef.current = dismissible;
  }, [onClose, dismissible]);

  useEffect(() => {
    if (!open || !mounted) return;
    seq += 1;
    const id = `dialog-${seq}`;
    idRef.current = id;
    stack.push(id);
    const opener = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Move focus inside: the first autofocus target, else the first focusable, else the panel.
    const panel = panelRef.current;
    const first =
      panel?.querySelector<HTMLElement>('[data-autofocus]') ?? panel?.querySelector<HTMLElement>(FOCUSABLE) ?? panel;
    first?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (stack[stack.length - 1] !== id) return;
      if (e.key === 'Escape' && dismissibleRef.current) {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const nodes = [...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (n) => n.offsetParent !== null || n === document.activeElement,
      );
      if (nodes.length === 0) {
        e.preventDefault();
        panelRef.current.focus();
        return;
      }
      const firstNode = nodes[0];
      const lastNode = nodes[nodes.length - 1];
      if (e.shiftKey && (document.activeElement === firstNode || !panelRef.current.contains(document.activeElement))) {
        e.preventDefault();
        lastNode.focus();
      } else if (!e.shiftKey && (document.activeElement === lastNode || !panelRef.current.contains(document.activeElement))) {
        e.preventDefault();
        firstNode.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      const at = stack.lastIndexOf(id);
      if (at >= 0) stack.splice(at, 1);
      if (stack.length === 0) document.body.style.overflow = previousOverflow;
      opener?.focus?.();
    };
  }, [open, mounted]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className={cn('fixed inset-0 z-[70] flex p-4', variant === 'drawer' ? 'justify-end p-0' : 'items-center justify-center')}>
      <div
        aria-hidden
        onClick={dismissible ? onClose : undefined}
        className="absolute inset-0 bg-slate-900/50"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={cn(
          'relative flex w-full flex-col overflow-hidden border border-slate-200 bg-white shadow-lg focus:outline-none',
          variant === 'drawer' ? 'h-full rounded-none border-y-0 border-r-0' : 'max-h-[92vh] rounded-2xl',
          maxWidth,
          className,
        )}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
