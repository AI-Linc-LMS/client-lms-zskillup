'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Activity, ArrowLeft, Building2, GraduationCap, Loader2, Mail } from 'lucide-react';
import { getTpoStudentDetail } from '@/lib/api/tpo';
import type { TpoStudentDetail } from '@/shared';
import { ProvenanceChip, ReadinessBadge } from '@/components/tpo/ui';

export default function StudentProfilePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [detail, setDetail] = useState<TpoStudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    getTpoStudentDetail(id)
      .then(setDetail)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load student'))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="space-y-5">
      <Link
        href="/tpo/students"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-navy"
      >
        <ArrowLeft className="size-4" /> Back to directory
      </Link>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="size-7 animate-spin text-slate-500" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</div>
      ) : detail ? (
        <>
          {/* Hero */}
          <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-6 shadow-sm">
            <span aria-hidden className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-orange/[0.06] blur-3xl" />
            <div className="relative flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-2xl font-black tracking-tight text-navy">{detail.name ?? 'Student'}</h1>
                <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-500">
                  <Mail className="size-3.5" /> {detail.email}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                  <ReadinessBadge band={detail.band} />
                  {detail.rollNumber && <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium">Roll {detail.rollNumber}</span>}
                  {detail.branch && (
                    <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 font-medium">
                      <GraduationCap className="size-3" /> {detail.branch}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Activity className="size-3" /> {detail.participation} participation
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-4xl font-black tabular-nums leading-none text-navy">{detail.readiness}%</p>
                <p className="mt-1 text-xs font-semibold text-slate-600">{detail.level} readiness</p>
                <p className="mt-1 text-[11px] text-slate-500">
                  Last active {detail.lastActiveDate ? new Date(detail.lastActiveDate).toLocaleDateString('en-IN') : 'never'}
                </p>
              </div>
            </div>
          </section>

          <div className="grid gap-5 lg:grid-cols-2">
            {/* Composite */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-bold text-navy">Readiness composite</h2>
              <div className="mt-4 space-y-3">
                {detail.components.map((c) => (
                  <div key={c.label} className="flex items-center gap-3">
                    <span className="w-24 shrink-0 text-sm text-navy">{c.label}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full rounded-full ${c.active ? 'bg-navy' : 'bg-slate-300'}`} style={{ width: `${c.score}%` }} />
                    </div>
                    <span className="w-14 text-right text-xs font-semibold tabular-nums text-slate-600">
                      {c.active ? `${c.score}%` : 'no data'}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-4"><ProvenanceChip source="Practice + Mock + Coding + coverage" /></div>
            </section>

            {/* Weak topics */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-bold text-navy">Weakest topics</h2>
              {detail.topics.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">Not enough practice data yet.</p>
              ) : (
                <div className="mt-4 space-y-2.5">
                  {[...detail.topics].sort((a, b) => a.accuracy - b.accuracy).slice(0, 8).map((t) => (
                    <div key={t.slug} className="flex items-center gap-3">
                      <span className="w-32 shrink-0 truncate text-sm text-navy">{t.topic}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-red-500" style={{ width: `${t.accuracy}%` }} />
                      </div>
                      <span className="w-10 text-right text-xs font-semibold tabular-nums text-slate-600">{t.accuracy}%</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Company readiness */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-1.5 text-sm font-bold text-navy">
              <Building2 className="size-4 text-slate-500" /> Company readiness
            </h2>
            {detail.companies.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">No company-tagged practice yet.</p>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {detail.companies.map((c) => (
                  <div key={c.slug} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-navy">{c.name}</span>
                      <span className="shrink-0 text-sm font-bold tabular-nums text-navy">{c.readiness}%</span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {c.questionsAttempted} Qs · {c.questionAccuracy}% acc
                      {c.codingTotal > 0 ? ` · ${c.codingSolved}/${c.codingTotal} coding` : ''}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
