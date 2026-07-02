'use client';

import { useMemo, useRef, useState } from 'react';
import { AlertCircle, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Shared create/edit form for a College Registration Request (Batch 2). Collects
 * college details, TPO contact, subscription plan, and the student list (CSV
 * upload or paste), then hands a normalized payload to the parent, which owns the
 * API calls. `mode` distinguishes "save draft" from "save + submit for review".
 */

export interface CollegeRequestStudent {
  email: string;
  fullName?: string;
  rollNumber?: string;
}

export interface CollegeRequestFormValue {
  collegeName: string;
  collegeSlug: string;
  state: string;
  city: string;
  logoUrl: string;
  contactName: string;
  contactEmail: string;
  planName: string;
  seatLimit: number;
  durationMonths: number | '';
  students: CollegeRequestStudent[];
}

const EMPTY: CollegeRequestFormValue = {
  collegeName: '',
  collegeSlug: '',
  state: '',
  city: '',
  logoUrl: '',
  contactName: '',
  contactEmail: '',
  planName: '',
  seatLimit: 60,
  durationMonths: 12,
  students: [],
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseCsv(raw: string): { rows: CollegeRequestStudent[]; errors: string[] } {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return { rows: [], errors: ['File is empty'] };
  const firstCols = lines[0].split(',').map((c) => c.trim().toLowerCase());
  const hasHeader = firstCols.includes('email') || firstCols[0] === 'email address';
  const dataLines = hasHeader ? lines.slice(1) : lines;
  const rows: CollegeRequestStudent[] = [];
  const errors: string[] = [];
  dataLines.forEach((line, i) => {
    const [email, fullName, rollNumber] = line.split(',').map((c) => c.trim());
    if (!email) {
      errors.push(`Row ${i + 1}: missing email`);
      return;
    }
    rows.push({ email, fullName: fullName || undefined, rollNumber: rollNumber || undefined });
  });
  return { rows, errors };
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-slate-600">{label}</span>
      {children}
      {hint ? <span className="mt-0.5 block text-[11px] text-slate-400">{hint}</span> : null}
    </label>
  );
}

const inputCls =
  'mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-navy shadow-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange';

export function CollegeRequestForm({
  initial,
  busy,
  error,
  onSave,
  primaryLabel = 'Submit for review',
}: {
  initial?: Partial<CollegeRequestFormValue>;
  busy: boolean;
  error: string | null;
  onSave: (value: CollegeRequestFormValue, mode: 'draft' | 'submit') => void;
  primaryLabel?: string;
}) {
  const [v, setV] = useState<CollegeRequestFormValue>({ ...EMPTY, ...initial });
  const [slugTouched, setSlugTouched] = useState<boolean>(Boolean(initial?.collegeSlug));
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof CollegeRequestFormValue>(k: K, val: CollegeRequestFormValue[K]) =>
    setV((prev) => ({ ...prev, [k]: val }));

  const onName = (name: string) => {
    setV((prev) => ({
      ...prev,
      collegeName: name,
      collegeSlug: slugTouched ? prev.collegeSlug : slugify(name),
    }));
  };

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const { rows, errors } = parseCsv(await file.text());
    set('students', rows);
    setParseErrors(errors);
  }

  function onPaste(raw: string) {
    const { rows, errors } = parseCsv(raw);
    set('students', rows);
    setParseErrors(errors);
  }

  const valid = useMemo(
    () =>
      v.collegeName.trim().length >= 2 &&
      /^[a-z0-9-]+$/.test(v.collegeSlug) &&
      v.state.trim().length >= 2 &&
      v.city.trim().length >= 2 &&
      v.contactName.trim().length >= 2 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.contactEmail) &&
      v.planName.trim().length >= 2 &&
      v.students.length >= 1,
    [v],
  );

  return (
    <div className="space-y-6">
      {/* College details */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-bold text-navy">College details</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="College name">
            <input className={inputCls} value={v.collegeName} onChange={(e) => onName(e.target.value)} placeholder="VIT Vellore" />
          </Field>
          <Field label="Slug" hint="lowercase, digits, dashes — used in the college URL">
            <input
              className={inputCls}
              value={v.collegeSlug}
              onChange={(e) => {
                setSlugTouched(true);
                set('collegeSlug', e.target.value);
              }}
              placeholder="vit-vellore"
            />
          </Field>
          <Field label="State">
            <input className={inputCls} value={v.state} onChange={(e) => set('state', e.target.value)} placeholder="Tamil Nadu" />
          </Field>
          <Field label="City">
            <input className={inputCls} value={v.city} onChange={(e) => set('city', e.target.value)} placeholder="Vellore" />
          </Field>
          <Field label="Logo URL (optional)">
            <input className={inputCls} value={v.logoUrl} onChange={(e) => set('logoUrl', e.target.value)} placeholder="https://…" />
          </Field>
        </div>
      </section>

      {/* TPO contact */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-bold text-navy">TPO contact</h2>
        <p className="mt-1 text-xs text-slate-500">Receives the college login credentials once the subscription is activated.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Contact name">
            <input className={inputCls} value={v.contactName} onChange={(e) => set('contactName', e.target.value)} placeholder="Dr. Placement Officer" />
          </Field>
          <Field label="Contact email">
            <input className={inputCls} value={v.contactEmail} onChange={(e) => set('contactEmail', e.target.value)} placeholder="tpo@college.edu" />
          </Field>
        </div>
      </section>

      {/* Subscription plan */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-bold text-navy">Subscription plan</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Field label="Plan name">
            <input className={inputCls} value={v.planName} onChange={(e) => set('planName', e.target.value)} placeholder="Campus Pro" />
          </Field>
          <Field label="Seat limit">
            <input type="number" min={0} className={inputCls} value={v.seatLimit} onChange={(e) => set('seatLimit', Number(e.target.value))} />
          </Field>
          <Field label="Duration (months)">
            <input
              type="number"
              min={1}
              className={inputCls}
              value={v.durationMonths}
              onChange={(e) => set('durationMonths', e.target.value === '' ? '' : Number(e.target.value))}
            />
          </Field>
        </div>
      </section>

      {/* Student list */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-navy">Student list</h2>
            <p className="mt-1 text-xs text-slate-500">
              CSV columns: <code className="rounded bg-slate-100 px-1 text-[11px]">email,fullName,rollNumber</code> (header optional).
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
            {v.students.length} students
          </span>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={onFile} className="hidden" />
          <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload className="mr-1.5 size-4" /> Upload CSV
          </Button>
          <span className="text-xs text-slate-400">or paste below</span>
        </div>
        <textarea
          className={`${inputCls} mt-3 h-28 font-mono text-xs`}
          placeholder={'student1@college.edu,Asha Rao,21CS001\nstudent2@college.edu,Vikram N,21CS002'}
          onChange={(e) => onPaste(e.target.value)}
        />
        {parseErrors.length > 0 ? (
          <ul className="mt-2 rounded-md bg-amber-50 p-2 text-xs text-amber-700 ring-1 ring-amber-200">
            {parseErrors.slice(0, 5).map((e) => (
              <li key={e}>{e}</li>
            ))}
            {parseErrors.length > 5 ? <li>…and {parseErrors.length - 5} more</li> : null}
          </ul>
        ) : null}
        {v.students.length > 0 ? (
          <div className="mt-3 max-h-40 overflow-auto rounded-lg border border-slate-200">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-slate-50 text-[10px] uppercase tracking-widest text-slate-400">
                <tr>
                  <th className="px-3 py-1.5 text-left">Email</th>
                  <th className="px-3 py-1.5 text-left">Name</th>
                  <th className="px-3 py-1.5 text-left">Roll</th>
                </tr>
              </thead>
              <tbody>
                {v.students.slice(0, 20).map((s, i) => (
                  <tr key={`${s.email}-${i}`} className="border-t border-slate-100">
                    <td className="px-3 py-1.5 font-medium text-navy">{s.email}</td>
                    <td className="px-3 py-1.5 text-slate-600">{s.fullName ?? '—'}</td>
                    <td className="px-3 py-1.5 text-slate-500">{s.rollNumber ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      {error ? (
        <p role="alert" className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200">
          <AlertCircle className="size-4 shrink-0" /> {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={!valid || busy} onClick={() => onSave(v, 'submit')}>
          {busy ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null}
          {primaryLabel}
        </Button>
        <Button variant="outline" disabled={busy || v.collegeName.trim().length < 2} onClick={() => onSave(v, 'draft')}>
          Save draft
        </Button>
      </div>
    </div>
  );
}

export function toCreateBody(v: CollegeRequestFormValue) {
  return {
    collegeName: v.collegeName.trim(),
    collegeSlug: v.collegeSlug.trim(),
    state: v.state.trim(),
    city: v.city.trim(),
    logoUrl: v.logoUrl.trim() || undefined,
    contactName: v.contactName.trim(),
    contactEmail: v.contactEmail.trim().toLowerCase(),
    planName: v.planName.trim(),
    seatLimit: Number(v.seatLimit) || 0,
    durationMonths: v.durationMonths === '' ? undefined : Number(v.durationMonths),
    students: v.students.map((s) => ({
      email: s.email,
      fullName: s.fullName,
      rollNumber: s.rollNumber,
    })),
  };
}
