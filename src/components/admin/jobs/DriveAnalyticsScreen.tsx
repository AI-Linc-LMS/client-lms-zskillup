'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { describeError } from '@/lib/api/errors';
import { saveBlob } from '@/lib/download';
import {
  CtcCard,
  FunnelTable,
  RateRow,
  StageLossesCard,
  label,
} from '@/components/admin/analytics/rate';
import {
  exportDriveFunnelCsv,
  getDriveAnalytics,
  getStageImprovement,
  type DriveAnalyticsDto,
  type StageImprovementDto,
} from '@/lib/api/jobs';

/**
 * ONE DRIVE'S FUNNEL AND OUTCOMES (PRD §14).
 *
 * §14's six reporting levels had no screen at all. This is the drive level, the one that
 * sits beside the other per-drive pages and answers "where are we losing people".
 *
 * Two of its rules shape every number here:
 *
 *   NO PERCENTAGE APPEARS WITHOUT ITS DENOMINATOR. The server's `Rate` type makes that
 *   impossible to omit and this screen honours it — see `Rate` above.
 *
 *   THE FUNNEL IS MONOTONE because it is read from §10's event log rather than from
 *   current status. A candidate interviewed and then rejected still counts as interviewed,
 *   so these counts never fall as decisions get made. Worth knowing when reading it: the
 *   numbers are "ever reached", not "currently at".
 */
export function DriveAnalyticsScreen({ driveId }: { driveId: string }) {
  const [data, setData] = useState<DriveAnalyticsDto | null>(null);
  const [gaps, setGaps] = useState<StageImprovementDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [a, g] = await Promise.all([
        getDriveAnalytics(driveId),
        getStageImprovement({ driveId }).catch(() => null),
      ]);
      setData(a);
      setGaps(g);
    } catch (e) {
      setError(describeError(e, 'Could not load this drive’s report.'));
    } finally {
      setLoading(false);
    }
  }, [driveId]);

  useEffect(() => {
    void load();
  }, [load]);

  const download = async () => {
    setExporting(true);
    try {
      const f = await exportDriveFunnelCsv(driveId);
      saveBlob(f.blob, f.filename ?? 'drive-funnel.csv');
    } catch (e) {
      toast.error(describeError(e, 'Could not export the report.'));
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <p className="flex items-center gap-2 py-10 text-sm text-slate-500">
        <Loader2 className="size-5 animate-spin text-slate-300" aria-hidden /> Loading the report…
      </p>
    );
  }
  if (error) {
    return (
      <p role="alert" className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200">
        {error}
      </p>
    );
  }
  if (!data) return null;

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className={label}>Drive report</p>
            <h2 className="mt-1 text-lg font-bold text-navy">{data.drive.title}</h2>
            <p className="text-sm text-slate-500">
              {data.drive.companyName}
              {data.drive.location ? ` · ${data.drive.location}` : ''} · {data.drive.status}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={download} disabled={exporting}>
            {exporting ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
            Export CSV
          </Button>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Counts are <span className="font-semibold">ever reached</span>, not currently at —
          the funnel is read from the move history, so a candidate interviewed and then
          rejected still counts as interviewed and these numbers never fall as decisions get
          made.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { k: 'Audience', v: data.audience.total, hint: 'Students this drive reaches' },
          { k: 'Eligible', v: data.audience.eligible, hint: 'Pass every hard criterion' },
          {
            k: 'Needs review',
            v: data.audience.needsReview,
            hint: 'Could not be judged — missing data, not a failure',
          },
          {
            k: 'Cannot apply',
            v: data.audienceWithoutPaidAccess,
            hint: 'In the audience but hold no live access',
          },
        ].map((c) => (
          <div key={c.k} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className={label}>{c.k}</p>
            <p className="mt-1 text-[26px] font-extrabold leading-none text-navy tabular-nums">
              {c.v.toLocaleString('en-IN')}
            </p>
            <p className="mt-1 text-xs text-slate-500">{c.hint}</p>
          </div>
        ))}
      </div>

      {data.audience.needsReview > 0 ? (
        <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-4 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            <span className="font-semibold">
              {data.audience.needsReview} of {data.audience.total} could not be judged.
            </span>{' '}
            That is absent data rather than a failed criterion — this platform holds no
            academic marks, so any academic rule returns &ldquo;unknown&rdquo; for everyone.
          </span>
        </p>
      ) : null}

      <FunnelTable funnel={data.funnel} />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className={label}>Conversion</p>
          <dl className="mt-2 space-y-2">
            <RateRow k="Shortlist ratio" rate={data.shortlistRatio} />
            <RateRow k="Assessment participation" rate={data.assessmentParticipation} />
            <div className="flex items-center justify-between gap-3">
              <dt className="text-sm text-slate-600">Median time to fill</dt>
              <dd className="text-sm font-semibold text-navy tabular-nums">
                {data.timeToFillDays === null ? (
                  <span className="text-xs font-normal text-slate-400">not yet filled</span>
                ) : (
                  `${data.timeToFillDays} days`
                )}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-slate-400">
            Every rate shows what it is a rate of. &ldquo;No data&rdquo; means the
            denominator was zero — not that the answer was nought.
          </p>
        </div>

        <CtcCard ctc={data.ctc} />
      </div>

      {gaps ? <StageLossesCard losses={gaps.losses} /> : null}
    </section>
  );
}
