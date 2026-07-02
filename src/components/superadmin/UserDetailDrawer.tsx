'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  activateAdminUser,
  deleteAdminStudent,
  getAdminUser,
  getAdminUserLoginHistory,
  sendAdminUserResetLink,
  suspendAdminUser,
  updateAdminUser,
  updateAdminUserCapabilities,
  verifyAdminUserEmail,
  type AdminLoginHistoryRow,
  type AdminUserDetail,
} from '@/lib/api/admin';
import {
  ADMIN_CAPABILITY_KEYS,
  ADMIN_CAPABILITY_LABELS,
  ADMIN_CAPABILITY_DESCRIPTIONS,
  type AdminCapabilityKey,
} from '@/shared/admin-capabilities';
import { describeError } from '@/lib/api/errors';
import {
  BadgeCheck,
  Ban,
  Check,
  KeyRound,
  Loader2,
  LogIn,
  Pencil,
  ShieldCheck,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ROLE_LABELS: Record<AdminUserDetail['role'], string> = {
  STUDENT: 'Student',
  COLLEGE_ADMIN: 'College Admin',
  ADMIN: 'Admin',
  SUPER_ADMIN: 'Super Admin',
};

const STATUS_STYLE: Record<AdminUserDetail['status'], string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  INVITED: 'bg-amber-100 text-amber-700',
  SUSPENDED: 'bg-red-100 text-red-600',
};

