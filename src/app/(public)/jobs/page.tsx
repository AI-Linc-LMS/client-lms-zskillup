import Link from 'next/link';
import { Briefcase, Clock, IndianRupee, MapPin } from 'lucide-react';
import { getPublicJobs } from '@/lib/server/public-content';
import type { JobPostingDto } from '@/shared/dto/jobs.dto';
import { safeHttpUrl } from '@/lib/utils';

/**
 * The public job board. Deliberately readable WITHOUT an account: the brief is that
 * free users browse and preview everything, and only APPLY is gated. Server-rendered
 * and revalidated so shared links and search engines see real content, not a spinner.
 */
export const revalidate = 300;

export const metadata = {
  title: 'Jobs & Internships · prephasz',
  description:
    'Live openings for students and freshers - roles, locations, eligibility and how to apply.',
};

function deadlineLabel(iso: string | null): string | null {
  if (!iso) return null;
  const days = Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
  if (days < 0) return 'Closed';
  if (days === 0) return 'Closes today';
  if (days === 1) return 'Closes tomorrow';
  if (days <= 14) return `Closes in ${days} days`;
  return `Apply by ${new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
}

function JobCard({ job }: { job: JobPostingDto }) {
  const closes = deadlineLabel(job.applicationDeadline);
  return (
    <Link
      href={`/jobs/${job.slug}`}
      className="group flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-slate-300"
    >
      <div className="flex items-start gap-3">
        {safeHttpUrl(job.companyLogoUrl) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={safeHttpUrl(job.companyLogoUrl) as string} alt="" className="size-11 rounded-xl object-contain ring-1 ring-slate-100" />
        ) : (
          <span className="grid size-11 place-items-center rounded-xl bg-sky-50 text-sky-600 ring-1 ring-sky-100">
            <Briefcase className="size-5" />
          </span>
        )}
        <div className="min-w-0">
          <h2 className="truncate text-base font-bold text-navy">{job.title}</h2>
          <p className="truncate text-sm text-slate-600">{job.companyName}</p>
        </div>
      </div>

      {job.excerpt ? (
        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-slate-600">{job.excerpt}</p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
        {job.location ? (
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3.5" /> {job.location}
            {job.workMode ? ` · ${job.workMode.toLowerCase()}` : ''}
          </span>
        ) : null}
        {job.experience ? <span>{job.experience}</span> : null}
        {job.salary ? (
          <span className="inline-flex items-center gap-1">
            <IndianRupee className="size-3.5" /> {job.salary}
          </span>
        ) : null}
      </div>

      <div className="mt-auto flex items-center justify-between pt-4">
        {job.employmentType ? (
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
            {job.employmentType}
          </span>
        ) : <span />}
        {closes ? (
          <span
            className={
              closes === 'Closed'
                ? 'inline-flex items-center gap-1 text-[11px] font-semibold text-red-600'
                : 'inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700'
            }
          >
            <Clock className="size-3" /> {closes}
          </span>
        ) : null}
      </div>
    </Link>
  );
}

export default async function JobsPage() {
  const jobs = await getPublicJobs();
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Job board</p>
      <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-navy sm:text-[42px] sm:leading-tight">
        Openings for students and freshers
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
        Browse every live role in full - eligibility, hiring process and salary. Applying takes a
        plan; reading never does.
      </p>

      {jobs.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <Briefcase className="mx-auto size-10 text-slate-400" />
          <p className="mt-3 text-sm text-slate-600">
            No openings are live right now. New roles are posted here as they open.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {jobs.map((j) => (
            <JobCard key={j.id} job={j} />
          ))}
        </div>
      )}
    </div>
  );
}
