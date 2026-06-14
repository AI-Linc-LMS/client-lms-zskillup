'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ui/progress-bar';
import { getTopicAccuracy, type ApiTopicAccuracy } from '@/lib/api/practice';

/**
 * Live per-topic accuracy panels (Sprint 3 exit — "reports show accuracy").
 * "Weak topics" = accuracy under 60% with at least 3 attempts; "Continue
 * where you left off" = the most recently practised topics. Both read
 * `GET /practice/accuracy/topics`; with no attempts yet the panels render
 * an honest empty state instead of invented numbers.
 */
export function TopicAccuracyPanels() {
  const [rows, setRows] = useState<ApiTopicAccuracy[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getTopicAccuracy()
      .then((data) => !cancelled && setRows(data))
      .catch(() => !cancelled && setRows([]));
    return () => {
      cancelled = true;
    };
  }, []);

  if (rows === null) {
    return <div className="h-40 animate-pulse rounded-xl border border-slate-200 bg-white shadow-sm" />;
  }

  const weak = rows.filter((r) => r.total >= 3 && r.accuracyPct < 60).slice(0, 3);
  const recent = rows.slice(0, 3);

  return (
    <>
      {/* Weak topics */}
      <div>
        <p className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Your Weak Topics
        </p>
        {weak.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-navy">
              {rows.length === 0 ? 'No practice data yet.' : 'No weak topics detected.'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {rows.length === 0
                ? 'Attempt a few questions and your weakest topics will surface here automatically.'
                : 'Topics drop in here when accuracy falls under 60% across 3+ attempts.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {weak.map((topic) => (
              <div key={topic.topicSlug} className="rounded-xl border border-amber-200 bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <p className="font-semibold text-navy">{topic.topicName}</p>
                  <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200">
                    Weak
                  </span>
                </div>
                <div className="mb-1 flex items-center gap-2">
                  <ProgressBar
                    value={topic.accuracyPct}
                    className="h-1.5 flex-1"
                    barClassName="bg-amber-400"
                    label={`${topic.topicName} accuracy`}
                  />
                  <span className="text-xs font-semibold text-amber-700">{topic.accuracyPct}%</span>
                </div>
                <p className="mb-4 text-xs text-slate-400">
                  {topic.correct}/{topic.total} correct so far
                </p>
                <Button asChild size="sm">
                  <Link href={`/practice?topic=${encodeURIComponent(topic.topicSlug)}`}>Drill now</Link>
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recently practised */}
      {recent.length > 0 ? (
        <div>
          <p className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Continue Where You Left Off
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((topic) => (
              <div key={topic.topicSlug} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <p className="font-semibold text-navy">{topic.topicName}</p>
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <Calendar className="size-3" aria-hidden="true" />
                    <span>{formatRelative(topic.lastAttemptAt)}</span>
                  </div>
                </div>
                <div className="mb-1 flex items-center gap-2">
                  <ProgressBar
                    value={topic.accuracyPct}
                    className="h-1.5 flex-1"
                    label={`${topic.topicName} accuracy`}
                  />
                  <span className="text-xs font-semibold text-navy">{topic.accuracyPct}%</span>
                </div>
                <p className="mb-4 text-xs text-slate-400">
                  {topic.correct}/{topic.total} correct
                </p>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/practice?topic=${encodeURIComponent(topic.topicSlug)}`}>Continue</Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}

function formatRelative(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
}
