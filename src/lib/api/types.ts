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
