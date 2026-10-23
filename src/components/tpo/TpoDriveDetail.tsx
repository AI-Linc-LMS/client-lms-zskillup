'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { describeError } from '@/lib/api/errors';
import { getTpoDrive, type TpoDrivePipeline } from '@/lib/api/tpo';
import { APPLICATION_SOURCE_LABELS } from '@/shared/drive-roster-import';

const eyebrow = 'text-[10px] font-semibold uppercase tracking-widest text-slate-400';
const card = 'rounded-xl border border-slate-200 bg-white p-5 shadow-sm';

/**
 * ONE DRIVE, THIS COLLEGE'S STUDENTS ONLY (additional requirement 1).
 *
 * A drive can be open to several colleges. The server returns only this college's
 * applicants and the pipeline counted over them, so a TPO sees how their own students
 * are doing without learning anything about a rival cohort.
 *
 * A drive not open to this college 404s rather than rendering an empty shell — an empty
 * page reads as "nobody applied", which is a different and misleading fact.
 */
export function TpoDriveDetail({ driveId }: { driveId: string }) {
  const [data, setData] = useState<TpoDrivePipeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setData(await getTpoDrive(driveId));
      } catch (e) {
        setErr(describeError(e, 'Could not open that drive.'));
      } finally {
        setLoading(false);
      }
    })();
  }, [driveId]);

  if (loading) {
    return (
      <p className="p-8 text-center text-sm text-slate-500">
        <Loader2 className="mr-2 inline size-4 animate-spin" aria-hidden />Loading…
      </p>
    );
  }
  if (err || !data) {
    return (
      <div className="space-y-4">
        <div role="alert" className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200">
          {err ?? 'That drive is not available.'}
        </div>
        <Link href="/tpo/placement" className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy underline-offset-4 hover:underline">
          <ArrowLeft className="size-4" aria-hidden /> Back to placement
        </Link>
      </div>
    );
  }

  const total = data.students.length;

  return (
    <div className="space-y-5">
      <Link href="/tpo/placement" className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy underline-offset-4 hover:underline">
        <ArrowLeft className="size-4" aria-hidden /> All drives
      </Link>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className={eyebrow}>{data.drive.companyName ?? 'Drive'}</p>
        <h1 className="mt-1 text-[28px] font-extrabold tracking-tight text-navy">
          {data.drive.title}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-600">
          <span className="rounded-full bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
            {data.drive.status}
          </span>
          {data.drive.location ? <span>· {data.drive.location}</span> : null}
          {data.drive.applyBy ? (
            <span>· Applications close {new Date(data.drive.applyBy).toLocaleDateString()}</span>
          ) : null}
        </div>
      </div>

      <section className="space-y-3">
        <p className={eyebrow}>Where your {total} student{total === 1 ? ' is' : 's are'}</p>
        {data.pipeline.length === 0 ? (
          <div className={card}>
            <p className="text-sm text-slate-500">
              None of your students have applied to this drive yet.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {data.pipeline.map((p) => (
              <div key={p.stage} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-[22px] font-extrabold leading-none text-navy tabular-nums">
                  {p.count}
                </p>
                <p className="mt-1 text-xs text-slate-500">{p.stageLabel}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {total > 0 ? (
        <section className="space-y-3">
          <p className={eyebrow}>Your students in this drive</p>
          <div className={`${card} overflow-x-auto p-0`}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  {['Student', 'Branch', 'Batch', 'Stage', 'Route', 'Applied'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.students.map((s) => (
                  <tr key={s.userId} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3">
                      <Link
                        href={`/tpo/placement/students/${s.userId}`}
                        className="font-semibold text-navy underline-offset-4 hover:underline"
                      >
                        {s.fullName ?? s.email}
                      </Link>
                      <span className="block text-xs text-slate-400">{s.email}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{s.branch ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{s.cohortName ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-[11px] font-semibold text-sky-700 ring-1 ring-sky-200">
                        {s.stageLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {APPLICATION_SOURCE_LABELS[s.source as keyof typeof APPLICATION_SOURCE_LABELS] ?? s.source}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(s.appliedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
