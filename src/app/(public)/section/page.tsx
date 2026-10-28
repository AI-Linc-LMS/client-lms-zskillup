import Link from 'next/link';
import { PublicHeader } from '@/components/marketing/PublicHeader';
import { PublicFooter } from '@/components/marketing/PublicFooter';
import { SignupCta } from '@/components/marketing/SignupCta';
import { getPublicTopics } from '@/lib/server/public-content';
import { buildSections, buildSoftSkillsSection } from '@/lib/sections/section-catalog';

const SITE = 'https://prephasz.com';

/** Index for the section landing pages — the crawl path into /section/[slug]. */
export const revalidate = 300;

export async function generateMetadata() {
  const title = 'Placement Practice by Section — Aptitude, Reasoning, Verbal, Coding | prephasz';
  const description =
    'Practise section by section: numerical ability, logical reasoning, verbal ability, technical MCQs, interview preparation and coding.';
  return { title, description, alternates: { canonical: `${SITE}/section` } };
}

export default async function SectionIndexPage() {
  const topics = await getPublicTopics();
  const soft = topics.length ? buildSoftSkillsSection(topics) : null;
  const sections = topics.length ? [...buildSections(topics), ...(soft ? [soft] : [])] : [];
  // A section with nothing published behind it is not worth a crawl or a click.
  const listed = sections.filter((s) => s.questionCount > 0);

  return (
    <>
      <PublicHeader />
      <main>
        <section className="relative overflow-hidden bg-gradient-to-br from-[#0a0a0c] via-[#0d0e13] to-[#141a2e] px-5 py-16 text-white md:px-8">
          <div aria-hidden className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[#f5b400]/20 blur-3xl" />
          <div className="relative mx-auto max-w-[1100px]">
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-[42px] sm:leading-tight">
              Practice by section
            </h1>
            <p className="mt-4 max-w-2xl text-base text-white/70">
              Every placement paper is built from the same few sections. Work through them
              one at a time, with the counts you see here coming from the live bank.
            </p>
          </div>
        </section>
        <div className="mx-auto max-w-[1100px] space-y-12 px-5 py-14 md:px-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listed.map((s) => (
              <Link
                key={s.slug}
                href={`/section/${s.slug}`}
                className="group block rounded-xl border border-[var(--color-line)] bg-white p-5 transition hover:border-[var(--color-accent)]"
              >
                <p className="font-bold text-[var(--color-text)] group-hover:text-[var(--color-primary)]">{s.name}</p>
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                  {s.questionCount.toLocaleString('en-IN')} questions · {s.topicCount} topics
                </p>
              </Link>
            ))}
            <Link
              href="/section/coding"
              className="group block rounded-xl border border-[var(--color-line)] bg-white p-5 transition hover:border-[var(--color-accent)]"
            >
              <p className="font-bold text-[var(--color-text)] group-hover:text-[var(--color-primary)]">Coding</p>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">Company-wise coding problems</p>
            </Link>
          </div>
          <SignupCta
            tone="light"
            heading="Practise the sections your target company tests"
            sub="Company-wise practice, previous-year questions, coding problems and timed mock assessments."
            cta="Create your free account"
          />
        </div>
      </main>
      <PublicFooter />
    </>
  );
}
