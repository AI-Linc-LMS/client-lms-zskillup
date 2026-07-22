import type { TpoCompanyHeatmapRow } from '@/shared';

/**
 * Company Readiness heatmap - rows = companies, columns = readiness bands. Each
 * cell is coloured by its band hue with opacity scaled to the company's largest
 * band, so the dominant readiness bucket per company reads at a glance. Pure CSS.
 */

const BAND_LABELS = ['<40', '40–54', '55–69', '70+']; // readiness bands, aligned to the Overall Placement Readiness donut
const BAND_COLORS = ['#dc2626', '#f59e0b', '#0284c7', '#059669'];

export function CompanyHeatmap({ rows }: { rows: TpoCompanyHeatmapRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        Not enough company-tagged practice yet to build a distribution.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-separate border-spacing-1">
        <thead>
          <tr>
            <th className="w-40 px-2 py-1 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Company
            </th>
            {BAND_LABELS.map((b, i) => (
              <th key={b} className="px-2 py-1 text-center text-[10px] font-bold" style={{ color: BAND_COLORS[i] }}>
                {b}
              </th>
            ))}
            <th className="px-2 py-1 text-right text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Students
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const rowMax = Math.max(1, ...r.bands);
            return (
              <tr key={r.slug}>
                <td className="truncate px-2 py-1 text-sm font-semibold text-navy">{r.name}</td>
                {r.bands.map((count, i) => {
                  const intensity = count > 0 ? 0.16 + 0.84 * (count / rowMax) : 0;
                  const strong = intensity > 0.55;
                  return (
                    <td key={i} className="px-0.5 py-0.5">
                      <div
                        className="grid h-9 place-items-center rounded-md text-sm font-bold tabular-nums transition-colors"
                        style={{
                          background: count > 0 ? BAND_COLORS[i] : '#f8fafc',
                          opacity: count > 0 ? intensity : 1,
                          color: count === 0 ? '#cbd5e1' : strong ? 'white' : '#0a0a0c',
                        }}
                        title={`${count} student${count === 1 ? '' : 's'} · ${BAND_LABELS[i]} on ${r.name}`}
                      >
                        {count > 0 ? count : '·'}
                      </div>
                    </td>
                  );
                })}
                <td className="px-2 py-1 text-right text-sm font-bold tabular-nums text-navy">{r.total}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-600">
        {BAND_LABELS.map((b, i) => (
          <span key={b} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm" style={{ background: BAND_COLORS[i] }} /> {b} accuracy
          </span>
        ))}
      </div>
    </div>
  );
}
