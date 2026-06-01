import { cn } from '@/lib/utils';

/**
 * Placement Readiness (PPS) gauge — sidebar footer.
 * Display-only: server is the only source of truth (FRONTEND_STANDARDS §3).
 * Matches reference screenshot: label · large score · blue bar · delta · context.
 */
export function PpsGauge({
  score,
  delta,
  contextLine,
}: {
  score?: number;
  delta?: number;
  contextLine?: string;
}) {
  const hasScore = typeof score === 'number';
  const pct = hasScore ? Math.max(0, Math.min(100, score)) : 0;

  return (
    <div className="rounded-xl bg-navy p-4 text-white">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-white/60">
        Placement Readiness
      </p>

      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-3xl font-bold">{hasScore ? score : '--'}</span>
        <span className="text-base font-medium text-white/60">/100</span>
      </div>

      {/* Progress bar — sky-blue fill on translucent white track */}
      <div
        className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/20"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Placement readiness ${hasScore ? score : 'unknown'} out of 100`}
      >
        <div
          className="h-full rounded-full bg-sky-400 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      {typeof delta === 'number' ? (
        <p className={cn('mt-2 text-xs font-medium', delta >= 0 ? 'text-emerald-300' : 'text-red-300')}>
          {delta >= 0 ? '↑' : '↓'} {Math.abs(delta)} points (last 7 days)
        </p>
      ) : (
        <p className="mt-2 text-xs text-white/50">Awaiting your first assessment</p>
      )}

      {contextLine ? (
        <p className="mt-1 text-xs text-white/60">{contextLine}</p>
      ) : null}
    </div>
  );
}
