'use client';

import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Loader2, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { ApiRequestError } from '@/lib/api/types';
import {
  createAdminCompany,
  listAdminCompanies,
  updateAdminCompany,
  type AdminCompanyRow,
} from '@/lib/api/admin';
import { CompanyType } from '@/shared/enums';
import type { AdminCreateCompanyDto } from '@/shared';

/**
 * Companies admin — list, create, publish/unpublish (Sprint 2 "superadmin can
 * author content"). Uses `/api/v1/admin/companies`; the form's rules mirror
 * `AdminCreateCompanyDto` (class-validator) and the backend re-validates,
 * surfacing 409 on a duplicate slug as an inline error.
 */
export function CompaniesAdmin() {
  const [companies, setCompanies] = useState<AdminCompanyRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoadError(null);
    try {
      setCompanies(await listAdminCompanies());
    } catch (err) {
      setLoadError(err instanceof ApiRequestError ? err.message : 'Could not load companies.');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered = (companies ?? []).filter((c) => {
    if (!search) return true;
    const needle = search.trim().toLowerCase();
    return c.name.toLowerCase().includes(needle) || c.slug.toLowerCase().includes(needle);
  });

  const togglePublish = useCallback(
    async (row: AdminCompanyRow) => {
      setBusyId(row.id);
      try {
        await updateAdminCompany(row.id, { isPublished: !row.isPublished });
        await refresh();
      } catch (err) {
        window.alert(err instanceof ApiRequestError ? err.message : 'Could not update company.');
      } finally {
        setBusyId(null);
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
            placeholder="Search by name or slug"
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-navy placeholder:text-slate-400 focus:border-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/30"
            aria-label="Search companies"
          />
        </div>
        <Button onClick={() => setShowForm((v) => !v)} size="sm">
          <Plus className="size-4" /> {showForm ? 'Close form' : 'Add company'}
        </Button>
      </div>

      {showForm ? (
        <AddCompanyForm
          onCreated={() => {
            setShowForm(false);
            void refresh();
          }}
        />
      ) : null}

      {loadError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
          {loadError}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50">
            <tr className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {companies === null ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <Loader2 className="mx-auto size-5 animate-spin text-slate-400" aria-hidden="true" />
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-500">
                  {search ? 'No companies match that search.' : 'No companies yet — add the first one above.'}
                </td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-semibold text-navy">{c.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{c.slug}</td>
                  <td className="px-4 py-3 text-slate-600">{c.type}</td>
                  <td className="px-4 py-3 text-slate-600">{c.displayOrder}</td>
                  <td className="px-4 py-3">
                    <StatusPill published={c.isPublished} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      disabled={busyId === c.id}
                      onClick={() => togglePublish(c)}
                      className="text-xs font-semibold text-navy transition-colors hover:text-orange disabled:opacity-50"
                    >
                      {c.isPublished ? 'Unpublish' : 'Publish'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-400">
        {companies?.length ?? 0} compan{(companies?.length ?? 0) === 1 ? 'y' : 'ies'} total
        {search ? ` · ${filtered.length} matching` : ''}
      </p>
    </div>
  );
}

// ─── Add-company form ───────────────────────────────────────────────────────

function AddCompanyForm({ onCreated }: { onCreated: () => void }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AdminCreateCompanyDto>({
    defaultValues: { type: CompanyType.SERVICE, displayOrder: 0, isPublished: true },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await createAdminCompany(values);
      reset();
      onCreated();
    } catch (err) {
      setServerError(err instanceof ApiRequestError ? err.message : 'Could not add company.');
    }
  });

  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" noValidate>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">New company</p>
      <h2 className="mb-4 text-base font-bold text-navy">Add a recruiter hub</h2>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField
          id="name"
          label="Company name"
          placeholder="Tata Consultancy Services"
          error={errors.name?.message}
          {...register('name', {
            required: 'Name is required',
            minLength: { value: 2, message: 'Name must be at least 2 characters' },
            maxLength: { value: 120, message: 'Name must be 120 characters or fewer' },
          })}
        />
        <FormField
          id="slug"
          label="Slug (URL identifier)"
          placeholder="tcs"
          error={errors.slug?.message}
          {...register('slug', {
            required: 'Slug is required',
            pattern: { value: /^[a-z0-9-]+$/, message: 'Lowercase letters, digits, and dashes only' },
            maxLength: { value: 120, message: 'Slug must be 120 characters or fewer' },
          })}
        />
        <div className="space-y-1.5">
          <label htmlFor="type" className="block text-sm font-medium text-navy">
            Type
          </label>
          <select
            id="type"
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy focus:border-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/30"
            {...register('type', { required: true })}
          >
            {Object.values(CompanyType).map((t) => (
              <option key={t} value={t}>
                {t.charAt(0) + t.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </div>
        <FormField
          id="displayOrder"
          label="Display order"
          type="number"
          error={errors.displayOrder?.message}
          {...register('displayOrder', {
            valueAsNumber: true,
            min: { value: 0, message: 'Must be 0 or more' },
            max: { value: 1000, message: 'Must be 1000 or less' },
          })}
        />
        <div className="md:col-span-2">
          <FormField
            id="tagline"
            label="Tagline (optional)"
            placeholder="NQT-style quant, verbal & reasoning"
            error={errors.tagline?.message}
            {...register('tagline', {
              maxLength: { value: 200, message: 'Tagline must be 200 characters or fewer' },
            })}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600 md:col-span-2">
          <input type="checkbox" className="rounded border-slate-300" {...register('isPublished')} />
          Published (visible to students immediately)
        </label>
      </div>

      {serverError ? (
        <p role="alert" className="mt-4 rounded-md bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200">
          {serverError}
        </p>
      ) : null}

      <div className="mt-4 flex justify-end">
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? 'Adding…' : 'Add company'}
        </Button>
      </div>
    </form>
  );
}

// ─── Status pill ────────────────────────────────────────────────────────────

function StatusPill({ published }: { published: boolean }) {
  if (published) {
    return (
      <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
        Published
      </span>
    );
  }
  return (
    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
      Draft
    </span>
  );
}
