'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { fetchGooglePhones, type GooglePhoneCandidate } from '@/lib/api/me';
import { loadGoogleIdentity, requestGooglePhoneAccessToken } from '@/lib/google/identity';
import { describeGooglePhoneFailure, phoneLabels } from '@/lib/profile/google-phone';

/**
 * "Use my Google phone" - shared by the profile Phone field and the pre-checkout prompt.
 * Only mount it when GET /me reports `googlePhoneFetchEnabled` (and the account is a
 * student, the only role PATCH /me accepts a phone from); with the switch off nothing here
 * renders anywhere.
 *
 * The hook asks Google for a phone-read token, hands it to POST /me/phone/google and keeps
 * only the resulting numbers. The token lives in a local variable for that one request -
 * never in state, a ref, storage or a log.
 */

export type GooglePhoneState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'none' }
  | { status: 'found'; phones: GooglePhoneCandidate[] }
  | { status: 'error'; message: string }
  /** The user's own choice (a cancelled consent) - a note, not a failure. */
  | { status: 'notice'; message: string }
  /** The server switch turned out to be off - hide the option. */
  | { status: 'disabled' };

export function useGooglePhone(loginHint?: string | null) {
  const [state, setState] = useState<GooglePhoneState>({ status: 'idle' });
  // A newer request (or a reset) makes an older one's late result a no-op.
  const seq = useRef(0);

  // Preload GIS so the click can open the consent popup synchronously (popup blockers).
  useEffect(() => {
    void loadGoogleIdentity();
    return () => {
      seq.current += 1;
    };
  }, []);

  /** Call directly from a click handler. */
  const request = useCallback(() => {
    const id = ++seq.current;
    setState({ status: 'loading' });
    void (async () => {
      try {
        const token = await requestGooglePhoneAccessToken({ loginHint });
        const phones = await fetchGooglePhones(token);
        if (id !== seq.current) return;
        setState(phones.length > 0 ? { status: 'found', phones } : { status: 'none' });
      } catch (err) {
        if (id !== seq.current) return;
        const failure = describeGooglePhoneFailure(err);
        if (failure.tone === 'info') toast(failure.message);
        else toast.error(failure.message);
        // A cancelled consent is a note, not an error - but it still renders inline, so the
        // pre-checkout modal never swallows the outcome behind a toast the user can miss.
        setState(
          failure.disabled
            ? { status: 'disabled' }
            : { status: failure.tone === 'info' ? 'notice' : 'error', message: failure.message },
        );
      }
    })();
  }, [loginHint]);

  const reset = useCallback(() => {
    seq.current += 1;
    setState({ status: 'idle' });
  }, []);

  return { state, request, reset };
}

/**
 * What Google returned: one number → "Use 98xxxxxx10?"; several → pick one; none → a
 * short note. `onUse` receives the normalised 10-digit number.
 */
