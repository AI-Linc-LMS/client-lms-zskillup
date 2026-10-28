import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { BookOpen, Layers, Lock, Target, Users, Wallet } from 'lucide-react';
import { PublicHeader } from '@/components/marketing/PublicHeader';
import { PublicFooter } from '@/components/marketing/PublicFooter';
import { SignupCta } from '@/components/marketing/SignupCta';
import { getPublicCodingTopics, getPublicCompanies, getPublicCompanyHub } from '@/lib/server/public-content';
import { breadcrumbLd, itemListLd, JsonLd } from '@/components/seo/JsonLd';
import { seoPageContent, seoPageMedia, seoTemplateMetadataFor } from '@/lib/seo/page-metadata';
import { PageMedia } from '@/components/seo/PageMedia';
import { PageFaqs, PageSections } from '@/components/seo/PageContent';
import { PromoBannerSlot } from '@/components/promo/PromoBannerSlot';
import { COMPANY_FEATURES, companyFeatureSeoKey, findCompanyFeature } from '@/shared/company-features';
import { fillSeoContent } from '@/shared/seo-content';
import type { ApiCompanyHub } from '@/lib/api/catalog';

const SITE = 'https://prephasz.com';

/**
 * The company × feature landing pages — /company/accenture/syllabus and the rest.
 *
 * One template over COMPANY_FEATURES × published companies, which is what makes this a
 * pSEO surface rather than a folder of hand-written pages. Everything a page shows comes
 * from the SAME hub payload the logged-in company hub renders, so a page is never a
 * marketing claim about content that does not exist: a section with no data is dropped,
 * not filled with a placeholder.
 *
 * Gating follows the brief: the visitor sees WHAT exists (titles, counts, topics, rounds)
 * and signs up to CONSUME it. Every lock carries the in-app destination through
 * `?redirect=`, so converting lands them on the thing they came for instead of the
 * dashboard.
 *
 * STATIC, REVALIDATED — prerendered per pair, refreshed every 5 minutes so counts track
 * the bank without a deploy.
 */
export const revalidate = 300;

export async function generateStaticParams() {
  const companies = await getPublicCompanies();
  return companies.flatMap((c) =>
    COMPANY_FEATURES.map((f) => ({ slug: c.slug, feature: f.slug })),
  );
}

/** The batch year these pages address. Current year, so titles stay fresh on their own —
 *  revalidate picks the rollover up within 5 minutes of the new year, not at the next deploy. */
function currentYear(): string {
  return String(new Date().getFullYear());
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; feature: string }>;
}) {
  const { slug, feature } = await params;
  const f = findCompanyFeature(feature);
  if (!f) return { title: 'Company preparation · ZSkillup' };
  const company = await getPublicCompanyHub(slug);
  if (!company) return { title: 'Company preparation · ZSkillup' };

  const vars = { company: company.name, year: currentYear() };
  const fill = (t: string) => t.split('{company}').join(company.name).split('{year}').join(vars.year);

  // Exact path first, then the shared template — an admin can retitle ONE company's
  // page from the SEO module without touching the other eight.
  const seo = await seoTemplateMetadataFor([`/company/${slug}/${f.slug}`, companyFeatureSeoKey(f.slug)], vars, {
    title: fill(f.titleTemplate),
    description: fill(f.descriptionTemplate),
  });
  return {
    ...seo,
    alternates: { canonical: `${SITE}/company/${company.slug}/${f.slug}` },
    openGraph: {
      ...seo.openGraph,
      images: company.logoUrl ? [{ url: company.logoUrl }] : seo.openGraph?.images,
    },
  };
}

/* ── small presentational pieces ─────────────────────────────────────────────── */

function Stat({ icon: Icon, value, label }: { icon: typeof BookOpen; value: string; label: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <Icon className="size-4 text-[#f5b400]" />
      <p className="mt-2 text-xl font-extrabold leading-none text-white">{value}</p>
      <p className="mt-1 text-[11px] font-semibold uppercase tracking-widest text-white/50">{label}</p>
    </div>
  );
}

/**
 * A resource the visitor can see but not open yet.
 *
 * Showing the real title and count and THEN asking for an account is the whole gating
 * model — a locked row with its contents hidden would be a page about nothing. The lock
 * is also stated in text, not colour alone (WCAG 2.1 AA is a launch gate, §10).
 */
