/**
 * Dashboard loading skeleton — shown during navigation + the first data load so
 * a returning/just-signed-in student sees a clean skeleton instead of a frozen
 * previous page or a flash of stale content.
 */
export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-6">
      {/* hero */}
      <div className="h-40 rounded-[1.75rem] bg-slate-200/70" />

      {/* stat tiles */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-2xl bg-slate-200/60" />
        ))}
      </div>

      {/* content + right rail */}
      <div className="grid gap-6 lg:grid-cols-[1fr_19rem]">
        <div className="space-y-4">
          <div className="h-48 rounded-2xl bg-slate-200/60" />
          <div className="h-64 rounded-2xl bg-slate-200/50" />
        </div>
        <div className="space-y-4">
          <div className="h-40 rounded-2xl bg-slate-200/50" />
          <div className="h-40 rounded-2xl bg-slate-200/40" />
        </div>
      </div>
    </div>
  );
}
