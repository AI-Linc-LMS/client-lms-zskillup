'use client';

import { Button } from '@/components/ui/button';

const inputCls =
  'h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy focus:border-orange focus:outline-none focus-visible:ring-2 focus-visible:ring-orange/30';

/**
 * Reports date-range filter (§4.4(a) standard card). Emits `YYYY-MM-DD` values
 * (or null when cleared); the page normalises them to inclusive UTC bounds before
 * calling the API. Only date-scoped exports honour the range - snapshot totals stay
 * point-in-time.
 */
export function ReportDateRange({
  from,
  to,
  onChange,
}: {
  from: string | null;
  to: string | null;
  onChange: (from: string | null, to: string | null) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Date range</p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-slate-600">From</span>
          <input
            type="date"
            value={from ?? ''}
            max={to ?? undefined}
            onChange={(e) => onChange(e.target.value || null, to)}
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-slate-600">To</span>
          <input
            type="date"
            value={to ?? ''}
            min={from ?? undefined}
            onChange={(e) => onChange(from, e.target.value || null)}
            className={inputCls}
          />
        </label>
        <Button variant="ghost" size="sm" onClick={() => onChange(null, null)} disabled={!from && !to}>
          Clear
        </Button>
      </div>
    </div>
  );
}
