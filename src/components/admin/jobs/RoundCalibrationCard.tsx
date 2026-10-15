'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Scale } from 'lucide-react';
import { describeError } from '@/lib/api/errors';
import { RateValue, label } from '@/components/admin/analytics/rate';
import { getRoundCalibration, type RoundCalibrationDto } from '@/lib/api/jobs';
import { MIN_PAIRED_FOR_RATE } from '@/shared/practice-calibration';

/**
 * DID THE PRACTICE PREDICT WHAT THE EMPLOYER ACTUALLY DID? (PRD §23.7)
 *
 * The honest version of "is our practice any good". Two halves are paired per candidate:
 * what the practice claimed, and what the employer did afterwards — read from §10's event
 * log, so a candidate who cleared this round and was rejected at the next one still counts
 * as having cleared this one.
 *
 * NO RATE IS SHOWN BELOW THE SAMPLE FLOOR. Twenty paired results is the minimum, and
 * under it the card says "too early to tell" rather than printing a percentage. A
 * calibration figure from six candidates is noise wearing a number, and it is the kind of
 * number that gets quoted in a meeting.
 *
 * EXCLUSIONS ARE NAMED, NOT NETTED OFF. "Paired 12 of 40" invites the reader to assume the
 * other 28 failed; they did not — they had no practice result, no recorded outcome, or the
 * practice made no claim about them. Three different facts, three counts.
 */
export function RoundCalibrationCard({
  driveId,
  roundId,
}: {
  driveId: string;
  roundId: string;
}) {
  const [data, setData] = useState<RoundCalibrationDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getRoundCalibration(driveId, roundId));
    } catch (e) {
      setError(describeError(e, 'Could not load calibration.'));
    } finally {
      setLoading(false);
    }
  }, [driveId, roundId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="size-4 animate-spin text-slate-300" aria-hidden /> Checking
          calibration…
        </p>
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className={label}>Calibration</p>
        <p className="mt-1 text-sm text-slate-500">{error ?? 'No calibration available.'}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-600 ring-1 ring-violet-100" aria-hidden>
          <Scale className="size-4" />
        </span>
        <div className="min-w-0">
          <p className={label}>Calibration</p>
          <p className="mt-0.5 text-base font-bold text-navy">
            Did the practice predict the employer?
          </p>
        </div>
      </div>

      {data.tooEarlyToTell ? (
        <>
          <p className="mt-3 rounded-lg bg-slate-50 p-4 text-sm leading-relaxed text-slate-600 ring-1 ring-slate-200">
            <span className="font-semibold text-navy">Too early to tell.</span> {data.predictive} of{' '}
            {data.paired} paired results made a prediction, and this needs at least{' '}
            {MIN_PAIRED_FOR_RATE} before a rate means anything. A percentage from a handful
            of candidates is noise wearing a number — and it is exactly the number that gets
            quoted in a meeting.
          </p>
        </>
      ) : (
        <dl className="mt-3 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-sm text-slate-600">Said ready, and cleared</dt>
            <dd><RateValue rate={data.saidReady.accuracy} /></dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-sm text-slate-600">Said practise, and did not clear</dt>
            <dd><RateValue rate={data.saidPractise.accuracy} /></dd>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-2">
            <dt className="text-sm font-semibold text-navy">Overall agreement</dt>
            <dd><RateValue rate={data.overallAgreement} /></dd>
          </div>
        </dl>
      )}

      {/* Named, not netted off — see the note at the top of this file. */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        {[
          { k: 'No practice result', v: data.excluded.noPracticeResult },
          { k: 'No outcome yet', v: data.excluded.noRecordedOutcome },
          { k: 'Made no claim', v: data.excluded.noPrediction },
        ].map((x) => (
          <div key={x.k} className="rounded-lg bg-slate-50 p-2.5 ring-1 ring-slate-200">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{x.k}</p>
            <p className="mt-0.5 text-sm font-bold text-navy tabular-nums">{x.v}</p>
          </div>
        ))}
      </div>

      {/* The caveat travels with the report rather than living in documentation. */}
      <p className="mt-3 text-xs leading-relaxed text-slate-400">{data.caveat}</p>
    </div>
  );
}
