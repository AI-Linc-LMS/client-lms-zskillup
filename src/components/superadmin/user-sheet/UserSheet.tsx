'use client';

import { useDeferredValue, useMemo, useState } from 'react';
import { AlertTriangle, Download, FileSpreadsheet, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusPill, type StatusTone } from '@/components/student/StatusPill';
import {
  ACCOUNT_STATUS_OPTIONS,
  FilterSearch,
  FilterSelect,
  ListPagination,
} from '@/components/superadmin/UserListControls';
import { recordUserSheetExport } from '@/lib/api/admin';
import { describeError } from '@/lib/api/errors';
import { ApiRequestError } from '@/lib/api/types';
import { formatDateTimeSecondsIST, formatTimeIST } from '@/lib/format';
import {
  EMPTY_FILTERS,
  NO_COLLEGE,
  collegeOptions,
  filterSheetRows,
  hasActiveFilters,
  type SheetFilters,
  type SheetPaidFilter,
} from './sheet-model';
import { runUserSheetExport } from './sheet-export';
import { saveUserSheet, type SheetFileFormat } from './sheet-file';
import { UserSheetTable } from './UserSheetTable';
import { useLiveUserSheet, type LiveState } from './useLiveUserSheet';

const PAGE_SIZE = 100;

const LIVE_PILL: Record<LiveState, { tone: StatusTone; label: string; hint: string }> = {
  connecting: { tone: 'info', label: 'Connecting', hint: 'Loading the latest snapshot.' },
  live: { tone: 'positive', label: 'Live', hint: 'Refreshes every 20 seconds while this tab is open.' },
  paused: { tone: 'neutral', label: 'Paused', hint: 'Live updates pause while this tab is in the background.' },
  retrying: { tone: 'warning', label: 'Reconnecting', hint: 'The last refresh failed; retrying with a longer wait.' },
  stopped: { tone: 'negative', label: 'Stopped', hint: 'Live updates are off. Use Sync now to reload.' },
};

