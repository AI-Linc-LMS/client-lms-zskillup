'use client';

import { useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { AlertTriangle, CheckCircle2, Download, FileUp, Loader2, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { describeError } from '@/lib/api/errors';
import { importDriveRoster, previewDriveRoster } from '@/lib/api/jobs';
import {
  ImportRowOutcome,
  ROSTER_TEMPLATE_HEADERS,
  ROW_OUTCOME_LABELS,
  RosterColumn,
  resolveHeader,
  type ImportPreview,
  type ImportResult,
  type PreviewedRow,
  type RosterRow,
} from '@/shared/drive-roster-import';
import { ApplicationStage, STAGE_LABELS } from '@/shared/application-pipeline';

const inputCls =
  'h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy focus:border-orange focus-visible:ring-2 focus-visible:ring-orange/30';
const eyebrow = 'text-[10px] font-semibold uppercase tracking-widest text-slate-400';
const card = 'rounded-xl border border-slate-200 bg-white p-5 shadow-sm';

/** Tone per outcome. Colour is never the only signal — every row also carries its words. */
const TONE: Record<ImportRowOutcome, string> = {
  [ImportRowOutcome.EXISTING_STUDENT]: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  [ImportRowOutcome.NEW_STUDENT]: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
  [ImportRowOutcome.ALREADY_IN_DRIVE]: 'bg-slate-50 text-slate-600 ring-1 ring-slate-200',
  [ImportRowOutcome.DUPLICATE_ROW]: 'bg-slate-50 text-slate-600 ring-1 ring-slate-200',
  [ImportRowOutcome.MISSING_REQUIRED]: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  [ImportRowOutcome.INVALID]: 'bg-red-50 text-red-700 ring-1 ring-red-200',
  [ImportRowOutcome.BLOCKED]: 'bg-red-50 text-red-700 ring-1 ring-red-200',
};

/** The order the summary reads in: what will happen, then what will not. */
const SUMMARY_ORDER: ImportRowOutcome[] = [
  ImportRowOutcome.EXISTING_STUDENT,
  ImportRowOutcome.NEW_STUDENT,
  ImportRowOutcome.ALREADY_IN_DRIVE,
  ImportRowOutcome.DUPLICATE_ROW,
  ImportRowOutcome.MISSING_REQUIRED,
  ImportRowOutcome.INVALID,
  ImportRowOutcome.BLOCKED,
];

/**
 * Turn a worksheet into rows, mapping each header to the column it means.
 *
 * Reads with `header: 1` (an array of arrays) rather than letting the library key by
 * header, because these files routinely carry a title row or two above the real headers —
 * every college roster seen so far does — and keying by header would silently take
 * "ARMY INSTITUTE OF TECHNOLOGY" as a column name and return nothing usable.
 */
function rowsFromSheet(wb: XLSX.WorkBook): { rows: RosterRow[]; headerLine: number | null } {
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return { rows: [], headerLine: null };
  const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false });

  // The header row is the first one where at least two cells resolve to known columns.
  let headerAt = -1;
  let map: Array<RosterColumn | null> = [];
  for (let i = 0; i < Math.min(grid.length, 25); i++) {
    const candidate = (grid[i] ?? []).map((c) => resolveHeader(String(c ?? '')));
    if (candidate.filter(Boolean).length >= 2) {
      headerAt = i;
      map = candidate;
      break;
    }
  }
  if (headerAt === -1) return { rows: [], headerLine: null };

  const rows: RosterRow[] = [];
  for (let i = headerAt + 1; i < grid.length; i++) {
    const cells = grid[i] ?? [];
    const get = (col: RosterColumn): string => {
      const at = map.indexOf(col);
      return at === -1 ? '' : String(cells[at] ?? '').trim();
    };
    const first = get(RosterColumn.FIRST_NAME);
    const last = get(RosterColumn.LAST_NAME);
    const full = get(RosterColumn.FULL_NAME) || [first, last].filter(Boolean).join(' ');
    const email = get(RosterColumn.EMAIL);
    const phone = get(RosterColumn.PHONE);
    const roll = get(RosterColumn.ROLL_NUMBER);
    // A row with none of the three identifiers is blank padding, not a student.
    if (!email && !phone && !roll && !full) continue;
    rows.push({
      line: i + 1,
      email,
      fullName: full || null,
      phone: phone || null,
      rollNumber: roll || null,
      branch: get(RosterColumn.BRANCH) || null,
      batch: get(RosterColumn.BATCH) || null,
      course: get(RosterColumn.COURSE) || null,
      collegeName: get(RosterColumn.COLLEGE) || null,
      applicationDate: get(RosterColumn.APPLICATION_DATE) || null,
      currentStage: get(RosterColumn.CURRENT_STAGE) || null,
    });
  }
  return { rows, headerLine: headerAt + 1 };
}

