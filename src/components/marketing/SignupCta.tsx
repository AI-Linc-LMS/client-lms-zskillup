import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

/**
 * The sign-up prompt the pSEO landing pages carry mid-page and again at the bottom.
 *
 * A visitor who arrives from a search result has no session and no reason to scroll back
 * up to the header, so the ask is repeated where attention actually ends: once after they
 * have seen what the page is about, and once when they finish it.
 *
 * `/signup` matches LANDING_HREFS.start — every "start" on the marketing surface is a
 * sign-up, because practice needs an account.
 *
 * A server component: it is static markup on a static page, and must stay that way for
 * these pages to prerender.
 */
export function SignupCta({
  heading,
  sub,
  cta = 'Get started free',
  tone = 'dark',
}: {
  heading: string;
  sub: string;
  cta?: string;
  /** `dark` for the mid-page break against light content; `light` to close the page. */
  tone?: 'dark' | 'light';
}) {
  const dark = tone === 'dark';
  return (
    <section
      className={
        dark
          ? 'relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#0a0a0c] via-[#0d0e13] to-[#141a2e] px-6 py-10 text-white sm:px-10'
          : 'rounded-2xl border border-[var(--color-line)] bg-white px-6 py-10 sm:px-10'
      }
    >
      {dark && (
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#f5b400]/20 blur-3xl"
        />
      )}
      <div className="relative mx-auto max-w-2xl text-center">
        <h2
          className={`text-2xl font-extrabold tracking-tight sm:text-3xl ${
            dark ? 'text-white' : 'text-[var(--color-text)]'
          }`}
        >
          {heading}
        </h2>
        <p className={`mt-3 text-sm leading-relaxed ${dark ? 'text-white/70' : 'text-[var(--color-text-muted)]'}`}>
          {sub}
        </p>
        <Link
          href="/signup"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#f5b400] px-6 py-3 text-sm font-bold text-[#171717] transition hover:bg-[#f5b400]/90"
        >
          {cta} <ArrowRight className="size-4" />
        </Link>
      </div>
    </section>
  );
}
