import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Briefcase, CalendarClock, IndianRupee, MapPin, Users } from 'lucide-react';
import { getPublicJob, getPublicJobs } from '@/lib/server/public-content';
import type { JobPostingDto } from '@/shared/dto/jobs.dto';
import { JobStatus } from '@/shared/enums';
import { safeHttpUrl } from '@/lib/utils';

/**
 * One job, at its own shareable URL: prephasz.com/jobs/software-engineer-google.
 *
 * This page exists to be SHARED - email, WhatsApp, LinkedIn, search. So it is server
 * rendered with real metadata rather than client-fetched, and a CLOSED role still
 * renders (marked closed) instead of 404ing, because a link already sent out should
 * never dead-end.
 */
export const revalidate = 300;

/** The preview line. Falls back to a derived sentence when no excerpt was written -
 *  truncating a pasted JD reads badly, since they open with company boilerplate. */
function previewText(job: JobPostingDto): string {
  if (job.excerpt) return job.excerpt;
  const bits = [job.title, 'at', job.companyName];
  if (job.location) bits.push(`· ${job.location}`);
  if (job.experience) bits.push(`· ${job.experience}`);
  return bits.join(' ');
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const job = await getPublicJob(slug);
  if (!job) return { title: 'Jobs · prephasz' };
  const title = `${job.title} at ${job.companyName} · prephasz`;
  const description = previewText(job);
  return {
    title,
    description,
    alternates: { canonical: `/jobs/${job.slug}` },
    openGraph: {
      title,
      description,
      type: 'article',
      images: job.companyLogoUrl ? [{ url: job.companyLogoUrl }] : undefined,
    },
    twitter: { card: 'summary', title, description },
  };
}

function Fact({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-navy">
        <Icon className="size-4 text-slate-400" /> {value}
      </p>
    </div>
  );
}

export default async function JobPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const job = await getPublicJob(slug);
  if (!job) notFound();

  const closed =
    job.status === JobStatus.CLOSED ||
    (!!job.applicationDeadline && new Date(job.applicationDeadline).getTime() < Date.now());
  const others = (await getPublicJobs()).filter((j) => j.id !== job.id).slice(0, 3);
  // Constrain admin-supplied URLs to http(s) before they become an href/src: a
  // javascript: or data: URL in either place is a trivially avoidable footgun.
  const applyHref = safeHttpUrl(job.applyUrl);
  const logoSrc = safeHttpUrl(job.companyLogoUrl);

  // Search engines read this even though the page renders fine without it.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: job.description || previewText(job),
    datePosted: job.publishedAt ?? undefined,
    validThrough: job.applicationDeadline ?? undefined,
    employmentType: job.employmentType ?? undefined,
    hiringOrganization: { '@type': 'Organization', name: job.companyName },
    jobLocation: job.location
      ? { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: job.location } }
      : undefined,
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-12">
      {/* JSON.stringify does NOT escape "</script>", so a job description containing
          that sequence closes this block early and everything after it executes as
          markup - stored XSS on a public page, from text an admin may well have PASTED
          from an employer's email. Escaping "<" as \u003c is still valid JSON and
          parsers decode it identically. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />

      <Link href="/jobs" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-navy">
        <ArrowLeft className="size-4" /> All jobs
      </Link>

      <header className="mt-5 flex items-start gap-4">
        {logoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoSrc} alt="" className="size-14 rounded-2xl object-contain ring-1 ring-slate-100" />
        ) : (
          <span className="grid size-14 place-items-center rounded-2xl bg-sky-50 text-sky-600 ring-1 ring-sky-100">
            <Briefcase className="size-6" />
          </span>
        )}
        <div className="min-w-0">
          <h1 className="text-3xl font-extrabold tracking-tight text-navy">{job.title}</h1>
          <p className="mt-1 text-base text-slate-600">{job.companyName}</p>
        </div>
      </header>

      {closed ? (
        <p className="mt-5 rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600 ring-1 ring-slate-200">
          This role is closed. It stays here so shared links keep working - browse the board for live openings.
        </p>
      ) : null}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {job.location ? (
          <Fact icon={MapPin} label="Location" value={`${job.location}${job.workMode ? ` · ${job.workMode.toLowerCase()}` : ''}`} />
        ) : null}
        {job.experience ? <Fact icon={Briefcase} label="Experience" value={job.experience} /> : null}
        {job.salary ? <Fact icon={IndianRupee} label="Compensation" value={job.salary} /> : null}
        {job.openings ? <Fact icon={Users} label="Openings" value={String(job.openings)} /> : null}
        {job.applicationDeadline ? (
          <Fact
            icon={CalendarClock}
            label="Apply by"
            value={new Date(job.applicationDeadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          />
        ) : null}
      </div>

      {job.skills.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-lg font-bold text-navy">Skills</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {job.skills.map((s) => (
              <span key={s} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {s}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {job.description ? (
        <section className="mt-8">
          <h2 className="text-lg font-bold text-navy">About the role</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{job.description}</p>
        </section>
      ) : null}

      {job.hiringProcess ? (
        <section className="mt-8">
          <h2 className="text-lg font-bold text-navy">Hiring process</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{job.hiringProcess}</p>
        </section>
      ) : null}

      {job.passoutYears.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-lg font-bold text-navy">Who can apply</h2>
          <p className="mt-2 text-sm text-slate-600">
            Graduating in {job.passoutYears.join(', ')}.
          </p>
        </section>
      ) : null}

      {/* Phase 3b replaces this with the gated Apply action. Until then an external
          apply link is honoured, and everything else points back to the board. */}
      {!closed && applyHref ? (
        <a
          href={applyHref}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-9 inline-flex items-center gap-2 rounded-full bg-navy px-6 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-navy/90"
        >
          Apply on the company site
        </a>
      ) : null}

      {others.length > 0 ? (
        <section className="mt-12 border-t border-slate-200 pt-8">
          <h2 className="text-lg font-bold text-navy">Other openings</h2>
          <ul className="mt-3 space-y-2">
            {others.map((o) => (
              <li key={o.id}>
                <Link href={`/jobs/${o.slug}`} className="text-sm font-semibold text-navy hover:underline">
                  {o.title} <span className="font-normal text-slate-500">· {o.companyName}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
