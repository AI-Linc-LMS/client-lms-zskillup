'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { roleHint } from '@/lib/session-hints';

/** Role-appropriate landing after login (mirrors middleware.roleHome). */
function roleHome(role: string | null): string {
  if (role === 'SUPER_ADMIN') return '/superadmin/dashboard';
  if (role === 'ADMIN') return '/admin/dashboard';
  if (role === 'COLLEGE_ADMIN') return '/tpo/dashboard';
  return '/dashboard';
}

/**
 * Public-header auth CTA. Logged-out visitors see "Log in" + "Get started free";
 * an already-authenticated visitor (role hint cookie present) sees a single
 * "Go to dashboard" button instead. Renders the logged-out markup on the server
 * / first paint (matches SSR), then swaps after mount once the cookie is read —
 * so there's no hydration mismatch.
 */
export function PublicAuthCta() {
  const [role, setRole] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setRole(roleHint());
    setReady(true);
  }, []);

  if (ready && role) {
    return (
      <Link href={roleHome(role)} className="btn-brand rounded-full px-5 py-2 text-sm">
        Go to dashboard
      </Link>
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
