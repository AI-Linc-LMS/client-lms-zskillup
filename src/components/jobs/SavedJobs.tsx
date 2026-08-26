'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bookmark, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { JobRow } from './JobRow';
import { listJobs } from '@/lib/api/jobs';
import type { JobPostingDto } from '@/shared/dto/jobs.dto';

/**
 * The student's own shortlist.
 *
 * Resolved by fetching the board and intersecting with the saved slugs rather than
 * adding a dedicated endpoint: a shortlist is small, and doing it this way means a
 * saved job that has since been closed, unpublished or targeted away simply stops
 * appearing - there is no separate code path that could show something the board
 * itself would not.
 */
export function SavedJobs({
  savedSlugs,
  onToggleSave,
  appliedSlugs,
}: {
  savedSlugs: Set<string>;
  onToggleSave: (slug: string) => void;
  appliedSlugs: Set<string>;
}) {
  const [jobs, setJobs] = useState<JobPostingDto[] | null>(null);

  useEffect(() => {
    if (savedSlugs.size === 0) {
      setJobs([]);
      return;
    }
    let alive = true;
    listJobs({ limit: 100 })
      .then((r) => alive && setJobs(r.items.filter((j) => savedSlugs.has(j.slug))))
      .catch(() => alive && setJobs([]));
    return () => {
      alive = false;
    };
    // Keyed on size rather than the set itself: a new Set identity on every parent
    // render would refetch the board continuously.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedSlugs.size]);

  if (jobs === null) {
    return (
      <div className="grid place-items-center py-16">
        <Loader2 className="size-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
        <span className="mx-auto grid size-11 place-items-center rounded-xl bg-orange/10 text-orange ring-1 ring-orange/20">
          <Bookmark className="size-5" />
        </span>
        <p className="mt-3 text-base font-bold text-navy">Nothing saved yet</p>
        <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-slate-600">
          Tap the bookmark on any role to keep it here while you decide. Saved roles are only
          ever visible to you.
        </p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/jobs">Browse open roles</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {jobs.map((job) => (
        <JobRow
          key={job.id}
          job={job}
          saved
          onToggleSave={onToggleSave}
          applied={appliedSlugs.has(job.slug)}
        />
      ))}
    </div>
  );
}
