'use client';

import Link from 'next/link';
import { Bookmark, Briefcase, Clock, IndianRupee, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn, safeHttpUrl } from '@/lib/utils';
import type { JobPostingDto } from '@/shared/dto/jobs.dto';
import { JobStatus } from '@/shared/enums';
import { compensationLabel, deadlineLabel, jobMetaLine } from '@/lib/jobs/format';

/**
 * The list-view row.
 *
 * Same information as the card, laid out for scanning down a column rather than across
 * a grid: the description gets a full line instead of two clipped ones, which is the
 * only reason to offer a list view at all.
 */
export function JobRow({
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
  const shut = job.status !== JobStatus.ACTIVE || closes?.tone === 'closed';

  return (
    <div
      className={cn(
        'flex flex-wrap items-start gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-slate-300',
        shut && 'opacity-75',
      )}
    >
      {safeHttpUrl(job.companyLogoUrl) ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={safeHttpUrl(job.companyLogoUrl) as string}
          alt=""
          className="size-12 shrink-0 rounded-xl object-contain ring-1 ring-slate-100"
        />
      ) : (
        <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-sky-50 text-sky-600 ring-1 ring-sky-100">
          <Briefcase className="size-5" />
        </span>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/jobs/${job.slug}`} className="text-base font-bold text-navy hover:underline">
            {job.title}
          </Link>
          {applied ? (
            <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-[11px] font-semibold text-sky-700 ring-1 ring-sky-200">
              Applied
            </span>
          ) : null}
        </div>
        <p className="text-sm text-slate-600">{job.companyName}</p>

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
          {jobMetaLine(job) ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" /> {jobMetaLine(job)}
            </span>
          ) : null}
          {pay ? (
            <span className="inline-flex items-center gap-1">
              <IndianRupee className="size-3.5" /> {pay}
            </span>
          ) : null}
          {closes ? (
            <span
              className={cn(
                'inline-flex items-center gap-1 font-semibold',
                closes.tone === 'urgent'
                  ? 'text-red-600'
                  : closes.tone === 'soon'
                    ? 'text-amber-700'
                    : 'text-slate-500',
              )}
            >
              <Clock className="size-3.5" /> {closes.text}
            </span>
          ) : null}
        </div>

        {job.excerpt ? (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-600">{job.excerpt}</p>
        ) : null}

        {job.skills.length > 0 ? (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {job.skills.slice(0, 6).map((s) => (
              <span
                key={s}
                className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600"
              >
                {s}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {onToggleSave ? (
          <button
            type="button"
            aria-label={saved ? `Remove ${job.title} from saved` : `Save ${job.title}`}
            aria-pressed={saved}
            onClick={() => onToggleSave(job.slug)}
            className="grid size-9 place-items-center rounded-lg text-slate-300 transition-colors hover:bg-slate-50 hover:text-slate-500 focus-visible:ring-2 focus-visible:ring-orange/40"
          >
            <Bookmark className={cn('size-4', saved && 'fill-orange text-orange')} />
          </button>
        ) : null}
        <Button asChild size="sm">
          <Link href={`/jobs/${job.slug}`}>View details</Link>
        </Button>
      </div>
    </div>
  );
}
