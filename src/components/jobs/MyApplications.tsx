'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Briefcase } from 'lucide-react';
import { StatusPill } from '@/components/student/StatusPill';
import { Button } from '@/components/ui/button';
import { listMyApplications, type JobApplicationDto } from '@/lib/api/jobs';
import { APPLICATION_STATUS } from '@/lib/jobs/application-status';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * The student's own list. Each row carries the reason line from the shared status map,
 * not just the pill - a student looking at "Under review" for two weeks should be able
 * to read what that actually means without emailing support.
 */
export function MyApplications() {
  const [rows, setRows] = useState<JobApplicationDto[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    listMyApplications()
      .then((r) => alive && setRows(r))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, []);

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200"
      >
        Could not load your applications. Refresh the page to try again.
      </div>
    );
  }

  if (rows === null) {
    return (
      <div className="space-y-3" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-100" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <span className="mx-auto grid size-11 place-items-center rounded-xl bg-sky-50 text-sky-600 ring-1 ring-sky-100">
          <Briefcase className="size-5" aria-hidden="true" />
        </span>
        <p className="mt-3 text-base font-bold text-navy">No applications yet</p>
        <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-slate-600">
          Roles posted by our hiring partners show up on the job board. Applying takes one
          click - we send the profile you have already built here.
        </p>
        <Button asChild className="mt-4">
          <Link href="/jobs">Browse open roles</Link>
        </Button>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {rows.map((a) => {
        const meta = APPLICATION_STATUS[a.status];
        return (
          <li
            key={a.id}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  href={`/jobs/${a.jobSlug}`}
                  className="text-base font-bold text-navy hover:underline"
                >
                  {a.jobTitle}
                </Link>
                <p className="mt-0.5 text-sm text-slate-500">{a.companyName}</p>
              </div>
              <StatusPill tone={meta.tone} label={meta.label} />
            </div>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{meta.reason}</p>
            <p className="mt-3 text-xs text-slate-400">
              Applied {formatDate(a.appliedAt)}
              {a.statusChangedAt ? ` · Last update ${formatDate(a.statusChangedAt)}` : ''}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
