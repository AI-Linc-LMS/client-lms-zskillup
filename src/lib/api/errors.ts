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
