/**
 * SHARED CONTRACT — DUPLICATED ACROSS BOTH REPOS (ADR-011).
 * Mirrored byte-for-byte at the same path in the other repo
 * (backend-repo/src/shared & frontend-repo/src/shared). Change both together.
 *
 * Standard API envelope (ADR-007 / DATA_FLOW §1). Every backend response is
 * wrapped in one of these. Endpoint payload types are generated from the OpenAPI
 * spec (openapi-typescript) on the frontend; these envelopes are the transport
 * contract that wraps them.
 */

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
}

export interface ApiResponse<T> {
  data: T;
  meta?: {
    requestId?: string;
    pagination?: PaginationMeta;
  };
}

/** Error body shape (DATA_FLOW §1 / §5). `code` is a stable machine-readable string. */
export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
  requestId: string;
}
