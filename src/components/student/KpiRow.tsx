import { DEMO_KPIS } from '@/lib/demo-data';

export function KpiRow() {
  return (
    <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {DEMO_KPIS.map((kpi) => (
        <div key={kpi.label} className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            {kpi.label}
          </p>
          <p className="mt-2 text-[26px] font-extrabold leading-none text-navy">{kpi.value}</p>
          <p className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-emerald-600">
            ↑ {kpi.sub.replace(/^↑\s*/, '')}
          </p>
        </div>
      ))}
    </section>
  );
}
