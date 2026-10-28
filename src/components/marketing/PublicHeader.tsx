import Link from 'next/link';
import { BrandLogo } from '@/components/layout/BrandLogo';
import { PublicAuthCta } from '@/components/marketing/PublicAuthCta';
import { PublicMobileMenu } from '@/components/marketing/PublicMobileMenu';
import { LANDING_NAV } from '@/lib/landing-config';

/**
 * The marketing header, for every public page rather than just the landing one.
 *
 * It lived inline in `(public)/page.tsx`, so the landing page had a full header and the
 * blog had none at all — a reader who arrived on a post from search had no logo, no nav
 * and no way to sign up without editing the URL. Lifting it here rather than copying it
 * keeps one definition: the nav links come from `landing-config`, so a link added there
 * now appears on every page that renders this, not only on the homepage.
 *
 * A server component on purpose. Nothing here holds state — the two interactive pieces
 * (`PublicAuthCta`, `PublicMobileMenu`) are already client components and stay the only
 * client boundary, so adding this header to a static page does not make it dynamic.
 */
export function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-white/10 bg-gradient-to-r from-[#0a0a0c] to-[#141a2e] px-5 md:px-8">
      <BrandLogo variant="light" priority className="h-8" />
      <nav className="hidden items-center gap-6 lg:flex" aria-label="Primary">
        {/* Keyed by label, not href: two links legitimately CAN share a destination, and
            keying on href silently produced duplicate React keys when they did. */}
        {LANDING_NAV.map((l) => (
          <Link
            key={l.label}
            href={l.href}
            className="text-sm font-medium text-white/75 transition-colors hover:text-white"
          >
            {l.label}
          </Link>
        ))}
      </nav>
      <div className="flex items-center gap-3">
        <PublicAuthCta />
        <PublicMobileMenu />
      </div>
    </header>
  );
}
