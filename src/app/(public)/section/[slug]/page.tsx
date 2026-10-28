import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Code2 } from 'lucide-react';
import { PublicHeader } from '@/components/marketing/PublicHeader';
import { PublicFooter } from '@/components/marketing/PublicFooter';
import { SignupCta } from '@/components/marketing/SignupCta';
import {
  getPublicCodingTopics,
  getPublicCompanies,
  getPublicTopics,
} from '@/lib/server/public-content';
import {
  buildSections,
  buildSoftSkillsSection,
  CODING_SECTION_SLUG,
  SOFT_SKILLS_ROOT,
  type SectionRoot,
} from '@/lib/sections/section-catalog';

const SITE = 'https://prephasz.com';

/**
 * PUBLIC SECTION LANDING PAGE — /section/[slug] (pSEO).
 *
 * The topic-hub half of the pair: one indexable page per section of the question bank
 * (numerical ability, logical reasoning, verbal, technical, interview prep …), built from
 * the same public topic tree the product uses, so the syllabus shown here is the syllabus
 * that exists rather than marketing copy about it.
 *
 * CODING IS STILL THE ODD ONE OUT. It is synthetic — its topics are Judge0 tags rather
 * than bank topic roots, so it has no row in the tree above and is handled separately.
 * Its syllabus comes from `/api/v1/mocks/coding-topics`, which answered 401 until it was
 * explicitly opened for this page (it returns tag names and counts, nothing else). The
 * fetcher degrades to [] if it is ever closed again, so the grid disappears rather than
 * the page breaking — and the company list below it, built from the already-public
 * company counts, stands on its own either way.
 *
 * `/dashboard/section/[slug]` — the product hub for the same subject — is NOT public; it
 * redirects to /login. That is left alone: this page is the public face, and its CTAs go
 * to sign-up rather than deep-linking a visitor into a screen that would bounce them.
 */
export const revalidate = 300;

/** Every section the public topic tree can produce, plus the synthetic coding one. */
async function allSections(): Promise<SectionRoot[]> {
  const topics = await getPublicTopics();
  if (topics.length === 0) return [];
  const soft = buildSoftSkillsSection(topics);
  return [...buildSections(topics), ...(soft ? [soft] : [])];
}

async function findPublicSection(slug: string): Promise<SectionRoot | null> {
  if (slug === CODING_SECTION_SLUG) return null; // handled separately — no public syllabus
  const topics = await getPublicTopics();
  if (topics.length === 0) return null;
  return slug === SOFT_SKILLS_ROOT
    ? buildSoftSkillsSection(topics)
    : (buildSections(topics).find((s) => s.slug === slug) ?? null);
}

export async function generateStaticParams() {
  const sections = await allSections();
  return [...sections.map((s) => ({ slug: s.slug })), { slug: CODING_SECTION_SLUG }];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug === CODING_SECTION_SLUG) {
    const title = 'Coding Practice for Placements — Company-Wise Problems | prephasz';
    const description =
      'Practise placement coding problems company by company, with real previous-round patterns and timed assessments.';
    return { title, description, alternates: { canonical: `${SITE}/section/coding` } };
  }
  const section = await findPublicSection(slug);
  if (!section) return { title: 'Practice sections · ZSkillup' };
  const title = `${section.name} Practice Questions for Placements | prephasz`;
  const description = `Practise ${section.name.toLowerCase()} for placement tests — ${section.questionCount} questions across ${section.topicCount} topics, with timed mocks and previous-year papers.`;
  return { title, description, alternates: { canonical: `${SITE}/section/${section.slug}` } };
}

function Hero({ eyebrow, title, sub }: { eyebrow: string; title: string; sub: string }) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#0a0a0c] via-[#0d0e13] to-[#141a2e] px-5 py-16 text-white md:px-8">
      <div aria-hidden className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[#f5b400]/20 blur-3xl" />
      <div className="relative mx-auto max-w-[1100px]">
        <nav aria-label="Breadcrumb" className="text-xs text-white/50">
          <Link href="/" className="hover:text-white">Home</Link>
          <span className="px-1.5">/</span>
          <span className="text-white/80">{eyebrow}</span>
        </nav>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-[42px] sm:leading-tight">{title}</h1>
        <p className="mt-4 max-w-2xl text-base text-white/70">{sub}</p>
      </div>
    </section>
  );
}

