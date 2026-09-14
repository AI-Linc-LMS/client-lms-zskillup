'use client';

import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PaidStatus } from '@/lib/api/admin';
import type { UserListSortState } from '@/hooks/useAdminUserList';

/**
 * Filter bar, last-login sort header and pagination shared by the admin users consoles
 * (and the filter controls reused by the Super Admin user sheet).
 */

const controlCls =
  'h-10 rounded-lg border border-slate-200 bg-white text-sm text-navy focus:border-orange focus:outline-none focus-visible:ring-2 focus-visible:ring-orange/30';

export interface SelectOption {
  value: string;
  label: string;
}

/** Native select with the §9 input treatment and a visually-hidden label. */
export function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly SelectOption[];
}) {
  return (
    <label className="relative block">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${controlCls} max-w-full appearance-none pl-3 pr-8`}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-slate-500"
      />
    </label>
  );
}

/** Search input with a leading icon and a visually-hidden label. */
export function FilterSearch({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="relative block min-w-[200px] flex-1">
      <span className="sr-only">{label}</span>
      <Search
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500"
      />
      <input
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${controlCls} w-full pl-9 pr-3`}
      />
    </label>
  );
}

export const ACCOUNT_STATUS_OPTIONS: readonly SelectOption[] = [
  { value: '', label: 'All statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INVITED', label: 'Invited' },
  { value: 'SUSPENDED', label: 'Suspended' },
];

export const PAID_FILTER_OPTIONS: readonly { value: PaidStatus | ''; label: string }[] = [
  { value: '', label: 'Paid: All' },
  { value: 'PAID', label: 'Paid' },
  { value: 'UNPAID', label: 'Unpaid' },
];

/** The users-console filter row: debounced search (handled by the hook), role, status, paid. */
export function UserListFilters({
  searchInput,
  onSearch,
  role,
  onRole,
  roleOptions,
  status,
  onStatus,
  paid,
  onPaid,
  showPaid,
}: {
  searchInput: string;
  onSearch: (value: string) => void;
  role: string;
  onRole: (value: string) => void;
  roleOptions: readonly SelectOption[];
  status: string;
  onStatus: (value: string) => void;
  paid: PaidStatus | '';
  onPaid: (value: PaidStatus | '') => void;
  /** The server says this viewer may see paid status. */
  showPaid: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      <FilterSearch
        label="Search users"
        placeholder="Search by name or email…"
        value={searchInput}
        onChange={onSearch}
      />
      <FilterSelect label="Filter by role" value={role} onChange={onRole} options={roleOptions} />
      <FilterSelect
        label="Filter by account status"
        value={status}
        onChange={onStatus}
        options={ACCOUNT_STATUS_OPTIONS}
      />
      {showPaid && (
        <FilterSelect
          label="Filter by paid status"
          value={paid}
          onChange={(v) => onPaid(v === 'PAID' || v === 'UNPAID' ? v : '')}
          options={PAID_FILTER_OPTIONS}
        />
      )}
    </div>
  );
}

/** `<th>` for Last login with a sort toggle: latest first → oldest first → default order. */
export function LastLoginSortHeader({
  sort,
  onToggle,
  className,
}: {
  sort: UserListSortState;
  onToggle: () => void;
  className?: string;
}) {
  const active = sort.key === 'lastLoginAt';
  const Icon = !active ? ArrowUpDown : sort.order === 'desc' ? ArrowDown : ArrowUp;
  const next = !active
    ? 'Sort by last login, latest first'
    : sort.order === 'desc'
      ? 'Sort by last login, oldest first'
      : 'Clear last-login sort (newest accounts first)';
  return (
    <th
      scope="col"
      className={className}
      aria-sort={active ? (sort.order === 'desc' ? 'descending' : 'ascending') : 'none'}
    >
      <button
        type="button"
        onClick={onToggle}
        title={next}
        aria-label={next}
        className="inline-flex items-center gap-1 rounded-md uppercase tracking-widest transition-colors hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/40 focus-visible:ring-offset-2"
      >
        Last login
        <Icon aria-hidden className={active ? 'size-3.5 text-navy' : 'size-3.5'} />
      </button>
    </th>
  );
}

/** "Showing 1-20 of 312" + Previous / Next. Renders nothing for a single page. */
export function ListPagination({
  page,
  pageCount,
  pageSize,
  total,
  onPage,
}: {
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
}) {
  if (pageCount <= 1) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
      <p className="text-xs text-slate-500" aria-live="polite">
        Showing {(page * pageSize + 1).toLocaleString('en-IN')}-
        {Math.min((page + 1) * pageSize, total).toLocaleString('en-IN')} of{' '}
        {total.toLocaleString('en-IN')}
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPage(Math.max(0, page - 1))}
          disabled={page === 0}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPage(Math.min(pageCount - 1, page + 1))}
          disabled={page >= pageCount - 1}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
