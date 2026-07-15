'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ConsoleHero } from '@/components/layout/ConsoleHero';
import { Button } from '@/components/ui/button';
import { Building2, ChevronDown, Loader2, Plus } from 'lucide-react';
import { listCollegeRequests, type CollegeRequestSummary } from '@/lib/api/college-requests';
import { STATUS_STYLE } from '@/lib/college-request-status';

export default function AdminCollegeRequestsPage() {
  const [rows, setRows] = useState<CollegeRequestSummary[] | null>(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setRows(null);
    setError(null);
    listCollegeRequests(status || undefined)
      .then((r) => !cancelled && setRows(r))
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load requests');
          setRows([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [status]);

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[{ label: 'Home', href: '/' }, { label: 'Platform Admin', href: '/admin/dashboard' }, { label: 'College Requests' }]}
      />

      <ConsoleHero
        icon={Building2}
        eyebrow="Platform Admin"
        title="College Registration Requests"
        description="Draft a college onboarding request and submit it for Super Admin review."
        actions={
          <Link href="/admin/college-requests/new">
            <Button>
              <Plus className="mr-1.5 size-4" /> New request
            </Button>
          </Link>
        }
      />

      <div className="relative w-48">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-sm focus:border-[#f5b400] focus:outline-none focus:ring-1 focus:ring-[#f5b400]"
        >
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {rows === null ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-6 animate-spin text-slate-500" />
          </div>
        ) : error ? (
          <div className="py-16 text-center text-sm text-red-500">{error}</div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-500">No requests yet. Create one to get started.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="px-4 py-3">College</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Students</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Updated</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-navy">{r.collegeName}</p>
                      <p className="text-xs text-slate-500">{r.city}, {r.state}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {r.planName} <span className="text-xs text-slate-500">· {r.seatLimit} seats</span>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-slate-600">{r.studentCount}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[r.status] ?? ''}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{new Date(r.updatedAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/college-requests/${r.id}`} className="text-sm font-semibold text-[#1a1a1a] hover:underline">
                        View
                      </Link>
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