export default async function SectionLandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  if (slug === CODING_SECTION_SLUG) {
    const [companiesAll, codingTopics] = await Promise.all([
      getPublicCompanies(),
      getPublicCodingTopics(),
    ]);
    const companies = companiesAll.filter((c) => (c.codingCount ?? 0) > 0);
    return (
      <>
        <PublicHeader />
        <main>
          <Hero
            eyebrow="Coding"
            title="Coding practice for placements"
            sub="Company-wise coding problems drawn from real recruitment rounds, run against test cases and timed like the assessment itself."
          />
          <div className="mx-auto max-w-[1100px] space-y-12 px-5 py-14 md:px-8">
            {codingTopics.length > 0 && (
              <section>
                <h2 className="text-2xl font-extrabold tracking-tight text-[var(--color-text)]">What this section covers</h2>
                <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {codingTopics.map((t) => (
                    <div key={t.topic} className="rounded-xl border border-[var(--color-line)] bg-white p-4">
                      <p className="font-bold text-[var(--color-text)]">{t.topic}</p>
                      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                        {t.count.toLocaleString('en-IN')} problems
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}
            {companies.length > 0 && (
              <section>
                <h2 className="text-2xl font-extrabold tracking-tight text-[var(--color-text)]">Coding banks by company</h2>
                <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {companies.map((c) => (
                    <Link
                      key={c.slug}
                      href={`/company/${c.slug}`}
                      className="group flex items-center justify-between rounded-xl border border-[var(--color-line)] bg-white p-4 transition hover:border-[var(--color-accent)]"
                    >
                      <span className="font-bold text-[var(--color-text)] group-hover:text-[var(--color-primary)]">{c.name}</span>
                      <span className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)]">
                        <Code2 className="size-4" />
                        {c.codingCount}
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            )}
            <SignupCta
              heading="Start solving placement coding problems"
              sub="Create a free account to run your solutions against real test cases and sit timed coding rounds."
            />
            <SignupCta
              tone="light"
              heading="Your placement preparation, in one place"
              sub="Company-wise practice, previous-year questions, coding problems and timed mock assessments."
              cta="Create your free account"
            />
          </div>
        </main>
        <PublicFooter />
      </>
    );
  }

  const section = await findPublicSection(slug);
  if (!section) notFound();

  const topics = section.topics.filter((t) => t.questionCount > 0);

  return (
    <>
      <PublicHeader />
      <main>
        <Hero
          eyebrow={section.name}
          title={`${section.name} practice for placements`}
          sub={`${section.questionCount.toLocaleString('en-IN')} practice questions across ${section.topicCount} topics, drawn from the same bank used for timed mocks and previous-year papers.`}
        />
        <div className="mx-auto max-w-[1100px] space-y-12 px-5 py-14 md:px-8">
          {topics.length > 0 && (
            <section>
              <h2 className="text-2xl font-extrabold tracking-tight text-[var(--color-text)]">What this section covers</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {topics.map((t) => (
                  <div key={t.slug} className="rounded-xl border border-[var(--color-line)] bg-white p-4">
                    <p className="font-bold text-[var(--color-text)]">{t.name}</p>
                    <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                      {t.questionCount.toLocaleString('en-IN')} questions
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <SignupCta
            heading={`Start practising ${section.name.toLowerCase()}`}
            sub="Create a free account to practise topic by topic, sit timed mocks and track your placement readiness."
          />

          <SignupCta
            tone="light"
            heading="Your placement preparation, in one place"
            sub="Company-wise practice, previous-year questions, coding problems and timed mock assessments."
            cta="Create your free account"
          />
        </div>
      </main>
      <PublicFooter />
    </>
  );
}
