'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileUp, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { describeError } from '@/lib/api/errors';
import { label } from '@/components/admin/analytics/rate';
import {
  getAcademicCoverage,
  importAcademics,
} from '@/lib/api/jobs';
import {
  ACADEMIC_HEADERS,
  AcademicColumn,
  SCALE_LABELS,
  ScoreScale,
  type AcademicImportResult,
} from '@/shared/academic-import';

const inputCls =
  'h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy focus:border-orange focus-visible:ring-2 focus-visible:ring-orange/30';

/**
 * IMPORTING ACADEMIC MARKS (PRD §20).
 *
 * The twelfth acceptance criterion asks to evaluate against academic hard rules and show
 * clear pass/fail reasons. The engine always did that correctly and always answered
 * UNKNOWN, because the platform held no marks. This is the way in.
 *
 * THE PREVIEW IS NOT OPTIONAL. The first upload always runs as a dry run and the apply
 * button does not exist until it has returned. An import that writes on the first click
 * is one where nobody ever reads which rows failed — and the rows that failed are
 * precisely the students who then become invisible to every drive with an academic rule.
 *
 * THE SCALE IS ASKED FOR, NOT GUESSED. 8.2 is a legal percentage and a legal CGPA, and
 * nothing in the file distinguishes them. Picking quietly would understate a whole
 * cohort's graduation marks by enough to fail an eligibility bar.
 *
 * EVERY FAILURE IS LISTED WITH ITS ROW NUMBER, because the TPO's next action is to open
 * the spreadsheet at that line. A count would tell them something is wrong and not where.
 */
