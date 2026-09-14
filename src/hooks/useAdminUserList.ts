'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  listAdminUsers,
  type AdminUserListSort,
  type AdminUserRow,
  type PaidStatus,
} from '@/lib/api/admin';
import { ApiRequestError } from '@/lib/api/types';
import { describeError } from '@/lib/api/errors';

/** Pause after the last keystroke before the search goes to the server. */
export const USER_SEARCH_DEBOUNCE_MS = 300;

export interface UserListSortState {
  key: AdminUserListSort;
  order: 'asc' | 'desc';
}

/** The server default: newest registrations first. */
const DEFAULT_SORT: UserListSortState = { key: 'createdAt', order: 'desc' };

/**
 * State + fetching for the paginated admin users table (GET /admin/users), shared by
 * the Super Admin and Admin consoles:
 *   - the search box is debounced, and every filter / sort / search change returns to
 *     page 1;
 *   - a newer request aborts the one in flight, and a response that is no longer the
 *     latest is dropped, so a slow reply can never overwrite a newer one;
 *   - paidStatusVisible comes from the server. If the Paid filter is refused (403 - the
 *     capability was revoked mid-session) the filter is cleared and the column hidden.
 */
export function useAdminUserList(pageSize: number) {
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [paidStatusVisible, setPaidStatusVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [role, setRoleState] = useState('');
  const [status, setStatusState] = useState('');
  const [paid, setPaidState] = useState<PaidStatus | ''>('');
  const [sort, setSortState] = useState<UserListSortState>(DEFAULT_SORT);
  const [page, setPage] = useState(0);

  const seq = useRef(0);
  const inFlight = useRef<AbortController | null>(null);

  useEffect(() => {
    const next = searchInput.trim();
    if (next === search) return;
    const t = setTimeout(() => {
      setSearch(next);
      setPage(0);
    }, USER_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInput, search]);

  const fetchUsers = useCallback(async () => {
    const id = ++seq.current;
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;
    setLoading(true);
    setError(null);
    try {
      const data = await listAdminUsers(
        {
          search: search || undefined,
          role: role || undefined,
          status: status || undefined,
          paid: paid || undefined,
          // Omit the defaults so the request stays identical to the pre-sort contract.
          sort: sort.key === DEFAULT_SORT.key ? undefined : sort.key,
          order: sort.key === DEFAULT_SORT.key ? undefined : sort.order,
          limit: pageSize,
          offset: page * pageSize,
        },
        { signal: controller.signal },
      );
      if (id !== seq.current) return;
      setRows(data.rows);
      setTotal(data.total);
      setPaidStatusVisible(data.paidStatusVisible === true);
      setLoaded(true);
    } catch (err) {
      if (id !== seq.current || controller.signal.aborted) return;
      if (err instanceof ApiRequestError && err.status === 403 && paid) {
        setPaidStatusVisible(false);
        setNotice('Paid status is not available for your account, so the Paid filter was cleared.');
        setPaidState('');
        setPage(0);
        return;
      }
      setError(describeError(err, 'Failed to load users. Please try again.'));
    } finally {
      if (id === seq.current) setLoading(false);
    }
  }, [search, role, status, paid, sort, page, pageSize]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  useEffect(() => () => inFlight.current?.abort(), []);

  // A page that emptied under us (the last user on it was filtered out by an action in
  // the drawer) steps back to the last page that still has rows.
  useEffect(() => {
    if (loaded && !loading && !error && rows.length === 0 && page > 0 && total > 0) {
      setPage(Math.max(0, Math.ceil(total / pageSize) - 1));
    }
  }, [loaded, loading, error, rows.length, page, total, pageSize]);

  const withPageReset =
    <T>(set: (v: T) => void) =>
    (v: T) => {
      set(v);
      setPage(0);
      setNotice(null);
    };

  /** Last-login header toggle: latest first → oldest first → back to newest accounts. */
  const cycleLastLoginSort = () => {
    setSortState((s) =>
      s.key !== 'lastLoginAt'
        ? { key: 'lastLoginAt', order: 'desc' }
        : s.order === 'desc'
          ? { key: 'lastLoginAt', order: 'asc' }
          : DEFAULT_SORT,
    );
    setPage(0);
  };

  const updateRow = (id: string, patch: Partial<AdminUserRow>) =>
    setRows((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));

  return {
    rows,
    total,
    paidStatusVisible,
    loaded,
    loading,
    error,
    notice,
    searchInput,
    setSearchInput,
    role,
    setRole: withPageReset(setRoleState),
    status,
    setStatus: withPageReset(setStatusState),
    paid,
    setPaid: withPageReset(setPaidState),
    sort,
    cycleLastLoginSort,
    page,
    setPage,
    pageCount: Math.ceil(total / pageSize),
    refetch: fetchUsers,
    updateRow,
  };
}
