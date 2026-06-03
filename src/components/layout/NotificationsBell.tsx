'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';

/**
 * Top-bar notifications bell. The notifications feed (badges earned, quest
 * completed, mock drive opened) lands with Sprint 5 gamification. For now the
 * bell opens a small empty-state popover so the button feels alive instead of
 * dead — and we don't render a misleading red unread dot.
 */
export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label="Notifications"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="grid size-8 place-items-center rounded-full text-slate-500 transition-colors hover:bg-slate-100"
      >
        <Bell className="size-4" aria-hidden="true" />
      </button>
      {open ? (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-md"
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Notifications
          </p>
          <p className="mt-2 text-sm text-slate-600">You&apos;re all caught up.</p>
          <p className="mt-1 text-xs text-slate-400">
            Badges, quest results, and drive invites land here.
          </p>
        </div>
      ) : null}
    </div>
  );
}
