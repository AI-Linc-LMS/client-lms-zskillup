'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import { ChevronDown, Loader2, Receipt } from 'lucide-react';
import { cn } from '@/lib/utils';
import { listAdminTransactions } from '@/lib/api/admin-payments';
import type { AdminTransactionDto } from '@/shared/dto/payments.dto';

const PAGE = 20;

const STATUS_FILTERS: { key: string; label: string }[] = [
  { key: '', label: 'All' },
  { key: 'CAPTURED', label: 'Captured' },
  { key: 'FAILED', label: 'Failed' },
  { key: 'PENDING', label: 'Pending' },
];

function inr(cents: number, currency = 'INR'): string {
  return `${currency === 'INR' ? '₹' : ''}${(cents / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function scopeName(scope: string): string {
  return scope === 'PLATFORM'
    ? 'Full platform'
    : scope === 'COMPANY'
      ? 'Company'
      : scope === 'SECTION'
        ? 'Section'
        : scope === 'SUBTOPIC'
          ? 'Sub-topic'
          : scope === 'TOPIC'
            ? 'Topic'
            : 'Other';
}

/** "section-2-logical-reasoning--blood-relations" → "Blood Relations"; "infosys" → "Infosys". */
function prettyRef(ref: string): string {
  const last = ref.split('--').pop() ?? ref;
  return last.replace(/-/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
}

/** One line item → "Company: Infosys" / "Full platform" / "Topic: Blood Relations". */
function formatProduct(p: { scopeType: string; scopeRef: string | null }): string {
  return p.scopeRef ? `${scopeName(p.scopeType)}: ${prettyRef(p.scopeRef)}` : scopeName(p.scopeType);
}

/** Compact label for the Product column (full list is in the expanded detail). */
function productSummary(t: AdminTransactionDto): string {
  if (!t.products.length) return t.scopeType ? formatProduct({ scopeType: t.scopeType, scopeRef: t.scopeRef }) : 'Other';
  if (t.products.length === 1) return formatProduct(t.products[0]);
  return `${t.products.length} items`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function StatusChip({ status }: { status: string }) {
  const s = status.toUpperCase();
  const cls =
    s === 'CAPTURED' || s === 'PAID'
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
      : s === 'FAILED'
        ? 'bg-red-50 text-red-700 ring-red-200'
        : s === 'PENDING'
          ? 'bg-amber-50 text-amber-700 ring-amber-200'
          : 'bg-slate-50 text-slate-600 ring-slate-200';
  return (
    <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset', cls)}>
      {status}
    </span>
  );
}

/** Read-only line for the expanded detail grid. */
function Detail({ label, value, mono = false }: { label: string; value: string | null; mono?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{label}</p>
      <p className={cn('mt-0.5 break-all text-sm text-navy', mono && 'font-mono text-[12px]')}>{value || '—'}</p>
    </div>
  );
}

/**
 * Super-Admin transactions ledger: every payment with the buyer's identity, the
 * purchased product, amounts, IDs, method and access validity — so a transaction
 * can be verified or supported from one place. Click a row to expand full detail.
 */
export function TransactionsLedger() {
  const [rows, setRows] = useState<AdminTransactionDto[] | null>(null);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [status, setStatus] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setRows(null);
    setError(null);
    listAdminTransactions({ limit: PAGE, offset, status: status || undefined })
      .then((d) => {
        setRows(d.items);
        setTotal(d.total);
      })
      .catch(() => setError('Could not load transactions.'));
  }, [offset, status]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-black tracking-tight text-navy">
            <Receipt className="size-5 text-slate-500" /> Transactions
          </h2>
          <p className="text-sm text-slate-600">Every payment with the buyer, product and IDs. Click a row for full detail.</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key || 'all'}
              type="button"
              onClick={() => {
                setStatus(f.key);
                setOffset(0);
                setOpen(null);
              }}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-semibold transition-colors',
                status === f.key ? 'bg-navy text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <th className="p-3">Date</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Product</th>
              <th className="p-3 text-right">Amount</th>
              <th className="p-3">Status</th>
              <th className="p-3">Method</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows === null ? (
              <tr>
                <td colSpan={7} className="p-10 text-center">
                  <Loader2 className="mx-auto size-5 animate-spin text-slate-400" />
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-sm text-red-600">
                  {error}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-sm text-slate-500">
                  No transactions{status ? ` with status ${status}` : ''} yet.
                </td>
              </tr>
            ) : (
              rows.map((t) => {
                const isOpen = open === t.paymentId;
                return (
                  <Fragment key={t.paymentId}>
                    <tr
                      onClick={() => setOpen(isOpen ? null : t.paymentId)}
                      className="cursor-pointer text-navy transition-colors hover:bg-slate-50"
                    >
                      <td className="p-3 whitespace-nowrap text-slate-600">{fmtDate(t.capturedAt)}</td>
                      <td className="p-3">
                        <p className="font-semibold text-navy">{t.userName || '—'}</p>
                        <p className="text-xs text-slate-500">{t.email || '—'}</p>
                      </td>
                      <td className="p-3 text-slate-600">{productSummary(t)}</td>
                      <td className="p-3 text-right font-bold tabular-nums text-navy">{inr(t.amountCents, t.currency)}</td>
                      <td className="p-3"><StatusChip status={t.status} /></td>
                      <td className="p-3 capitalize text-slate-600">{t.method || '—'}</td>
                      <td className="p-3 text-right">
                        <ChevronDown className={cn('size-4 text-slate-400 transition-transform', isOpen && 'rotate-180')} />
                      </td>
                    </tr>
                    {isOpen ? (
                      <tr className="bg-slate-50/60">
                        <td colSpan={7} className="p-4">
                          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
                            <Detail label="User name" value={t.userName} />
                            <Detail label="Email" value={t.email} />
                            <Detail label="Mobile" value={t.phone} />
                            <Detail label="User ID" value={t.userId} mono />
                            <div className="sm:col-span-2">
                              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                                Purchased {t.products.length > 1 ? `(${t.products.length} items)` : ''}
                              </p>
                              {t.products.length ? (
                                <ul className="mt-0.5 space-y-0.5">
                                  {t.products.map((p, i) => (
                                    <li key={i} className="text-sm font-semibold text-navy">
                                      {formatProduct(p)}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="mt-0.5 text-sm text-navy">{productSummary(t)}</p>
                              )}
                            </div>
                            <Detail label="Tier" value={t.tier} />
                            <Detail label="Period" value={t.period} />
                            <Detail label="Amount" value={inr(t.amountCents, t.currency)} />
                            <Detail label="Status" value={t.status} />
                            <Detail label="Method" value={t.method} />
                            <Detail label="Purchased" value={fmtDate(t.capturedAt)} />
                            <Detail label="Valid until" value={t.validUntil ? fmtDate(t.validUntil) : 'Perpetual / n/a'} />
                            <Detail label="Order ID" value={t.orderId} mono />
                            <Detail label="Gateway order ID" value={t.gatewayOrderId} mono />
                            <Detail label="Transaction ID" value={t.transactionId} mono />
                            <Detail label="Payment ID" value={t.paymentId} mono />
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {rows && total > PAGE ? (
        <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
          <span>
            {offset + 1}–{Math.min(offset + PAGE, total)} of {total}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={offset === 0}
              onClick={() => {
                setOffset(Math.max(0, offset - PAGE));
                setOpen(null);
              }}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-navy transition-colors hover:bg-slate-50 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={offset + PAGE >= total}
              onClick={() => {
                setOffset(offset + PAGE);
                setOpen(null);
              }}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-navy transition-colors hover:bg-slate-50 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