const ROLE_OPTIONS = [
  { value: '', label: 'All roles' },
  { value: 'STUDENT', label: 'Student' },
  { value: 'COLLEGE_ADMIN', label: 'College Admin' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
];

const PAID_OPTIONS: { value: SheetPaidFilter; label: string }[] = [
  { value: '', label: 'Paid: All' },
  { value: 'PAID', label: 'Paid' },
  { value: 'UNPAID', label: 'Unpaid' },
  { value: 'COLLEGE_ACCESS', label: 'Unpaid: College access' },
  { value: 'COMPLIMENTARY', label: 'Unpaid: Complimentary' },
  { value: 'NA', label: 'Not applicable (staff)' },
];

/** Uppercase label (§4.3), in slate-500: slate-400 fails WCAG AA contrast at this size. */
const LABEL = 'text-[10px] font-semibold uppercase tracking-widest text-slate-500';

type SelectFilters = Omit<SheetFilters, 'search'>;

/**
 * Super Admin live user sheet: every user in one table, kept current by background
 * deltas (see useLiveUserSheet), with client-side search / filters / pagination over the
 * whole dataset and CSV / Excel export of the filtered rows from a fresh snapshot. Each
 * download is recorded in the audit trail with the exact number of rows in the file
 * (see sheet-export). All values are rendered as the server computed them.
 */
export function UserSheet() {
  const sheet = useLiveUserSheet();

  const [searchInput, setSearchInput] = useState('');
  const search = useDeferredValue(searchInput);
  const [selects, setSelects] = useState<SelectFilters>({
    role: EMPTY_FILTERS.role,
    status: EMPTY_FILTERS.status,
    paid: EMPTY_FILTERS.paid,
    college: EMPTY_FILTERS.college,
  });
  const [page, setPage] = useState(0);
  const [exporting, setExporting] = useState<SheetFileFormat | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  /** Non-blocking export outcome: nothing matched, or the file saved but was not logged. */
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const filters = useMemo<SheetFilters>(() => ({ ...selects, search }), [selects, search]);
  const filtered = useMemo(() => filterSheetRows(sheet.rows, filters), [sheet.rows, filters]);
  const colleges = useMemo(() => collegeOptions(sheet.rows), [sheet.rows]);

  const collegeSelectOptions = useMemo(() => {
    const opts = [
      { value: '', label: 'All colleges' },
      { value: NO_COLLEGE, label: 'No college' },
      ...colleges.map((c) => ({ value: c.name, label: `${c.name} (${c.count.toLocaleString('en-IN')})` })),
    ];
    // Keep a chosen college selectable even if no user carries it any more.
    if (selects.college && selects.college !== NO_COLLEGE && !colleges.some((c) => c.name === selects.college)) {
      opts.push({ value: selects.college, label: `${selects.college} (0)` });
    }
    return opts;
  }, [colleges, selects.college]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = useMemo(
    () => filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE),
    [filtered, safePage],
  );

  const setSelect = <K extends keyof SelectFilters>(key: K, value: SelectFilters[K]) => {
    setSelects((prev) => ({ ...prev, [key]: value }));
    setPage(0);
  };

  const filtersActive = hasActiveFilters(filters);
  const live = LIVE_PILL[sheet.liveState];
  const busy = sheet.syncing || exporting !== null;

  const onExport = async (format: SheetFileFormat) => {
    setExporting(format);
    setExportError(null);
    setExportNotice(null);
    try {
      // A fresh snapshot, so the file is the latest data. The filters are the ones on
      // screen, with the search box exactly as typed. The export is recorded (exact row
      // count, format, filters) only after the file was generated, and never holds it up.
      const outcome = await runUserSheetExport(
        format,
        { ...selects, search: searchInput },
        { fetchSnapshot: sheet.fetchForExport, saveFile: saveUserSheet, record: recordUserSheetExport },
      );
      if (outcome.status === 'empty') {
        setExportNotice(
          outcome.filtered
            ? 'Nothing to export for these filters: no users match them.'
            : 'Nothing to export: there are no users yet.',
        );
      } else if (outcome.logged === 'failed') {
        setExportNotice('Export saved, but it couldn’t be logged.');
      }
      // logged 'unsupported' (404): the backend predates export logging - nothing to show.
    } catch (err) {
      setExportError(
        err instanceof ApiRequestError && (err.status === 429 || err.code === 'RATE_LIMITED')
          ? 'Too many requests right now. Wait a minute, then export again.'
          : describeError(err, 'The export failed. Please try again.'),
      );
    } finally {
      setExporting(null);
    }
  };

  if (!sheet.loaded) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {sheet.loadError ? (
          <div role="alert" className="flex flex-col items-center gap-3 py-10 text-center">
            <AlertTriangle className="size-6 text-red-600" aria-hidden />
            <p className="text-sm font-medium text-red-700">{sheet.loadError}</p>
            <Button variant="outline" size="sm" onClick={() => void sheet.syncNow()} disabled={sheet.syncing}>
              {sheet.syncing ? <Loader2 className="animate-spin" /> : <RefreshCw />}
              Retry
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
            <Loader2 className="size-5 animate-spin" aria-hidden />
            Loading every user…
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Polite announcement of what a background refresh changed. */}
      <p className="sr-only" aria-live="polite">
        {sheet.announcement}
      </p>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" aria-label="Sheet controls">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className={LABEL}>Live user sheet</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <span title={live.hint}>
                <StatusPill tone={live.tone} label={live.label} />
              </span>
              <span className="sr-only">{live.hint}</span>
              {sheet.syncedAt && (
                <span className="text-sm text-slate-600" title={formatDateTimeSecondsIST(sheet.syncedAt)}>
                  Last synced {formatTimeIST(sheet.syncedAt, { seconds: true })}
                </span>
              )}
              <span className="text-sm text-slate-500">
                {sheet.rows.length.toLocaleString('en-IN')} users
                {filtersActive && ` · ${filtered.length.toLocaleString('en-IN')} match`}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => void sheet.syncNow()} disabled={busy}>
              {sheet.syncing && !exporting ? <Loader2 className="animate-spin" /> : <RefreshCw />}
              Sync now
            </Button>
            <Button variant="outline" size="sm" onClick={() => void onExport('csv')} disabled={busy}>
              {exporting === 'csv' ? <Loader2 className="animate-spin" /> : <Download />}
              Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => void onExport('xlsx')} disabled={busy}>
              {exporting === 'xlsx' ? <Loader2 className="animate-spin" /> : <FileSpreadsheet />}
              Export Excel
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <FilterSearch
            label="Search users"
            placeholder="Search name, email, phone, college, cohort…"
            value={searchInput}
            onChange={(v) => {
              setSearchInput(v);
              setPage(0);
            }}
          />
          <FilterSelect
            label="Filter by role"
            value={selects.role}
            onChange={(v) => setSelect('role', v)}
            options={ROLE_OPTIONS}
          />
          <FilterSelect
            label="Filter by account status"
            value={selects.status}
            onChange={(v) => setSelect('status', v)}
            options={ACCOUNT_STATUS_OPTIONS}
          />
          <FilterSelect
            label="Filter by paid status"
            value={selects.paid}
            onChange={(v) => setSelect('paid', PAID_OPTIONS.find((o) => o.value === v)?.value ?? '')}
            options={PAID_OPTIONS}
          />
          <FilterSelect
            label="Filter by college"
            value={selects.college}
            onChange={(v) => setSelect('college', v)}
            options={collegeSelectOptions}
          />
          {filtersActive && (
            <Button
              variant="ghost"
              size="sm"
              className="self-center"
              onClick={() => {
                setSearchInput('');
                setSelects({ role: '', status: '', paid: '', college: '' });
                setPage(0);
              }}
            >
              Clear filters
            </Button>
          )}
        </div>

        {sheet.notice && (
          <p
            role="status"
            className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 ring-1 ring-amber-200"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>{sheet.notice}</span>
          </p>
        )}
        {exportNotice && (
          <p
            role="status"
            className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 ring-1 ring-amber-200"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>{exportNotice}</span>
          </p>
        )}
        {exportError && (
          <p role="alert" className="mt-4 rounded-md bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200">
            {exportError}
          </p>
        )}
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm" aria-label="Users">
        {filtered.length === 0 ? (
          <p className="py-16 text-center text-sm text-slate-500">
            {sheet.rows.length === 0 ? 'No users yet.' : 'No users match these filters.'}
          </p>
        ) : (
          <UserSheetTable rows={pageRows} highlighted={sheet.highlighted} busy={sheet.syncing} />
        )}
        <ListPagination
          page={safePage}
          pageCount={pageCount}
          pageSize={PAGE_SIZE}
          total={filtered.length}
          onPage={setPage}
        />
      </section>
    </div>
  );
}
