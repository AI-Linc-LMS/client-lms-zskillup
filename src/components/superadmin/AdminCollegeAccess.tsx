'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Search, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusPill } from '@/components/student/StatusPill';
import { ApiRequestError } from '@/lib/api/types';
import { listAdminColleges, type AdminCollegeRow } from '@/lib/api/admin';
import {
  listAdminCollegeAssignments,
  setAdminColleges,
} from '@/lib/api/admin-college-access';
import type { AdminAssignmentDto } from '@/shared';

/**
 * Super-admin: Admin ↔ college portfolio (TPO Panel View, 3-tier hierarchy).
 * Lists every ADMIN and the colleges they are scoped to. A super-admin can pin an
 * admin to a subset of colleges (they then see only those across the console) or
 * clear the set — an admin with NO colleges assigned keeps all-colleges access
 * (backward compatible). Read-only server enforcement lives in AdminAccessService;
 * this leaf only reads + writes the assignment set.
 */
export function AdminCollegeAccess() {
  const [assignments, setAssignments] = useState<AdminAssignmentDto[] | null>(null);
  const [colleges, setColleges] = useState<AdminCollegeRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const [a, c] = await Promise.all([listAdminCollegeAssignments(), listAdminColleges()]);
      setAssignments(a);
      setColleges(c);
    } catch (err) {
      setLoadError(
        err instanceof ApiRequestError ? err.message : 'Could not load admin access.',
      );
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onSaved = useCallback((adminId: string, collegeIds: string[]) => {
    setAssignments((prev) =>
      prev ? prev.map((a) => (a.adminId === adminId ? { ...a, collegeIds } : a)) : prev,
    );
    setEditingId(null);
  }, []);

  if (loadError) {
    return (
      <div
        role="alert"
        className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200"
      >
        {loadError}{' '}
        <button type="button" onClick={() => void load()} className="underline">
          Retry
        </button>
      </div>
    );
  }

  if (!assignments || !colleges) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Loader2 className="size-4 animate-spin" /> Loading admins…
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
        No platform admins yet. Create an ADMIN account under{' '}
        <span className="font-semibold text-navy">Users</span> to scope their college
        portfolio here.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {assignments.map((admin) => (
        <AdminRow
          key={admin.adminId}
          admin={admin}
          colleges={colleges}
          isEditing={editingId === admin.adminId}
          onEdit={() => setEditingId(admin.adminId)}
          onCancel={() => setEditingId(null)}
          onSaved={onSaved}
        />
      ))}
    </div>
  );
}

function AdminRow({
  admin,
  colleges,
  isEditing,
  onEdit,
  onCancel,
  onSaved,
}: {
  admin: AdminAssignmentDto;
  colleges: AdminCollegeRow[];
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSaved: (adminId: string, collegeIds: string[]) => void;
}) {
  const scoped = admin.collegeIds.length > 0;
  const byId = useMemo(() => new Map(colleges.map((c) => [c.id, c])), [colleges]);
  const assignedNames = admin.collegeIds
    .map((id) => byId.get(id)?.name)
    .filter((n): n is string => Boolean(n));

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base font-bold text-navy">{admin.name || admin.email}</p>
          <p className="text-sm text-slate-500">{admin.email}</p>
        </div>
        <div className="flex items-center gap-3">
          {scoped ? (
            <StatusPill
              tone="info"
              label={`${admin.collegeIds.length} college${admin.collegeIds.length === 1 ? '' : 's'}`}
            />
          ) : (
            <StatusPill tone="neutral" label="All colleges" />
          )}
          {!isEditing && (
            <Button variant="outline" size="sm" onClick={onEdit}>
              Edit access
            </Button>
          )}
        </div>
      </div>

      {!isEditing && scoped && (
        <p className="mt-3 text-sm text-slate-600">
          Scoped to: <span className="text-navy">{assignedNames.join(', ')}</span>
        </p>
      )}
      {!isEditing && !scoped && (
        <p className="mt-3 text-sm text-slate-500">
          No restriction — this admin can open every college&rsquo;s dashboard and roster.
        </p>
      )}

      {isEditing && (
        <CollegePicker
          admin={admin}
          colleges={colleges}
          onCancel={onCancel}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}

function CollegePicker({
  admin,
  colleges,
  onCancel,
  onSaved,
}: {
  admin: AdminAssignmentDto;
  colleges: AdminCollegeRow[];
  onCancel: () => void;
  onSaved: (adminId: string, collegeIds: string[]) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(admin.collegeIds));
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return colleges;
    return colleges.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q) ||
        c.state.toLowerCase().includes(q),
    );
  }, [colleges, search]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const ids = [...selected];
      const res = await setAdminColleges(admin.adminId, ids);
      onSaved(admin.adminId, res.collegeIds);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not save access.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Assign colleges — {selected.size === 0 ? 'none (all-colleges access)' : `${selected.size} selected`}
        </p>
        <button
          type="button"
          onClick={() => setSelected(new Set())}
          className="text-xs font-semibold text-slate-500 underline-offset-2 hover:text-navy hover:underline"
        >
          Clear all
        </button>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search colleges…"
          className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-navy focus:border-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/30"
        />
      </div>

      <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-slate-100 p-1">
        {filtered.length === 0 ? (
          <p className="p-3 text-sm text-slate-500">No colleges match “{search}”.</p>
        ) : (
          filtered.map((c) => {
            const checked = selected.has(c.id);
            return (
              <label
                key={c.id}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(c.id)}
                  className="size-4 rounded border-slate-300 text-orange focus-visible:ring-2 focus-visible:ring-orange/40"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-navy">{c.name}</span>
                  <span className="block truncate text-xs text-slate-400">
                    {c.city}, {c.state}
                  </span>
                </span>
                {c.status === 'SUSPENDED' && (
                  <StatusPill tone="neutral" label="Suspended" />
                )}
              </label>
            );
          })
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200"
        >
          {error}
        </p>
      )}

      <div className="flex items-center gap-2">
        <Button onClick={() => void save()} disabled={saving}>
          {saving ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <ShieldCheck className="mr-1.5 size-4" />}
          Save access
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
