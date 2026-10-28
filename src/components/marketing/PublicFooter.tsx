import Link from 'next/link';
import { Instagram, Linkedin, Youtube } from 'lucide-react';
import { BrandLogo } from '@/components/layout/BrandLogo';
import { LANDING_FOOTER, LANDING_SOCIALS } from '@/lib/landing-config';

/** Icon per social label. Lived next to the landing page's inline footer; it moves with
 *  the markup that uses it so the two cannot drift apart. */
const SOCIAL_ICON = { Instagram, LinkedIn: Linkedin, YouTube: Youtube } as const;

/**
 * The marketing footer, for every public page rather than just the landing one.
 *
 * Same reason as `PublicHeader`: this was inline in `(public)/page.tsx`, so a blog post
 * ended with nothing — no product links, no account links, no copyright. The link groups
 * come from `landing-config`, so they stay one definition across every page.
 */
export function PublicFooter() {
  return (
    <footer className="border-t border-[var(--color-line)] bg-white px-5 py-12 md:px-8">
      <div className="mx-auto grid max-w-[1400px] gap-8 sm:grid-cols-4">
        <div className="sm:col-span-1">
          <BrandLogo variant="dark" className="h-7" />
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            Company-wise prep, timed mocks, and cohort analytics - all in one platform.
          </p>
          <p className="group-label mb-3 mt-6">Follow us</p>
          <div className="flex items-center gap-2.5">
            {LANDING_SOCIALS.map((s) => {
              const Icon = SOCIAL_ICON[s.label];
              return (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="grid size-9 place-items-center rounded-full border border-[var(--color-line)] text-[var(--color-text-muted)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-primary)]"
                >
                  <Icon className="size-4" />
                </a>
              );
            })}
          </div>
        </div>
        <div>
          <p className="group-label mb-3">Product</p>
          <ul className="space-y-2">
            {LANDING_FOOTER.product.map((l) => (
              <li key={l.label}>
                <Link href={l.href} className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="group-label mb-3">Account</p>
          <ul className="space-y-2">
            {LANDING_FOOTER.account.map((l) => (
              <li key={l.label}>
                <Link href={l.href} className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="group-label mb-3">Coverage</p>
          <ul className="space-y-2">
            {LANDING_FOOTER.coverage.map((l) => (
              <li key={l.label}>
                <Link href={l.href} className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      {/* Affiliation disclaimer moved up next to the recruiter logos (above the "Aligned
          with the hiring patterns of" strip), so it no longer lives in the footer. */}
      <div className="mx-auto mt-10 max-w-[1400px] border-t border-[var(--color-line)] pt-6 text-center text-xs text-[var(--color-text-subtle)]">
        © 2026 prephasz · Powered by ZSkillup · Future-ready graduates, future-strong institutions
      </div>
    </footer>
  );
}