/**
 * BULK-ADDING A DRIVE'S OFFLINE REGISTRATIONS.
 *
 * Opportunities get circulated on WhatsApp, a Google Form or the college ERP, and the
 * students who answered are already committed to the drive without having touched the job
 * board. This is how they get in, as real applicants rather than a list in Excel.
 *
 * NOTHING IS WRITTEN UNTIL THE OPERATOR HAS SEEN WHAT WOULD HAPPEN. Preview classifies
 * every row and the import button stays disabled until there is something importable. A
 * row that cannot be imported is shown with its line number and the reason — "412 of 455"
 * tells somebody that 43 students are missing without saying which, so nobody chases them.
 */
export function DriveRosterImport({
  jobId,
  collegeOptions = [],
  onImported,
  onClose,
}: {
  jobId: string;
  /** Colleges a NEW student may be created under. A TPO sees only their own. */
  collegeOptions?: Array<{ id: string; name: string }>;
  onImported?: () => void;
  onClose?: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<RosterRow[]>([]);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [excluded, setExcluded] = useState<Set<number>>(new Set());
  const [defaultStage, setDefaultStage] = useState('');
  const [collegeId, setCollegeId] = useState(collegeOptions[0]?.id ?? '');
  const [sourceNote, setSourceNote] = useState('');
  const [source, setSource] = useState<'BULK_UPLOAD' | 'OFFLINE'>('BULK_UPLOAD');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const kept = useMemo(
    () => rows.filter((r) => !excluded.has(r.line)),
    [rows, excluded],
  );
  const needsCollege = (preview?.counts[ImportRowOutcome.NEW_STUDENT] ?? 0) > 0;
  const canImport = (preview?.importable ?? 0) > 0 && (!needsCollege || Boolean(collegeId));

  function downloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([ROSTER_TEMPLATE_HEADERS as string[]]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Students');
    XLSX.writeFile(wb, 'drive-roster-template.csv', { bookType: 'csv' });
  }

  async function onFile(file: File) {
    setErr(null);
    setResult(null);
    setPreview(null);
    setExcluded(new Set());
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const { rows: parsed } = rowsFromSheet(wb);
      if (parsed.length === 0) {
        setErr(
          'No student rows found. The file needs a header row naming at least two of Email, Phone, Name or Registration Number.',
        );
        setRows([]);
        return;
      }
      setFileName(file.name);
      setRows(parsed);
      await runPreview(parsed);
    } catch (e) {
      setErr(describeError(e, 'Could not read that file. Use a .csv or .xlsx.'));
    }
  }

  async function runPreview(forRows: RosterRow[]) {
    setBusy(true);
    setErr(null);
    try {
      setPreview(
        await previewDriveRoster(jobId, {
          rows: forRows,
          defaultStage: defaultStage || null,
        }),
      );
    } catch (e) {
      setErr(describeError(e, 'Could not check that file against this drive.'));
    } finally {
      setBusy(false);
    }
  }

  async function runImport() {
    setBusy(true);
    setErr(null);
    try {
      const res = await importDriveRoster(jobId, {
        rows: kept,
        defaultStage: defaultStage || null,
        collegeId: needsCollege ? collegeId : undefined,
        sourceNote: sourceNote.trim() || undefined,
        source,
      });
      setResult(res);
      toast.success(
        `${res.attached} student${res.attached === 1 ? '' : 's'} added to this drive`,
      );
      onImported?.();
    } catch (e) {
      setErr(describeError(e, 'Could not add these students.'));
    } finally {
      setBusy(false);
    }
  }

  const problems = (preview?.rows ?? []).filter(
    (r) =>
      r.outcome !== ImportRowOutcome.EXISTING_STUDENT &&
      r.outcome !== ImportRowOutcome.NEW_STUDENT,
  );

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={eyebrow}>Bulk add</p>
          <h2 className="mt-1 text-lg font-bold text-navy">Upload students into this drive</h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">
            For students who registered through a Google Form, the college ERP, WhatsApp or
            a sheet, and never applied on the job board. They become ordinary applicants:
            same pipeline, rounds, exports and reporting.
          </p>
        </div>
        {onClose ? (
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
            <X className="size-4" />
          </Button>
        ) : null}
      </div>

      {err ? (
        <div
          role="alert"
          className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200"
        >
          {err}
        </div>
      ) : null}

      {/* ── choose a file ─────────────────────────────────────────────── */}
      <div className={card}>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="size-4" /> Template
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFile(f);
            }}
          />
          <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
            <FileUp className="size-4" /> Choose a file
          </Button>
          {fileName ? (
            <span className="text-sm text-slate-600">
              {fileName} · {rows.length} row{rows.length === 1 ? '' : 's'}
            </span>
          ) : (
            <span className="text-sm text-slate-500">CSV or Excel. A title row above the headers is fine.</span>
          )}
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="roster-stage" className={eyebrow}>
              Stage for rows with no stage of their own
            </label>
            <select
              id="roster-stage"
              value={defaultStage}
              onChange={(e) => {
                setDefaultStage(e.target.value);
                if (rows.length) void runPreview(rows);
              }}
              className={`mt-1 w-full ${inputCls}`}
            >
              <option value="">Applied</option>
              {/* STAGE_LABELS is declared in pipeline order, so its keys are the order
                  a TPO expects to read them in. */}
              {(Object.keys(STAGE_LABELS) as ApplicationStage[]).map((s) => (
                <option key={s} value={s}>
                  {STAGE_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="roster-note" className={eyebrow}>
              Where did this list come from
            </label>
            <input
              id="roster-note"
              value={sourceNote}
              onChange={(e) => setSourceNote(e.target.value)}
              placeholder="e.g. Infosys Google Form, 22 Oct"
              className={`mt-1 w-full ${inputCls}`}
            />
          </div>
        </div>
      </div>

      {/* ── what would happen ─────────────────────────────────────────── */}
      {preview ? (
        <div className={card}>
          <p className={eyebrow}>Before anything is written</p>
          <h3 className="mt-1 text-base font-bold text-navy">
            {preview.total} row{preview.total === 1 ? '' : 's'} read,{' '}
            {preview.importable} will be added
          </h3>

          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {SUMMARY_ORDER.map((o) => {
              const n = preview.counts[o] ?? 0;
              if (n === 0) return null;
              return (
                <div key={o} className="rounded-lg border border-slate-200 px-3 py-2">
                  <p className="text-[22px] font-extrabold leading-none text-navy tabular-nums">{n}</p>
                  <p className="mt-1 text-xs text-slate-500">{ROW_OUTCOME_LABELS[o]}</p>
                </div>
              );
            })}
          </div>

          {needsCollege ? (
            <div className="mt-4">
              <label htmlFor="roster-college" className={eyebrow}>
                College for the {preview.counts[ImportRowOutcome.NEW_STUDENT]} new student
                {preview.counts[ImportRowOutcome.NEW_STUDENT] === 1 ? '' : 's'} *
              </label>
              <select
                id="roster-college"
                value={collegeId}
                onChange={(e) => setCollegeId(e.target.value)}
                className={`mt-1 w-full max-w-md ${inputCls}`}
              >
                <option value="">Choose a college</option>
                {collegeOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-500">
                They are created as invited students of that college and emailed a set-up link.
              </p>
            </div>
          ) : null}

          {problems.length > 0 ? (
            <div className="mt-5">
              <p className={eyebrow}>
                {problems.length} row{problems.length === 1 ? '' : 's'} will not be added
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Every one is named below with its line number. Untick a row to leave it out
                of this import, fix it in your file and upload again, or go ahead and deal
                with them separately.
              </p>
              <ul className="mt-3 max-h-72 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200">
                {problems.map((r: PreviewedRow) => (
                  <li key={r.line} className={`flex items-start gap-3 px-3 py-2 ${excluded.has(r.line) ? 'opacity-50' : ''}`}>
                    <label className="flex shrink-0 items-center gap-2 pt-0.5">
                      <input
                        type="checkbox"
                        checked={!excluded.has(r.line)}
                        onChange={(e) =>
                          setExcluded((prev) => {
                            const next = new Set(prev);
                            if (e.target.checked) next.delete(r.line);
                            else next.add(r.line);
                            return next;
                          })
                        }
                        aria-label={`Include line ${r.line}`}
                        className="size-4 rounded border-slate-300"
                      />
                      <span className="w-10 text-xs text-slate-400 tabular-nums">L{r.line}</span>
                    </label>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${TONE[r.outcome]}`}
                    >
                      {ROW_OUTCOME_LABELS[r.outcome]}
                    </span>
                    <span className="min-w-0 flex-1 text-sm">
                      <span className="font-medium text-navy">
                        {r.fullName || r.email || r.rollNumber || 'unnamed'}
                      </span>
                      {r.reason ? (
                        <span className="block text-xs text-slate-500">{r.reason}</span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button onClick={() => void runImport()} disabled={!canImport || busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              Add {preview.importable} student{preview.importable === 1 ? '' : 's'}
            </Button>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={source === 'OFFLINE'}
                onChange={(e) => setSource(e.target.checked ? 'OFFLINE' : 'BULK_UPLOAD')}
                className="size-4 rounded border-slate-300"
              />
              These were offline registrations
            </label>
            {needsCollege && !collegeId ? (
              <span className="inline-flex items-center gap-1.5 text-sm text-amber-700">
                <AlertTriangle className="size-4" /> Choose a college first
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* ── what happened ─────────────────────────────────────────────── */}
      {result ? (
        <div className={card}>
          <p className="inline-flex items-center gap-2 text-base font-bold text-navy">
            <CheckCircle2 className="size-5 text-emerald-600" /> Added to the drive
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {[
              ['Added as applicants', result.attached],
              ['New accounts created', result.created],
              ['Skipped', result.skipped],
            ].map(([k, v]) => (
              <div key={String(k)} className="rounded-lg border border-slate-200 px-3 py-2">
                <p className="text-[22px] font-extrabold leading-none text-navy tabular-nums">{v}</p>
                <p className="mt-1 text-xs text-slate-500">{k}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-sm text-slate-600">
            They now appear in the applicant list, search, rounds, exports and reporting, marked
            as {source === 'OFFLINE' ? 'offline registrations' : 'a bulk upload'}.
          </p>
        </div>
      ) : null}
    </div>
  );
}
