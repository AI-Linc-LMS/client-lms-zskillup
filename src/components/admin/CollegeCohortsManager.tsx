'use client';

import { useEffect, useState } from 'react';
import { Loader2, Mail, Plus, Search, Upload, UserPlus, Users } from 'lucide-react';
import {
  assignStudentsToCohort,
  createCollegeCohort,
  getCollegeCohorts,
  inviteCollegeStudents,
} from '@/lib/api/admin-cohorts';
import { listStudentReports, type AdminStudentReportRow } from '@/lib/api/admin';
import { Button } from '@/components/ui/button';
import { StatusPill, type StatusTone } from '@/components/student/StatusPill';
import type { CohortDto, TpoBulkInviteResult } from '@/shared';

const inputCls =
  'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy focus:border-orange focus:outline-none focus-visible:ring-2 focus-visible:ring-orange/30';

type InviteRow = { email: string; fullName?: string; rollNumber?: string; branch?: string };

/** Minimal RFC-4180-ish CSV parser: handles quoted fields, escaped `""`, and CRLF. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (ch !== '\r') {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim().length > 0));
}

function findCol(header: string[], names: string[]): number {
  for (const n of names) {
    const exact = header.findIndex((h) => h === n);
    if (exact >= 0) return exact;
  }
  for (const n of names) {
    const partial = header.findIndex((h) => h.includes(n));
    if (partial >= 0) return partial;
  }
  return -1;
}

/** Parse CSV text into invitation rows. Detects a header row (Name/Email/Roll/Branch,
 *  case-insensitive) and maps columns; otherwise falls back to positional order. Caps at 500. */
function parseInvitations(text: string): InviteRow[] {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];
  const first = rows[0].map((c) => c.trim());
  const firstLower = first.map((c) => c.toLowerCase());
  const looksLikeData = first.some((c) => c.includes('@'));
  const hasHeader = !looksLikeData && firstLower.some((c) => c.includes('email'));

  let emailIdx = 0;
  let nameIdx = 1;
  let rollIdx = 2;
  let branchIdx = 3;
  let dataRows = rows;
  if (hasHeader) {
    emailIdx = findCol(firstLower, ['email', 'e-mail']);
    nameIdx = findCol(firstLower, ['fullname', 'full name', 'name']);
    rollIdx = findCol(firstLower, ['rollnumber', 'roll number', 'roll no', 'rollno', 'roll']);
    branchIdx = findCol(firstLower, ['branch', 'department', 'dept']);
    dataRows = rows.slice(1);
  }

  const out: InviteRow[] = [];
  for (const r of dataRows) {
    const get = (i: number) => (i >= 0 && i < r.length ? r[i].trim() : '');
    const email = get(emailIdx);
    if (!email) continue;
    out.push({
      email,
      fullName: get(nameIdx) || undefined,
      rollNumber: get(rollIdx) || undefined,
      branch: get(branchIdx) || undefined,
    });
    if (out.length >= 500) break;
  }
  return out;
}

const ROW_TONE: Record<string, StatusTone> = {
  created: 'positive',
  skipped: 'neutral',
  invalid: 'negative',
};

/**
 * Admin cohort + student management for a single college. Configuration that used
 * to live in the TPO console - TPOs are now read-only. Self-fetching. Students can
 * be added by CSV import (invites new accounts) or by selecting existing college
 * students into a cohort.
 */
