import Link from 'next/link';
import { PublicHeader } from '@/components/marketing/PublicHeader';
import { PublicFooter } from '@/components/marketing/PublicFooter';
import { SignupCta } from '@/components/marketing/SignupCta';
import { getPublicCompanies } from '@/lib/server/public-content';

const SITE = 'https://prephasz.com';

/**
 * Index for the company landing pages — the crawl path into /company/[slug].
 *
 * Without it every company page is an orphan reachable only from the sitemap, which is
 * the weakest kind of internal linking. It is also the page the sitemap's `/company`
 * entry points at, and this file is why that entry is not a 404.
 */
export const revalidate = 300;

export async function generateMetadata() {
  const title = 'Company-Wise Placement Preparation | prephasz';
  const description =
    'Prepare company by company — aptitude, previous-year questions, coding problems and interview rounds for the recruiters that hire freshers.';
  return { title, description, alternates: { canonical: `${SITE}/company` } };
}

export default async function CompanyIndexPage() {
  const companies = await getPublicCompanies();
  return (
    <>
      <PublicHeader />
      <main>
        <section className="relative overflow-hidden bg-gradient-to-br from-[#0a0a0c] via-[#0d0e13] to-[#141a2e] px-5 py-16 text-white md:px-8">
          <div aria-hidden className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[#f5b400]/20 blur-3xl" />
          <div className="relative mx-auto max-w-[1100px]">
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-[42px] sm:leading-tight">
              Company-wise placement preparation
            </h1>
            <p className="mt-4 max-w-2xl text-base text-white/70">
              Each hub follows one recruiter&apos;s actual process — the rounds, the question
              patterns and the previous-year papers.
            </p>
          </div>
        </section>
        <div className="mx-auto max-w-[1100px] space-y-12 px-5 py-14 md:px-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {companies.map((c) => (
              <Link
                key={c.slug}
                href={`/company/${c.slug}`}
                className="group block rounded-xl border border-[var(--color-line)] bg-white p-5 transition hover:border-[var(--color-accent)]"
              >
                <p className="font-bold text-[var(--color-text)] group-hover:text-[var(--color-primary)]">{c.name}</p>
                {c.tagline && <p className="mt-1 line-clamp-2 text-sm text-[var(--color-text-muted)]">{c.tagline}</p>}
                {(c.questionCount ?? 0) > 0 && (
                  <p className="mt-3 text-xs text-[var(--color-text-subtle)]">
                    {c.questionCount?.toLocaleString('en-IN')} practice questions
                  </p>
                )}
              </Link>
            ))}
          </div>
          <SignupCta
            tone="light"
            heading="Pick your target company and start"
            sub="Company-wise practice, previous-year questions, coding problems and timed mock assessments."
            cta="Create your free account"
          />
        </div>
      </main>
      <PublicFooter />
    </>
  );
}
