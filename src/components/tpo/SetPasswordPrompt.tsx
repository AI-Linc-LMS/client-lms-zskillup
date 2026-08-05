'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { KeyRound, X } from 'lucide-react';
import { getMe } from '@/lib/api/me';

/**
 * College-admin (TPO) accounts are SHARED with the placement office, so they must be
 * signable-in with email + password from any device. An admin who onboarded via
 * "Continue with Google" never set one — the account then only works inside their Google
 * session, and email+password handed to a colleague fails. This prompts them to set a
 * password so the account can actually be shared. Dismissible; only shown for a
 * COLLEGE_ADMIN whose account has no usable password.
 */
export function SetPasswordPrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let alive = true;
    getMe()
      .then((me) => {
        if (alive && me.role === 'COLLEGE_ADMIN' && me.hasPassword === false) setShow(true);
      })
      .catch(() => {
        /* not signed in / no session — nothing to prompt */
      });
    return () => {
      alive = false;
    };
  }, []);

  if (!show) return null;

  return (
    <div className="mb-5 flex flex-wrap items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-amber-100 text-amber-700">
        <KeyRound className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-navy">Set a password to share this account</p>
        <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
          You signed in with Google, so this placement-office account has no password yet — it only works from
          your own Google session. Set a password so your team can sign in with email &amp; password from any device.
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Link
          href="/forgot-password"
          className="inline-flex items-center gap-1.5 rounded-full bg-navy px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-navy/90"
        >
          Set a password
        </Link>
        <button
          type="button"
          onClick={() => setShow(false)}
          aria-label="Dismiss"
          className="rounded-lg p-1 text-slate-400 transition-colors hover:text-slate-600"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