export function CollegeCohortsManager({ collegeId, onChange }: { collegeId: string; onChange?: () => void }) {
  const [cohorts, setCohorts] = useState<CohortDto[] | null>(null);

  // Create-cohort form
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [year, setYear] = useState('');
  const [branch, setBranch] = useState('');
  const [busyCohort, setBusyCohort] = useState(false);

  // Add-students shared
  const [tab, setTab] = useState<'import' | 'existing'>('import');
  const [cohortId, setCohortId] = useState('');
  const [err, setErr] = useState<string | null>(null);

  // CSV import
  const [invitations, setInvitations] = useState<InviteRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [busyInvite, setBusyInvite] = useState(false);
  const [inviteResult, setInviteResult] = useState<TpoBulkInviteResult | null>(null);

  // Select existing
  const [search, setSearch] = useState('');
  const [roster, setRoster] = useState<AdminStudentReportRow[] | null>(null);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busyAssign, setBusyAssign] = useState(false);
  const [assignMsg, setAssignMsg] = useState<string | null>(null);

  const load = () =>
    getCollegeCohorts(collegeId)
      .then(setCohorts)
      .catch(() => setCohorts([]));

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collegeId]);

  // Roster search (debounced) - only while the "Select existing" tab is open.
  useEffect(() => {
    if (tab !== 'existing') return;
    let alive = true;
    setRosterLoading(true);
    const t = setTimeout(() => {
      listStudentReports({ collegeId, search: search.trim() || undefined, limit: 100 })
        .then((r) => alive && setRoster(r.rows))
        .catch(() => alive && setRoster([]))
        .finally(() => alive && setRosterLoading(false));
    }, 300);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [tab, search, collegeId]);

  async function addCohort() {
    if (name.trim().length < 2) {
      setErr('Cohort name needs at least 2 characters');
      return;
    }
    setBusyCohort(true);
    setErr(null);
    try {
      await createCollegeCohort(collegeId, {
        name: name.trim(),
        description: description.trim() || undefined,
        year: year ? Number(year) : undefined,
        branch: branch.trim() || undefined,
      });
      setName('');
      setDescription('');
      setYear('');
      setBranch('');
      await load();
      onChange?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not create cohort');
    } finally {
      setBusyCohort(false);
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    setErr(null);
    setInviteResult(null);
    try {
      const text = await file.text();
      const parsed = parseInvitations(text);
      if (parsed.length === 0) {
        setErr('No valid rows found. Expected columns: Email, Name, Roll, Branch.');
        setInvitations([]);
        setFileName('');
        return;
      }
      setInvitations(parsed);
      setFileName(file.name);
    } catch {
      setErr('Could not read that file.');
    }
  }

  async function invite() {
    if (invitations.length === 0) {
      setErr('Upload a CSV with at least one student row');
      return;
    }
    setBusyInvite(true);
    setErr(null);
    setInviteResult(null);
    try {
      const res = await inviteCollegeStudents(collegeId, { invitations, cohortId: cohortId || undefined });
      setInviteResult(res);
      setInvitations([]);
      setFileName('');
      await load();
      onChange?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not send invitations');
    } finally {
      setBusyInvite(false);
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function assign() {
    if (!cohortId) {
      setErr('Pick a cohort to assign students into');
      return;
    }
    if (selected.size === 0) {
      setErr('Select at least one student');
      return;
    }
    setBusyAssign(true);
    setErr(null);
    setAssignMsg(null);
    try {
      const res = await assignStudentsToCohort(collegeId, cohortId, [...selected]);
      setAssignMsg(`${res.assigned} student${res.assigned === 1 ? '' : 's'} assigned to the cohort.`);
      setSelected(new Set());
      await load();
      onChange?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not assign students');
    } finally {
      setBusyAssign(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* Cohorts */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-base font-bold text-navy">
          <Users className="size-4 text-orange" /> Cohorts / batches
        </h2>
        {cohorts === null ? (
          <div className="grid h-24 place-items-center">
            <Loader2 className="size-5 animate-spin text-slate-400" />
          </div>
        ) : cohorts.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No cohorts yet - create the first batch below.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {cohorts.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-navy">{c.name}</p>
                  {c.description ? (
                    <p className="truncate text-xs text-slate-500">{c.description}</p>
                  ) : null}
                  <p className="text-xs text-slate-400">
                    {[c.branch, c.year].filter(Boolean).join(' · ') || 'All branches'}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold tabular-nums text-slate-600">
                  {c.studentCount} student{c.studentCount === 1 ? '' : 's'}
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-semibold text-slate-600">
              Name
              <input className={`mt-1 ${inputCls}`} value={name} onChange={(e) => setName(e.target.value)} placeholder="B.Tech CSE 2026" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs font-semibold text-slate-600">
                Year
                <input type="number" className={`mt-1 ${inputCls}`} value={year} onChange={(e) => setYear(e.target.value)} placeholder="2026" />
              </label>
              <label className="block text-xs font-semibold text-slate-600">
                Branch
                <input className={`mt-1 ${inputCls}`} value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="CSE" />
              </label>
            </div>
          </div>
          <label className="block text-xs font-semibold text-slate-600">
            Description <span className="font-normal text-slate-400">(optional)</span>
            <textarea
              className={`mt-1 min-h-[64px] ${inputCls} py-2`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Placement batch of 2026, morning shift…"
              maxLength={500}
            />
          </label>
          <Button onClick={() => void addCohort()} disabled={busyCohort} size="sm">
            {busyCohort ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Add cohort
          </Button>
        </div>
      </section>

      {/* Add students */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-base font-bold text-navy">
          <UserPlus className="size-4 text-orange" /> Add students
        </h2>

        {/* Tabs (§4.12 underline tabs) */}
        <div className="mt-3 flex gap-5 border-b border-slate-200">
          {(['import', 'existing'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTab(t);
                setErr(null);
              }}
              className={
                tab === t
                  ? 'border-b-2 border-orange pb-2 text-sm font-semibold text-navy'
                  : 'border-b-2 border-transparent pb-2 text-sm font-medium text-slate-400 hover:text-slate-600'
              }
            >
              {t === 'import' ? 'Import CSV' : 'Select existing'}
            </button>
          ))}
        </div>

        {/* Cohort target (shared) */}
        <label className="mt-4 block text-xs font-semibold text-slate-600">
          Cohort {tab === 'existing' ? <span className="text-orange">(required)</span> : <span className="font-normal text-slate-400">(optional)</span>}
          <select value={cohortId} onChange={(e) => setCohortId(e.target.value)} className={`mt-1 ${inputCls}`} aria-label="Cohort">
            <option value="">{tab === 'existing' ? 'Select a cohort…' : 'No cohort'}</option>
            {(cohorts ?? []).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>

        {tab === 'import' ? (
          <div className="mt-4 space-y-3">
            <p className="text-xs text-slate-500">
              Upload a CSV with columns <code className="rounded bg-slate-100 px-1">Email, Name, Roll, Branch</code>{' '}
              (Name/Roll/Branch optional). Invited students receive a set-password email. Up to 500 rows.
            </p>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-6 text-sm font-semibold text-slate-600 hover:border-orange hover:text-navy">
              <Upload className="size-4" />
              {fileName || 'Choose a CSV file'}
              <input type="file" accept=".csv,text/csv" onChange={(e) => void handleFile(e)} className="sr-only" />
            </label>

            {invitations.length > 0 ? (
              <div className="rounded-lg border border-slate-200">
                <p className="border-b border-slate-100 px-3 py-2 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                  Preview · {invitations.length} student{invitations.length === 1 ? '' : 's'}
                </p>
                <ul className="max-h-40 divide-y divide-slate-100 overflow-y-auto">
                  {invitations.slice(0, 50).map((r, i) => (
                    <li key={`${r.email}-${i}`} className="flex items-center justify-between gap-2 px-3 py-1.5 text-xs">
                      <span className="min-w-0 truncate font-medium text-navy">{r.email}</span>
                      <span className="shrink-0 text-slate-500">{r.fullName ?? '-'}</span>
                    </li>
                  ))}
                </ul>
                {invitations.length > 50 ? (
                  <p className="px-3 py-1.5 text-[11px] text-slate-400">+{invitations.length - 50} more…</p>
                ) : null}
              </div>
            ) : null}

            <Button onClick={() => void invite()} disabled={busyInvite || invitations.length === 0} size="sm">
              {busyInvite ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />} Send invites
            </Button>

            {inviteResult ? (
              <div className="space-y-2">
                <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200">
                  {inviteResult.created} invited
                  {inviteResult.skipped ? ` · ${inviteResult.skipped} already registered` : ''}.
                </p>
                <ul className="max-h-40 space-y-1 overflow-y-auto">
                  {inviteResult.rows.map((row, i) => (
                    <li key={`${row.email}-${i}`} className="flex items-center justify-between gap-2 text-xs">
                      <span className="min-w-0 truncate text-slate-600">{row.email}</span>
                      <span className="flex shrink-0 items-center gap-1.5">
                        {row.reason ? <span className="text-slate-400">{row.reason}</span> : null}
                        <StatusPill tone={ROW_TONE[row.status] ?? 'neutral'} label={row.status} />
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search students by name or email…"
                className={`${inputCls} pl-9`}
                aria-label="Search students"
              />
            </div>

            <div className="rounded-lg border border-slate-200">
              {rosterLoading && roster === null ? (
                <div className="grid h-24 place-items-center">
                  <Loader2 className="size-5 animate-spin text-slate-400" />
                </div>
              ) : (roster ?? []).length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-slate-500">No students match.</p>
              ) : (
                <ul className="max-h-56 divide-y divide-slate-100 overflow-y-auto">
                  {(roster ?? []).map((s) => (
                    <li key={s.id}>
                      <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={selected.has(s.id)}
                          onChange={() => toggle(s.id)}
                          className="size-4 shrink-0 accent-orange"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-navy">{s.fullName ?? '-'}</p>
                          <p className="truncate text-xs text-slate-500">{s.email}</p>
                        </div>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={() => void assign()} disabled={busyAssign || selected.size === 0} size="sm">
                {busyAssign ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />} Assign {selected.size > 0 ? `(${selected.size})` : ''}
              </Button>
              {assignMsg ? <span className="text-sm font-semibold text-emerald-700">{assignMsg}</span> : null}
            </div>
          </div>
        )}
      </section>

      {err ? <p className="text-sm font-semibold text-red-600 lg:col-span-2">{err}</p> : null}
    </div>
  );
}
