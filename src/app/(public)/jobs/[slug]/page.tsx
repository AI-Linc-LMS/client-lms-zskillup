import {
  getPublicJob,
  getPublicJobs,
  getPublicJobTestimonials,
  getPublicJobBlogs,
} from '@/lib/server/public-content';
import { JobDetail } from '@/components/jobs/JobDetail';
import { TargetedJobFallback } from '@/components/jobs/TargetedJobFallback';
import { JobsPublicShell } from '@/components/jobs/JobsPublicShell';
import type { JobPostingDto } from '@/shared/dto/jobs.dto';
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
  const logo = safeHttpUrl(job.companyLogoUrl);
  return {
    title,
    description,
    alternates: { canonical: `/jobs/${job.slug}` },
    openGraph: {
      title,
      description,
      type: 'article',
      // Launder it here too. og:image is fetched SERVER-SIDE by WhatsApp, Slack and
      // LinkedIn unfurl bots, and @IsUrl({ require_tld: false }) on the DTO accepts
      // ftp:// and hostless internal targets. The <img> below already goes through
      // safeHttpUrl; leaving the meta tag raw is the inconsistency that regresses.
      images: logo ? [{ url: logo }] : undefined,
    },
    twitter: { card: 'summary', title, description },
  };
}

export default async function JobPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const job = await getPublicJob(slug);

  // The server has no access token - it lives in memory - so a posting TARGETED at one
  // college legitimately 404s here even for a student who is in its audience. Public
  // postings render on the server with their metadata and JSON-LD intact; the rest
  // fall through to a client fetch that asks again as the signed-in student.
  //
  // A crawler therefore still gets nothing for a private role, which is the behaviour
  // we want: a college-specific req should never be indexed.
  if (!job)
    return (
      <JobsPublicShell>
        <TargetedJobFallback slug={slug} />
      </JobsPublicShell>
    );

  const [allJobs, testimonials, blogs] = await Promise.all([
    getPublicJobs(),
    getPublicJobTestimonials(),
    getPublicJobBlogs(),
  ]);
  const others = allJobs.filter((j) => j.id !== job.id).slice(0, 3);

  // Search engines read this even though the page renders fine without it. Only for
  // publicly-visible roles - reaching this line means the anonymous fetch succeeded.
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
    <>
      {/* JSON.stringify does NOT escape "</script>", so a job description containing
          that sequence closes this block early and everything after it executes as
          markup - stored XSS on a public page, from text an admin may well have PASTED
          from an employer's email. Escaping "<" as \u003c is still valid JSON and
          parsers decode it identically. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <JobsPublicShell>
        <JobDetail job={job} others={others} testimonials={testimonials} blogs={blogs} />
      </JobsPublicShell>
    </>
  );
}
