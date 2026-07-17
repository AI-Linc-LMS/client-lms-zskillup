import { parseSqlSchema, type SqlTable } from './sql-schema';

/**
 * Renders a SQL problem's seed (CREATE TABLE + INSERT) as structured tables — a
 * schema table (Column / Data Type / Description) and a sample-data grid — so
 * students read the database at a glance instead of parsing raw SQL. Falls back
 * to null when the seed can't be parsed, so the caller keeps the plain-text view.
 */
export function SqlSchemaView({
  sampleInput,
  statement,
}: {
  sampleInput?: string;
  statement?: string;
}) {
  const tables = parseSqlSchema(sampleInput, statement);
  if (!tables || tables.length === 0) return null;
  return (
    <div className="space-y-4">
      {tables.map((t) => (
        <SqlTableCard key={t.name} table={t} />
      ))}
    </div>
  );
}

function SqlTableCard({ table }: { table: SqlTable }) {
  const hasDesc = table.columns.some((c) => c.description);
  const previewRows = table.rows.slice(0, 20);
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2">
        <span className="grid size-5 place-items-center rounded bg-sky-50 text-sky-600 ring-1 ring-sky-100">
          <TableIcon />
        </span>
        <span className="font-mono text-[13px] font-bold text-navy">{table.name}</span>
        <span className="text-[11px] text-slate-400">
          {table.columns.length} cols · {table.rows.length} rows
        </span>
      </div>

      {/* Schema */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[12.5px]">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-widest text-slate-400">
              <th className="px-3 py-1.5 font-semibold">Column</th>
              <th className="px-3 py-1.5 font-semibold">Type</th>
              {hasDesc ? <th className="px-3 py-1.5 font-semibold">Description</th> : null}
            </tr>
          </thead>
          <tbody>
            {table.columns.map((col) => (
              <tr key={col.name} className="border-t border-slate-100">
                <td className="whitespace-nowrap px-3 py-1.5 font-mono font-semibold text-navy">
                  {col.name}
                </td>
                <td className="whitespace-nowrap px-3 py-1.5 font-mono text-violet-600">{col.type}</td>
                {hasDesc ? <td className="px-3 py-1.5 text-slate-600">{col.description ?? ''}</td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Sample data grid */}
      {previewRows.length ? (
        <div className="border-t border-slate-200">
          <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Sample data
          </p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="text-left">
                  {table.columns.map((col) => (
                    <th
                      key={col.name}
                      className="whitespace-nowrap bg-slate-50/60 px-3 py-1.5 font-mono font-semibold text-slate-500"
                    >
                      {col.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    {table.columns.map((_, j) => (
                      <td
                        key={j}
                        className="whitespace-nowrap px-3 py-1 font-mono tabular-nums text-slate-700"
                      >
                        {row[j] ?? ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {table.rows.length > previewRows.length ? (
            <p className="px-3 py-1.5 text-[11px] text-slate-400">
              +{table.rows.length - previewRows.length} more rows
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** Render a pipe-delimited query result ("a|b\nc|d") as a compact grid. Falls
 *  back to a code block if it doesn't look like pipe-delimited rows. */
export function SqlResultGrid({ text }: { text: string }) {
  const lines = text.trim().split('\n').filter(Boolean);
  const rows = lines.map((l) => l.split('|'));
  const looksTabular = rows.length > 0 && rows.every((r) => r.length === rows[0].length);
  if (!looksTabular) {
    return (
      <pre className="overflow-auto whitespace-pre-wrap break-words rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-[12px] text-slate-700">
        {text}
      </pre>
    );
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full border-collapse text-[12px]">
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i === 0 ? '' : 'border-t border-slate-100'}>
              {row.map((cell, j) => (
                <td key={j} className="whitespace-nowrap px-3 py-1 font-mono tabular-nums text-slate-700">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TableIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-3.5">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
    </svg>
  );
}
