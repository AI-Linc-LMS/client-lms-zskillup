import Link from 'next/link';
import { Briefcase } from 'lucide-react';
import { BrandLogo } from '@/components/layout/BrandLogo';
import { PublicAuthCta } from '@/components/marketing/PublicAuthCta';

/**
 * Chrome for the PUBLIC job pages (shareable links, viewed logged-out or in). A job
 * link opened cold used to float bare on white with no branding or navigation; this
 * wraps it in the prephasz header (logo + "Browse jobs" + auth CTA) and a footer, on
 * the Zone-C soft background — so a shared role looks like part of the product.
 *
 * A full authed sidebar is deliberately NOT used here: the page is server-rendered and
 * publicly shareable, so it must render identically for an anonymous visitor. The auth
 * CTA swaps to "Go to dashboard" after mount for a signed-in viewer.
 */
export function JobsPublicShell({ children }: { children: React.ReactNode }) {
  const year = new Date().getFullYear();
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex h-16 w-full max-w-[1680px] items-center justify-between px-6">
          <BrandLogo className="h-8" priority />
          <div className="flex items-center gap-1.5 sm:gap-3">
            <Link
              href="/jobs"
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-navy"
            >
              <Briefcase className="size-4" />
              <span className="hidden sm:inline">Browse jobs</span>
            </Link>
            <PublicAuthCta />
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1680px] flex-col items-center justify-between gap-4 px-6 py-8 text-center sm:flex-row sm:text-left">
          <BrandLogo className="h-7" />
          <nav className="flex items-center gap-5 text-sm text-slate-500" aria-label="Footer">
            <Link href="/" className="transition-colors hover:text-navy">
              Home
            </Link>
            <Link href="/jobs" className="transition-colors hover:text-navy">
              Jobs
            </Link>
            <Link href="/leaderboard" className="transition-colors hover:text-navy">
              Leaderboard
            </Link>
            <Link href="/login" className="transition-colors hover:text-navy">
              Sign in
            </Link>
          </nav>
          <p className="text-xs text-slate-400">© {year} prephasz · Powered by ZSkillup</p>
        </div>
      </footer>
    </div>
  );
}
