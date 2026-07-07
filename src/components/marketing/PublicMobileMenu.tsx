'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { roleHint } from '@/lib/session-hints';

function roleHome(role: string | null): string {
  if (role === 'SUPER_ADMIN') return '/superadmin/dashboard';
  if (role === 'ADMIN') return '/admin/dashboard';
  if (role === 'COLLEGE_ADMIN') return '/tpo/dashboard';
  return '/dashboard';
}

/**
 * Mobile menu for the PUBLIC (logged-out) navbar. The public landing header's
 * primary links are `hidden lg:flex` and "Log in" is `hidden sm:block`, and the
 * public pages do not use the AppShell (so the authenticated MobileNav drawer
 * doesn't cover them). This hamburger — shown only below `lg` — exposes those
 * links on phones. Self-contained client island dropped into the server-rendered
 * header.
 */
const LINKS = [
  { label: 'Companies', href: '/dashboard/company' },
  { label: 'Prepare', href: '/dashboard/company' },
  { label: 'Leaderboard', href: '/leaderboard' },
];

export function PublicMobileMenu() {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  useEffect(() => setRole(roleHint()), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        className="grid size-9 place-items-center rounded-lg text-white/85 transition-colors hover:bg-white/10 hover:text-white"
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>

      {open ? (
        <>
          <div
            className="fixed inset-x-0 bottom-0 top-16 z-40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute left-0 right-0 top-full z-50 border-b border-white/10 bg-[#0b1220] px-5 py-4 shadow-xl">
            <nav className="flex flex-col gap-1" aria-label="Primary">
              {LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-white/85 transition-colors hover:bg-white/10 hover:text-white"
                >
                  {l.label}
                </Link>
              ))}
              <Link
                href={role ? roleHome(role) : '/login'}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-semibold text-white/85 transition-colors hover:bg-white/10 hover:text-white"
              >
                {role ? 'Go to dashboard' : 'Log in'}
              </Link>
            </nav>
          </div>
        </>
      ) : null}
    </div>
  );
}
