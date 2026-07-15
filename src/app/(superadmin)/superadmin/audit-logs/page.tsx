'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ConsoleHero } from '@/components/layout/ConsoleHero';
import { AUDIT_ACTIONS, listAuditLogs, type AuditLogRow } from '@/lib/api/audit';
import { ChevronDown, Loader2, ScrollText } from 'lucide-react';

const PAGE_SIZE = 50;

const ACTION_LABEL: Record<string, string> = Object.fromEntries(
  AUDIT_ACTIONS.map((a) => [a.value, a.label]),
);

/** Super-admin audit-log viewer (Phase 3). Read-only forensics trail. */
export default function AuditLogsPage() {
  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState('');
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listAuditLogs({
        action: action || undefined,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });
      setRows(data.rows);
      setTotal(data.total);
    } catch {
      setError('Failed to load the audit trail. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, [action, page]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Super Admin', href: '/superadmin/dashboard' },
          { label: 'Audit Log' },
        ]}
      />
      <ConsoleHero
        icon={ScrollText}
        eyebrow="Super Admin"
        title="Audit log"
        description={<>{total.toLocaleString()} recorded events &middot; every privileged write, append-only</>}
      />

      <div className="relative w-56">
        <select
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            setPage(0);
          }}
          className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-4 pr-8 text-sm shadow-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
        >
          <option value="">All actions</option>
          {AUDIT_ACTIONS.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-6 animate-spin text-slate-500" />
          </div>
        ) : error ? (
          <div className="py-16 text-center text-sm text-red-500">{error}</div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-500">No audit events found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="px-4 py-3">When</th>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Target</th>
                  <th className="px-4 py-3">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <Fragment key={r.id}>
                    <tr
                      onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                      className="cursor-pointer hover:bg-slate-50"
                    >
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {new Date(r.createdAt).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-navy">
                          {r.actorName ?? r.actorEmail ?? (r.actorId ? 'Unknown' : 'System')}
                        </p>
                        {r.actorEmail && r.actorName && (
                          <p className="text-xs text-slate-500">{r.actorEmail}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                          {ACTION_LABEL[r.action] ?? r.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {r.entity ? (
                          <span>
                            {r.entity}
                            {r.entityId ? ` · ${r.entityId.slice(0, 8)}…` : ''}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs tabular-nums text-slate-500">{r.ip ?? '-'}</td>
                    </tr>
                    {expanded === r.id && (
                      <tr className="bg-slate-50/60">
                        <td colSpan={5} className="px-4 py-3">
                          <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-lg bg-white p-3 text-[11px] text-slate-600 ring-1 ring-slate-100">
                            {JSON.stringify(r.metadata, null, 2)}
                            {r.userAgent ? `\n\nUser-Agent: ${r.userAgent}` : ''}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
            <p className="text-xs text-slate-500">
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
