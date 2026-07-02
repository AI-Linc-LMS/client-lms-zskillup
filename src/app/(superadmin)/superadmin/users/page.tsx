'use client';

import { useCallback, useEffect, useState } from 'react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { listAdminUsers, updateAdminUserRole, type AdminUserRow } from '@/lib/api/admin';
import { UserDetailDrawer } from '@/components/superadmin/UserDetailDrawer';
import {
  BadgeCheck,
  ChevronDown,
  Loader2,
  Search,
  ShieldCheck,
  UserCheck,
  Users,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Role = AdminUserRow['role'];

const ROLE_LABELS: Record<Role, string> = {
  STUDENT: 'Student',
  COLLEGE_ADMIN: 'College Admin',
  ADMIN: 'Admin',
  SUPER_ADMIN: 'Super Admin',
};

const ROLE_COLORS: Record<Role, string> = {
  STUDENT: 'bg-slate-100 text-slate-700',
  COLLEGE_ADMIN: 'bg-blue-100 text-blue-700',
  ADMIN: 'bg-indigo-100 text-indigo-700',
  SUPER_ADMIN: 'bg-orange-100 text-orange-700',
};

const STATUS_COLORS: Record<AdminUserRow['status'], string> = {
  ACTIVE: 'text-green-600',
  INVITED: 'text-amber-600',
  SUSPENDED: 'text-red-500',
};

const PAGE_SIZE = 20;

export default function AdminUsersPage() {
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);

  const [promoting, setPromoting] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listAdminUsers({
        search: search || undefined,
        role: roleFilter || undefined,
        status: statusFilter || undefined,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });
      setRows(data.rows);
      setTotal(data.total);
    } catch {
      setError('Failed to load users. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, statusFilter, page]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleRoleChange = async (userId: string, newRole: Role) => {
    setPromoting(userId);
    setActionError(null);
    setActionSuccess(null);
    try {
      await updateAdminUserRole(userId, newRole);
      setActionSuccess(`Role updated to ${ROLE_LABELS[newRole]}.`);
      setRows((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)),
      );
      setTimeout(() => setActionSuccess(null), 3000);
    } catch {
      setActionError('Failed to update role. Please try again.');
    } finally {
      setPromoting(null);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Super Admin', href: '/superadmin/dashboard' },
          { label: 'Users' },
        ]}
      />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Super Admin · ZSkillup
          </p>
          <h1 className="mt-1 text-[28px] font-extrabold tracking-tight text-navy">
            User Management
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {total.toLocaleString()} total accounts · view, search, and change roles
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Users className="size-5 text-slate-400" />
          <span className="text-sm font-semibold text-slate-600">{total} users</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm shadow-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
          />
        </div>
        <div className="relative">
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(0); }}
            className="appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-4 pr-8 text-sm shadow-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
          >
            <option value="">All roles</option>
            <option value="STUDENT">Student</option>
            <option value="COLLEGE_ADMIN">College Admin</option>
            <option value="ADMIN">Admin</option>
            <option value="SUPER_ADMIN">Super Admin</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        </div>
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
            className="appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-4 pr-8 text-sm shadow-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INVITED">Invited</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        </div>
      </div>

      {/* Feedback */}
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
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-6 animate-spin text-slate-400" />
          </div>
        ) : error ? (
          <div className="py-16 text-center text-sm text-red-500">{error}</div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-400">No users found.</div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Verified</th>
                <th className="px-4 py-3">Last login</th>
                <th className="px-4 py-3">Change role</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-navy">{user.fullName ?? '—'}</p>
                    <p className="text-xs text-slate-400">{user.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('text-xs font-semibold', STATUS_COLORS[user.status])}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-semibold', ROLE_COLORS[user.role])}>
                      {ROLE_LABELS[user.role]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {user.isEmailVerified ? (
                      <BadgeCheck className="size-4 text-green-500" />
                    ) : (
                      <XCircle className="size-4 text-slate-300" />
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {user.lastLoginAt
                      ? new Date(user.lastLoginAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <RoleChanger
                      userId={user.id}
                      currentRole={user.role}
                      promoting={promoting === user.id}
                      onChangeRole={handleRoleChange}
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setSelectedId(user.id)}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-navy hover:bg-slate-50"
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
            <p className="text-xs text-slate-400">
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedId && (
        <UserDetailDrawer
          userId={selectedId}
          onClose={() => setSelectedId(null)}
          onChanged={fetchUsers}
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
        <Loader2 className="size-4 animate-spin text-slate-400" />
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
            Make {ROLE_LABELS[role]}
          </button>
        ))
      )}
    </div>
  );
}
