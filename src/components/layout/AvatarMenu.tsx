'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { User, LogOut } from 'lucide-react';
import { logout } from '@/lib/api/auth';
import { getMe } from '@/lib/api/me';

/**
 * Top-bar avatar + dropdown (CLAUDE.md §4). Client leaf — TopBar itself is RSC.
 * Initials fall back to the prop while `GET /me` is in flight; once the
 * response arrives we render the real user's initials from their full name
 * (or the email local-part when no name is set).
 *
 * Logout calls the backend, clears the in-memory token, and redirects to /.
 */
export function AvatarMenu({ initials = 'AK' }: { initials?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resolvedInitials, setResolvedInitials] = useState<string>(initials);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    getMe()
      .then((me) => {
        if (cancelled) return;
        const source = me.fullName ?? me.email.split('@')[0];
        const parts = source.split(/\s+|[._-]/).filter(Boolean);
        const next =
          parts.length >= 2
            ? (parts[0][0] + parts[1][0]).toUpperCase()
            : source.slice(0, 2).toUpperCase();
        setResolvedInitials(next);
      })
      .catch(() => {
        // Not signed in / preview → keep the fallback initials
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  async function handleLogout() {
    setBusy(true);
    try {
      await logout();
      router.push('/');
      router.refresh();
    } finally {
      setBusy(false);
      setOpen(false);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        onClick={() => setOpen((v) => !v)}
        className="grid size-9 place-items-center rounded-full bg-navy text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/40 focus-visible:ring-offset-2"
      >
        {resolvedInitials}
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-md"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              router.push('/dashboard');
              setOpen(false);
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-navy"
          >
            <User className="size-4 text-slate-400" aria-hidden="true" />
            My Workspace
          </button>
          <div className="my-1 border-t border-slate-100" />
          <button
            type="button"
            role="menuitem"
            disabled={busy}
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
          >
            <LogOut className="size-4" aria-hidden="true" />
            {busy ? 'Logging out…' : 'Log out'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
