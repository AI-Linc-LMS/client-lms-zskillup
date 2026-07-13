'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { listAdminColleges, type AdminCollegeRow } from '@/lib/api/admin';
import { Loader2, School, Search } from 'lucide-react';

/** Admin console — read-only colleges directory with drill-down (Phase 2). */
export default function AdminCollegesPage() {
  const [rows, setRows] = useState<AdminCollegeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await listAdminColleges();
        if (alive) setRows(data);
      } catch {
        if (alive) setError('Failed to load colleges. Please refresh.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(
      (c) =>
        c.name.toLowerCase().includes(needle) ||
        c.city?.toLowerCase().includes(needle) ||
        c.state?.toLowerCase().includes(needle),
    );
  }, [rows, q]);

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Platform Admin', href: '/admin/dashboard' },
          { label: 'Colleges' },
        ]}
      />
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Insights</p>
          <h1 className="mt-1 text-[28px] font-extrabold tracking-tight text-navy">Colleges</h1>
          <p className="mt-1 text-sm text-slate-600">
            {rows.length.toLocaleString()} colleges · click a row for enrolment + performance
          </p>
        </div>
        <School className="size-6 text-slate-400" />
      </header>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
        <input
          type="search"
          placeholder="Search by name, city or state…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm focus:border-[#ffc42d] focus:outline-none focus:ring-1 focus:ring-[#ffc42d]"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-6 animate-spin text-slate-500" />
          </div>
        ) : error ? (
          <div className="py-16 text-center text-sm text-red-500">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-500">No colleges found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="px-4 py-3">College</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Added</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link href={`/admin/colleges/${c.id}`} className="group">
                        <p className="font-semibold text-navy group-hover:text-[#1a1d29]">{c.name}</p>
                        <p className="text-xs text-slate-500">{c.slug}</p>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {[c.city, c.state].filter(Boolean).join(', ') || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          c.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-600'
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(c.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
