import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { PublicHeader } from '@/components/marketing/PublicHeader';
import { PublicFooter } from '@/components/marketing/PublicFooter';
import { SignupCta } from '@/components/marketing/SignupCta';
import { PromoBannerSlot } from '@/components/promo/PromoBannerSlot';
import { breadcrumbLd, faqLd, JsonLd } from '@/components/seo/JsonLd';
import { seoMetadataFor, seoPageContent } from '@/lib/seo/page-metadata';
import { PageSections } from '@/components/seo/PageContent';
import {
  findProductFeature,
  PRODUCT_FEATURES,
  productFeatureSeoKey,
} from '@/shared/product-features';

const SITE = 'https://prephasz.com';

/**
 * The public face of each logged-in student module — /features/practice and the rest.
 *
 * The brief: "public pages should showcase the actual features available in the
 * corresponding logged-in module" while "authenticated functionality remains behind
 * login". So these describe the module honestly and send every action through signup
 * with `?redirect=` set to the module itself, rather than reproducing any of it.
 *
 * They expose no student data of any kind — there is nothing personalised on the page to
 * leak, which is the simplest way to satisfy "do not expose private student data".
 */
export const revalidate = 3600;

export async function generateStaticParams() {
  return PRODUCT_FEATURES.map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const f = findProductFeature(slug);
  if (!f) return { title: 'Features · ZSkillup' };
  const seo = await seoMetadataFor(productFeatureSeoKey(f.slug), {
    title: f.title,
    description: f.description,
  });
  return { ...seo, alternates: { canonical: `${SITE}/features/${f.slug}` } };
}

export default async function ProductFeaturePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const f = findProductFeature(slug);
  if (!f) notFound();

  const content = await seoPageContent([`/features/${slug}`, productFeatureSeoKey(slug)]);
  const heading = content?.heading || f.heading;
  const intro = content?.intro || f.intro;
  // Admin FAQs REPLACE the code-shipped set rather than appending to it. Two FAQPage
  // blocks on one page is invalid structured data for the whole page, and a visible list
  // that disagrees with the markup is a manual-action risk — so one list feeds both.
  const faqs = content?.faqs?.length ? content.faqs : f.faqs;

  const others = PRODUCT_FEATURES.filter((x) => x.slug !== f.slug);

  return (
    <>
      <PublicHeader />
      <JsonLd
        data={breadcrumbLd([
          { name: 'Home', path: '/' },
          { name: 'Features', path: '/features' },
          { name: f.label, path: `/features/${f.slug}` },
        ])}
      />
      {/* The SAME questions rendered below — markup the visitor cannot see is a
          manual-action risk, not a richer result. */}
      <JsonLd data={faqLd(faqs)} />

      <main>
        <section className="relative overflow-hidden bg-gradient-to-br from-[#0a0a0c] via-[#0d0e13] to-[#141a2e] px-5 py-16 text-white md:px-8">
          <div aria-hidden className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[#f5b400]/20 blur-3xl" />
          <div className="relative mx-auto max-w-[1100px]">
            <nav aria-label="Breadcrumb" className="text-xs text-white/50">
              <Link href="/" className="hover:text-white">Home</Link>
              <span className="px-1.5">/</span>
              <Link href="/features" className="hover:text-white">Features</Link>
              <span className="px-1.5">/</span>
              <span className="text-white/80">{f.label}</span>
            </nav>
            <h1 className="mt-5 text-3xl font-extrabold tracking-tight sm:text-[42px] sm:leading-tight">
              {heading}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/70">{intro}</p>
            <Link
              href={`/signup?redirect=${encodeURIComponent(f.appHref)}`}
              className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#f5b400] px-6 py-3 text-sm font-bold text-[#171717] transition hover:bg-[#f5b400]/90"
            >
              Get started free <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </section>

        <div className="mx-auto max-w-[1100px] space-y-12 px-5 py-14 md:px-8">
          <section>
            <h2 className="text-2xl font-extrabold tracking-tight text-[var(--color-text)]">
              What {f.label.toLowerCase()} gives you
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {f.highlights.map((h) => (
                <div key={h.title} className="rounded-xl border border-[var(--color-line)] bg-white p-5">
                  <h3 className="text-base font-bold text-[var(--color-text)]">{h.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">{h.body}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-extrabold tracking-tight text-[var(--color-text)]">How it works</h2>
            <ol className="mt-4 space-y-3">
              {f.steps.map((s, i) => (
                <li key={s} className="flex items-start gap-3 rounded-xl border border-[var(--color-line)] bg-white p-4">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[var(--color-text)] text-[11px] font-bold text-white">
                    {i + 1}
                  </span>
                  <span className="text-sm leading-relaxed text-[var(--color-text-muted)]">{s}</span>
                </li>
              ))}
            </ol>
          </section>

          {/* Admin-authored sections sit above the CTA, after the code-shipped blocks. */}
          <PageSections content={content} />

          <PromoBannerSlot placement="PUBLIC_HOME" />

          <SignupCta
            heading={`Start using ${f.label.toLowerCase()}`}
            sub="Create a free account — it takes a minute, and you land straight on this module."
            redirect={f.appHref}
          />

          <section>
            <h2 className="text-2xl font-extrabold tracking-tight text-[var(--color-text)]">
              Frequently asked questions
            </h2>
            <dl className="mt-4 space-y-3">
              {faqs.map((it) => (
                <div key={it.q} className="rounded-xl border border-[var(--color-line)] bg-white p-5">
                  <dt className="text-base font-bold text-[var(--color-text)]">{it.q}</dt>
                  <dd className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">{it.a}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section>
            <h2 className="text-2xl font-extrabold tracking-tight text-[var(--color-text)]">
              Everything else on Prephasz
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {others.map((o) => (
                <Link
                  key={o.slug}
                  href={`/features/${o.slug}`}
                  className="group block rounded-xl border border-[var(--color-line)] bg-white p-4 transition hover:border-[var(--color-accent)]"
                >
                  <p className="font-bold text-[var(--color-text)] group-hover:text-[var(--color-primary)]">
                    {o.label}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm text-[var(--color-text-muted)]">{o.description}</p>
                </Link>
              ))}
            </div>
          </section>

          <SignupCta
            tone="light"
            heading="Your placement preparation, in one place"
            sub="Company-wise practice, previous-year questions, coding problems, timed mocks and a readiness score that tells you where you stand."
            cta="Create your free account"
            redirect={f.appHref}
          />
        </div>
      </main>
      <PublicFooter />
    </>
  );
}
