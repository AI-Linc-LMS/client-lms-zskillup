'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Link2,
  Loader2,
  Plus,
  Search,
  Trash2,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { deleteJob, listAdminJobs, updateJob, applicantsExportUrl } from '@/lib/api/jobs';
import type { JobPostingDto } from '@/shared/dto/jobs.dto';
import { JobStatus } from '@/shared/enums';
import { describeError } from '@/lib/api/errors';
import { cn } from '@/lib/utils';
import { JOB_STATUS_LABEL, JobStatusPill, PublishPill } from './JobStatusPill';

type Filter = 'ALL' | 'PUBLISHED' | 'DRAFT' | JobStatus;

const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: 'ALL', label: 'All' },
  { key: 'PUBLISHED', label: 'Published' },
  { key: 'DRAFT', label: 'Drafts' },
  { key: JobStatus.ACTIVE, label: 'Active' },
  { key: JobStatus.INACTIVE, label: 'Inactive' },
  { key: JobStatus.CLOSED, label: 'Closed' },
  { key: JobStatus.COMPLETED, label: 'Completed' },
  { key: JobStatus.ON_HOLD, label: 'On hold' },
];

/**
 * Every posting, in one place.
 *
 * Publish state and lifecycle are filtered separately because they ARE separate: "show
 * me the drafts" and "show me what is on hold" are different questions, and a single
 * status dropdown could only answer one of them.
 */
export function JobsListing() {
  const [jobs, setJobs] = useState<JobPostingDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    listAdminJobs()
      .then(setJobs)
      .catch((err) => toast.error(describeError(err, 'Could not load the job board.')))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return jobs.filter((j) => {
      if (q && !`${j.title} ${j.companyName}`.toLowerCase().includes(q)) return false;
      if (filter === 'ALL') return true;
      if (filter === 'PUBLISHED') return j.isPublished;
      if (filter === 'DRAFT') return !j.isPublished;
      return j.status === filter;
    });
  }, [jobs, filter, search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: jobs.length };
    c.PUBLISHED = jobs.filter((j) => j.isPublished).length;
    c.DRAFT = jobs.filter((j) => !j.isPublished).length;
    for (const s of Object.values(JobStatus)) c[s] = jobs.filter((j) => j.status === s).length;
    return c;
  }, [jobs]);

  const patch = async (job: JobPostingDto, dto: Parameters<typeof updateJob>[1], msg: string) => {
    setBusyId(job.id);
    try {
      const updated = await updateJob(job.id, dto);
      setJobs((prev) => prev.map((j) => (j.id === job.id ? updated : j)));
      toast.success(msg);
    } catch (err) {
      toast.error(describeError(err, 'Could not update the posting.'));
    } finally {
      setBusyId(null);
    }
  };

  const copyLink = async (slug: string) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/jobs/${slug}`);
      setCopied(slug);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      toast.error('Could not copy the link.');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search postings"
            aria-label="Search postings"
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-navy placeholder:text-slate-400 focus:border-orange focus-visible:ring-2 focus-visible:ring-orange/30"
          />
        </div>
        <Button asChild variant="outline">
          <a href={applicantsExportUrl()} download>
            <Download className="size-4" /> Export all applicants
          </a>
        </Button>
        <Button asChild>
          <Link href="/admin/jobs/new">
            <Plus className="size-4" /> New posting
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            aria-pressed={filter === f.key}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-semibold transition-colors',
              filter === f.key
                ? 'bg-navy text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
            )}
          >
            {f.label}
            <span className={cn('ml-1.5', filter === f.key ? 'text-white/70' : 'text-slate-400')}>
              {counts[f.key] ?? 0}
            </span>
          </button>
        ))}
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        {loading ? (
          <div className="grid place-items-center py-12">
            <Loader2 className="size-6 animate-spin text-slate-400" />
          </div>
        ) : shown.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-500">
            {jobs.length === 0
              ? 'No postings yet. Create the first one.'
              : 'Nothing matches that filter.'}
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {shown.map((j) => (
              <li key={j.id} className="flex flex-wrap items-center justify-between gap-3 py-3.5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/admin/jobs/${j.id}`}
                      className="truncate text-sm font-bold text-navy hover:underline"
                    >
                      {j.title}
                    </Link>
                    <span className="text-sm text-slate-500">· {j.companyName}</span>
                    <PublishPill published={j.isPublished} />
                    <JobStatusPill status={j.status} />
                  </div>
                  <p className="mt-0.5 flex items-center gap-1 font-mono text-xs text-slate-500">
                    <Link2 className="size-3" /> /jobs/{j.slug}
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/admin/jobs/${j.id}/applicants`}>
                      <Users className="size-3.5" /> Applicants
                    </Link>
                  </Button>

                  {j.isPublished ? (
                    <>
                      <Button size="sm" variant="outline" onClick={() => void copyLink(j.slug)}>
                        {copied === j.slug ? (
                          <Check className="size-3.5" />
                        ) : (
                          <Copy className="size-3.5" />
                        )}
                        Link
                      </Button>
                      <Button asChild size="sm" variant="ghost">
                        <a href={`/jobs/${j.slug}`} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="size-3.5" />
                        </a>
                      </Button>
                    </>
                  ) : null}

                  <select
                    aria-label={`Status for ${j.title}`}
                    value={j.status}
                    disabled={busyId === j.id}
                    onChange={(e) =>
                      void patch(
                        j,
                        { status: e.target.value as JobStatus },
                        `${j.title} → ${JOB_STATUS_LABEL[e.target.value as JobStatus]}`,
                      )
                    }
                    className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-navy focus:border-orange focus-visible:ring-2 focus-visible:ring-orange/30"
                  >
                    {Object.values(JobStatus).map((s) => (
                      <option key={s} value={s}>
                        {JOB_STATUS_LABEL[s]}
                      </option>
                    ))}
                  </select>

                  <Button
                    size="sm"
                    variant={j.isPublished ? 'ghost' : 'default'}
                    disabled={busyId === j.id}
                    onClick={() =>
                      void patch(
                        j,
                        { isPublished: !j.isPublished },
                        j.isPublished ? 'Unpublished' : 'Published',
                      )
                    }
                  >
                    {j.isPublished ? 'Unpublish' : 'Publish'}
                  </Button>

                  <button
                    type="button"
                    aria-label={`Delete ${j.title}`}
                    onClick={async () => {
                      if (
                        !window.confirm(
                          `Delete "${j.title}"? Its URL stays reserved so old links cannot be re-pointed at a different job.`,
                        )
                      )
                        return;
                      try {
                        await deleteJob(j.id);
                        toast.success('Posting removed');
                        load();
                      } catch (err) {
                        toast.error(describeError(err, 'Could not delete the posting.'));
                      }
                    }}
                    className="text-slate-400 transition-colors hover:text-red-600"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
