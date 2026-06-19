'use client';

import { useEffect, useMemo, useState } from 'react';
import { BadgeCheck, ExternalLink, Loader2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ApiRequestError } from '@/lib/api/types';
import { listCompanies } from '@/lib/api/catalog';
import {
  listAdminCodingProblems,
  setCodingProblemActive,
  type AdminCodingProblemSummary,
} from '@/lib/api/coding';

const SOURCE_LABEL: Record<string, string> = {
  PREVIOUS_YEAR_QUESTIONS: 'PYQ',
  MEMORY_BASED: 'Memory-based',
  PATTERN_BASED: 'Pattern-based',
  MOCK_DERIVED: 'Mock-derived',
};
const SOURCE_TONE: Record<string, string> = {
  PREVIOUS_YEAR_QUESTIONS: 'bg-violet-50 text-violet-700 ring-violet-200',
  MEMORY_BASED: 'bg-sky-50 text-sky-700 ring-sky-200',
  PATTERN_BASED: 'bg-slate-50 text-slate-600 ring-slate-200',
  MOCK_DERIVED: 'bg-amber-50 text-amber-700 ring-amber-200',
};
const DIFF_TONE: Record<string, string> = {
  EASY: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  MEDIUM: 'bg-amber-50 text-amber-700 ring-amber-200',
  HARD: 'bg-rose-50 text-rose-700 ring-rose-200',
};

/**
 * Superadmin coding-bank console. Lists every coding problem with its company
 * tag, provenance (source + year), Judge0 verification status, and — what this
 * view is really for — its SOURCE CITATION (clickable link to where a PYQ came
 * from). The list is small (~hundreds) so filtering is client-side.
 */
export function CodingAdmin() {
  const [rows, setRows] = useState<AdminCodingProblemSummary[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [company, setCompany] = useState('');
  const [source, setSource] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () =>
    listAdminCodingProblems()
      .then(setRows)
      .catch((e) => setErr(e instanceof ApiRequestError ? e.message : 'Could not load coding problems.'));

  useEffect(() => {
    void load();
    listCompanies()
      .then((cs) => setCompanyName(Object.fromEntries(cs.map((c) => [c.slug, c.name]))))
      .catch(() => {});
  }, []);

  const companies = useMemo(() => {
    const s = new Set<string>();
    (rows ?? []).forEach((r) => (r.companies ?? []).forEach((c) => s.add(c)));
    return [...s].sort();
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (rows ?? []).filter(
      (r) =>
        (!q || r.title.toLowerCase().includes(q) || r.slug.toLowerCase().includes(q)) &&
        (!company || (r.companies ?? []).includes(company)) &&
        (!source || r.source === source),
    );
  }, [rows, search, company, source]);

  const stats = useMemo(() => {
    const s = rows ?? [];
    return {
      total: s.length,
      verified: s.filter((r) => r.verified).length,
      pyq: s.filter((r) => r.source === 'PREVIOUS_YEAR_QUESTIONS').length,
      active: s.filter((r) => r.isActive).length,
    };
  }, [rows]);

  const toggleActive = async (r: AdminCodingProblemSummary) => {
    setBusyId(r.id);
    try {
      await setCodingProblemActive(r.id, !r.isActive);
      await load();
    } catch (e) {
      window.alert(e instanceof ApiRequestError ? e.message : 'Could not update.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Total" value={stats.total} accent="text-navy" />
        <Metric label="Verified" value={stats.verified} accent="text-emerald-700" />
        <Metric label="PYQ" value={stats.pyq} accent="text-violet-700" />
        <Metric label="Active" value={stats.active} accent="text-sky-700" />
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search problem title / slug"
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-navy placeholder:text-slate-400 focus:border-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/30"
          />
        </div>
        <select
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-navy"
        >
          <option value="">All companies</option>
          {companies.map((c) => (
            <option key={c} value={c}>
              {companyName[c] ?? c}
            </option>
          ))}
        </select>
        <select
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-navy"
        >
          <option value="">All sources</option>
          {Object.entries(SOURCE_LABEL).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </div>

      {err ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">{err}</div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/90">
              <tr className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                <th className="px-4 py-4">Problem</th>
                <th className="px-4 py-4">Difficulty</th>
                <th className="px-4 py-4">Company</th>
                <th className="px-4 py-4">Source</th>
                <th className="px-4 py-4">Citation</th>
                <th className="px-4 py-4">Verified</th>
                <th className="px-4 py-4 text-right">Active</th>
              </tr>
            </thead>
            <tbody>
              {rows === null ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <Loader2 className="mx-auto size-5 animate-spin text-slate-400" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500">
                    No coding problems match this view.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100/80 align-top hover:bg-slate-50/60">
                    <td className="max-w-xs px-4 py-3.5">
                      <span className="block font-semibold text-navy">{r.title}</span>
                      <span className="text-[11px] text-slate-400">{r.slug}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <Pill tone={DIFF_TONE[r.difficulty]}>{cap(r.difficulty)}</Pill>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">
                      {(r.companies ?? []).map((c) => companyName[c] ?? c).join(', ') || '—'}
                    </td>
                    <td className="px-4 py-3.5">
                      {r.source ? (
                        <Pill tone={SOURCE_TONE[r.source] ?? SOURCE_TONE.PATTERN_BASED}>
                          {SOURCE_LABEL[r.source] ?? r.source}
                          {r.yearTags && r.yearTags.length ? ` · ${r.yearTags.join(', ')}` : ''}
                        </Pill>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="max-w-[16rem] px-4 py-3.5">
                      {r.sourceRef ? (
                        /^https?:\/\//.test(r.sourceRef) ? (
                          <a
                            href={r.sourceRef}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 break-all text-[12px] font-medium text-sky-700 hover:underline"
                          >
                            {hostOf(r.sourceRef)} <ExternalLink className="size-3 shrink-0" />
                          </a>
                        ) : (
                          <span className="break-words text-[12px] text-slate-600">{r.sourceRef}</span>
                        )
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {r.verified ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                          <BadgeCheck className="size-4" /> Verified
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">Unverified</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        type="button"
                        disabled={busyId === r.id}
                        onClick={() => toggleActive(r)}
                        className={cn(
                          'rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset disabled:opacity-50',
                          r.isActive
                            ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                            : 'bg-slate-100 text-slate-500 ring-slate-200',
                        )}
                      >
                        {r.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
          Showing {filtered.length} of {rows?.length ?? 0}
        </div>
      </div>
    </div>
  );
}

function cap(s: string) {
  return s.charAt(0) + s.slice(1).toLowerCase();
}
function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url.slice(0, 40);
  }
}
function Pill({ tone, children }: { tone?: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        'whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset',
        tone ?? 'bg-slate-50 text-slate-600 ring-slate-200',
      )}
    >
      {children}
    </span>
  );
}
function Metric({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">{label}</p>
      <p className={`mt-2 text-2xl font-black tracking-tight ${accent}`}>{value.toLocaleString()}</p>
    </div>
  );
}
