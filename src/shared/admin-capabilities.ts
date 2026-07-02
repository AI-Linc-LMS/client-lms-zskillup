/**
 * SHARED CONTRACT — DUPLICATED ACROSS BOTH REPOS (ADR-011).
 * Mirrored byte-for-byte at the same path in the other repo
 * (backend-repo/src/shared & frontend-repo/src/shared). Change both together.
 *
 * Per-ADMIN capability flags (Phase 2 — Admin/Super-Admin program). These gate
 * sensitive operations for the internal ADMIN role. SUPER_ADMIN implicitly holds
 * ALL capabilities; STUDENT / COLLEGE_ADMIN hold NONE. Flags are set by a
 * SUPER_ADMIN on an ADMIN account and enforced server-side by CapabilitiesGuard
 * via the `@RequireCapability()` decorator, and surfaced to the frontend through
 * `GET /me` for UI gating (the server remains the authority).
 *
 * Enforcement is per-endpoint: a capability only gates an operation once a route
 * carries `@RequireCapability(...)`. Phase 2 wires `canDeleteStudents` (DELETE
 * /admin/students/:id); the remaining flags are stored + assignable now and get
 * their guards as their features land — canBroadcast (Phase 3 broadcasts),
 * canManageSubscriptions (Phase 4 subscriptions), canViewFinancials (Phase 7).
 */

/** The four capability flags, keyed by their camelCase wire name. */
export interface AdminCapabilities {
  /** May soft-delete student accounts. */
  canDeleteStudents: boolean;
  /** May create / extend / cancel college subscriptions. */
  canManageSubscriptions: boolean;
  /** May send broadcast notifications to users. */
  canBroadcast: boolean;
  /** May view revenue / financial dashboards. */
  canViewFinancials: boolean;
}

/** Ordered list of capability keys (stable — drives UI toggles + iteration). */
export const ADMIN_CAPABILITY_KEYS = [
  'canDeleteStudents',
  'canManageSubscriptions',
  'canBroadcast',
  'canViewFinancials',
] as const;

export type AdminCapabilityKey = (typeof ADMIN_CAPABILITY_KEYS)[number];

/** Human-readable labels for the capability-toggle UI. */
export const ADMIN_CAPABILITY_LABELS: Record<AdminCapabilityKey, string> = {
  canDeleteStudents: 'Delete students',
  canManageSubscriptions: 'Manage subscriptions',
  canBroadcast: 'Send broadcasts',
  canViewFinancials: 'View financials',
};

/** One-line descriptions shown beside each toggle. */
export const ADMIN_CAPABILITY_DESCRIPTIONS: Record<AdminCapabilityKey, string> = {
  canDeleteStudents: 'Soft-delete student accounts from the platform.',
  canManageSubscriptions: 'Create, extend, or cancel college subscriptions.',
  canBroadcast: 'Send platform-wide or targeted broadcast notifications.',
  canViewFinancials: 'Access the revenue / financial dashboards.',
};

/** DB column name for each capability (snake_case on `auth.users`). */
export const ADMIN_CAPABILITY_COLUMNS: Record<AdminCapabilityKey, string> = {
  canDeleteStudents: 'can_delete_students',
  canManageSubscriptions: 'can_manage_subscriptions',
  canBroadcast: 'can_broadcast',
  canViewFinancials: 'can_view_financials',
};

/** All-false — the default for a freshly-created ADMIN (and every non-admin). */
export const EMPTY_ADMIN_CAPABILITIES: AdminCapabilities = {
  canDeleteStudents: false,
  canManageSubscriptions: false,
  canBroadcast: false,
  canViewFinancials: false,
};

/** All-true — the effective set for a SUPER_ADMIN. */
export const ALL_ADMIN_CAPABILITIES: AdminCapabilities = {
  canDeleteStudents: true,
  canManageSubscriptions: true,
  canBroadcast: true,
  canViewFinancials: true,
};

/**
 * Resolve the EFFECTIVE capabilities for a principal. SUPER_ADMIN always holds
 * all; ADMIN holds whatever flags are set on the account; everyone else holds
 * none. `role` is compared as a string so this stays enum-import-free.
 */
export function effectiveCapabilities(
  role: string,
  flags: Partial<AdminCapabilities> | null | undefined,
): AdminCapabilities {
  if (role === 'SUPER_ADMIN') return { ...ALL_ADMIN_CAPABILITIES };
  if (role === 'ADMIN') {
    return {
      canDeleteStudents: flags?.canDeleteStudents ?? false,
      canManageSubscriptions: flags?.canManageSubscriptions ?? false,
      canBroadcast: flags?.canBroadcast ?? false,
      canViewFinancials: flags?.canViewFinancials ?? false,
    };
  }
  return { ...EMPTY_ADMIN_CAPABILITIES };
}
