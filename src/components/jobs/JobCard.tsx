'use client';

import Link from 'next/link';
import { Bookmark, Briefcase, Clock, IndianRupee, MapPin } from 'lucide-react';
import { cn, safeHttpUrl } from '@/lib/utils';
import type { JobPostingDto } from '@/shared/dto/jobs.dto';
import { JobStatus } from '@/shared/enums';
import { compensationLabel, deadlineLabel, jobMetaLine, JOB_KIND_LABEL } from '@/lib/jobs/format';

const DEADLINE_TONE: Record<string, string> = {
  urgent: 'bg-red-50 text-red-700 ring-red-200',
  soon: 'bg-amber-50 text-amber-700 ring-amber-200',
  normal: 'bg-slate-50 text-slate-600 ring-slate-200',
  closed: 'bg-slate-50 text-slate-500 ring-slate-200',
};

/**
 * One role on the board.
 *
 * The deadline is the only thing here rendered in colour, and only when it is close.
 * A board where every card shouts is a board nobody scans - the urgency has to mean
 * something, so "3 days left" is amber and "Apply by 30 Sep" is not.
 */
export function JobCard({
  job,
  saved,
  onToggleSave,
  applied,
}: {
  job: JobPostingDto;
  saved?: boolean;
  onToggleSave?: (slug: string) => void;
  applied?: boolean;
}) {
  const closes = deadlineLabel(job.applicationDeadline);
  const pay = compensationLabel(job);
  const meta = jobMetaLine(job);
  const shut = job.status !== JobStatus.ACTIVE || closes?.tone === 'closed';

  return (
    <div
      className={cn(
        'group relative flex h-full flex-col rounded-xl border bg-white p-5 shadow-sm transition-colors',
        shut ? 'border-slate-200 opacity-75' : 'border-slate-200 hover:border-slate-300',
      )}
    >
      {onToggleSave ? (
        <button
          type="button"
          aria-label={saved ? `Remove ${job.title} from saved` : `Save ${job.title}`}
          aria-pressed={saved}
          onClick={() => onToggleSave(job.slug)}
          className="absolute right-4 top-4 z-10 grid size-8 place-items-center rounded-lg text-slate-300 transition-colors hover:bg-slate-50 hover:text-slate-500 focus-visible:ring-2 focus-visible:ring-orange/40"
        >
          <Bookmark className={cn('size-4', saved && 'fill-orange text-orange')} />
        </button>
      ) : null}

      <Link href={`/jobs/${job.slug}`} className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start gap-3 pr-8">
          {safeHttpUrl(job.companyLogoUrl) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={safeHttpUrl(job.companyLogoUrl) as string}
              alt=""
              className="size-11 shrink-0 rounded-xl object-contain ring-1 ring-slate-100"
            />
          ) : (
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-sky-50 text-sky-600 ring-1 ring-sky-100">
              <Briefcase className="size-5" />
            </span>
          )}
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold text-navy group-hover:underline">
              {job.title}
            </h3>
            <p className="truncate text-sm text-slate-600">{job.companyName}</p>
          </div>
        </div>

        {meta ? (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
            <MapPin className="size-3.5 shrink-0" />
            <span className="truncate">{meta}</span>
          </p>
        ) : null}

        {job.excerpt ? (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-600">{job.excerpt}</p>
        ) : null}

        {job.skills.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {job.skills.slice(0, 4).map((s) => (
              <span
                key={s}
                className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600"
              >
                {s}
              </span>
            ))}
            {job.skills.length > 4 ? (
              <span className="px-1 text-[11px] font-semibold text-slate-400">
                +{job.skills.length - 4}
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
            {JOB_KIND_LABEL[job.jobKind]}
          </span>
          {pay ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
              <IndianRupee className="size-3" /> {pay}
            </span>
          ) : null}
          {applied ? (
            <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-[11px] font-semibold text-sky-700 ring-1 ring-sky-200">
              Applied
            </span>
          ) : null}
          {closes ? (
            <span
              className={cn(
                'ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1',
                DEADLINE_TONE[closes.tone],
              )}
            >
              <Clock className="size-3" /> {closes.text}
            </span>
          ) : null}
        </div>
      </Link>
    </div>
  );
}
