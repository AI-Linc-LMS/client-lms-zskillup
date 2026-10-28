import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { BookOpen, Code2, FileText, Layers } from 'lucide-react';
import { PublicHeader } from '@/components/marketing/PublicHeader';
import { PublicFooter } from '@/components/marketing/PublicFooter';
import { SignupCta } from '@/components/marketing/SignupCta';
import { getPublicCompanies, getPublicCompany } from '@/lib/server/public-content';
import { breadcrumbLd, JsonLd } from '@/components/seo/JsonLd';
import { seoTemplateMetadataFor } from '@/lib/seo/page-metadata';
import { COMPANY_FEATURES } from '@/shared/company-features';
import { PromoBannerSlot } from '@/components/promo/PromoBannerSlot';
import type { ApiCompany } from '@/lib/api/catalog';

const SITE = 'https://prephasz.com';

/**
 * PUBLIC COMPANY LANDING PAGE — /company/[slug] (pSEO).
 *
 * One indexable page per published company hub, with no login barrier: a visitor
 * searching "Accenture aptitude questions" lands here, reads what the process looks like
 * and what the bank holds, and is asked to sign up in the middle and again at the end.
 *
 * WHY THIS IS NOT /dashboard/company/[slug]. That hub already exists and is already
 * publicly reachable, but it is the product surface — tabs, practice launchers, progress
 * — built for someone with an account, and it sits under a path that reads as an app
 * screen. This is the marketing face of the same subject at the URL the team asked for.
 *
 * The two therefore say similar things, which is a duplicate-content problem rather than
 * a layout one: left alone, Google picks whichever it likes and the app URL can win. Both
 * pages declare THIS one canonical, so the ranking URL is the one with the sign-up CTAs.
 *
 * STATIC, REVALIDATED. Nine hubs today; `generateStaticParams` prerenders them all and
 * `revalidate` refreshes counts without a deploy. The data comes from endpoints that are
 * already @Public, so none of this needs a session to render.
 */
export const revalidate = 300;

export async function generateStaticParams() {
  const companies = await getPublicCompanies();
  return companies.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = await getPublicCompany(slug);
  if (!c) return { title: 'Company preparation · ZSkillup' };
  // One catalog row — "/company/[slug]" in the SEO module — templates every company
  // hub; `{company}` is substituted here. The company's own description still wins as
  // the fallback, so a hub with real copy does not lose it to a generic template.
  const seo = await seoTemplateMetadataFor(
    '/company/[slug]',
    { company: c.name },
    {
      title: `${c.name} Placement Preparation — Aptitude, Coding & Interview | prephasz`,
      description:
        c.description ??
        c.tagline ??
        `Prepare for the ${c.name} recruitment process with company-specific aptitude, previous-year questions, coding practice and interview rounds.`,
    },
  );
  return {
    ...seo,
    alternates: { canonical: `${SITE}/company/${c.slug}` },
    openGraph: {
      ...seo.openGraph,
      images: c.logoUrl ? [{ url: c.logoUrl }] : seo.openGraph?.images,
    },
  };
}

/** A counted stat, shown only when the bank actually has that content. */
function Stat({ icon: Icon, value, label }: { icon: typeof BookOpen; value: string; label: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <Icon className="size-4 text-[#f5b400]" />
      <p className="mt-2 text-xl font-extrabold leading-none text-white">{value}</p>
      <p className="mt-1 text-[11px] font-semibold uppercase tracking-widest text-white/50">{label}</p>
    </div>
  );
}

function OtherCompany({ c }: { c: ApiCompany }) {
  return (
    <Link
      href={`/company/${c.slug}`}
      className="group block rounded-xl border border-[var(--color-line)] bg-white p-4 transition hover:border-[var(--color-accent)]"
    >
      <p className="font-bold text-[var(--color-text)] group-hover:text-[var(--color-primary)]">{c.name}</p>
      {c.tagline && <p className="mt-1 line-clamp-2 text-sm text-[var(--color-text-muted)]">{c.tagline}</p>}
    </Link>
  );
}

