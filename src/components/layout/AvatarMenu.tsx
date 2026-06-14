'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Eye, Loader2, LogOut, User } from 'lucide-react';
import { logout } from '@/lib/api/auth';
import { getMe } from '@/lib/api/me';
import { startStudentPreview, exitStudentPreview } from '@/lib/preview-actions';
import { roleHint } from '@/lib/session-hints';
import { useAuthStore } from '@/store/auth';

/**
 * Top-bar avatar + dropdown (CLAUDE.md §4). Client leaf — TopBar itself is RSC.
 *
 * Initials resolve from `GET /me` (or the previewed student's name while a
 * super-admin preview is active). A SUPER_ADMIN sees a "Switch to student view"
 * action that mints a short-lived student token and drops them into the student
 * workspace; while previewing, that becomes "Return to admin view". The role is
 * read from the (client-set) `role` hint cookie so it stays the ADMIN's role
 * even while the active token is the student's.
 */
function initialsFrom(source: string): string {
  const parts = source.split(/\s+|[._-]/).filter(Boolean);
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : source.slice(0, 2).toUpperCase();
}

export function AvatarMenu({ initials = '··' }: { initials?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resolvedInitials, setResolvedInitials] = useState<string>(initials);
  const [sessionRole, setSessionRole] = useState<string | null>(null);
  const previewUser = useAuthStore((s) => s.previewUser);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSessionRole(roleHint());
  }, [previewUser]);

  useEffect(() => {
    let cancelled = false;
    getMe()
      .then((me) => {
        if (cancelled) return;
        setResolvedInitials(initialsFrom(me.fullName ?? me.email.split('@')[0]));
      })
      .catch(() => {
        // Not signed in / preview → keep the fallback initials
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const isPreviewing = previewUser !== null;
  const canPreview = !isPreviewing && sessionRole === 'SUPER_ADMIN';
  const shownInitials = isPreviewing && previewUser?.name ? initialsFrom(previewUser.name) : resolvedInitials;

  async function handleLogout() {
    setBusy(true);
    setOpen(false);
    exitStudentPreview();
    await logout(); // logout() never throws — it clears local state in its own finally
    // Session teardown uses a HARD navigation (not router.push) on purpose: it
    // tears down every piece of in-memory state — the access token, any cached
    // server data, the API-client circuit-breaker latch — instead of leaving it
    // alive to race the just-cleared cookies. router.push kept the SPA state and
    // could land the user back in an authenticated view with a dead session.
    window.location.assign('/');
  }

  async function handleSwitchToStudent() {
    setBusy(true);
    try {
      await startStudentPreview();
      setOpen(false);
      router.push('/dashboard');
    } catch {
      window.alert('Could not start the student preview. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  function handleReturnToAdmin() {
    exitStudentPreview();
    setOpen(false);
    router.push('/superadmin/dashboard');
  }

  function handleWorkspace() {
    setOpen(false);
    if (isPreviewing) {
      router.push('/dashboard');
    } else if (sessionRole === 'SUPER_ADMIN') {
      router.push('/superadmin/dashboard');
    } else if (sessionRole === 'COLLEGE_ADMIN') {
      router.push('/tpo/dashboard');
    } else {
      router.push('/dashboard');
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
        {shownInitials}
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-md"
        >
          {isPreviewing ? (
            <div className="border-b border-slate-100 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-orange">
                Previewing as student
              </p>
              <p className="mt-0.5 truncate text-sm font-semibold text-navy">
                {previewUser?.name ?? 'Student'}
              </p>
            </div>
          ) : null}

          <button
            type="button"
            role="menuitem"
            onClick={handleWorkspace}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-navy"
          >
            <User className="size-4 text-slate-400" aria-hidden="true" />
            My Workspace
          </button>

          {canPreview ? (
            <button
              type="button"
              role="menuitem"
              disabled={busy}
              onClick={handleSwitchToStudent}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-sky-50 hover:text-navy disabled:opacity-50"
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin text-slate-400" aria-hidden="true" />
              ) : (
                <Eye className="size-4 text-sky-600" aria-hidden="true" />
              )}
              Switch to student view
            </button>
          ) : null}

          {isPreviewing ? (
            <button
              type="button"
              role="menuitem"
              onClick={handleReturnToAdmin}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-navy transition-colors hover:bg-sky-50"
            >
              <ArrowLeft className="size-4 text-sky-600" aria-hidden="true" />
              Return to admin view
            </button>
          ) : null}

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
