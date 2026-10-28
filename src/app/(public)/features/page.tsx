import Link from 'next/link';
import { PublicHeader } from '@/components/marketing/PublicHeader';
import { PublicFooter } from '@/components/marketing/PublicFooter';
import { SignupCta } from '@/components/marketing/SignupCta';
import { breadcrumbLd, itemListLd, JsonLd } from '@/components/seo/JsonLd';
import { seoMetadataFor } from '@/lib/seo/page-metadata';
import { PRODUCT_FEATURES } from '@/shared/product-features';

const SITE = 'https://prephasz.com';

/**
 * Index for the product feature pages — the crawl path into /features/[slug].
 *
 * Without it each feature page is an orphan reachable only from its siblings and the
 * sitemap, and the breadcrumb on every one of them would point at a 404.
 */
export const revalidate = 3600;

export async function generateMetadata() {
  const seo = await seoMetadataFor('/features', {
    title: 'Placement Preparation Features — Practice, Mocks, Interviews & More | Prephasz',
    description:
      'Everything Prephasz gives you for campus placements: topic-wise practice, timed mock assessments, coding rounds, mock interviews, a resume builder and a readiness score.',
  });
  return { ...seo, alternates: { canonical: `${SITE}/features` } };
}

export default async function FeaturesIndexPage() {
  return (
    <>
      <PublicHeader />
      <JsonLd
        data={breadcrumbLd([
          { name: 'Home', path: '/' },
          { name: 'Features', path: '/features' },
        ])}
      />
      <JsonLd
        data={itemListLd(
          'Placement preparation features',
          PRODUCT_FEATURES.map((f) => ({ name: f.label, path: `/features/${f.slug}` })),
        )}
      />
      <main>
        <section className="relative overflow-hidden bg-gradient-to-br from-[#0a0a0c] via-[#0d0e13] to-[#141a2e] px-5 py-16 text-white md:px-8">
          <div aria-hidden className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[#f5b400]/20 blur-3xl" />
          <div className="relative mx-auto max-w-[1100px]">
            <nav aria-label="Breadcrumb" className="text-xs text-white/50">
              <Link href="/" className="hover:text-white">Home</Link>
              <span className="px-1.5">/</span>
              <span className="text-white/80">Features</span>
            </nav>
            <h1 className="mt-5 text-3xl font-extrabold tracking-tight sm:text-[42px] sm:leading-tight">
              Everything you need for campus placements
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/70">
              Practice, mocks, coding rounds, interviews and a readiness score that tells you where
              you actually stand — in one place, free to start.
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-[1100px] space-y-12 px-5 py-14 md:px-8">
          <section>
            <h2 className="text-2xl font-extrabold tracking-tight text-[var(--color-text)]">
              Explore each module
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {PRODUCT_FEATURES.map((f) => (
                <Link
                  key={f.slug}
                  href={`/features/${f.slug}`}
                  className="group block rounded-xl border border-[var(--color-line)] bg-white p-5 transition hover:border-[var(--color-accent)]"
                >
                  <h3 className="font-bold text-[var(--color-text)] group-hover:text-[var(--color-primary)]">
                    {f.label}
                  </h3>
                  <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-[var(--color-text-muted)]">
                    {f.intro}
                  </p>
                </Link>
              ))}
            </div>
          </section>

          <SignupCta
            tone="light"
            heading="Start preparing today"
            sub="Create a free account and get practice, mocks and a readiness score built from your real attempts."
            cta="Create your free account"
          />
        </div>
      </main>
      <PublicFooter />
    </>
  );
}
