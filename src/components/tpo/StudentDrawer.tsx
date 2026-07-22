'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Activity, Building2, Loader2, Mail, X } from 'lucide-react';
import { getTpoStudentDetail } from '@/lib/api/tpo';
import type { TpoStudentDetail } from '@/shared';
import { ProvenanceChip, ReadinessBadge } from './ui';

/**
 * Student drill-down drawer - slides in from the right when a student is selected
 * (a scatter dot or a roster row). Shows the readiness composite, per-company
 * performance and weakest topics from GET /tpo/students/:id.
 */
export function StudentDrawer({ studentId, onClose }: { studentId: string | null; onClose: () => void }) {
  const [detail, setDetail] = useState<TpoStudentDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!studentId) return;
    setDetail(null);
    setError(null);
    setLoading(true);
    let cancelled = false;
    getTpoStudentDetail(studentId)
      .then((d) => !cancelled && setDetail(d))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'Failed to load student'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  return (
    <AnimatePresence>
      {studentId && (
        <motion.div
          className="fixed inset-0 z-50 flex justify-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="absolute inset-0 bg-navy/30 backdrop-blur-[2px]"
          />
          <motion.aside
            className="relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-slate-200 bg-white shadow-2xl"
            initial={{ x: 40, opacity: 0.6 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 40 }}
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-100 bg-white/90 p-5 backdrop-blur">
              <div className="min-w-0">
                <h2 className="truncate text-lg font-black tracking-tight text-navy">
                  {detail?.name ?? (loading ? 'Loading…' : 'Student')}
                </h2>
                {detail && (
                  <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-slate-500">
                    <Mail className="size-3" /> {detail.email}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="grid size-8 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                <X className="size-4" />
              </button>
            </div>

            {loading ? (
              <div className="flex flex-1 items-center justify-center py-24">
                <Loader2 className="size-6 animate-spin text-slate-500" />
              </div>
            ) : error ? (
              <div className="m-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
            ) : detail ? (
              <div className="space-y-6 p-5">
                {/* Identity + readiness hero */}
                <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                    <ReadinessBadge band={detail.band} />
                    {detail.branch && <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium">{detail.branch}</span>}
                    <span className="flex items-center gap-1">
                      <Activity className="size-3" /> {detail.participation} participation
                    </span>
                  </div>
                  <div className="mt-3 flex items-end gap-3">
                    <span className="text-4xl font-black tabular-nums leading-none text-navy">{detail.readiness}%</span>
                    <span className="mb-1 text-sm font-semibold text-slate-600">{detail.level} readiness</span>
                  </div>
                  <p className="mt-2 text-[11px] text-slate-500">
                    Last active {detail.lastActiveDate ? new Date(detail.lastActiveDate).toLocaleDateString('en-IN') : 'never'}
                  </p>
                </div>

                {/* Composite components */}
                <section>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Readiness composite</p>
                  <div className="space-y-2.5">
                    {detail.components.map((c) => (
                      <div key={c.label} className="flex items-center gap-3">
                        <span className="w-20 shrink-0 text-sm text-navy">{c.label}</span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full ${c.active ? 'bg-navy' : 'bg-slate-300'}`}
                            style={{ width: `${c.score}%` }}
                          />
                        </div>
                        <span className="w-14 text-right text-xs font-semibold tabular-nums text-slate-600">
                          {c.active ? `${c.score}%` : 'no data'}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Per-company */}
                <section>
                  <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                    <Building2 className="size-3" /> Company readiness
                  </p>
                  {detail.companies.length === 0 ? (
                    <p className="text-sm text-slate-500">No company-tagged practice yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {detail.companies.slice(0, 8).map((c) => (
                        <div key={c.slug} className="rounded-xl border border-slate-100 bg-slate-50/60 p-2.5">
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

                {/* Weak topics */}
                <section>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Weakest topics</p>
                  {detail.topics.length === 0 ? (
                    <p className="text-sm text-slate-500">Not enough practice data yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {[...detail.topics]
                        .sort((a, b) => a.accuracy - b.accuracy)
                        .slice(0, 6)
                        .map((t) => (
                          <div key={t.slug} className="flex items-center gap-3">
                            <span className="w-28 shrink-0 truncate text-sm text-navy">{t.topic}</span>
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                              <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-red-500" style={{ width: `${t.accuracy}%` }} />
                            </div>
                            <span className="w-10 text-right text-xs font-semibold tabular-nums text-slate-600">{t.accuracy}%</span>
                          </div>
                        ))}
                    </div>
                  )}
                </section>

                <ProvenanceChip source="Practice + Mock + Coding + topic coverage" />
              </div>
            ) : null}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
