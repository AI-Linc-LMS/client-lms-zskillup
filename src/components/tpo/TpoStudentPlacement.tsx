'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { describeError } from '@/lib/api/errors';
import { getTpoStudentPlacement, type TpoStudentPlacement as Data } from '@/lib/api/tpo';
import { StatusPill } from '@/components/student/StatusPill';
import { offerStatusPill, stageTone } from '@/lib/ui-maps';
import { APPLICATION_SOURCE_LABELS } from '@/shared/drive-roster-import';

const eyebrow = 'text-[10px] font-semibold uppercase tracking-widest text-slate-400';
const card = 'rounded-xl border border-slate-200 bg-white p-5 shadow-sm';

function Fact({ k, v }: { k: string; v: string | number | null }) {
  return (
    <div>
      <p className={eyebrow}>{k}</p>
      <p className="mt-1 text-sm font-semibold text-navy">{v ?? '—'}</p>
    </div>
  );
}

/**
 * ONE STUDENT'S PLACEMENT RECORD, for a TPO (additional requirement 1).
 *
 * Applications, hiring stages, previous applications, offers and placement status, which
 * the TPO console showed none of — it carried assessment and readiness data only.
 *
 * THREE MILESTONES, NOT A STATUS WORD. Offer received, accepted and joined are tracked
 * separately (§7), so "placed" cannot be quoted without saying which one is meant.
 */
export function TpoStudentPlacement({ userId }: { userId: string }) {
  const [d, setD] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setD(await getTpoStudentPlacement(userId));
      } catch (e) {
        setErr(describeError(e, 'Could not load that student.'));
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  if (loading) {
    return (
      <p className="p-8 text-center text-sm text-slate-500">
        <Loader2 className="mr-2 inline size-4 animate-spin" aria-hidden />Loading…
      </p>
    );
  }
  if (err || !d) {
    return (
      <div role="alert" className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200">
        {err ?? 'Not available.'}
      </div>
    );
  }

  const s = d.student;
  const milestone = d.placement.joined
    ? 'Joined'
    : d.placement.accepted
      ? 'Offer accepted'
      : d.placement.offered
        ? 'Offer received'
        : 'In process';

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className={eyebrow}>Student</p>
        <h2 className="mt-1 text-[26px] font-extrabold tracking-tight text-navy">
          {s.fullName ?? s.email}
        </h2>
        <p className="mt-1 text-sm text-slate-500">{s.email}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <Fact k="Branch" v={s.branch} />
          <Fact k="Course" v={s.course} />
          <Fact k="Batch" v={s.cohortName} />
          <Fact k="Passout" v={s.passoutYear} />
          <Fact k="Status" v={milestone} />
        </div>
      </div>

      <section className="space-y-3">
        <p className={eyebrow}>Academic record</p>
        <div className={card}>
          <div className="grid gap-4 sm:grid-cols-4">
            <Fact k="10th" v={s.score10th ? `${s.score10th}%` : null} />
            <Fact k="12th" v={s.score12th ? `${s.score12th}%` : null} />
            <Fact k="Graduation" v={s.scoreGraduation ? `${s.scoreGraduation}%` : null} />
            <Fact k="Active backlogs" v={s.activeBacklogs} />
          </div>
          {/* A dash is "we were never told", not "zero". §6 rests on that distinction. */}
          <p className="mt-3 text-xs text-slate-500">
            A dash means no mark is on file, which is not the same as a low one. Marks are
            uploaded from Academic marks.
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <p className={eyebrow}>Assessment performance</p>
        <div className={card}>
          <div className="grid gap-4 sm:grid-cols-3">
            <Fact k="Attempts" v={d.performance.attempts} />
            <Fact k="Average score" v={d.performance.avgScore ? `${d.performance.avgScore}%` : null} />
            <Fact k="Best score" v={d.performance.bestScore ? `${d.performance.bestScore}%` : null} />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <p className={eyebrow}>
          Applications ({d.applications.length}) — current and previous
        </p>
        <div className={`${card} overflow-x-auto p-0`}>
          {d.applications.length === 0 ? (
            <p className="p-6 text-center text-sm text-slate-500">
              This student has not applied to any drive yet.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  {['Drive', 'Company', 'Stage', 'Route', 'Applied', 'Last activity'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {d.applications.map((a) => (
                  <tr key={a.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3">
                      <Link
                        href={`/tpo/placement/drives/${a.driveId}`}
                        className="font-semibold text-navy underline-offset-4 hover:underline"
                      >
                        {a.driveTitle}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{a.companyName ?? '—'}</td>
                    <td className="px-4 py-3">
                      <StatusPill tone={stageTone(a.stage)} label={a.stageLabel} />
                      {a.reason ? (
                        <span className="mt-1 block text-xs text-slate-500">{a.reason}</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {APPLICATION_SOURCE_LABELS[a.source as keyof typeof APPLICATION_SOURCE_LABELS] ?? a.source}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(a.appliedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(a.updatedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <p className={eyebrow}>Offers ({d.offers.length})</p>
        <div className={`${card} p-0`}>
          {d.offers.length === 0 ? (
            <p className="p-6 text-center text-sm text-slate-500">No offers on record.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {d.offers.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <span className="min-w-0">
                    <span className="font-semibold text-navy">{o.companyName}</span>
                    {o.role ? <span className="text-slate-600"> · {o.role}</span> : null}
                    {o.ctcLpa ? (
                      <span className="block text-xs text-slate-500">₹{o.ctcLpa} LPA</span>
                    ) : null}
                  </span>
                  <span className="flex items-center gap-3">
                    <StatusPill {...offerStatusPill(o.status)} />
                    <span className="text-xs text-slate-400">
                      {o.offerDate ? new Date(o.offerDate).toLocaleDateString() : ''}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          {/* A declined or lapsed offer stays on the record: a student who turned down
              two offers is a different case from one who never received any. */}
          <p className="px-4 pb-3 text-xs text-slate-500">
            Declined and lapsed offers stay listed. They are part of the record.
          </p>
        </div>
      </section>
    </div>
  );
}
