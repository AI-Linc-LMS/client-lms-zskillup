'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowUpRight, BadgeCheck, Building2, ClipboardList, Code2, History, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { listCompanies, type ApiCompany } from '@/lib/api/catalog';
import { getMyRegistrations, registerForCompany } from '@/lib/api/registrations';

const compact = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(n));

/** Dashboard companies — browse + register for a company drive in one tap. */
export function DashboardCompanies() {
  const [companies, setCompanies] = useState<ApiCompany[] | null>(null);
  const [registered, setRegistered] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);

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
    } catch {
      /* ignore */
    } finally {
      setBusy(null);
    }
  };

  if (companies === null) {
    return <div className="grid h-40 place-items-center rounded-3xl border border-slate-200 bg-white shadow-sm"><Loader2 className="size-5 animate-spin text-slate-400" /></div>;
  }
  if (companies.length === 0) return null;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-slate-400">
          <Building2 className="size-4 text-orange" /> Company drives
        </h3>
        <Link href="/dashboard/company" className="flex items-center gap-1 text-xs font-bold text-orange hover:underline">
          All companies <ArrowUpRight className="size-3.5" />
        </Link>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {companies.slice(0, 4).map((c, i) => {
          const isReg = registered.has(c.slug);
          return (
            <motion.div
              key={c.slug}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 rounded-2xl border border-slate-200/80 p-3"
            >
              <Link
                href={`/dashboard/company/${c.slug}`}
                className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5"
              >
                {c.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.logoUrl} alt={c.name} className="max-h-full max-w-full object-contain" />
                ) : (
                  <span className="text-xs font-bold text-slate-500">{c.name.slice(0, 2).toUpperCase()}</span>
                )}
              </Link>
              <div className="min-w-0 flex-1">
                <Link href={`/dashboard/company/${c.slug}`} className="block truncate text-sm font-bold text-navy hover:text-orange">
                  {c.name}
                </Link>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[10px] font-semibold text-slate-400">
                  <span className="flex items-center gap-0.5"><ClipboardList className="size-3" /> {compact(c.questionCount ?? 0)}</span>
                  <span className="flex items-center gap-0.5"><History className="size-3 text-orange" /> {compact(c.pyqCount ?? 0)} PYQ</span>
                  <span className="flex items-center gap-0.5"><Code2 className="size-3 text-emerald-500" /> {compact(c.codingCount ?? 0)}</span>
                </div>
              </div>
              {isReg ? (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-700">
                  <BadgeCheck className="size-3.5" /> Registered
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => register(c.slug)}
                  disabled={busy === c.slug}
                  className="inline-flex shrink-0 items-center gap-1 rounded-full bg-gradient-to-r from-[#f7a14e] to-[#f37021] px-3.5 py-1.5 text-[11px] font-extrabold text-white shadow-[0_8px_20px_-10px_rgba(243,112,33,0.8)] disabled:opacity-50"
                >
                  {busy === c.slug ? <Loader2 className="size-3.5 animate-spin" /> : 'Register'}
                </button>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
