'use client';

import { createContext, useCallback, useContext, useId, useRef, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Loader2, Smartphone, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DialogShell } from '@/components/superadmin/assessment-wizard/DialogShell';
import { GooglePhoneChoices, useGooglePhone } from '@/components/student/GooglePhone';
import { getMe, updateMe, type ApiMe } from '@/lib/api/me';
import { describeApiError } from '@/lib/api/types';
import { loadGoogleIdentity } from '@/lib/google/identity';
import { checkoutContact, type CheckoutPrefill } from '@/lib/payments/checkout-contact';
import { notifyProfileUpdated } from '@/lib/profile-events';

/**
 * Settles the mobile number Razorpay Checkout opens with, just before the widget opens.
 *
 *   1. A valid phone the caller already has (from GET /me) → used as-is.
 *   2. Else the buyer's saved profile phone (a fresh GET /me) → used.
 *   3. Else, ONLY for a student while `googlePhoneFetchEnabled` is on, a compact prompt
 *      offers "Use my Google phone" (saved through PATCH /me) or "Continue to payment".
 *      It never blocks paying (SMS OTP is on hold); skipping silences it for the rest of
 *      the session. Closing it (Esc / ✕ / backdrop) cancels the purchase.
 *
 * With the switch off - or outside the student area, where no provider is mounted - the
 * flow is exactly the old one plus a valid profile phone in the prefill.
 */

/** The prefill to open checkout with, or null when the buyer closed the prompt (cancel). */
export type ResolveCheckoutContact = (
  prefill: CheckoutPrefill | undefined,
  opts?: { forCollege?: boolean },
) => Promise<CheckoutPrefill | null>;

type PromptResult = { kind: 'saved'; contact: string } | { kind: 'skip' } | { kind: 'closed' };

const CheckoutContactContext = createContext<ResolveCheckoutContact | null>(null);

/** No provider (e.g. the TPO console): pass the caller's prefill through, phone validated. */
const passThrough: ResolveCheckoutContact = async (prefill) => ({
  ...prefill,
  contact: checkoutContact(prefill?.contact) ?? null,
});

export function useCheckoutContact(): ResolveCheckoutContact {
  return useContext(CheckoutContactContext) ?? passThrough;
}

export function CheckoutPhoneProvider({ children }: { children: ReactNode }) {
  const [prompt, setPrompt] = useState<{ me: ApiMe; settle: (r: PromptResult) => void } | null>(null);
  const skipped = useRef(false);

  const resolve = useCallback<ResolveCheckoutContact>(async (prefill, opts) => {
    // The control that started checkout, read before any await (the caller disables it
    // while busy), so a cancelled prompt can hand focus back to it.
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const given = checkoutContact(prefill?.contact);
    if (given) return { ...prefill, contact: given };
    // A college (B2B) order is bought by staff, who have no student profile phone to save.
    if (opts?.forCollege) return { ...prefill, contact: null };

    const me = await getMe().catch(() => null);
    const base: CheckoutPrefill = {
      ...prefill,
      name: prefill?.name || me?.fullName || null,
      email: prefill?.email || me?.email || null,
    };
    const saved = checkoutContact(me?.studentProfile?.phone);
    if (saved) return { ...base, contact: saved };
    if (!me?.googlePhoneFetchEnabled || me.role !== 'STUDENT' || skipped.current) {
      return { ...base, contact: null };
    }

    void loadGoogleIdentity(); // warm GIS so the prompt's button can open Google's popup at once
    const result = await new Promise<PromptResult>((settle) => setPrompt({ me, settle }));
    setPrompt(null);
    if (result.kind === 'closed') {
      refocusWhenEnabled(opener);
      return null;
    }
    if (result.kind === 'skip') {
      skipped.current = true;
      return { ...base, contact: null };
    }
    return { ...base, contact: result.contact };
  }, []);

  return (
    <CheckoutContactContext.Provider value={resolve}>
      {children}
      {prompt ? <CheckoutPhonePrompt me={prompt.me} onResult={prompt.settle} /> : null}
    </CheckoutContactContext.Provider>
  );
}

/** Focus `el` once its busy state clears (a disabled button cannot take focus). */
function refocusWhenEnabled(el: HTMLElement | null) {
  if (!el || el === document.body) return;
  let frames = 0;
  const attempt = () => {
    if (!el.isConnected) return;
    if (!el.matches(':disabled')) el.focus();
    else if (++frames < 60) requestAnimationFrame(attempt);
  };
  requestAnimationFrame(attempt);
}

function CheckoutPhonePrompt({ me, onResult }: { me: ApiMe; onResult: (r: PromptResult) => void }) {
  const titleId = useId();
  const google = useGooglePhone(me.email);
  const [saving, setSaving] = useState(false);
  const close = useCallback(() => onResult({ kind: 'closed' }), [onResult]);

  const save = async (phone: string) => {
    setSaving(true);
    try {
      // PATCH /me normalises the phone, applies can-correct-never-clear, and answers with
      // the refreshed GET /me payload - the stored number is what checkout opens with.
      const updated = await updateMe({ phone });
      notifyProfileUpdated();
      toast.success('Mobile number saved to your profile.');
      onResult({ kind: 'saved', contact: checkoutContact(updated.studentProfile?.phone) ?? phone });
    } catch (err) {
      toast.error(describeApiError(err, 'Could not save your number. You can still continue to payment.'));
      setSaving(false);
    }
  };

  const status = google.state.status;
  const loading = status === 'loading';

  return (
    <DialogShell open onClose={close} labelledBy={titleId} maxWidth="max-w-md" dismissible={!saving}>
      <div className="overflow-y-auto p-6">
        <div className="flex items-start gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-orange-50 text-orange-600 ring-1 ring-orange-100">
            <Smartphone className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Before you pay</p>
            <h2 id={titleId} className="mt-1 text-base font-bold text-navy">
              Add your mobile number
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              Keep a mobile number on your profile so we can reach you about this payment. You can fill
              it from your Google account, or continue without it.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={close}
            disabled={saving}
            aria-label="Close and cancel payment"
            className="-mr-2 -mt-2 shrink-0"
          >
            <X />
          </Button>
        </div>

        <GooglePhoneChoices
          className="mt-4"
          state={google.state}
          onUse={(phone) => void save(phone)}
          onCancel={google.reset}
          useLabel={saving ? 'Saving…' : 'Save and continue'}
          busy={saving}
        />

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onResult({ kind: 'skip' })} disabled={saving}>
            Continue to payment
          </Button>
          {status !== 'found' && status !== 'disabled' ? (
            // aria-disabled, not disabled: a disabled button drops keyboard focus mid-request.
            <Button
              type="button"
              onClick={loading ? undefined : google.request}
              aria-disabled={loading}
              aria-busy={loading}
              className={loading ? 'opacity-60' : undefined}
              data-autofocus
            >
              {loading ? <Loader2 className="animate-spin" aria-hidden /> : <Smartphone aria-hidden />}
              Use my Google phone
            </Button>
          ) : null}
        </div>
      </div>
    </DialogShell>
  );
}
