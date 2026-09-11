'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { updateMe, type ApiMe, type UpdateMePayload } from '@/lib/api/me';
import { apiFieldErrors, describeApiError } from '@/lib/api/types';
import { BRANCH_OPTIONS, branchLabel } from '@/lib/branch';
import {
  DETAIL_TEXT_MAX,
  PHONE_INPUT_MAX,
  cleanDetailText,
  isBranchCode,
  isValidDetailText,
  isValidPhone,
  missingAssessmentDetails,
  normalizePhone,
  resolvedCollegeName,
  type DetailKey,
} from '@/shared/assessment-details';

/**
 * One-time pre-assessment details gate. Before an assessment starts we make sure the
 * report will carry Student name, College, Department, Email and Contact number. Only
 * the fields the student is MISSING (or holds an invalid value for, e.g. a legacy
 * 5-digit phone) are asked; a valid value already on their profile is shown locked
 * and never re-asked. The rules live in shared/assessment-details (the same ones the
 * server enforces). Saved to the profile via PATCH /me, so it is a genuinely one-time
 * step — the next assessment sees the fields present and this never appears.
 *
 * Accessible modal: focus moves in on open and is trapped, Escape cancels, Enter
 * submits, and each field carries aria-invalid + aria-describedby for its messages.
 */

type EditableKey = Exclude<DetailKey, 'email'>;
type FieldErrors = Partial<Record<EditableKey, string>>;

const FIELD_ID: Record<EditableKey, string> = {
  fullName: 'pad-name',
  collegeName: 'pad-college',
  branch: 'pad-branch',
  phone: 'pad-phone',
};

/** Server field names (PATCH /me errors) → the dialog field they belong to. */
const FIELD_OF: Record<string, EditableKey> = {
  fullName: 'fullName',
  collegeName: 'collegeName',
  collegeId: 'collegeName',
  college: 'collegeName',
  branch: 'branch',
  phone: 'phone',
};

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const inputCls =
  'mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy focus:border-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/30';
const invalidCls = 'border-red-300 focus:border-red-400';
const labelCls = 'block text-[11px] font-semibold uppercase tracking-widest text-slate-500';

/** A valid field already on file: shown, locked, never editable (and never sent). */
function Locked({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className={labelCls}>{label}</span>
      <div className="mt-1 flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-navy">
        <Lock className="mt-0.5 size-3.5 shrink-0 text-slate-400" aria-hidden="true" />
        <span className="min-w-0 [overflow-wrap:anywhere]">{value}</span>
        <span className="sr-only">(on file)</span>
      </div>
    </div>
  );
}

/** Hint (why a saved value is editable) + error for one field, ids for aria-describedby. */
function FieldNote({ id, error, hint }: { id: string; error?: string; hint?: string | null }) {
  return (
    <>
      {hint ? (
        <p id={`${id}-hint`} className="mt-1 text-xs text-amber-700 [overflow-wrap:anywhere]">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-xs font-medium text-red-700">
          {error}
        </p>
      ) : null}
    </>
  );
}