export default async function CompanyLandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [company, all] = await Promise.all([getPublicCompany(slug), getPublicCompanies()]);
  if (!company) notFound();

  const others = all.filter((c) => c.slug !== company.slug).slice(0, 6);
  // Only show a stat the bank can back. A "0 questions" tile on a landing page is an
  // argument against signing up.
  const stats = [
    company.questionCount ? { icon: BookOpen, value: String(company.questionCount), label: 'Practice questions' } : null,
    company.pyqCount ? { icon: FileText, value: String(company.pyqCount), label: 'Previous-year questions' } : null,
    company.codingCount ? { icon: Code2, value: String(company.codingCount), label: 'Coding problems' } : null,
    company.rounds ? { icon: Layers, value: String(company.rounds), label: 'Selection rounds' } : null,
  ].filter((s): s is NonNullable<typeof s> => s !== null);

  return (
    <>
      <PublicHeader />
      {/* Trail matches the visible breadcrumb above, crumb for crumb. */}
      <JsonLd
        data={breadcrumbLd([
          { name: 'Home', path: '/' },
          { name: 'Companies', path: '/company' },
          { name: company.name, path: `/company/${company.slug}` },
        ])}
      />
      <main>
        <section className="relative overflow-hidden bg-gradient-to-br from-[#0a0a0c] via-[#0d0e13] to-[#141a2e] px-5 py-16 text-white md:px-8">
          <div aria-hidden className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[#f5b400]/20 blur-3xl" />
          <div className="relative mx-auto max-w-[1100px]">
            <nav aria-label="Breadcrumb" className="text-xs text-white/50">
              <Link href="/" className="hover:text-white">Home</Link>
              <span className="px-1.5">/</span>
              <Link href="/company" className="hover:text-white">Companies</Link>
              <span className="px-1.5">/</span>
              <span className="text-white/80">{company.name}</span>
            </nav>
            <div className="mt-5 flex items-center gap-4">
              {company.logoUrl && (
                <Image
                  src={company.logoUrl}
                  alt={`${company.name} logo`}
                  width={56}
                  height={56}
                  className="size-14 rounded-xl bg-white object-contain p-2"
                />
              )}
              <div>
                {company.badge && (
                  <span className="rounded-full bg-[#f5b400]/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-widest text-[#f5b400]">
                    {company.badge}
                  </span>
                )}
                <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-[42px] sm:leading-tight">
                  {company.name} placement preparation
                </h1>
              </div>
            </div>
            {company.tagline && <p className="mt-4 max-w-2xl text-base text-white/70">{company.tagline}</p>}
            {stats.length > 0 && (
              <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {stats.map((s) => (
                  <Stat key={s.label} icon={s.icon} value={s.value} label={s.label} />
                ))}
              </div>
            )}
          </div>
        </section>

        <div className="mx-auto max-w-[1100px] space-y-12 px-5 py-14 md:px-8">
          {company.description && (
            <section>
              <h2 className="text-2xl font-extrabold tracking-tight text-[var(--color-text)]">
                About the {company.name} process
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[var(--color-text-muted)]">
                {company.description}
              </p>
              <dl className="mt-6 grid gap-4 sm:grid-cols-3">
                {company.package && (
                  <div className="rounded-xl border border-[var(--color-line)] bg-white p-4">
                    <dt className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-subtle)]">Package</dt>
                    <dd className="mt-1 font-bold text-[var(--color-text)]">{company.package}</dd>
                  </div>
                )}
                {company.difficulty && (
                  <div className="rounded-xl border border-[var(--color-line)] bg-white p-4">
                    <dt className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-subtle)]">Difficulty</dt>
                    <dd className="mt-1 font-bold text-[var(--color-text)]">{company.difficulty}</dd>
                  </div>
                )}
                {company.enrolled && (
                  <div className="rounded-xl border border-[var(--color-line)] bg-white p-4">
                    <dt className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-subtle)]">Learners preparing</dt>
                    <dd className="mt-1 font-bold text-[var(--color-text)]">{company.enrolled}</dd>
                  </div>
                )}
              </dl>
            </section>
          )}

          {/* The crawl path into the company x feature matrix. Without it each of those
              pages is reachable only from the sitemap and its own siblings, which is the
              weakest internal linking there is — and this is the page that ranks for the
              company name, so it is the one with authority to pass down. */}
          <section>
            <h2 className="text-2xl font-extrabold tracking-tight text-[var(--color-text)]">
              {company.name} preparation resources
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {COMPANY_FEATURES.map((f) => (
                <Link
                  key={f.slug}
                  href={`/company/${company.slug}/${f.slug}`}
                  className="group block rounded-xl border border-[var(--color-line)] bg-white p-4 transition hover:border-[var(--color-accent)]"
                >
                  <p className="font-bold text-[var(--color-text)] group-hover:text-[var(--color-primary)]">
                    {company.name} {f.label.toLowerCase()}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm text-[var(--color-text-muted)]">
                    {f.descriptionTemplate.split('{company}').join(company.name).split('{year}').join(String(new Date().getFullYear()))}
                  </p>
                </Link>
              ))}
            </div>
          </section>

          {/* Admin-scheduled campaign for this module. Renders nothing when empty, so a
              page with no live campaign looks exactly as it did before banners existed. */}
          <PromoBannerSlot placement="PUBLIC_COMPANY" />

          {/* Mid-page ask, after the visitor knows what the page is about. */}
          <SignupCta
            heading={`Start preparing for ${company.name}`}
            sub="Create a free account to practise this company's questions, sit timed mocks and track your placement readiness."
            redirect={`/dashboard/company/${company.slug}`}
          />

          {others.length > 0 && (
            <section>
              <h2 className="text-2xl font-extrabold tracking-tight text-[var(--color-text)]">Other companies to prepare for</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {others.map((c) => (
                  <OtherCompany key={c.slug} c={c} />
                ))}
              </div>
            </section>
          )}

          <SignupCta
            tone="light"
            heading="Your placement preparation, in one place"
            sub="Company-wise practice, previous-year questions, coding problems and timed mock assessments."
            redirect={`/dashboard/company/${company.slug}`}
            cta="Create your free account"
          />
        </div>
      </main>
      <PublicFooter />
    </>
  );
}
