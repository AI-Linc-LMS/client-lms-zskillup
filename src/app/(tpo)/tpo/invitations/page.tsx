'use client';

import { useState } from 'react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { CheckCircle2, Upload, AlertCircle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { bulkInviteStudents } from '@/lib/api/tpo';
import type { TpoBulkInviteResult } from '@/shared';

/**
 * TPO bulk-invite by CSV (Implementation Plan Sprint 1 — POST /tpo/invitations).
 *
 * Accepts a CSV with the columns `email,fullName,rollNumber` (header row
 * optional). Lines are validated client-side and posted to the backend in a
 * single batch; the backend returns per-row outcomes that we render below.
 */

interface ParsedRow {
  email: string;
  fullName?: string;
  rollNumber?: string;
}

function parseCsv(raw: string): { rows: ParsedRow[]; errors: string[] } {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return { rows: [], errors: ['File is empty'] };

  // Detect optional header
  const firstCols = lines[0].split(',').map((c) => c.trim().toLowerCase());
  const hasHeader =
    firstCols.includes('email') || firstCols[0] === 'email address' || firstCols[0] === 'e-mail';
  const dataLines = hasHeader ? lines.slice(1) : lines;

  const rows: ParsedRow[] = [];
  const errors: string[] = [];
  dataLines.forEach((line, i) => {
    const [email, fullName, rollNumber] = line.split(',').map((c) => c.trim());
    if (!email) {
      errors.push(`Row ${i + 1}: missing email`);
      return;
    }
    rows.push({
      email,
      fullName: fullName || undefined,
      rollNumber: rollNumber || undefined,
    });
  });
  return { rows, errors };
}

export default function TpoInvitationsPage() {
  const [parsed, setParsed] = useState<ParsedRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [result, setResult] = useState<TpoBulkInviteResult | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    setServerError(null);
    setResult(null);
    const file = e.target.files?.[0];
    if (!file) return;
    const raw = await file.text();
    const { rows, errors } = parseCsv(raw);
    setParsed(rows);
    setParseErrors(errors);
  }

  async function onSubmit() {
    if (parsed.length === 0) return;
    setSubmitting(true);
    setServerError(null);
    try {
      const res = await bulkInviteStudents({ invitations: parsed });
      setResult(res);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Could not send invitations');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Placement Office', href: '/tpo/dashboard' },
          { label: 'Bulk invitations' },
        ]}
      />

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          TPO Console
        </p>
        <h1 className="mt-1 text-[28px] font-extrabold tracking-tight text-navy">
          Bulk-invite students
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Upload a CSV with columns: <code className="rounded bg-slate-100 px-1 text-xs">email,fullName,rollNumber</code>.
          We&apos;ll email each student a signup link and skip emails that already exist.
        </p>
      </div>

      {/* Step 1: upload */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-orange/10 text-orange ring-1 ring-orange/20">
            <Upload className="size-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-base font-bold text-navy">Step 1 · Upload CSV</p>
            <p className="text-xs text-slate-500">Header row is optional.</p>
          </div>
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm">
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={onFile}
            className="block w-full rounded-lg border border-slate-200 bg-white p-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-navy file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white"
          />
        </label>
        {parseErrors.length > 0 ? (
          <ul className="mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-700 ring-1 ring-amber-200">
            {parseErrors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        ) : null}
        {parsed.length > 0 ? (
          <p className="mt-3 text-sm text-slate-600">
            <span className="font-bold text-navy">{parsed.length}</span> rows parsed and ready to invite.
          </p>
        ) : null}
      </section>

      {/* Step 2: review + submit */}
      {parsed.length > 0 && !result ? (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-sky-50 text-sky-600 ring-1 ring-sky-100">
              <FileText className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-base font-bold text-navy">Step 2 · Review preview</p>
              <p className="text-xs text-slate-500">First 10 rows shown.</p>
            </div>
          </div>
          <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full min-w-[480px] text-sm">
              <thead className="bg-slate-50 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                <tr>
                  <th className="px-3 py-2 text-left">Email</th>
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-left">Roll number</th>
                </tr>
              </thead>
              <tbody>
                {parsed.slice(0, 10).map((r, i) => (
                  <tr key={`${r.email}-${i}`} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-medium text-navy">{r.email}</td>
                    <td className="px-3 py-2 text-slate-600">{r.fullName ?? '—'}</td>
                    <td className="px-3 py-2 text-slate-500">{r.rollNumber ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {serverError ? (
            <p role="alert" className="mt-3 rounded-md bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200">
              {serverError}
            </p>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button onClick={onSubmit} disabled={submitting}>
              {submitting ? 'Sending invitations…' : `Send ${parsed.length} invitations`}
            </Button>
            <Button variant="outline" onClick={() => setParsed([])}>
              Cancel
            </Button>
          </div>
        </section>
      ) : null}

      {/* Step 3: result */}
      {result ? (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
              <CheckCircle2 className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-base font-bold text-navy">Done</p>
              <p className="text-xs text-slate-500">
                {result.created} invited · {result.skipped} skipped
              </p>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full min-w-[480px] text-sm">
              <thead className="bg-slate-50 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                <tr>
                  <th className="px-3 py-2 text-left">Email</th>
                  <th className="px-3 py-2 text-left">Outcome</th>
                  <th className="px-3 py-2 text-left">Reason</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((r) => {
                  const Icon =
                    r.status === 'created'
                      ? CheckCircle2
                      : r.status === 'skipped'
                        ? AlertCircle
                        : AlertCircle;
                  const tone =
                    r.status === 'created'
                      ? 'text-emerald-600'
                      : r.status === 'skipped'
                        ? 'text-amber-600'
                        : 'text-red-600';
                  return (
                    <tr key={r.email} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-medium text-navy">{r.email}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${tone}`}>
                          <Icon className="size-3.5" aria-hidden="true" />
                          {r.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-500">{r.reason ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <Button
            variant="outline"
            onClick={() => {
              setParsed([]);
              setResult(null);
            }}
            className="mt-5"
          >
            Upload another batch
          </Button>
        </section>
      ) : null}
    </div>
  );
}
