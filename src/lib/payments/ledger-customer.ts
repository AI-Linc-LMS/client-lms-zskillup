import type { AdminTransactionDto } from '@/shared/dto/payments.dto';

/** The buyer's contact as one transactions-ledger row shows it. */
export interface LedgerCustomer {
  name: string | null;
  email: string | null;
  phone: string | null;
  /** Shown only when the phone was typed at checkout rather than saved on the profile. */
  phoneNote: string | null;
}

/**
 * The row's customer contact: the server-resolved customer* fields (live registered name,
 * current profile phone, …), or the legacy userName/email/phone on a backend that predates
 * them - never a mix of the two.
 *
 * "Predates them" means the keys are absent from the JSON; a present-but-null key is a
 * resolved answer of "we have none" and must NOT fall back to the legacy snapshot, or a
 * cleared phone would keep showing the old one.
 */
export function customerOf(t: AdminTransactionDto): LedgerCustomer {
  const resolved = t.customerName !== undefined || t.customerEmail !== undefined || t.customerPhone !== undefined;
  if (!resolved) return { name: t.userName, email: t.email, phone: t.phone, phoneNote: null };
  const phone = t.customerPhone ?? null;
  return {
    name: t.customerName ?? null,
    email: t.customerEmail ?? null,
    phone,
    phoneNote: phone && t.customerPhoneSource === 'CHECKOUT' ? 'from checkout' : null,
  };
}
