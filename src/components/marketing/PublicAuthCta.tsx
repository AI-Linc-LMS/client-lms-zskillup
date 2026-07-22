'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LogOut } from 'lucide-react';
import { roleHint } from '@/lib/session-hints';
import { logout } from '@/lib/api/auth';

/** Role-appropriate landing after login (mirrors middleware.roleHome). */
function roleHome(role: string | null): string {
  if (role === 'SUPER_ADMIN') return '/superadmin/dashboard';
  if (role === 'ADMIN') return '/admin/dashboard';
  if (role === 'COLLEGE_ADMIN') return '/tpo/dashboard';
  return '/dashboard';
}

/**
 * Public-header auth CTA. Logged-out visitors see "Log in" + "Get started free";
 * an already-authenticated visitor (role hint cookie present) sees "Go to
 * dashboard" plus a "Log out" button so they can sign out without leaving the
 * landing page. Renders the logged-out markup on the server / first paint
 * (matches SSR), then swaps after mount once the cookie is read - so there's no
 * hydration mismatch.
 */
export function PublicAuthCta() {
  const [role, setRole] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    setRole(roleHint());
    setReady(true);
  }, []);

  const onLogout = async () => {
    setSigningOut(true);
    try {
      await logout();
    } finally {
      // logout() clears the session hints; drop the local role so the CTA swaps
      // back to the logged-out state without a full reload.
      setRole(null);
      setSigningOut(false);
    }
  };

  if (ready && role) {
    return (
      <div className="flex items-center gap-2.5">
        <Link href={roleHome(role)} className="btn-brand rounded-full px-5 py-2 text-sm">
          Go to dashboard
        </Link>
        <button
          type="button"
          onClick={onLogout}
          disabled={signingOut}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/[0.08] px-4 py-2 text-sm font-semibold text-white/85 transition hover:border-white/40 hover:bg-white/[0.14] disabled:opacity-60"
        >
          <LogOut className="h-4 w-4" /> {signingOut ? 'Logging out…' : 'Log out'}
        </button>
      </div>
    );
  }

  return (
    <>
      <Link
        href="/login"
        className="hidden text-sm font-semibold text-white/80 transition-colors hover:text-white sm:block"
      >
        Log in
      </Link>
      <Link href="/signup" className="btn-brand rounded-full px-5 py-2 text-sm">
        Get started free
      </Link>
    </>
  );
}
