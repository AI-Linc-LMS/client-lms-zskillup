'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Clock, FileText, Loader2, Star, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { listMocks, type ApiMockSummary } from '@/lib/api/mocks';

/**
 * Live mock-test catalog (Sprint 4). Reads the active mocks from the backend and
 * routes each "Start" into the real timed runner at `/dashboard/quiz?mock=<id>`.
 * Client component because the API client attaches the in-memory access token.
 */
export function MockTestsCatalog() {
  const [mocks, setMocks] = useState<ApiMockSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    listMocks()
      .then((rows) => {
        if (!cancelled) setMocks(rows);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message || 'Could not load mock tests.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white p-12">
        <Loader2 className="size-5 animate-spin text-slate-400" aria-hidden="true" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>
    );
  }

  if (!mocks || mocks.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
        <span className="mx-auto grid size-11 place-items-center rounded-xl bg-orange/10 text-orange ring-1 ring-orange/20">
          <FileText className="size-5" aria-hidden="true" />
        </span>
        <p className="mt-3 text-sm font-semibold text-navy">No mock tests are live yet.</p>
        <p className="mt-1 text-xs text-slate-500">Check back soon — new timed drives are added regularly.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {mocks.map((mock) => (
        <div key={mock.id} className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-orange/10 text-orange ring-1 ring-orange/20">
              <Timer className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="font-bold text-navy">{mock.title}</p>
              <p className="text-xs text-slate-400">Timed mock assessment</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5">
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <FileText className="size-3.5 text-slate-400" aria-hidden="true" />
              {mock.totalQuestions} questions
            </span>
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <Clock className="size-3.5 text-slate-400" aria-hidden="true" />
              {mock.durationMinutes} min
            </span>
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <Star className="size-3.5 text-slate-400" aria-hidden="true" />
              Pass {mock.passingScore}%
            </span>
          </div>

          <div className="mt-5 flex items-center justify-end border-t border-slate-100 pt-4">
            <Button asChild size="sm">
              <Link href={`/dashboard/quiz?mock=${mock.id}`} aria-label={`Start ${mock.title}`}>
                <Timer className="size-4" aria-hidden="true" />
                Start test
              </Link>
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
