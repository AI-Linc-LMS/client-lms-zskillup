/**
 * Frontend transport types. The envelope shapes (`ApiResponse`, `ApiError`) are
 * the SHARED contract from `@/shared` (ADR-011) - re-exported here so API code
 * has one import site. `ApiRequestError` is the FE-only throwable the client
 * raises for non-2xx responses; it carries the stable backend error `code`.
 */
import type { ApiError, ApiResponse } from '@/shared';

export type { ApiResponse, ApiError };

export class ApiRequestError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;
  readonly requestId?: string;

  constructor(status: number, body: Partial<ApiError>) {
    super(body.message ?? `Request failed with status ${status}`);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = body.code ?? 'UNKNOWN';
    this.details = body.details;
    this.requestId = body.requestId;
  }
}

/**
 * A human-readable message for an API error, naming the offending FIELDS when the
 * server sent them.
 *
 * The ValidationPipe returns `details` as { field: [messages] }, but only the
 * generic "Request validation failed" was ever shown - so an operator staring at
 * a filled-in form had no way to tell WHICH field the server objected to. This
 * turns that into "Request validation failed - subtopicSlug: ...".
 */
export function describeApiError(err: unknown, fallback: string): string {
  if (!(err instanceof ApiRequestError)) return fallback;
  const details = err.details;
  if (details && typeof details === 'object' && !Array.isArray(details)) {
    const parts = Object.entries(details as Record<string, unknown>)
      .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join('; ') : String(msgs)}`)
      .filter(Boolean);
    if (parts.length > 0) return `${err.message} - ${parts.join(' | ')}`;
  }
  return err.message || fallback;
}
