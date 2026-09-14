'use client';

import { useState } from 'react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ConsoleHero } from '@/components/layout/ConsoleHero';
import { Button } from '@/components/ui/button';
import { updateAdminUserRole, type AdminUserRow } from '@/lib/api/admin';
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
import {
  BadgeCheck,
  Info,
  Loader2,
  ShieldCheck,
  UserCheck,
  Users,
  XCircle,
} from 'lucide-react';
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
  { value: 'ADMIN', label: 'Admin' },
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
] as const;

const PAGE_SIZE = 20;

const TH = 'px-4 py-3';

export default function AdminUsersPage() {
  const list = useAdminUserList(PAGE_SIZE);
  const { rows, total, paidStatusVisible } = list;

  const [promoting, setPromoting] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleRoleChange = async (userId: string, newRole: Role) => {
    setPromoting(userId);
    setActionError(null);
    setActionSuccess(null);
    try {
      await updateAdminUserRole(userId, newRole);
      setActionSuccess(`Role updated to ${ADMIN_ROLE_LABEL[newRole]}.`);
      // Paid status only applies to students - refetch so the row's paid fields follow
      // the new role as the server computes them.
      list.updateRow(userId, { role: newRole });
      void list.refetch();
      setTimeout(() => setActionSuccess(null), 3000);
    } catch {
      setActionError('Failed to update role. Please try again.');
    } finally {
      setPromoting(null);
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Super Admin', href: '/superadmin/dashboard' },
          { label: 'Users' },
        ]}
      />

      <ConsoleHero
        icon={Users}
        eyebrow="Super Admin"
        title="User Management"
        description={`${total.toLocaleString()} total accounts · view, search, and change roles`}
        actions={
          <div className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 ring-1 ring-inset ring-white/15">
            <Users className="size-5 text-white/70" />
            <span className="text-sm font-semibold text-white/90">{total} users</span>
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

      {/* Feedback */}
      {list.notice && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-600"
        >
          <Info className="size-4 shrink-0" />
          {list.notice}
        </div>
      )}
      {actionSuccess && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          <BadgeCheck className="size-4 shrink-0" />
          {actionSuccess}
        </div>
      )}
      {actionError && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <XCircle className="size-4 shrink-0" />
          {actionError}
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
          <div role="alert" className="flex flex-col items-center gap-3 py-16 text-center text-sm text-red-700">
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
          <table className="w-full min-w-[860px] text-sm">
            <thead className="border-b border-slate-100 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-500">
              <tr>
                <th scope="col" className={TH}>User</th>
                <th scope="col" className={TH}>Status</th>
                <th scope="col" className={TH}>Role</th>
                <th scope="col" className={TH}>Verified</th>
                <LastLoginSortHeader sort={list.sort} onToggle={list.cycleLastLoginSort} className={TH} />
                {paidStatusVisible && <th scope="col" className={TH}>Paid</th>}
                <th scope="col" className={TH}>Change role</th>
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
                    <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-semibold', ROLE_COLORS[user.role])}>
                      {ADMIN_ROLE_LABEL[user.role]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {user.isEmailVerified ? (
                      <BadgeCheck role="img" className="size-4 text-green-500" aria-label="Email verified" />
                    ) : (
                      <XCircle role="img" className="size-4 text-slate-400" aria-label="Email not verified" />
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
                  <td className="px-4 py-3">
                    <RoleChanger
                      userId={user.id}
                      currentRole={user.role}
                      promoting={promoting === user.id}
                      onChangeRole={handleRoleChange}
                    />
                  </td>
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

function RoleChanger({
  userId,
  currentRole,
  promoting,
  onChangeRole,
}: {
  userId: string;
  currentRole: Role;
  promoting: boolean;
  onChangeRole: (id: string, role: Role) => void;
}) {
  const otherRoles = (['STUDENT', 'COLLEGE_ADMIN', 'ADMIN', 'SUPER_ADMIN'] as Role[]).filter(
    (r) => r !== currentRole,
  );

  return (
    <div className="flex flex-wrap gap-1.5">
      {promoting ? (
        <Loader2 className="size-4 animate-spin text-slate-500" />
      ) : (
        otherRoles.map((role) => (
          <button
            key={role}
            onClick={() => onChangeRole(userId, role)}
            className={cn(
              'flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-colors',
              role === 'SUPER_ADMIN'
                ? 'border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100'
                : role === 'ADMIN'
                  ? 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                  : role === 'COLLEGE_ADMIN'
                    ? 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100',
            )}
          >
            {role === 'SUPER_ADMIN' || role === 'ADMIN' ? (
              <ShieldCheck className="size-3" />
            ) : (
              <UserCheck className="size-3" />
            )}
            Make {ADMIN_ROLE_LABEL[role]}
          </button>
        ))
      )}
    </div>
  );
}