function fmt(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Slide-over drawer for a single user (Phase 2). A SUPER_ADMIN can edit the name,
 * suspend/activate, verify email, send a reset link, toggle per-ADMIN capability
 * flags, delete a student, and review recent sign-ins. Every action calls the
 * audited backend endpoint and refreshes the drawer + notifies the parent list.
 */
export function UserDetailDrawer({
  userId,
  onClose,
  onChanged,
}: {
  userId: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [history, setHistory] = useState<AdminLoginHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [detail, hist] = await Promise.all([
        getAdminUser(userId),
        getAdminUserLoginHistory(userId, 20).catch(() => [] as AdminLoginHistoryRow[]),
      ]);
      setUser(detail);
      setHistory(hist);
    } catch (err) {
      setError(describeError(err, 'Failed to load the user.'));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const flash = (msg: string) => {
    setSuccess(msg);
    setError(null);
    setTimeout(() => setSuccess(null), 3500);
  };

  const run = async (key: string, fn: () => Promise<AdminUserDetail | void>, okMsg: string) => {
    setBusy(key);
    setError(null);
    setSuccess(null);
    try {
      const result = await fn();
      if (result) setUser(result);
      flash(okMsg);
      onChanged();
      return true;
    } catch (err) {
      setError(describeError(err, 'Action failed. Please try again.'));
      return false;
    } finally {
      setBusy(null);
    }
  };

  const saveName = async () => {
    const ok = await run(
      'name',
      () => updateAdminUser(userId, { fullName: nameDraft.trim() || null }),
      'Name updated.',
    );
    if (ok) setEditingName(false);
  };

  const toggleCapability = async (key: AdminCapabilityKey) => {
    if (!user) return;
    await run(
      `cap:${key}`,
      () => updateAdminUserCapabilities(userId, { [key]: !user.capabilities[key] }),
      `${ADMIN_CAPABILITY_LABELS[key]} ${!user.capabilities[key] ? 'granted' : 'revoked'}.`,
    );
  };

  const onDeleteStudent = async () => {
    if (!user) return;
    if (
      !window.confirm(
        `Delete student "${user.fullName ?? user.email}"? This soft-deletes the account and ends their sessions. This cannot be undone from the UI.`,
      )
    )
      return;
    const ok = await run('delete', () => deleteAdminStudent(userId), 'Student deleted.');
    if (ok) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">User detail</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-slate-400" />
          </div>
        ) : !user ? (
          <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-red-500">
            {error ?? 'User not found.'}
          </div>
        ) : (
          <div className="space-y-6 p-5">
            {/* Identity */}
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  {editingName ? (
                    <div className="flex items-center gap-2">
                      <input
                        value={nameDraft}
                        onChange={(e) => setNameDraft(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                        placeholder="Full name"
                        autoFocus
                      />
                      <button
                        onClick={saveName}
                        disabled={busy === 'name'}
                        className="rounded-lg bg-navy p-1.5 text-white hover:bg-navy/90 disabled:opacity-50"
                        aria-label="Save name"
                      >
                        {busy === 'name' ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Check className="size-4" />
                        )}
                      </button>
                      <button
                        onClick={() => setEditingName(false)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                        aria-label="Cancel"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-lg font-extrabold text-navy">
                        {user.fullName ?? '—'}
                      </h3>
                      <button
                        onClick={() => {
                          setNameDraft(user.fullName ?? '');
                          setEditingName(true);
                        }}
                        className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                        aria-label="Edit name"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                    </div>
                  )}
                  <p className="truncate text-sm text-slate-500">{user.email}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                  {ROLE_LABELS[user.role]}
                </span>
                <span
                  className={cn(
                    'rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                    STATUS_STYLE[user.status],
                  )}
                >
                  {user.status}
                </span>
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                    user.isEmailVerified
                      ? 'bg-green-50 text-green-700'
                      : 'bg-slate-100 text-slate-500',
                  )}
                >
                  {user.isEmailVerified ? (
                    <BadgeCheck className="size-3" />
                  ) : (
                    <XCircle className="size-3" />
                  )}
                  {user.isEmailVerified ? 'Verified' : 'Unverified'}
                </span>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <dt className="text-slate-400">Joined</dt>
                  <dd className="font-medium text-slate-700">{fmt(user.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-slate-400">Last login</dt>
                  <dd className="font-medium text-slate-700">{fmt(user.lastLoginAt)}</dd>
                </div>
              </dl>
            </div>

            {/* Feedback */}
            {success && (
              <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-2.5 text-xs text-green-700">
                <BadgeCheck className="size-4 shrink-0" />
                {success}
              </div>
            )}
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
                <XCircle className="size-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Account actions */}
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                Account actions
              </p>
              <div className="grid grid-cols-1 gap-2">
                {!user.isEmailVerified && (
                  <ActionButton
                    icon={<BadgeCheck className="size-4" />}
                    label="Mark email verified"
                    busy={busy === 'verify'}
                    onClick={() =>
                      run('verify', () => verifyAdminUserEmail(userId), 'Email marked verified.')
                    }
                  />
                )}
                <ActionButton
                  icon={<KeyRound className="size-4" />}
                  label="Send password-reset link"
                  busy={busy === 'reset'}
                  onClick={() =>
                    run(
                      'reset',
                      async () => {
                        await sendAdminUserResetLink(userId);
                      },
                      'Reset link sent.',
                    )
                  }
                />
                {user.status === 'SUSPENDED' ? (
                  <ActionButton
                    icon={<Check className="size-4" />}
                    label="Reactivate account"
                    tone="positive"
                    busy={busy === 'activate'}
                    onClick={() =>
                      run('activate', () => activateAdminUser(userId), 'Account reactivated.')
                    }
                  />
                ) : (
                  user.role !== 'SUPER_ADMIN' && (
                    <ActionButton
                      icon={<Ban className="size-4" />}
                      label="Suspend (lock) account"
                      tone="danger"
                      busy={busy === 'suspend'}
                      onClick={() =>
                        run('suspend', () => suspendAdminUser(userId), 'Account suspended.')
                      }
                    />
                  )
                )}
                {user.role === 'STUDENT' && (
                  <ActionButton
                    icon={<Trash2 className="size-4" />}
                    label="Delete student"
                    tone="danger"
                    busy={busy === 'delete'}
                    onClick={onDeleteStudent}
                  />
                )}
              </div>
            </div>

            {/* Capabilities (ADMIN only) */}
            {user.role === 'ADMIN' && (
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                  <ShieldCheck className="size-3.5" /> Capabilities
                </p>
                <div className="space-y-1.5">
                  {ADMIN_CAPABILITY_KEYS.map((key) => (
                    <button
                      key={key}
                      onClick={() => toggleCapability(key)}
                      disabled={busy === `cap:${key}`}
                      className="flex w-full items-start justify-between gap-3 rounded-lg border border-slate-200 p-2.5 text-left transition-colors hover:bg-slate-50 disabled:opacity-60"
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-navy">
                          {ADMIN_CAPABILITY_LABELS[key]}
                        </span>
                        <span className="block text-[11px] text-slate-400">
                          {ADMIN_CAPABILITY_DESCRIPTIONS[key]}
                        </span>
                      </span>
                      <span
                        className={cn(
                          'mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors',
                          user.capabilities[key] ? 'bg-green-500' : 'bg-slate-300',
                        )}
                      >
                        {busy === `cap:${key}` ? (
                          <Loader2 className="size-4 animate-spin text-white" />
                        ) : (
                          <span
                            className={cn(
                              'size-4 rounded-full bg-white transition-transform',
                              user.capabilities[key] && 'translate-x-4',
                            )}
                          />
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Login history */}
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                <LogIn className="size-3.5" /> Recent sign-ins
              </p>
              {history.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-200 p-3 text-center text-xs text-slate-400">
                  No sign-ins recorded yet.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {history.map((h) => (
                    <li
                      key={h.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2 text-xs"
                    >
                      <span className="font-medium text-slate-700">{fmt(h.at)}</span>
                      <span className="flex items-center gap-2 text-slate-400">
                        {h.method && (
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase">
                            {h.method}
                          </span>
                        )}
                        {h.ip && <span className="tabular-nums">{h.ip}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  busy,
  tone = 'neutral',
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  busy?: boolean;
  tone?: 'neutral' | 'positive' | 'danger';
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={cn(
        'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:opacity-60',
        tone === 'danger'
          ? 'border-red-200 text-red-600 hover:bg-red-50'
          : tone === 'positive'
            ? 'border-green-200 text-green-700 hover:bg-green-50'
            : 'border-slate-200 text-slate-700 hover:bg-slate-50',
      )}
    >
      {busy ? <Loader2 className="size-4 animate-spin" /> : icon}
      {label}
    </button>
  );
}