export function GooglePhoneChoices({
  state,
  onUse,
  onCancel,
  useLabel = 'Use this number',
  busy = false,
  className,
}: {
  state: GooglePhoneState;
  onUse: (phone: string) => void;
  onCancel: () => void;
  useLabel?: string;
  busy?: boolean;
  className?: string;
}) {
  const groupId = useId();
  const phones = state.status === 'found' ? state.phones : [];
  const [picked, setPicked] = useState<string>('');
  const selected = phones.some((p) => p.phone === picked) ? picked : (phones[0]?.phone ?? '');
  const panelRef = useRef<HTMLDivElement & HTMLFieldSetElement>(null);

  // The choices replace the button the user just pressed - move focus to them so keyboard
  // and screen-reader users land on the question instead of the page top.
  const found = state.status === 'found';
  useEffect(() => {
    if (!found) return;
    panelRef.current?.querySelector<HTMLElement>('input:checked, button')?.focus();
  }, [found]);

  if (state.status === 'none') {
    return (
      <p role="status" className={cn('text-xs text-slate-500', className)}>
        No mobile number is saved on your Google account. Add it yourself instead.
      </p>
    );
  }
  if (state.status === 'error') {
    return (
      <p role="alert" className={cn('text-xs font-medium text-red-700', className)}>
        {state.message}
      </p>
    );
  }
  if (state.status === 'notice') {
    return (
      <p role="status" className={cn('text-xs text-slate-500', className)}>
        {state.message}
      </p>
    );
  }
  if (state.status !== 'found') return null;

  const labels = phoneLabels(phones.map((p) => p.phone));
  const actions = (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <Button type="button" size="sm" disabled={busy || !selected} onClick={() => onUse(selected)}>
        {useLabel}
      </Button>
      <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={onCancel}>
        Cancel
      </Button>
    </div>
  );

  if (phones.length === 1) {
    return (
      <div
        ref={panelRef}
        role="group"
        aria-labelledby={`${groupId}-q`}
        className={cn('rounded-xl border border-slate-200 bg-white p-4', className)}
      >
        <p id={`${groupId}-q`} className="text-sm text-navy">
          Use <span className="font-semibold tabular-nums">{labels[0]}</span>?
        </p>
        <p className="mt-0.5 text-xs text-slate-400">From your Google account</p>
        {actions}
      </div>
    );
  }

  return (
    <fieldset ref={panelRef} className={cn('rounded-xl border border-slate-200 bg-white p-4', className)}>
      <legend className="sr-only">Pick a number from your Google account</legend>
      <p aria-hidden className="text-sm font-semibold text-navy">
        Pick a number from your Google account
      </p>
      <div className="mt-2 space-y-2">
        {phones.map((p, i) => (
          <label
            key={p.phone}
            className={cn(
              'flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm text-navy transition-colors',
              selected === p.phone ? 'border-orange bg-orange/5' : 'border-slate-200 hover:bg-slate-50',
            )}
          >
            <input
              type="radio"
              name={`${groupId}-phone`}
              value={p.phone}
              checked={selected === p.phone}
              onChange={() => setPicked(p.phone)}
              className="size-4 accent-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/40"
            />
            <span className="font-semibold tabular-nums">{labels[i]}</span>
            {p.primary ? <span className="text-xs text-slate-400">Primary</span> : null}
          </label>
        ))}
      </div>
      {actions}
    </fieldset>
  );
}

/**
 * Profile Phone field add-on: "Use my Google phone" fills the field with the chosen number.
 * It never saves by itself - the page's one Save bar sends it through PATCH /me, which
 * normalises it and applies can-correct-never-clear like any typed edit.
 */
export function GooglePhoneFill({
  loginHint,
  value,
  savedValue,
  onFill,
}: {
  loginHint?: string | null;
  /** The field's current value and its last saved value - drive the "save to keep it" hint. */
  value: string;
  savedValue: string;
  onFill: (phone: string) => void;
}) {
  const { state, request, reset } = useGooglePhone(loginHint);
  const [filled, setFilled] = useState<string | null>(null);

  if (state.status === 'disabled') return null;
  const loading = state.status === 'loading';
  const unsavedFill = filled !== null && value === filled && value !== savedValue;

  return (
    <div className="space-y-2 pt-1">
      {state.status !== 'found' ? (
        // aria-disabled, not disabled: a disabled button drops keyboard focus mid-request.
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={loading ? undefined : request}
          aria-disabled={loading}
          aria-busy={loading}
          className={loading ? 'opacity-60' : undefined}
        >
          {loading ? <Loader2 className="animate-spin" aria-hidden /> : <Smartphone aria-hidden />}
          Use my Google phone
        </Button>
      ) : null}
      <GooglePhoneChoices
        state={state}
        onUse={(phone) => {
          reset();
          setFilled(phone);
          onFill(phone);
        }}
        onCancel={reset}
      />
      {unsavedFill ? (
        <p role="status" className="text-xs text-slate-400">
          Filled from your Google account. Save your profile to keep it.
        </p>
      ) : null}
    </div>
  );
}