function LockedRow({
  title,
  meta,
  redirect,
}: {
  title: string;
  meta?: string;
  redirect: string;
}) {
  return (
    <li className="flex items-center justify-between gap-4 rounded-xl border border-[var(--color-line)] bg-white p-4">
      <div className="min-w-0">
        <p className="truncate font-semibold text-[var(--color-text)]">{title}</p>
        {meta && <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{meta}</p>}
      </div>
      <Link
        href={`/signup?redirect=${encodeURIComponent(redirect)}`}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[var(--color-text)] px-3.5 py-1.5 text-xs font-bold text-white transition hover:opacity-90"
      >
        <Lock className="size-3" aria-hidden /> Unlock
      </Link>
    </li>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-2xl font-extrabold tracking-tight text-[var(--color-text)]">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function RoundsTable({ rows }: { rows: ApiCompanyHub['hub'] extends null ? never : { round: string; info: string; type: string }[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--color-line)] bg-white">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-[var(--color-line)] bg-[var(--color-surface-sunken,#f8fafc)]">
          <tr>
            <th className="px-4 py-3 font-bold text-[var(--color-text)]">Round</th>
            <th className="px-4 py-3 font-bold text-[var(--color-text)]">What it covers</th>
            <th className="px-4 py-3 font-bold text-[var(--color-text)]">Type</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.round}-${i}`} className="border-b border-[var(--color-line)] last:border-0">
              <td className="px-4 py-3 font-semibold text-[var(--color-text)]">{r.round}</td>
              <td className="px-4 py-3 text-[var(--color-text-muted)]">{r.info}</td>
              <td className="px-4 py-3">
                <span className="rounded-full bg-[var(--color-line)]/40 px-2.5 py-0.5 text-[11px] font-semibold text-[var(--color-text)]">
                  {r.type}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TopicGrid({ groups }: { groups: { group: string; topics: string[] }[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {groups.map((g) => (
        <div key={g.group} className="rounded-xl border border-[var(--color-line)] bg-white p-5">
          <h3 className="text-base font-bold text-[var(--color-text)]">{g.group}</h3>
          <ul className="mt-3 space-y-1.5">
            {g.topics.map((t) => (
              <li key={t} className="text-sm text-[var(--color-text-muted)]">
                {t}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/* ── the per-feature body ────────────────────────────────────────────────────── */

/**
 * Returns the sections for one feature, plus the list this page's ItemList describes.
 *
 * Every branch drops a section whose data is empty rather than rendering an empty shell —
 * a set of near-identical pages with nothing on them is what Google classifies as doorway
 * pages, and that judgement lands on the whole /company directory, not one URL.
 */
function featureBody(
  feature: string,
  company: ApiCompanyHub,
  appHref: string,
  codingTopics: Array<{ topic: string; count: number }>,
): { nodes: React.ReactNode[]; listed: { name: string; path: string }[] } {
  const hub = company.hub;
  const nodes: React.ReactNode[] = [];
  const listed: { name: string; path: string }[] = [];
  const name = company.name;

  if (feature === 'syllabus') {
    if (hub?.syllabus?.length) {
      nodes.push(
        <Section key="rounds" title={`${name} round-by-round syllabus`}>
          <RoundsTable rows={hub.syllabus} />
        </Section>,
      );
    }
    if (hub?.overview?.topicGrid?.length) {
      nodes.push(
        <Section key="topics" title={`Topics tested in the ${name} test`}>
          <TopicGrid groups={hub.overview.topicGrid} />
        </Section>,
      );
      hub.overview.topicGrid.forEach((g) => listed.push({ name: g.group, path: `/company/${company.slug}/syllabus` }));
    }
  }

  if (feature === 'test-pattern') {
    if (hub?.quickStats) {
      const q = hub.quickStats;
      const facts: [string, string][] = [
        ['Rounds', String(q.rounds)],
        ['Exam type', q.examType],
        ['Negative marking', q.negativeMarking],
        ['Applicants', q.applicants],
        ['Open roles', q.openRoles],
      ].filter(([, v]) => v && v !== 'null') as [string, string][];
      nodes.push(
        <Section key="facts" title={`${name} exam at a glance`}>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {facts.map(([k, v]) => (
              <div key={k} className="rounded-xl border border-[var(--color-line)] bg-white p-4">
                <dt className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-subtle)]">{k}</dt>
                <dd className="mt-1 font-bold text-[var(--color-text)]">{v}</dd>
              </div>
            ))}
          </dl>
        </Section>,
      );
    }
    if (hub?.syllabus?.length) {
      nodes.push(
        <Section key="rounds" title={`${name} rounds and what each eliminates on`}>
          <RoundsTable rows={hub.syllabus} />
        </Section>,
      );
    }
  }

  if (feature === 'previous-papers') {
    nodes.push(
      <Section key="intro" title={`What is in the ${name} question bank`}>
        <p className="max-w-3xl text-sm leading-relaxed text-[var(--color-text-muted)]">
          Previous-year questions from real {name} drives, grouped by the section that asked
          them. Every question carries a worked solution, so a paper you get wrong is a topic
          you can fix rather than a score you have to accept.
        </p>
      </Section>,
    );
    if (hub?.overview?.topicGrid?.length) {
      nodes.push(
        <Section key="topics" title={`${name} papers by topic`}>
          <TopicGrid groups={hub.overview.topicGrid} />
        </Section>,
      );
    }
  }

  if (feature === 'practice-questions' && hub?.quizzes?.length) {
    nodes.push(
      <Section key="quizzes" title={`${name} practice sets`}>
        <ul className="space-y-3">
          {hub.quizzes.map((q) => (
            <LockedRow key={q.title} title={q.title} meta={`${q.questions} questions`} redirect={appHref} />
          ))}
        </ul>
      </Section>,
    );
    hub.quizzes.forEach((q) => listed.push({ name: q.title, path: `/company/${company.slug}/practice-questions` }));
  }

  if (feature === 'coding-questions') {
    nodes.push(
      <Section key="coding" title={`${name} coding round`}>
        <p className="max-w-3xl text-sm leading-relaxed text-[var(--color-text-muted)]">
          Coding problems from {name} drives, solvable in-browser in C, C++, Java, Python and
          JavaScript against real test cases — including the edge cases that fail a solution
          which looked correct.
        </p>
      </Section>,
    );
    // The bank's real tag distribution. This was the thinnest page in the matrix on a
    // body-text audit of all 81, and a page that only asserts problems exist — without
    // naming what they cover — is the shape Google reads as a doorway page.
    if (codingTopics.length) {
      nodes.push(
        <Section key="coding-topics" title="Topics these problems cover">
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {codingTopics.slice(0, 24).map((t) => (
              <li
                key={t.topic}
                className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-line)] bg-white px-4 py-2.5"
              >
                <span className="truncate text-sm font-medium text-[var(--color-text)]">{t.topic}</span>
                <span className="shrink-0 text-xs font-semibold text-[var(--color-text-subtle)]">{t.count}</span>
              </li>
            ))}
          </ul>
        </Section>,
      );
      codingTopics.slice(0, 24).forEach((t) =>
        listed.push({ name: t.topic, path: `/company/${company.slug}/coding-questions` }),
      );
    }
  }

  if (feature === 'mock-test' && hub?.mocks?.length) {
    nodes.push(
      <Section key="mocks" title={`${name} mock assessments`}>
        <ul className="space-y-3">
          {hub.mocks.map((m) => (
            <LockedRow
              key={m.title}
              title={m.title}
              meta={`${m.questions} questions · ${m.minutes} minutes`}
              redirect={appHref}
            />
          ))}
        </ul>
      </Section>,
    );
    hub.mocks.forEach((m) => listed.push({ name: m.title, path: `/company/${company.slug}/mock-test` }));
  }

  if (feature === 'interview-questions' && hub?.interviews?.length) {
    nodes.push(
      <Section key="interviews" title={`${name} interview experiences`}>
        <div className="space-y-4">
          {hub.interviews.map((iv, i) => (
            <article key={`${iv.role}-${i}`} className="rounded-xl border border-[var(--color-line)] bg-white p-5">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-[var(--color-text)]">{iv.role}</h3>
                <span className="text-xs text-[var(--color-text-subtle)]">{iv.year}</span>
                <span className="rounded-full bg-[var(--color-line)]/40 px-2.5 py-0.5 text-[11px] font-semibold text-[var(--color-text)]">
                  {iv.rounds} rounds · {iv.verdict}
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-muted)]">{iv.excerpt}</p>
            </article>
          ))}
        </div>
      </Section>,
    );
    hub.interviews.forEach((iv) =>
      listed.push({ name: `${iv.role} (${iv.year})`, path: `/company/${company.slug}/interview-questions` }),
    );
  }

  if (feature === 'study-material' && hub?.material?.length) {
    nodes.push(
      <Section key="material" title={`${name} study material`}>
        <ul className="space-y-3">
          {hub.material.map((m) => (
            <LockedRow key={m.topic} title={m.topic} meta={`${m.videos} videos`} redirect={appHref} />
          ))}
        </ul>
      </Section>,
    );
    hub.material.forEach((m) => listed.push({ name: m.topic, path: `/company/${company.slug}/study-material` }));
  }

  if (feature === 'formula-sheet' && hub?.formulaSheets?.length) {
    nodes.push(
      <Section key="formulas" title={`${name} formula sheets`}>
        <ul className="space-y-3">
          {hub.formulaSheets.map((f) => (
            <LockedRow key={f.topic} title={f.topic} redirect={appHref} />
          ))}
        </ul>
      </Section>,
    );
    hub.formulaSheets.forEach((f) => listed.push({ name: f.topic, path: `/company/${company.slug}/formula-sheet` }));
  }

  return { nodes, listed };
}

/* ── the page ────────────────────────────────────────────────────────────────── */

export default async function CompanyFeaturePage({
  params,
}: {
  params: Promise<{ slug: string; feature: string }>;
}) {
  const { slug, feature } = await params;
  const f = findCompanyFeature(feature);
  if (!f) notFound();

  const seoKeys = [`/company/${slug}/${feature}`, companyFeatureSeoKey(feature)];
  const year = currentYear();

  const [company, all, codingTopics, media, rawContent] = await Promise.all([
    getPublicCompanyHub(slug),
    getPublicCompanies(),
    feature === 'coding-questions' ? getPublicCodingTopics() : Promise.resolve([]),
    // Exact path first, then the shared template key — so one company can carry its own
    // video on one feature without the other eight inheriting it.
    seoPageMedia(seoKeys),
    // Same precedence for the body copy. Tokens are NOT filled here — the company name
    // is not resolved until this Promise.all settles, and passing a blank for it would
    // substitute `{company}` away to nothing on every templated page.
    seoPageContent(seoKeys),
  ]);
  if (!company) notFound();

  const fill = (t: string) => t.split('{company}').join(company.name).split('{year}').join(year);
  // Now that the company is known, fill `{company}`/`{year}` through the admin's copy so
  // one template row reads as this company's own page on all nine.
  const content = rawContent && fillSeoContent(rawContent, { company: company.name, year });
  // Admin copy wins over the code-shipped template, per field. The fallbacks are what
  // every page rendered before the SEO module could write a page body, so an operator
  // who sets only an H1 does not blank the paragraph under it.
  const heading = content?.heading || fill(f.headingTemplate);
  const lead = content?.intro || fill(f.descriptionTemplate);
  // Where this page's content actually lives once you have an account.
  const appHref = `/dashboard/company/${company.slug}`;
  const { nodes, listed } = featureBody(f.slug, company, appHref, codingTopics);

  // See the hub page: bank-size counts are not public.
  const stats = [
    company.rounds ? { icon: Layers, value: String(company.rounds), label: 'Selection rounds' } : null,
    company.difficulty ? { icon: Target, value: company.difficulty, label: 'Difficulty' } : null,
    company.package ? { icon: Wallet, value: company.package, label: 'Package' } : null,
    company.enrolled ? { icon: Users, value: company.enrolled, label: 'Learners preparing' } : null,
  ].filter((s): s is NonNullable<typeof s> => s !== null);

  // The "at a glance" rail. Deliberately company facts, never bank-size counts.
  const q = company.hub?.quickStats;
  const quickFacts = ([
    ['Total rounds', q?.rounds ? String(q.rounds) : company.rounds ? String(company.rounds) : ''],
    ['Type of exam', q?.examType ?? ''],
    ['Negative marking', q?.negativeMarking ?? ''],
    ['Difficulty', company.difficulty ?? ''],
    ['Package', company.package ?? ''],
    ['Open positions', q?.openRoles ?? ''],
  ] as [string, string][]).filter(([, v]) => v && v !== 'null');

  const siblings = COMPANY_FEATURES.filter((x) => x.slug !== f.slug);
  const others = all.filter((c) => c.slug !== company.slug).slice(0, 6);

  return (
    <>
      <PublicHeader />
      {/* Crumb for crumb with the visible breadcrumb below — markup that disagrees with
          the page is a manual-action risk, not a shortcut. */}
      <JsonLd
        data={breadcrumbLd([
          { name: 'Home', path: '/' },
          { name: 'Companies', path: '/company' },
          { name: company.name, path: `/company/${company.slug}` },
          { name: f.label, path: `/company/${company.slug}/${f.slug}` },
        ])}
      />
      {listed.length > 0 && (
        <JsonLd data={itemListLd(fill(f.headingTemplate), listed)} />
      )}

      <main>
        <section className="relative overflow-hidden bg-gradient-to-br from-[#0a0a0c] via-[#0d0e13] to-[#141a2e] px-5 py-16 text-white md:px-8">
          <div aria-hidden className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[#f5b400]/20 blur-3xl" />
          <div className="relative mx-auto max-w-[1100px]">
            <nav aria-label="Breadcrumb" className="text-xs text-white/50">
              <Link href="/" className="hover:text-white">Home</Link>
              <span className="px-1.5">/</span>
              <Link href="/company" className="hover:text-white">Companies</Link>
              <span className="px-1.5">/</span>
              <Link href={`/company/${company.slug}`} className="hover:text-white">{company.name}</Link>
              <span className="px-1.5">/</span>
              <span className="text-white/80">{f.label}</span>
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
              <h1 className="text-3xl font-extrabold tracking-tight sm:text-[42px] sm:leading-tight">
                {heading}
              </h1>
            </div>
            <p className="mt-4 max-w-2xl text-base text-white/70">{lead}</p>
            {stats.length > 0 && (
              <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {stats.map((s) => (
                  <Stat key={s.label} icon={s.icon} value={s.value} label={s.label} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Sibling features — the internal linking that makes the matrix crawlable from
            any page in it, not only from the hub. */}
        <nav aria-label={`${company.name} preparation topics`} className="border-b border-[var(--color-line)] bg-white">
          <div className="mx-auto flex max-w-[1100px] gap-2 overflow-x-auto px-5 py-3 md:px-8">
            <Link
              href={`/company/${company.slug}`}
              className="shrink-0 rounded-full border border-[var(--color-line)] px-3.5 py-1.5 text-xs font-semibold text-[var(--color-text-muted)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-text)]"
            >
              Overview
            </Link>
            {siblings.map((s) => (
              <Link
                key={s.slug}
                href={`/company/${company.slug}/${s.slug}`}
                className="shrink-0 rounded-full border border-[var(--color-line)] px-3.5 py-1.5 text-xs font-semibold text-[var(--color-text-muted)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-text)]"
              >
                {s.label}
              </Link>
            ))}
          </div>
        </nav>

        <div className="mx-auto max-w-[1100px] gap-10 px-5 py-14 md:px-8 lg:grid lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-12">
          {nodes.length > 0 ? (
            nodes
          ) : (
            !content?.sections?.length && (
              <Section title={`${company.name} ${f.label.toLowerCase()}`}>
                <p className="max-w-3xl text-sm leading-relaxed text-[var(--color-text-muted)]">
                  {lead}
                </p>
              </Section>
            )
          )}

          {/* Admin-authored sections, after the data-derived ones: what the operator adds
              is editorial depth on top of the real bank, not a replacement for it. */}
          <PageSections content={content} />

          <PromoBannerSlot placement="PUBLIC_COMPANY" />

          <SignupCta
            heading={`Start your ${company.name} preparation`}
            sub={`Create a free account to open the ${company.name} ${f.label.toLowerCase()}, sit timed mocks and track your readiness.`}
            redirect={appHref}
          />

          {others.length > 0 && (
            <Section title="Prepare for other companies">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {others.map((c) => (
                  <Link
                    key={c.slug}
                    href={`/company/${c.slug}/${f.slug}`}
                    className="group block rounded-xl border border-[var(--color-line)] bg-white p-4 transition hover:border-[var(--color-accent)]"
                  >
                    <p className="font-bold text-[var(--color-text)] group-hover:text-[var(--color-primary)]">
                      {c.name} {f.label.toLowerCase()}
                    </p>
                    {c.tagline && (
                      <p className="mt-1 line-clamp-2 text-sm text-[var(--color-text-muted)]">{c.tagline}</p>
                    )}
                  </Link>
                ))}
              </div>
            </Section>
          )}

          <PageFaqs
            content={content}
            heading={`${company.name} ${f.label.toLowerCase()} — FAQs`}
          />

          <SignupCta
            tone="light"
            heading={`${company.name} ${f.label.toLowerCase()}, free to start`}
            sub="Join students preparing with real previous-year questions, timed mocks and recruiter-recognised certificates."
            cta="Create free account"
            redirect={appHref}
          />
          </div>

          {/* Right rail: the admin-attached video/image, then the company facts. Sticky
              on desktop, stacked under the content on mobile. */}
          <aside className="mt-10 space-y-4 lg:mt-0">
            <div className="lg:sticky lg:top-20 lg:space-y-4">
              <PageMedia media={media} />
              {quickFacts.length > 0 && (
                <div className="rounded-xl border border-[var(--color-line)] bg-white p-5 shadow-sm">
                  <h2 className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-subtle)]">
                    {company.name} at a glance
                  </h2>
                  <dl className="mt-3 space-y-3">
                    {quickFacts.map(([k, v]) => (
                      <div key={k} className="flex items-baseline justify-between gap-3">
                        <dt className="text-sm text-[var(--color-text-muted)]">{k}</dt>
                        <dd className="text-sm font-bold text-[var(--color-text)]">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>
      <PublicFooter />
    </>
  );
}
