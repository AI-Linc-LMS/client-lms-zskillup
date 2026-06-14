'use client';

import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Loader2, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { ApiRequestError } from '@/lib/api/types';
import {
  createAdminCollege,
  listAdminColleges,
  suspendAdminCollege,
  type AdminCollegeRow,
} from '@/lib/api/admin';
import type { AdminCreateCollegeDto } from '@/shared';

/**
 * Colleges admin — list, create, suspend (Day 3.5 admin UI). Uses the
 * `/api/v1/admin/colleges` endpoints; validation rules on the form mirror the
 * constraints encoded on `AdminCreateCollegeDto` (class-validator). The
 * backend re-validates on submit and surfaces conflict errors (409 on
 * duplicate slug) which we render as inline form errors.
 */
export function CollegesAdmin() {
  const [colleges, setColleges] = useState<AdminCollegeRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);

  const refresh = useCallback(async () => {
    setLoadError(null);
    try {
      const rows = await listAdminColleges();
      setColleges(rows);
    } catch (err) {
      setLoadError(err instanceof ApiRequestError ? err.message : 'Could not load colleges.');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered = (colleges ?? []).filter((c) => {
    if (!search) return true;
    const needle = search.trim().toLowerCase();
    return (
      c.name.toLowerCase().includes(needle) ||
      c.slug.toLowerCase().includes(needle) ||
      c.city.toLowerCase().includes(needle) ||
      c.state.toLowerCase().includes(needle)
    );
  });

  const handleSuspend = useCallback(
    async (row: AdminCollegeRow) => {
      const ok = window.confirm(
        `Suspend ${row.name}? Students at this college will not be blocked retroactively, but new sign-ins will be refused.`,
      );
      if (!ok) return;
      try {
        await suspendAdminCollege(row.id);
        await refresh();
      } catch (err) {
        window.alert(
          err instanceof ApiRequestError ? err.message : 'Could not suspend college.',
        );
      }
    },
    [refresh],
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, slug, city, or state"
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-navy placeholder:text-slate-400 focus:border-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/30"
            aria-label="Search colleges"
          />
        </div>

        <Button onClick={() => setShowForm((v) => !v)} size="sm">
          <Plus className="size-4" /> {showForm ? 'Close form' : 'Add college'}
        </Button>
      </div>

      {showForm ? <AddCollegeForm onCreated={() => { setShowForm(false); void refresh(); }} /> : null}

      {loadError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
          {loadError}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50">
            <tr className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Onboarded</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {colleges === null ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <Loader2 className="mx-auto size-5 animate-spin text-slate-400" aria-hidden="true" />
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-500">
                  {search ? 'No colleges match that search.' : 'No colleges yet — add the first one above.'}
                </td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-semibold text-navy">{c.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{c.slug}</td>
                  <td className="px-4 py-3 text-slate-600">{c.city}, {c.state}</td>
                  <td className="px-4 py-3">
                    <StatusPill status={c.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {c.status === 'ACTIVE' ? (
                      <button
                        type="button"
                        onClick={() => handleSuspend(c)}
                        className="text-xs font-semibold text-red-700 transition-colors hover:text-red-800"
                      >
                        Suspend
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">Suspended</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-400">
        {colleges?.length ?? 0} college{(colleges?.length ?? 0) === 1 ? '' : 's'} total
        {search ? ` · ${filtered.length} matching` : ''}
      </p>
    </div>
  );
}

// ─── Add-college form ─────────────────────────────────────────────────────────

function AddCollegeForm({ onCreated }: { onCreated: () => void }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AdminCreateCollegeDto>();

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await createAdminCollege(values);
      reset();
      onCreated();
    } catch (err) {
      setServerError(
        err instanceof ApiRequestError ? err.message : 'Could not add college.',
      );
    }
  });

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      noValidate
    >
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
        New college
      </p>
      <h2 className="mb-4 text-base font-bold text-navy">Onboard a partner institution</h2>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField
          id="name"
          label="College name"
          placeholder="VIT Vellore"
          error={errors.name?.message}
          {...register('name', {
            required: 'Name is required',
            minLength: { value: 2, message: 'Name must be at least 2 characters' },
            maxLength: { value: 200, message: 'Name must be 200 characters or fewer' },
          })}
        />
        <FormField
          id="slug"
          label="Slug (URL identifier)"
          placeholder="vit-vellore"
          error={errors.slug?.message}
          {...register('slug', {
            required: 'Slug is required',
            minLength: { value: 2, message: 'Slug must be at least 2 characters' },
            maxLength: { value: 120, message: 'Slug must be 120 characters or fewer' },
            pattern: {
              value: /^[a-z0-9-]+$/,
              message: 'Lowercase letters, digits, and dashes only',
            },
          })}
        />
        <FormField
          id="state"
          label="State"
          placeholder="Tamil Nadu"
          error={errors.state?.message}
          {...register('state', {
            required: 'State is required',
            minLength: { value: 2, message: 'State must be at least 2 characters' },
            maxLength: { value: 100, message: 'State must be 100 characters or fewer' },
          })}
        />
        <FormField
          id="city"
          label="City"
          placeholder="Vellore"
          error={errors.city?.message}
          {...register('city', {
            required: 'City is required',
            minLength: { value: 2, message: 'City must be at least 2 characters' },
            maxLength: { value: 100, message: 'City must be 100 characters or fewer' },
          })}
        />
      </div>

      {serverError ? (
        <p
          role="alert"
          className="mt-4 rounded-md bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200"
        >
          {serverError}
        </p>
      ) : null}

      <div className="mt-4 flex justify-end">
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? 'Adding…' : 'Add college'}
        </Button>
      </div>
    </form>
  );
}

// ─── Status pill ─────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: 'ACTIVE' | 'SUSPENDED' }) {
  if (status === 'ACTIVE') {
    return (
      <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
        Active
      </span>
    );
  }
  return (
    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
      Suspended
    </span>
  );
}
