/**
 * Dashboard loading skeleton — shown during navigation + the first data load so
 * a returning/just-signed-in student sees a clean skeleton instead of a frozen
 * previous page or a flash of stale content. Uses the shimmer `.skeleton`
 * primitive (design-direction) instead of a flat pulse.
 */
export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* hero */}
      <div className="skeleton h-40 rounded-[1.75rem]" />

      {/* stat tiles */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-24 rounded-2xl" />
        ))}
      </div>

      {/* content + right rail */}
      <div className="grid gap-6 lg:grid-cols-[1fr_19rem]">
        <div className="space-y-4">
          <div className="skeleton h-48 rounded-2xl" />
          <div className="skeleton h-64 rounded-2xl" />
        </div>
        <div className="space-y-4">
          <div className="skeleton h-40 rounded-2xl" />
          <div className="skeleton h-40 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
