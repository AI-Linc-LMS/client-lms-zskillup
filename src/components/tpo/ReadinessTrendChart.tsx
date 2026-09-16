'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import type { TpoReadinessTrend, TpoReadinessTrendPoint } from '@/shared';

/**
 * Placement-readiness trend.
 *
 * The page used to render the shared superadmin AreaChart, which plots by ARRAY INDEX
 * against a 0..series-max domain with no axes and no tooltip - so a 15-day range backed
 * by 8 snapshots drew a flat band with no dates, no readiness values and no way to tell
 * a missing day from a low one. This is a real chart on the backend's dense scaffold:
 * one x slot per DATE, a fixed 0-100% y-axis, dots so an isolated day is still visible,
 * and `connectNulls={false}` so a gap in the data is a gap in the line.
 */

const SERIES = '#f5b400';
const AVG_LINE = '#0284c7';

/** "2026-09-08" -> "08 Sep 2026" (IST-safe: the string is already a calendar date). */
export function formatTrendDate(date: string, opts: { short?: boolean } = {}): string {
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
  return dt.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    ...(opts.short ? {} : { year: 'numeric' }),
    timeZone: 'UTC',
  });
}

function TrendTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: TpoReadinessTrendPoint }>;
}) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="font-bold text-navy">{formatTrendDate(point.date)}</p>
      {point.avgReadiness == null ? (
        <p className="mt-0.5 text-slate-500">No data recorded</p>
      ) : (
        <p className="mt-0.5 text-slate-600">
          <span className="font-semibold tabular-nums text-navy">{point.avgReadiness}%</span> average
          readiness
          {point.placementReady != null && point.total != null ? (
            <>
              {' · '}
              <span className="font-semibold tabular-nums text-navy">{point.placementReady}</span> of{' '}
              <span className="tabular-nums">{point.total}</span> placement-ready
            </>
          ) : null}
        </p>
      )}
    </div>
  );
}

/** The one-line headline above the chart - average, latest and coverage of the range. */
function TrendSummary({ trend }: { trend: TpoReadinessTrend }) {
  return (
    <p className="mb-3 text-sm text-slate-600">
      <span className="font-semibold text-navy">Range average {trend.avgReadiness}%</span>
      {trend.latest ? (
        <>
          {' · '}latest{' '}
          <span className="font-semibold tabular-nums text-navy">{trend.latest.avgReadiness}%</span>{' '}
          <span className="text-slate-500">({formatTrendDate(trend.latest.date)})</span>
        </>
      ) : null}
      {' · '}
      <span className="tabular-nums">
        {trend.daysWithData} of {trend.daysInRange}
      </span>{' '}
      days with data
    </p>
  );
}

/**
 * Honest empty state: a snapshot is recorded the FIRST time someone opens the college's
 * readiness for a given day (a nightly sweep now fills the days nobody opens), and the
 * signals behind it are not time-travellable - so a day that was never recorded can
 * never be filled in afterwards.
 */
function TrendEmpty({ trend }: { trend: TpoReadinessTrend }) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 text-center">
      <TrendingUp className="size-8 text-slate-400" aria-hidden />
      <p className="text-sm font-semibold text-navy">No readiness recorded in this range</p>
      <p className="max-w-sm text-xs leading-relaxed text-slate-600">
        A snapshot is written the first time this college&apos;s readiness is opened each day, so
        days before you started using this page have no data and cannot be backfilled. Pick a
        range that includes {formatTrendDate(trend.to)} to see the days being recorded from now
        on.
      </p>
    </div>
  );
}

export function ReadinessTrendChart({ trend }: { trend: TpoReadinessTrend }) {
  // One day of data is still worth drawing - the dot plus the average line say more
  // than an empty state. Only a completely empty range falls back.
  if (trend.daysWithData === 0) return <TrendEmpty trend={trend} />;

  const showEveryTick = trend.points.length <= 10;

  return (
    <>
      <TrendSummary trend={trend} />
      <div style={{ height: 220 }} className="w-full">
        <ResponsiveContainer>
          <LineChart data={trend.points} margin={{ top: 16, right: 12, bottom: 4, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickFormatter={(d: string) => formatTrendDate(d, { short: true })}
              interval={showEveryTick ? 0 : 'preserveStartEnd'}
              minTickGap={showEveryTick ? 0 : 14}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickFormatter={(v: number) => `${v}%`}
            />
            <Tooltip content={<TrendTooltip />} cursor={{ stroke: '#e2e8f0' }} />
            {trend.avgReadiness != null ? (
              <ReferenceLine
                y={trend.avgReadiness}
                stroke={AVG_LINE}
                strokeDasharray="5 4"
                strokeWidth={1.5}
                label={{
                  value: `Range average ${trend.avgReadiness}%`,
                  position: 'insideTopRight',
                  fill: AVG_LINE,
                  fontSize: 10,
                  fontWeight: 700,
                }}
              />
            ) : null}
            {/* connectNulls={false} + always-on dots: a missing day breaks the line
                instead of being bridged, and a lone recorded day is still visible. */}
            <Line
              type="monotone"
              dataKey="avgReadiness"
              name="Average readiness"
              stroke={SERIES}
              strokeWidth={2.5}
              connectNulls={false}
              isAnimationActive={false}
              dot={{ r: 3.5, fill: SERIES, stroke: '#ffffff', strokeWidth: 1.5 }}
              activeDot={{ r: 5.5, fill: SERIES, stroke: '#ffffff', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {trend.daysMissing > 0 ? (
        <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
          {trend.daysMissing} of {trend.daysInRange} days have no snapshot and are shown as gaps -
          readiness is recorded the first time this college&apos;s page is opened each day (and by
          a nightly sweep), so earlier days cannot be backfilled.
        </p>
      ) : null}
    </>
  );
}
