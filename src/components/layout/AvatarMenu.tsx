'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ChevronRight, Eye, IdCard, Loader2, LogOut, User } from 'lucide-react';
import { logout } from '@/lib/api/auth';
import { getMe } from '@/lib/api/me';
import { startStudentPreview, exitStudentPreview } from '@/lib/preview-actions';
import { roleHint } from '@/lib/session-hints';
import { useAuthStore } from '@/store/auth';
import { cn } from '@/lib/utils';

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
  const [fullName, setFullName] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [imgFailed, setImgFailed] = useState(false);
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
        setFullName(me.fullName ?? null);
        setEmail(me.email);
        setAvatarUrl(me.avatarUrl ?? null);
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
  // The Google avatar belongs to the signed-in account — while previewing a
  // student we suppress it and fall back to that student's initials.
  const showAvatarImg = !isPreviewing && !!avatarUrl && !imgFailed;
  const headerName = isPreviewing ? (previewUser?.name ?? 'Student') : (fullName ?? email?.split('@')[0] ?? null);

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
    } else if (sessionRole === 'ADMIN') {
      router.push('/admin/dashboard');
    } else if (sessionRole === 'COLLEGE_ADMIN') {
      router.push('/tpo/dashboard');
    } else {
      router.push('/dashboard');
    }
  }

  function handleProfile() {
    setOpen(false);
    router.push('/profile');
  }

  // Profile is a student-area page; show it for students and admins-previewing.
  const showProfile = isPreviewing || sessionRole === 'STUDENT';

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        onClick={() => setOpen((v) => !v)}
        className="group relative grid size-9 place-items-center rounded-full transition-transform duration-200 hover:scale-[1.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/50 focus-visible:ring-offset-2"
      >
        {/* gradient ring */}
        <span
          aria-hidden
          className="absolute inset-0 rounded-full bg-[conic-gradient(from_140deg,#f37021,#6d3bf5,#2563eb,#f37021)] p-[2px] opacity-90 shadow-[0_4px_14px_-4px_rgba(243,112,33,0.6)] transition-opacity group-hover:opacity-100"
        >
          <span className="block size-full rounded-full bg-white" />
        </span>
        {showAvatarImg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl as string}
            alt=""
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="relative size-[30px] rounded-full object-cover"
          />
        ) : (
          <span className="relative grid size-[30px] place-items-center rounded-full bg-gradient-to-br from-[#f7a14e] to-[#f37021] text-[11px] font-bold text-white">
            {shownInitials}
          </span>
        )}
        {isPreviewing ? (
          <span
            aria-hidden
            className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-white bg-sky-500"
          />
        ) : null}
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformOrigin: 'top right' }}
            className="absolute right-0 z-50 mt-3 w-64 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-[0_24px_60px_-24px_rgba(11,18,32,0.5)] ring-1 ring-black/[0.02]"
          >
            {/* header — gradient-washed account card */}
            <div className="relative overflow-hidden rounded-xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white p-3">
              <div
                aria-hidden
                className="pointer-events-none absolute -right-8 -top-10 size-24 rounded-full bg-orange/15 blur-2xl"
              />
              <div className="relative flex items-center gap-3">
                <span
                  aria-hidden
                  className="grid size-11 shrink-0 place-items-center rounded-full bg-[conic-gradient(from_140deg,#f37021,#6d3bf5,#2563eb,#f37021)] p-[2px]"
                >
                  {showAvatarImg ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarUrl as string}
                      alt=""
                      referrerPolicy="no-referrer"
                      onError={() => setImgFailed(true)}
                      className="size-full rounded-full object-cover ring-2 ring-white"
                    />
                  ) : (
                    <span className="grid size-full place-items-center rounded-full bg-gradient-to-br from-[#f7a14e] to-[#f37021] text-sm font-bold text-white ring-2 ring-white">
                      {shownInitials}
                    </span>
                  )}
                </span>
                <div className="min-w-0">
                  {isPreviewing ? (
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-orange">
                      Previewing as student
                    </p>
                  ) : (
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                      Signed in
                    </p>
                  )}
                  <p className="mt-0.5 truncate text-sm font-bold text-navy">
                    {headerName ?? 'Your account'}
                  </p>
                  {!isPreviewing && email ? (
                    <p className="truncate text-xs text-slate-400">{email}</p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="mt-1.5 space-y-0.5">
              <MenuRow
                icon={<User className="size-4" aria-hidden="true" />}
                label="My Workspace"
                onClick={handleWorkspace}
                tone="default"
                trailing
              />

              {showProfile ? (
                <MenuRow
                  icon={<IdCard className="size-4" aria-hidden="true" />}
                  label="My Profile"
                  onClick={handleProfile}
                  tone="default"
                  trailing
                />
              ) : null}

              {canPreview ? (
                <MenuRow
                  icon={
                    busy ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Eye className="size-4" aria-hidden="true" />
                    )
                  }
                  label="Switch to student view"
                  onClick={handleSwitchToStudent}
                  disabled={busy}
                  tone="sky"
                  trailing
                />
              ) : null}

              {isPreviewing ? (
                <MenuRow
                  icon={<ArrowLeft className="size-4" aria-hidden="true" />}
                  label="Return to admin view"
                  onClick={handleReturnToAdmin}
                  tone="sky"
                  trailing
                />
              ) : null}
            </div>

            <div className="mx-2 my-1.5 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

            <MenuRow
              icon={<LogOut className="size-4" aria-hidden="true" />}
              label={busy ? 'Logging out…' : 'Log out'}
              onClick={handleLogout}
              disabled={busy}
              tone="danger"
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

type RowTone = 'default' | 'sky' | 'danger';

function MenuRow({
  icon,
  label,
  onClick,
  disabled = false,
  tone,
  trailing = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone: RowTone;
  trailing?: boolean;
}) {
  const toneClasses: Record<RowTone, string> = {
    default: 'text-slate-700 hover:bg-slate-50 hover:text-navy',
    sky: 'text-slate-700 hover:bg-sky-50 hover:text-navy',
    danger: 'text-red-600 hover:bg-red-50',
  };
  const chipClasses: Record<RowTone, string> = {
    default: 'bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-navy',
    sky: 'bg-sky-100 text-sky-600 group-hover:bg-white',
    danger: 'bg-red-100 text-red-600 group-hover:bg-white',
  };
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'group flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-sm font-medium transition-colors disabled:opacity-50',
        toneClasses[tone],
      )}
    >
      <span
        className={cn(
          'grid size-7 shrink-0 place-items-center rounded-lg shadow-sm transition-colors',
          chipClasses[tone],
        )}
      >
        {icon}
      </span>
      <span className="flex-1">{label}</span>
      {trailing ? (
        <ChevronRight className="size-3.5 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-400" aria-hidden="true" />
      ) : null}
    </button>
  );
}
