'use client';

import { useState } from 'react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ConsoleHero } from '@/components/layout/ConsoleHero';
import { Button } from '@/components/ui/button';
import type { AdminUserRow } from '@/lib/api/admin';
import { UserDetailDrawer } from '@/components/superadmin/UserDetailDrawer';
import {
  AccountStatusPill,
  DateTimeCell,
  PaidStatusCell,
} from '@/components/superadmin/UserCells';
import {
  LastLoginSortHeader,
  ListPagination,
  UserListFilters,
} from '@/components/superadmin/UserListControls';
import { useAdminUserList } from '@/hooks/useAdminUserList';
import { ADMIN_ROLE_LABEL } from '@/lib/ui-maps';
import { BadgeCheck, Info, Loader2, Users, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type Role = AdminUserRow['role'];

const ROLE_COLORS: Record<Role, string> = {
  STUDENT: 'bg-slate-100 text-slate-700',
  COLLEGE_ADMIN: 'bg-blue-100 text-blue-700',
  ADMIN: 'bg-indigo-100 text-indigo-700',
  SUPER_ADMIN: 'bg-orange-100 text-orange-700',
};

const ROLE_OPTIONS = [
  { value: '', label: 'All roles' },
  { value: 'STUDENT', label: 'Student' },
  { value: 'COLLEGE_ADMIN', label: 'College Admin' },
] as const;

const PAGE_SIZE = 20;

const TH = 'px-4 py-3';

/**
 * User Management (ADMIN). Operators manage student + college accounts - lock,
 * unlock, verify email, send reset links, edit profile, review sign-ins. The
 * backend list excludes peer ADMIN / SUPER_ADMIN rows for a non-super operator,
 * and role changes / capability grants stay SUPER_ADMIN-only (no role-changer
 * here). Reuses the shared UserDetailDrawer, whose capability panel is naturally
 * unreachable for ADMINs (they can only open non-admin accounts).
 *
 * Paid status (column + filter) appears only when the server says this admin may see
 * it (canManageSubscriptions or canViewFinancials); otherwise both stay hidden.
 */
export default function AdminUsersPage() {
  const list = useAdminUserList(PAGE_SIZE);
  const { rows, total, paidStatusVisible } = list;
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Platform Admin', href: '/admin/dashboard' },
          { label: 'User Management' },
        ]}
      />

      <ConsoleHero
        icon={Users}
        eyebrow="Platform Admin"
        title="User Management"
        description={
          <>
            {total.toLocaleString()} student &amp; college accounts · lock, verify, and reset access
          </>
        }
        actions={
          <div className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 ring-1 ring-inset ring-white/15">
            <Users className="size-5 text-white/70" />
            <span className="text-sm font-semibold text-white/80">{total} users</span>
          </div>
        }
      />

      <UserListFilters
        searchInput={list.searchInput}
        onSearch={list.setSearchInput}
        role={list.role}
        onRole={list.setRole}
        roleOptions={ROLE_OPTIONS}
        status={list.status}
        onStatus={list.setStatus}
        paid={list.paid}
        onPaid={list.setPaid}
        showPaid={paidStatusVisible}
      />

      {list.notice && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-600"
        >
          <Info className="size-4 shrink-0" />
          {list.notice}
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {!list.loaded && list.loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-6 animate-spin text-slate-500" />
            <span className="sr-only">Loading users</span>
          </div>
        ) : list.error ? (
          <div
            role="alert"
            className="flex flex-col items-center gap-3 py-16 text-center text-sm text-red-700"
          >
            {list.error}
            <Button variant="outline" size="sm" onClick={() => void list.refetch()}>
              Retry
            </Button>
          </div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-500">No users found.</div>
        ) : (
          <div
            className={cn('overflow-x-auto transition-opacity', list.loading && 'opacity-60')}
            aria-busy={list.loading}
          >
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-b border-slate-100 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                <tr>
                  <th scope="col" className={TH}>User</th>
                  <th scope="col" className={TH}>Status</th>
                  <th scope="col" className={TH}>Role</th>
                  <th scope="col" className={TH}>Verified</th>
                  <LastLoginSortHeader
                    sort={list.sort}
                    onToggle={list.cycleLastLoginSort}
                    className={TH}
                  />
                  {paidStatusVisible && <th scope="col" className={TH}>Paid</th>}
                  <th scope="col" className={TH}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-navy">{user.fullName ?? '-'}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <AccountStatusPill status={user.status} />
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                          ROLE_COLORS[user.role],
                        )}
                      >
                        {ADMIN_ROLE_LABEL[user.role]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {user.isEmailVerified ? (
                        <BadgeCheck
                          role="img"
                          className="size-4 text-green-500"
                          aria-label="Email verified"
                        />
                      ) : (
                        <XCircle
                          role="img"
                          className="size-4 text-slate-400"
                          aria-label="Email not verified"
                        />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <DateTimeCell at={user.lastLoginAt} />
                    </td>
                    {paidStatusVisible && (
                      <td className="px-4 py-3">
                        <PaidStatusCell
                          paidStatus={user.paidStatus}
                          accessLabel={user.accessLabel}
                          paidUntil={user.paidUntil}
                        />
                      </td>
                    )}
                    <td className="px-4 py-3 text-right">
                      <Button variant="outline" size="sm" onClick={() => setSelectedId(user.id)}>
                        Manage
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!list.error && (
          <ListPagination
            page={list.page}
            pageCount={list.pageCount}
            pageSize={PAGE_SIZE}
            total={total}
            onPage={list.setPage}
          />
        )}
      </div>

      {selectedId && (
        <UserDetailDrawer
          userId={selectedId}
          onClose={() => setSelectedId(null)}
          onChanged={() => void list.refetch()}
        />
      )}
    </div>
  );
}
