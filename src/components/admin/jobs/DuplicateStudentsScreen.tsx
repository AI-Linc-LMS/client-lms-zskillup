'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Info, Loader2, Phone, UserX, Users } from 'lucide-react';
import { describeError } from '@/lib/api/errors';
import { label } from '@/components/admin/analytics/rate';
import { getDuplicateStudents, type DuplicateStudentsDto } from '@/lib/api/jobs';

const SIGNAL: Record<string, { title: string; why: string; icon: typeof Phone; tone: string }> = {
  PHONE: {
    title: 'Same phone number',
    why: 'Nearly always the same person. The strongest signal here.',
    icon: Phone,
    tone: 'bg-red-50 text-red-600 ring-red-100',
  },
  NAME_ONE_WITHOUT_COLLEGE: {
    title: 'Same name, one account with no college',
    why:
      'Usually a student who took a test on a personal account while their college account is the one on the roster — so the college’s report shows them as never having attempted it. The fix is normally to attach the orphan, not to merge.',
    icon: UserX,
    tone: 'bg-amber-50 text-amber-600 ring-amber-100',
  },
  NAME_AND_COLLEGE: {
    title: 'Same name at the same college',
    why: 'Frequently two different people. Weakest of the three — check before acting.',
    icon: Users,
    tone: 'bg-sky-50 text-sky-600 ring-sky-100',
  },
};

const d = (v: string | null) =>
  v ? new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

/**
 * ACCOUNTS THAT LOOK LIKE THE SAME PERSON (PRD §18.12).
 *
 * Detection only, and the screen says so rather than burying it. §18 permits merging
 * "only through authorised data-governance process", and merging student records decides
 * whose attempts, entitlements and offers survive — which is a decision about a person,
 * not a button. The server returns that caveat in the payload; this renders it.
 *
 * GROUPED BY SIGNAL, ORDERED BY WHAT THE SIGNAL IS WORTH. A shared phone number is nearly
 * always one person; a shared name at a large college frequently is not. Presenting both
 * as "duplicates" with equal weight would invite someone to action the weak ones first,
 * because there are more of them.
 */
export function DuplicateStudentsScreen() {
  const [data, setData] = useState<DuplicateStudentsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getDuplicateStudents({ limit: 100 }));
    } catch (e) {
      setError(describeError(e, 'Could not load duplicate accounts.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <p className="flex items-center gap-2 py-10 text-sm text-slate-500">
        <Loader2 className="size-5 animate-spin text-slate-300" aria-hidden /> Looking for
        duplicate accounts…
      </p>
    );
  }
  if (error) {
    return (
      <p role="alert" className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200">
        {error}
      </p>
    );
  }
  if (!data) return null;

  const groups = data.groups;

  return (
    <section className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { k: 'Same phone', v: data.counts.byPhone, hint: 'Strongest signal' },
          { k: 'Orphan account', v: data.counts.nameWithOrphanAccount, hint: 'One has no college' },
          { k: 'Same name + college', v: data.counts.byNameAndCollege, hint: 'Often different people' },
        ].map((c) => (
          <div key={c.k} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className={label}>{c.k}</p>
            <p className="mt-1 text-[26px] font-extrabold leading-none text-navy tabular-nums">
              {c.v.toLocaleString('en-IN')}
            </p>
            <p className="mt-1 text-xs text-slate-500">{c.hint}</p>
          </div>
        ))}
      </div>

      {/* The server states its own limits in the payload. Rendered rather than paraphrased,
          because an endpoint that returns duplicates without saying it cannot fix them is
          exactly what invites somebody to build the merge button. */}
      <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-4 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>
          <span className="font-semibold">Detection only.</span> {data.note}
        </span>
      </p>

      {groups.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
          No suspected duplicates found.
        </p>
      ) : (
        <div className="space-y-4">
          {groups.map((g, i) => {
            const meta = SIGNAL[g.signal] ?? {
              title: g.signal,
              why: '',
              icon: Users,
              tone: 'bg-slate-50 text-slate-600 ring-slate-100',
            };
            const Icon = meta.icon;
            return (
              <div
                key={`${g.signal}-${g.matchedOn}-${i}`}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="flex items-start gap-3 border-b border-slate-200 px-5 py-4">
                  <span className={`grid size-9 shrink-0 place-items-center rounded-xl ring-1 ${meta.tone}`} aria-hidden>
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className={label}>{meta.title}</p>
                    <p className="mt-0.5 truncate text-sm font-bold text-navy">{g.matchedOn}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{meta.why}</p>
                  </div>
                  <span className="ml-auto shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 tabular-nums">
                    {g.accounts} accounts
                  </span>
                </div>
                <ul className="divide-y divide-slate-100">
                  {g.members.map((m) => (
                    <li key={m.userId} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                      <div className="min-w-0">
                        <Link
                          href={`/admin/placement-report/students/${m.userId}`}
                          className="truncate text-sm font-semibold text-navy underline-offset-2 hover:underline"
                        >
                          {m.name ?? m.email}
                        </Link>
                        <p className="truncate text-xs text-slate-400">{m.email}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3 text-xs text-slate-500">
                        {m.collegeId ? null : (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-200">
                            no college
                          </span>
                        )}
                        <span>joined {d(m.createdAt)}</span>
                        <span>
                          last seen{' '}
                          {m.lastLoginAt ? (
                            d(m.lastLoginAt)
                          ) : (
                            <span className="text-slate-400">never</span>
                          )}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      <p className="rounded-xl border border-slate-200 bg-white p-5 text-xs leading-relaxed text-slate-500 shadow-sm">
        <span className="font-semibold text-slate-600">Duplicate applications are a separate
        matter, and cannot happen.</span>{' '}
        {data.duplicateApplications}
      </p>
    </section>
  );
}
