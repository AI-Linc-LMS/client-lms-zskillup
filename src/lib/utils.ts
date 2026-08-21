import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge conditional + Tailwind classes (shadcn convention). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Constrain a URL that came from user or admin input before it becomes an href or an
 * img src. Anything that is not http(s) - javascript:, data:, vbscript: - returns null
 * so the caller renders nothing rather than a hostile link.
 */
export function safeHttpUrl(url: string | null | undefined): string | null {
  const t = (url ?? '').trim();
  return /^https?:\/\//i.test(t) ? t : null;
}
