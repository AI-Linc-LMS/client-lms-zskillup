import { isValidPhone, normalizePhone } from '@/shared/assessment-details';
import { ApiRequestError } from '@/lib/api/types';
import { GoogleConsentError } from '@/lib/google/identity';
import type { GooglePhoneCandidate } from '@/lib/api/me';

/**
 * Pure helpers for "Use my Google phone": cleaning the candidates, masking a number for a
 * confirm prompt, and turning every failure into one user-facing message. No React, no I/O.
 */

/** Valid numbers only (shared phone rule, normalised), de-duplicated, primary first. */
export function cleanGooglePhones(list: readonly { phone?: unknown; primary?: unknown }[]): GooglePhoneCandidate[] {
  const byPhone = new Map<string, GooglePhoneCandidate>();
  for (const item of list) {
    if (typeof item?.phone !== 'string' || !isValidPhone(item.phone)) continue;
    const phone = normalizePhone(item.phone);
    const primary = item.primary === true;
    const seen = byPhone.get(phone);
    if (!seen) byPhone.set(phone, { phone, primary });
    else if (primary) seen.primary = true;
  }
  // Stable sort: primary first, Google's order otherwise.
  return [...byPhone.values()].sort((a, b) => Number(b.primary) - Number(a.primary));
}

/** "9876543210" → "98xxxxxx10" - enough to recognise, not to read over a shoulder. */
export function maskPhone(phone: string): string {
  if (phone.length <= 4) return phone;
  return `${phone.slice(0, 2)}${'x'.repeat(phone.length - 4)}${phone.slice(-2)}`;
}

/** Masked labels for a list, falling back to the full number when two masks collide. */
export function phoneLabels(phones: readonly string[]): string[] {
  const masks = phones.map(maskPhone);
  return phones.map((phone, i) => (masks.indexOf(masks[i]) === masks.lastIndexOf(masks[i]) ? masks[i] : phone));
}

export interface GooglePhoneFailure {
  message: string;
  /** `info` for a user's own choice (cancelled consent), `error` otherwise. */
  tone: 'error' | 'info';
  /** The server switch is off - hide the option rather than offer a retry. */
  disabled?: boolean;
}

/** Every way the Google phone fetch can fail → what to tell the user. */
export function describeGooglePhoneFailure(err: unknown): GooglePhoneFailure {
  if (err instanceof GoogleConsentError) {
    switch (err.reason) {
      case 'cancelled':
        return { tone: 'info', message: 'Google phone access was cancelled. You can add your number yourself.' };
      case 'popup_blocked':
        return { tone: 'error', message: 'Your browser blocked the Google window. Allow pop-ups for this site and try again.' };
      case 'scope_denied':
        return { tone: 'error', message: 'Google did not share your phone number. Tick the phone permission to use it here.' };
      case 'timeout':
        return { tone: 'error', message: 'Google did not respond in time. Please try again.' };
      case 'not_configured':
        return { tone: 'error', message: 'Using your Google phone is not available right now.', disabled: true };
      default:
        return { tone: 'error', message: 'Could not reach Google right now. Please try again, or add your number yourself.' };
    }
  }
  if (err instanceof ApiRequestError) {
    switch (err.code) {
      case 'FEATURE_DISABLED':
        return { tone: 'error', message: 'Using your Google phone is not available right now.', disabled: true };
      case 'GOOGLE_TOKEN_INVALID':
        return { tone: 'error', message: 'Google could not confirm access to your phone number. Please try again.' };
      case 'GOOGLE_UNAVAILABLE':
        return { tone: 'error', message: 'Could not reach Google right now. Please try again, or add your number yourself.' };
    }
    if (err.status === 429) {
      return { tone: 'error', message: 'Too many attempts. Please wait a minute and try again.' };
    }
  }
  return { tone: 'error', message: 'Could not fetch your Google phone. Please try again.' };
}