function describedBy(id: string, error?: string, hint?: string | null): string | undefined {
  return [hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined;
}

export function PreAssessmentDetails({
  me,
  onDone,
  onCancel,
  forceEditable,
  notice,
  onSubmitGesture,
}: {
  me: ApiMe;
  /** Receives the profile PATCH /me returned, so the caller never re-asks saved fields. */
  onDone: (updated: ApiMe) => void;
  onCancel: () => void;
  /** Fields the SERVER reported missing (PROFILE_DETAILS_REQUIRED) - editable even when
   *  they look valid locally. */
  forceEditable?: DetailKey[];
  /** Shown above the fields (e.g. the server still reports details missing). */
  notice?: string | null;
  /** Runs synchronously inside the submit gesture, before any await (fullscreen). */
  onSubmitGesture?: () => void;
}) {
  const p = me.studentProfile;
  const storedName = me.fullName ?? '';
  const storedCollege = resolvedCollegeName(me) ?? '';
  const b = p?.branch;
  const storedBranch = isBranchCode(b) ? b : '';
  const storedPhone = p?.phone ?? '';

  // Frozen at open, so a field never flips to "locked" while the student types in it.
  const [editable] = useState<ReadonlySet<DetailKey>>(
    () => new Set<DetailKey>([...missingAssessmentDetails(me), ...(forceEditable ?? [])]),
  );
  // Email is the account login - it can't be fixed here, only reported.
  const emailMissing = editable.has('email');

  const [name, setName] = useState(storedName);
  const [college, setCollege] = useState(storedCollege);
  const [branch, setBranch] = useState<string>(storedBranch);
  const [phone, setPhone] = useState(storedPhone);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const dialogRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const busyRef = useRef(busy);
  busyRef.current = busy;
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  // Move focus in on open (first editable field, else the primary button) and hand it
  // back to whatever opened the dialog if that is still on the page afterwards.
  useEffect(() => {
    if (!mounted) return;
    const root = dialogRef.current;
    if (!root) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const field = root.querySelector<HTMLElement>('input:not([disabled]), select:not([disabled])');
    const primary = primaryRef.current && !primaryRef.current.disabled ? primaryRef.current : cancelRef.current;
    (field ?? primary)?.focus();
    return () => {
      if (opener?.isConnected) opener.focus();
    };
  }, [mounted]);

  // Escape = Cancel; Tab / Shift+Tab stay inside the dialog. On the document so a stray
  // backdrop click can't let focus wander back into the page behind.
  useEffect(() => {
    if (!mounted) return;
    const onKey = (e: KeyboardEvent) => {
      const root = dialogRef.current;
      if (!root) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        if (!busyRef.current) onCancelRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const nodes = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (nodes.length === 0) {
        e.preventDefault();
        return;
      }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement;
      const inside = active instanceof Node && root.contains(active);
      if (e.shiftKey && (!inside || active === first)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (!inside || active === last)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mounted]);

  const clearFieldError = (k: EditableKey) =>
    setFieldErrors((f) => (f[k] ? { ...f, [k]: undefined } : f));

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy || emailMissing) return;
    const next: FieldErrors = {};
    if (editable.has('fullName') && !isValidDetailText(name)) {
      next.fullName = 'Enter your full name (at least 2 letters).';
    }
    if (editable.has('collegeName') && !isValidDetailText(college)) {
      next.collegeName = 'Enter your college name (at least 2 letters).';
    }
    if (editable.has('branch') && !isBranchCode(branch)) next.branch = 'Select your department.';
    if (editable.has('phone') && !isValidPhone(phone)) next.phone = 'Enter a valid 10-digit mobile number.';
    setFieldErrors(next);
    setError(null);
    const firstBad = (Object.keys(FIELD_ID) as EditableKey[]).find((k) => next[k]);
    if (firstBad) {
      document.getElementById(FIELD_ID[firstBad])?.focus();
      return;
    }
    // Still inside the submit gesture, before any await - the only moment the browser
    // honours a fullscreen request.
    onSubmitGesture?.();
    setBusy(true);
    try {
      // Normalized values only (rules 1-2), and only the fields this dialog asked for.
      const patch: UpdateMePayload = {};
      if (editable.has('fullName')) patch.fullName = cleanDetailText(name);
      if (editable.has('collegeName')) patch.collegeName = cleanDetailText(college);
      if (editable.has('branch') && isBranchCode(branch)) patch.branch = branch;
      if (editable.has('phone')) patch.phone = normalizePhone(phone);
      const updated = await updateMe(patch);
      onDone(updated);
    } catch (err) {
      const byField: FieldErrors = {};
      const serverFields = Object.entries(apiFieldErrors(err));
      for (const [field, msg] of serverFields) {
        const key = FIELD_OF[field];
        if (key && editable.has(key)) byField[key] = msg;
      }
      setFieldErrors(byField);
      const allShown = serverFields.length > 0 && Object.keys(byField).length === serverFields.length;
      setError(
        allShown
          ? 'Please fix the highlighted field.'
          : describeApiError(err, 'Could not save your details. Please try again.'),
      );
    } finally {
      setBusy(false);
    }
  };

  if (!mounted) return null;

  const nameHint =
    editable.has('fullName') && storedName.trim() ? `Saved as “${storedName}” — please enter your full name.` : null;
  const collegeHint =
    editable.has('collegeName') && storedCollege.trim()
      ? `Saved as “${storedCollege}” — please enter your full college name.`
      : null;
  const phoneHint =
    editable.has('phone') && storedPhone.trim()
      ? `Saved as “${storedPhone}” — please enter a valid 10-digit mobile number.`
      : null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div aria-hidden className="absolute inset-0 bg-slate-900/50" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pad-title"
        aria-describedby="pad-desc"
        className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-lg"
      >
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Before you start</p>
        <h2 id="pad-title" className="text-lg font-bold text-navy">Confirm your details</h2>
        <p id="pad-desc" className="mt-1 text-sm leading-relaxed text-slate-600">
          These appear on your assessment report. You only need to do this once — we’ll save
          them to your profile and never ask again.
        </p>
        {notice ? (
          <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm font-medium text-amber-800 ring-1 ring-amber-200">
            {notice}
          </p>
        ) : null}

        <form onSubmit={onSubmit} noValidate className="mt-5">
          <div className="space-y-4">
            {editable.has('fullName') ? (
              <div>
                <label className={labelCls} htmlFor="pad-name">Student name</label>
                <input
                  id="pad-name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    clearFieldError('fullName');
                  }}
                  placeholder="Your full name"
                  autoComplete="name"
                  maxLength={DETAIL_TEXT_MAX}
                  aria-invalid={!!fieldErrors.fullName}
                  aria-describedby={describedBy('pad-name', fieldErrors.fullName, nameHint)}
                  className={cn(inputCls, fieldErrors.fullName && invalidCls)}
                />
                <FieldNote id="pad-name" error={fieldErrors.fullName} hint={nameHint} />
              </div>
            ) : (
              <Locked label="Student name" value={storedName} />
            )}

            {editable.has('collegeName') ? (
              <div>
                <label className={labelCls} htmlFor="pad-college">College name</label>
                <input
                  id="pad-college"
                  value={college}
                  onChange={(e) => {
                    setCollege(e.target.value);
                    clearFieldError('collegeName');
                  }}
                  placeholder="Your college"
                  autoComplete="organization"
                  maxLength={DETAIL_TEXT_MAX}
                  aria-invalid={!!fieldErrors.collegeName}
                  aria-describedby={describedBy('pad-college', fieldErrors.collegeName, collegeHint)}
                  className={cn(inputCls, fieldErrors.collegeName && invalidCls)}
                />
                <FieldNote id="pad-college" error={fieldErrors.collegeName} hint={collegeHint} />
              </div>
            ) : (
              <Locked label="College name" value={storedCollege} />
            )}

            {editable.has('branch') ? (
              <div>
                <label className={labelCls} htmlFor="pad-branch">Department</label>
                <select
                  id="pad-branch"
                  value={branch}
                  onChange={(e) => {
                    setBranch(e.target.value);
                    clearFieldError('branch');
                  }}
                  aria-invalid={!!fieldErrors.branch}
                  aria-describedby={describedBy('pad-branch', fieldErrors.branch)}
                  className={cn(inputCls, fieldErrors.branch && invalidCls)}
                >
                  <option value="">Select your department</option>
                  {BRANCH_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <FieldNote id="pad-branch" error={fieldErrors.branch} />
              </div>
            ) : (
              <Locked label="Department" value={branchLabel(storedBranch)} />
            )}

            {/* Email is the account login — always shown, never editable. */}
            <div>
              <Locked label="Email" value={me.email?.trim() ? me.email : 'Not on file'} />
              {emailMissing ? (
                <p className="mt-1 text-xs font-medium text-red-700">
                  Your account has no email on file, so this can’t be completed here. Please
                  contact your placement team.
                </p>
              ) : null}
            </div>

            {editable.has('phone') ? (
              <div>
                <label className={labelCls} htmlFor="pad-phone">Contact number</label>
                <input
                  id="pad-phone"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    clearFieldError('phone');
                  }}
                  placeholder="10-digit mobile"
                  inputMode="tel"
                  autoComplete="tel"
                  maxLength={PHONE_INPUT_MAX}
                  aria-invalid={!!fieldErrors.phone}
                  aria-describedby={describedBy('pad-phone', fieldErrors.phone, phoneHint)}
                  className={cn(inputCls, fieldErrors.phone && invalidCls)}
                />
                <FieldNote id="pad-phone" error={fieldErrors.phone} hint={phoneHint} />
              </div>
            ) : (
              <Locked label="Contact number" value={storedPhone} />
            )}
          </div>

          {error ? (
            <p role="alert" className="mt-4 rounded-md bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200">
              {error}
            </p>
          ) : null}

          <div className="mt-6 flex items-center justify-end gap-3">
            <Button ref={cancelRef} type="button" variant="ghost" onClick={onCancel} disabled={busy}>
              Cancel
            </Button>
            <Button ref={primaryRef} type="submit" disabled={busy || emailMissing}>
              {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
              Save &amp; start
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
