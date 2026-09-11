import { ApiRequestError } from '@/lib/api/types';

/**
 * Turn an unknown thrown value into a user-facing message: the server's message
 * for a structured ApiRequestError, otherwise the caller's fallback. Keeps
 * backend error copy (e.g. "A super-admin account cannot be suspended") visible
 * to the operator without leaking stack traces.
 */
export function describeError(err: unknown, fallback: string): string {
  return err instanceof ApiRequestError && err.message ? err.message : fallback;
}

/**
 * {@link describeError}, except a 403 gets the caller's plain-language `forbidden`
 * copy instead of the server's (often a bare "Forbidden"). For screens where a scoped
 * operator can reach a row outside their scope - e.g. a college-limited admin acting
 * on another college's drive. Keys on the status as well as the envelope's FORBIDDEN
 * code, because a scope rule may carry a more specific code.
 */
export function describeAccessError(err: unknown, forbidden: string, fallback: string): string {
  if (err instanceof ApiRequestError && (err.status === 403 || err.code === 'FORBIDDEN')) return forbidden;
  return describeError(err, fallback);
}
