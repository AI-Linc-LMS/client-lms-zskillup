'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { updateMe, type ApiMe, type UpdateMePayload } from '@/lib/api/me';
import { ApiRequestError } from '@/lib/api/types';
import { BRANCH_OPTIONS, branchLabel, type BranchCode } from '@/lib/branch';

/**
 * One-time pre-assessment details gate. Before an assessment starts we make sure the
 * report will carry Student name, College, Department, Email and Contact number. Only
 * the fields the student is MISSING are asked; anything already on their profile (set
 * by them, or seeded by their college's CSV import) is shown locked and never re-asked.
 * Saved to the profile via PATCH /me, so it is a genuinely one-time step — the next
 * assessment sees the fields present and this never appears. The caller only mounts
 * this when at least one field is missing, so a fully-filled student never sees it.
 */

/** True when the profile is missing any of the five report fields. */
export function needsAssessmentDetails(me: ApiMe | null): boolean {
  if (!me) return false;
  const p = me.studentProfile;
  return (
    !me.fullName?.trim() ||
    !me.email?.trim() ||
    !p?.collegeName?.trim() ||
    !p?.branch ||
    !p?.phone?.trim()
  );
}

const inputCls =
  'mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy focus:border-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/30';
const labelCls = 'block text-[11px] font-semibold uppercase tracking-widest text-slate-500';

/** A field already on file: shown, locked, never editable (and never sent). */
function Locked({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className={labelCls}>{label}</span>
      <div className="mt-1 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-navy">
        <Lock className="size-3.5 text-slate-400" aria-hidden="true" />
        <span className="truncate">{value}</span>
      </div>
    </div>
  );
}

export function PreAssessmentDetails({
  me,
  onDone,
  onCancel,
}: {
  me: ApiMe;
  onDone: () => void;
  onCancel: () => void;
}) {
  const p = me.studentProfile;
  const needName = !me.fullName?.trim();
  const needCollege = !p?.collegeName?.trim();
  const needBranch = !p?.branch;
  const needPhone = !p?.phone?.trim();

  const [name, setName] = useState(me.fullName ?? '');
  const [college, setCollege] = useState(p?.collegeName ?? '');
  const [branch, setBranch] = useState<BranchCode | ''>(p?.branch ?? '');
  const [phone, setPhone] = useState(p?.phone ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const submit = async () => {
    if (needName && !name.trim()) return setError('Please enter your full name.');
    if (needCollege && !college.trim()) return setError('Please enter your college name.');
    if (needBranch && !branch) return setError('Please select your department.');
    if (needPhone && !/^[0-9+\-\s]{7,15}$/.test(phone.trim())) {
      return setError('Please enter a valid contact number.');
    }
    setBusy(true);
    setError(null);
    try {
      const patch: UpdateMePayload = {};
      if (needName) patch.fullName = name.trim();
      if (needCollege) patch.collegeName = college.trim();
      if (needBranch && branch) patch.branch = branch;
      if (needPhone) patch.phone = phone.trim();
      await updateMe(patch);
      onDone();
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : 'Could not save your details. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div aria-hidden className="absolute inset-0 bg-slate-900/50" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pad-title"
        className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-lg"
      >
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Before you start</p>
        <h2 id="pad-title" className="text-lg font-bold text-navy">Confirm your details</h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">
          These appear on your assessment report. You only need to do this once — we’ll save
          them to your profile and never ask again.
        </p>

        <div className="mt-5 space-y-4">
          {needName ? (
            <div>
              <label className={labelCls} htmlFor="pad-name">Student name</label>
              <input id="pad-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" className={inputCls} autoFocus />
            </div>
          ) : (
            <Locked label="Student name" value={me.fullName ?? ''} />
          )}

          {needCollege ? (
            <div>
              <label className={labelCls} htmlFor="pad-college">College name</label>
              <input id="pad-college" value={college} onChange={(e) => setCollege(e.target.value)} placeholder="Your college" className={inputCls} />
            </div>
          ) : (
            <Locked label="College name" value={p?.collegeName ?? ''} />
          )}

          {needBranch ? (
            <div>
              <label className={labelCls} htmlFor="pad-branch">Department</label>
              <select
                id="pad-branch"
                value={branch}
                onChange={(e) => setBranch(e.target.value as BranchCode | '')}
                className={inputCls}
              >
                <option value="">Select your department</option>
                {BRANCH_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <Locked label="Department" value={branchLabel(p?.branch)} />
          )}

          {/* Email is the account login — always shown, never editable. */}
          <Locked label="Email" value={me.email} />

          {needPhone ? (
            <div>
              <label className={labelCls} htmlFor="pad-phone">Contact number</label>
              <input id="pad-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile" inputMode="tel" className={inputCls} />
            </div>
          ) : (
            <Locked label="Contact number" value={p?.phone ?? ''} />
          )}
        </div>

        {error ? (
          <p role="alert" className="mt-4 rounded-md bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex items-center justify-end gap-3">
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
            Save &amp; start
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
