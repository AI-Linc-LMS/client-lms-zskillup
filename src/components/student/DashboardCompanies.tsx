'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowUpRight, BadgeCheck, Building2, ClipboardList, Code2, History, Loader2, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { listCompanies, type ApiCompany } from '@/lib/api/catalog';
import { getMyRegistrations, registerForCompany } from '@/lib/api/registrations';

/** Dashboard companies — browse + register for a company assessment in one tap. */
export function DashboardCompanies() {
  const [companies, setCompanies] = useState<ApiCompany[] | null>(null);
  const [registered, setRegistered] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ApiCompany | null>(null);

  useEffect(() => {
    listCompanies().then(setCompanies).catch(() => setCompanies([]));
    getMyRegistrations()
      .then((rows) => setRegistered(new Set(rows.filter((r) => r.status !== 'CANCELLED').map((r) => r.companySlug))))
      .catch(() => {});
  }, []);

  const register = async (slug: string) => {
    setBusy(slug);
    try {
      await registerForCompany(slug);
      setRegistered((p) => new Set(p).add(slug));
      setConfirm(null);
    } catch {
      /* ignore */
    } finally {
      setBusy(null);
    }
  };

  if (companies === null) {
    return <div className="grid h-40 place-items-center rounded-3xl border border-slate-200 bg-white"><Loader2 className="size-5 animate-spin text-slate-400" /></div>;
  }
  if (companies.length === 0) return null;

  return (
    <div data-tour="dash:companies" className="rounded-3xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 aria-label="Company Assessments" className="flex items-center gap-2 text-2xl font-black tracking-tight text-navy">
            <Building2 className="size-5 text-[#f5b400]" /> Company Assessments
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-slate-500">
            Company-specific practice &amp; mock assessments crafted by Prephasz - train on each company&apos;s pattern before the real thing.
          </p>
        </div>
        <Link href="/dashboard/company" className="mt-1 flex shrink-0 items-center gap-1 text-xs font-bold text-[#f5b400] hover:underline">
          All companies <ArrowUpRight className="size-3.5" />
        </Link>
      </div>

      <div className="mt-4 grid gap-3.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {companies.slice(0, 6).map((c, i) => {
          const isReg = registered.has(c.slug);
          return (
            <motion.div
              key={c.slug}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-3.5 transition-all hover:-translate-y-0.5 hover:border-orange/40"
            >
              <span aria-hidden className="pointer-events-none absolute -right-10 -top-10 size-28 rounded-full bg-orange/[0.06] blur-2xl transition-opacity group-hover:bg-orange/[0.12]" />
              <div className="relative flex items-start gap-3">
                <Link
                  href={`/dashboard/company/${c.slug}`}
                  className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5"
                >
                  {c.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.logoUrl} alt={c.name} className="max-h-full max-w-full object-contain" />
                  ) : (
                    <span className="text-sm font-black text-slate-500">{c.name.slice(0, 2).toUpperCase()}</span>
                  )}
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/dashboard/company/${c.slug}`} className="block truncate text-base font-black tracking-tight text-navy transition-colors group-hover:text-[#f5b400]">
                    {c.name}
                  </Link>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {c.rating ? (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-extrabold text-amber-700 ring-1 ring-inset ring-amber-200">
                        <Star className="size-2.5 fill-amber-400 text-amber-500" /> {c.rating.toFixed(1)}
                      </span>
                    ) : null}
                    {c.difficulty ? (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">{c.difficulty}</span>
                    ) : null}
                    {c.package ? (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200">{c.package}</span>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* what's inside - content types available (no counts) */}
              {(() => {
                const feats: Array<{ icon: typeof ClipboardList; label: string; tone: string }> = [];
                if ((c.questionCount ?? 0) > 0) feats.push({ icon: ClipboardList, label: 'Practice', tone: 'text-slate-400' });
                if ((c.pyqCount ?? 0) > 0) feats.push({ icon: History, label: 'Previous-year', tone: 'text-[#f5b400]' });
                if ((c.codingCount ?? 0) > 0) feats.push({ icon: Code2, label: 'Coding', tone: 'text-emerald-500' });
                return feats.length ? (
                  <div className="relative mt-3 flex flex-wrap gap-1.5">
                    {feats.map((f) => (
                      <span
                        key={f.label}
                        className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-inset ring-slate-200/70"
                      >
                        <f.icon className={cn('size-3', f.tone)} aria-hidden="true" /> {f.label}
                      </span>
                    ))}
                  </div>
                ) : null;
              })()}

              {/* CTA */}
              <div className="relative mt-3">
                {isReg ? (
                  <span className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-50 py-2 text-sm font-extrabold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                    <BadgeCheck className="size-4" /> Registered
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirm(c)}
                    disabled={busy === c.slug}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#ffd24d] via-[#ffc42d] to-[#f5b400] py-2 text-sm font-extrabold text-[#171717] shadow-[0_10px_24px_-12px_rgba(245,180,0,0.5)] transition-transform hover:brightness-105 active:scale-[0.99] disabled:opacity-50"
                  >
                    {busy === c.slug ? <Loader2 className="size-4 animate-spin" /> : 'Register'}
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Register confirmation */}
      {confirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" aria-label="Close" onClick={() => setConfirm(null)} className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-2xl">
            <span className="mx-auto grid size-14 place-items-center overflow-hidden rounded-2xl border border-slate-200 bg-white p-2">
              {confirm.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={confirm.logoUrl} alt={confirm.name} className="max-h-full max-w-full object-contain" />
              ) : (
                <span className="text-sm font-black text-slate-500">{confirm.name.slice(0, 2).toUpperCase()}</span>
              )}
            </span>
            <h3 className="mt-3 text-lg font-black text-navy">Register for {confirm.name}?</h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">
              You&apos;ll get {confirm.name}&apos;s scheduled assessments on your calendar and reminders before each one.
            </p>
            <div className="mt-5 flex gap-2">
              <button type="button" onClick={() => setConfirm(null)} className="flex-1 rounded-full border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => register(confirm.slug)}
                disabled={busy === confirm.slug}
                className="flex-[1.4] inline-flex items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-[#ffd24d] via-[#ffc42d] to-[#f5b400] px-4 py-2.5 text-sm font-extrabold text-[#171717] disabled:opacity-60"
              >
                {busy === confirm.slug ? <Loader2 className="size-4 animate-spin" /> : <><BadgeCheck className="size-4" /> Confirm</>}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
