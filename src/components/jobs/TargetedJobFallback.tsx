'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Briefcase, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api/client';
import type { JobPostingDto } from '@/shared/dto/jobs.dto';
import type { BlogPostDto, PlacementRecordDto, TestimonialDto } from '@/shared/dto/content.dto';
import { JobDetail } from './JobDetail';
import { roleHint } from '@/lib/session-hints';

type Related = {
  testimonials: TestimonialDto[];
  blogs: BlogPostDto[];
  placements: PlacementRecordDto[];
};

/**
 * The page the server could not render, tried again as the signed-in student.
 *
 * A posting targeted at one college is invisible to an anonymous request - which is
 * exactly right, and also means the server component fetching this page (no token, it
 * lives in memory) legitimately gets a 404 for a student who IS in the audience.
 *
 * So: public postings render on the server with their metadata and JSON-LD intact, and
 * only the ones the server could not see fall through to here. A crawler still gets a
 * 404 for a private role, which is the behaviour we want - a college-specific req
 * should never be indexed.
 */
export function TargetedJobFallback({ slug }: { slug: string }) {
  const [job, setJob] = useState<JobPostingDto | null>(null);
  const [related, setRelated] = useState<Related>({ testimonials: [], blogs: [], placements: [] });
  const [state, setState] = useState<'loading' | 'found' | 'missing'>('loading');

  useEffect(() => {
    if (!roleHint()) {
      // Nobody is signed in, so there is no second identity to try.
      setState('missing');
      return;
    }
    let alive = true;
    apiClient
      .get<JobPostingDto>(`/api/v1/jobs/${slug}`)
      .then((r) => {
        if (!alive) return;
        setJob(r.data);
        setState('found');
        // Best-effort: a targeted role still shows its own selected related content.
        apiClient
          .get<Related>(`/api/v1/jobs/${slug}/related`)
          .then((rel) => alive && setRelated(rel.data))
          .catch(() => {});
      })
      .catch(() => alive && setState('missing'));
    return () => {
      alive = false;
    };
  }, [slug]);

  if (state === 'loading') {
    return (
      <div className="mx-auto grid w-full max-w-4xl place-items-center px-6 py-24">
        <Loader2 className="size-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (state === 'missing' || !job) {
    return (
      <div className="mx-auto w-full max-w-2xl px-6 py-24 text-center">
        <span className="mx-auto grid size-11 place-items-center rounded-xl bg-slate-100 text-slate-500">
          <Briefcase className="size-5" />
        </span>
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-navy">
          This role is not available
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600">
          It may have been taken down, or it may be open only to students at a particular
          college or batch. Everything currently open to you is on the board.
        </p>
        <Button asChild className="mt-5">
          <Link href="/jobs">Browse open roles</Link>
        </Button>
      </div>
    );
  }

  return (
    <JobDetail
      job={job}
      others={[]}
      testimonials={related.testimonials}
      blogs={related.blogs}
      placements={related.placements}
    />
  );
}
