import { isValidPhone, normalizePhone } from '@/shared/assessment-details';
import type { ApiMe } from '@/lib/api/me';

/** What Razorpay Checkout opens prefilled with. */
export interface CheckoutPrefill {
  name?: string | null;
  email?: string | null;
  /** The buyer's mobile. Only ever sent to the widget as a valid, normalised 10-digit number. */
  contact?: string | null;
}

/** The normalised 10-digit mobile when `raw` passes the shared phone rule, else undefined -
 *  so a legacy or malformed profile value never reaches the payment widget. */
export function checkoutContact(raw: string | null | undefined): string | undefined {
  return isValidPhone(raw) ? normalizePhone(raw) : undefined;
}

/** Checkout prefill from GET /me: registered name, email and the saved profile phone. */
export function checkoutPrefillFromMe(
  me: Pick<ApiMe, 'fullName' | 'email' | 'studentProfile'> | null | undefined,
): CheckoutPrefill {
  return {
    name: me?.fullName ?? null,
    email: me?.email ?? null,
    contact: checkoutContact(me?.studentProfile?.phone) ?? null,
  };
}

/** What the Razorpay widget opens prefilled with - Razorpay's own `prefill` shape. */
export interface WidgetPrefill {
  name?: string;
  email?: string;
  contact?: string;
}

/** The widget's `prefill`: blanks omitted, and `contact` only as a valid normalised mobile -
 *  never an invalid value the buyer would have to notice and fix inside Razorpay. */
export function widgetPrefill(prefill?: CheckoutPrefill): WidgetPrefill {
  const contact = checkoutContact(prefill?.contact);
  return {
    ...(prefill?.name ? { name: prefill.name } : {}),
    ...(prefill?.email ? { email: prefill.email } : {}),
    ...(contact ? { contact } : {}),
  };
}
