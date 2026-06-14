/**
 * Small value-over-label stat tile (§4.4(a) standard surface) used by session
 * summaries and reports — one definition, no per-screen copies.
 */
export function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
      <p className="text-lg font-extrabold leading-none text-navy">{value}</p>
      <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
        {label}
      </p>
    </div>
  );
}
