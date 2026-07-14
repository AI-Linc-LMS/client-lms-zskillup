'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { getTpoCompanyHeatmap } from '@/lib/api/tpo';
import type { TpoCompanyHeatmapRow } from '@/shared/dto/tpo-analytics.dto';

const BAND_LABELS = ['<40', '40–54', '55–69', '70+']; // readiness bands, aligned to the Overall Placement Readiness donut
// Base RGB per band (red → amber → sky → emerald); opacity encodes the count.
const BAND_RGB = ['220,38,38', '245,158,11', '2,132,199', '5,150,105'];

/**
 * Company Readiness heatmap — rows are companies, columns are readiness bands,
 * each cell a colour-scaled count of students. Reads /tpo/company-heatmap.
 */
export function CompanyHeatmap({ cohortId }: { cohortId?: string }) {
  const [rows, setRows] = useState<TpoCompanyHeatmapRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getTpoCompanyHeatmap(cohortId)
      .then((r) => !cancelled && setRows(r.rows))
      .catch(() => !cancelled && setRows([]));
    return () => {
      cancelled = true;
    };
  }, [cohortId]);

  if (rows === null) {
    return (
      <div className="grid h-40 place-items-center">
        <Loader2 className="size-5 animate-spin text-slate-400" />
      </div>
    );
  }
  if (rows.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-500">No company-tagged practice yet.</p>;
  }

  const max = Math.max(1, ...rows.flatMap((r) => r.bands));

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] border-separate border-spacing-1 text-sm">
        <thead>
          <tr>
            <th className="px-2 pb-1 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Company
            </th>
            {BAND_LABELS.map((b, i) => (
              <th key={b} className="px-1 pb-1 text-center text-[11px] font-semibold text-slate-600">
                <span
                  className="inline-block size-2 rounded-full align-middle"
                  style={{ background: `rgb(${BAND_RGB[i]})` }}
                />{' '}
                {b}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.slug}>
              <td className="max-w-[140px] truncate px-2 py-1 text-sm font-semibold text-navy">{r.name}</td>
              {r.bands.map((n, i) => {
                const intensity = n === 0 ? 0 : 0.15 + 0.75 * (n / max);
                return (
                  <td key={i} className="px-0.5">
                    <div
                      className="grid h-9 min-w-[52px] place-items-center rounded-md text-xs font-bold tabular-nums"
                      style={{
                        background: `rgba(${BAND_RGB[i]},${intensity})`,
                        color: intensity > 0.5 ? '#fff' : `rgb(${BAND_RGB[i]})`,
                      }}
                    >
                      {n}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
