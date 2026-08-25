'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { listAdminJobs, type JobPostingDto } from '@/lib/api/jobs';
import { JobComposer } from './JobComposer';

/**
 * Loads one posting, then hands it to the composer.
 *
 * Reads it out of the admin list rather than adding a by-id endpoint: the list is one
 * call the console already makes, and a posting an admin can edit is by definition one
 * they can see on it.
 */
export function EditJobComposer({ jobId }: { jobId: string }) {
  const [job, setJob] = useState<JobPostingDto | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading');

  useEffect(() => {
    let alive = true;
    listAdminJobs()
      .then((jobs) => {
        if (!alive) return;
        const found = jobs.find((j) => j.id === jobId);
        setJob(found ?? null);
        setState(found ? 'ready' : 'missing');
      })
      .catch(() => alive && setState('missing'));
    return () => {
      alive = false;
    };
  }, [jobId]);

  if (state === 'loading') {
    return (
      <div className="grid place-items-center py-16">
        <Loader2 className="size-6 animate-spin text-slate-400" />
      </div>
    );
  }
  if (state === 'missing' || !job) {
    return (
      <p className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
        That posting no longer exists.
      </p>
    );
  }
  return <JobComposer existing={job} />;
}