export function AcademicImportScreen() {
  const [csv, setCsv] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [gradScale, setGradScale] = useState<ScoreScale>(ScoreScale.PERCENTAGE);
  const [multiplier, setMultiplier] = useState(9.5);
  const [preview, setPreview] = useState<AcademicImportResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [coverage, setCoverage] = useState<{ total: number; withGraduation: number; withTenth: number; withTwelfth: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadCoverage = useCallback(async () => {
    try {
      setCoverage(await getAcademicCoverage());
    } catch {
      setCoverage(null);
    }
  }, []);

  useEffect(() => {
    void loadCoverage();
  }, [loadCoverage]);

  const body = () => ({
    csv,
    scales: { [AcademicColumn.SCORE_GRADUATION]: gradScale } as Partial<Record<AcademicColumn, ScoreScale>>,
    cgpaMultiplier: multiplier,
  });

  const run = async (apply: boolean) => {
    if (!csv.trim()) {
      toast.error('Choose a CSV first.');
      return;
    }
    setBusy(true);
    try {
      const res = await importAcademics({ ...body(), apply });
      setPreview(res);
      await loadCoverage();
      if (apply) {
        toast.success(`${res.updated} student${res.updated === 1 ? '' : 's'} updated.`);
      }
    } catch (e) {
      toast.error(describeError(e, 'Could not read that file.'));
    } finally {
      setBusy(false);
    }
  };

  const pick = (f: File) => {
    const r = new FileReader();
    r.onload = () => {
      setCsv(String(r.result ?? ''));
      setFileName(f.name);
      setPreview(null);
    };
    r.readAsText(f);
  };

  const pct = (n: number, d: number) => (d === 0 ? '—' : `${Math.round((n / d) * 100)}%`);

  return (
    <section className="space-y-5">
      {coverage ? (
        <div className="grid gap-4 sm:grid-cols-4">
          {[
            { k: 'Students', v: coverage.total, hint: 'In the colleges you can write to' },
            { k: 'Graduation mark', v: coverage.withGraduation, hint: pct(coverage.withGraduation, coverage.total) },
            { k: '10th mark', v: coverage.withTenth, hint: pct(coverage.withTenth, coverage.total) },
            { k: '12th mark', v: coverage.withTwelfth, hint: pct(coverage.withTwelfth, coverage.total) },
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
      ) : null}

      {coverage && coverage.withGraduation === 0 && coverage.total > 0 ? (
        <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-4 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            <span className="font-semibold">No student has an academic mark yet.</span> Every
            academic eligibility rule therefore returns &ldquo;unknown&rdquo; rather than a
            pass or a fail, which is why &ldquo;needs review&rdquo; is the largest group on
            the candidate screens. Importing marks is what turns those into real verdicts.
          </span>
        </p>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className={label}>Step one</p>
        <p className="mt-0.5 text-base font-bold text-navy">Choose the file</p>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">
          A CSV with one row per student and a column that identifies them — an email
          address or a roll number. Headers are matched generously, so an export straight
          from a university portal usually works unchanged.
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            aria-label="Academic marks CSV"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) pick(f);
            }}
          />
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <FileUp className="size-4" /> {fileName ?? 'Choose a CSV'}
          </Button>
          {fileName ? (
            <span className="text-xs text-slate-500">
              {csv.split(/\r?\n/).filter((l) => l.trim()).length - 1} data rows
            </span>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-4 border-t border-slate-100 pt-4">
          <div>
            <label htmlFor="scale" className="block text-xs font-medium text-slate-600">
              How the graduation column is written
            </label>
            <select
              id="scale"
              className={`mt-1.5 ${inputCls}`}
              value={gradScale}
              onChange={(e) => {
                setGradScale(e.target.value as ScoreScale);
                setPreview(null);
              }}
            >
              {Object.values(ScoreScale).map((s) => (
                <option key={s} value={s}>
                  {SCALE_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          {gradScale === ScoreScale.CGPA_10 ? (
            <div>
              <label htmlFor="mult" className="block text-xs font-medium text-slate-600">
                CGPA × this = percentage
              </label>
              <input
                id="mult"
                type="number"
                step="0.1"
                min="4"
                max="10"
                className={`mt-1.5 w-28 ${inputCls}`}
                value={multiplier}
                onChange={(e) => {
                  setMultiplier(Number(e.target.value));
                  setPreview(null);
                }}
              />
            </div>
          ) : null}
          <Button variant="secondary" onClick={() => void run(false)} disabled={busy || !csv}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : null} Preview
          </Button>
        </div>

        {/* 8.2 is a legal percentage AND a legal CGPA; nothing in the file distinguishes
            them. Asked for rather than guessed — see the note at the top of this file. */}
        <p className="mt-2 text-xs leading-relaxed text-slate-400">
          Your university&rsquo;s multiplier matters: a cohort converted at 9.5 when the
          university uses 10 has every graduation mark understated by five points, which is
          enough to fail an eligibility bar.
        </p>
      </div>

      {preview ? (
        <>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className={label}>Step two</p>
            <p className="mt-0.5 text-base font-bold text-navy">What this would do</p>

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-emerald-50 p-3 ring-1 ring-emerald-200">
                <p className={label}>Would update</p>
                <p className="mt-0.5 text-lg font-extrabold text-emerald-700 tabular-nums">
                  {preview.updated}
                </p>
              </div>
              <div className="rounded-lg bg-amber-50 p-3 ring-1 ring-amber-200">
                <p className={label}>Matched nobody</p>
                <p className="mt-0.5 text-lg font-extrabold text-amber-700 tabular-nums">
                  {preview.unmatched.length}
                </p>
              </div>
              <div className="rounded-lg bg-red-50 p-3 ring-1 ring-red-200">
                <p className={label}>Rejected</p>
                <p className="mt-0.5 text-lg font-extrabold text-red-700 tabular-nums">
                  {preview.problems.length}
                </p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {preview.recognised.map((c, i) => (
                <span
                  key={`${c}-${i}`}
                  className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700 ring-1 ring-sky-200"
                >
                  {c.replace(/_/g, ' ').toLowerCase()}
                </span>
              ))}
              {preview.unrecognised.map((h) => (
                <span
                  key={h}
                  title="Not imported — nothing recognised this header"
                  className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500"
                >
                  {h} · ignored
                </span>
              ))}
            </div>

            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              A blank cell is left alone rather than cleared, so a file with only 10th and
              12th marks cannot wipe graduation marks loaded earlier.
            </p>

            {preview.updated > 0 ? (
              <Button className="mt-4" onClick={() => void run(true)} disabled={busy}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                Import {preview.updated} student{preview.updated === 1 ? '' : 's'}
              </Button>
            ) : (
              <p className="mt-4 text-sm text-slate-500">
                Nothing would be imported. Fix the rows below and preview again.
              </p>
            )}
          </div>

          {/* Named with row numbers, because the next action is to open the spreadsheet
              at that line. A count says something is wrong without saying where. */}
          {preview.problems.length > 0 ? (
            <ProblemList
              title="Rejected rows"
              subtitle="Not imported. The row number is the line in your spreadsheet."
              rows={preview.problems}
              tone="red"
            />
          ) : null}
          {preview.unmatched.length > 0 ? (
            <ProblemList
              title="Matched no student"
              subtitle="These rows parsed correctly but nobody on the platform has that identifier."
              rows={preview.unmatched}
              tone="amber"
            />
          ) : null}
          {preview.problems.length === 0 && preview.unmatched.length === 0 ? (
            <p className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900 ring-1 ring-emerald-200">
              <CheckCircle2 className="size-4 shrink-0" aria-hidden />
              Every row matched a student and parsed cleanly.
            </p>
          ) : null}
        </>
      ) : null}

      <details className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <summary className="cursor-pointer text-sm font-semibold text-navy">
          Which column headings are understood?
        </summary>
        <ul className="mt-3 space-y-2">
          {Object.entries(ACADEMIC_HEADERS).map(([col, spellings]) => (
            <li key={col} className="text-xs">
              <span className="font-semibold text-navy">{col.replace(/_/g, ' ').toLowerCase()}</span>
              <span className="text-slate-500"> — {spellings.join(', ')}</span>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}

function ProblemList({
  title,
  subtitle,
  rows,
  tone,
}: {
  title: string;
  subtitle: string;
  rows: Array<{ row: number; identifier: string; message: string }>;
  tone: 'red' | 'amber';
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <p className={label}>{title}</p>
        <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
      </div>
      <ul className="divide-y divide-slate-100">
        {rows.slice(0, 50).map((r, i) => (
          <li key={`${r.row}-${i}`} className="flex items-start gap-3 px-5 py-2.5">
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${
                tone === 'red'
                  ? 'bg-red-50 text-red-700 ring-1 ring-red-200'
                  : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
              }`}
            >
              row {r.row}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-navy">{r.identifier}</span>
              <span className="block text-xs leading-relaxed text-slate-600">{r.message}</span>
            </span>
          </li>
        ))}
      </ul>
      {rows.length > 50 ? (
        <p className="border-t border-slate-200 px-5 py-2 text-xs text-slate-500">
          Showing the first 50 of {rows.length}.
        </p>
      ) : null}
    </div>
  );
}
