'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  createTestimonial,
  deleteTestimonial,
  listAdminTestimonials,
  updateTestimonial,
} from '@/lib/api/content';
import type { TestimonialDto } from '@/shared/dto/content.dto';
import { describeError } from '@/lib/api/errors';
import { BadgeCheck, Loader2, Plus, Star, Trash2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange';

const EMPTY = {
  id: '',
  authorName: '',
  authorTitle: '',
  avatarUrl: '',
  quote: '',
  rating: 5 as number | '',
  isPublished: true,
  sortOrder: 0,
};

/** Testimonials CMS manager (Phase 5). Drives the public sites' testimonials. */
export function TestimonialsManager() {
  const [items, setItems] = useState<TestimonialDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await listAdminTestimonials());
    } catch {
      setError('Failed to load testimonials.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const flash = (m: string) => {
    setSuccess(m);
    setError(null);
    setTimeout(() => setSuccess(null), 3000);
  };

  const edit = (t: TestimonialDto) => {
    setForm({
      id: t.id,
      authorName: t.authorName,
      authorTitle: t.authorTitle ?? '',
      avatarUrl: t.avatarUrl ?? '',
      quote: t.quote,
      rating: t.rating ?? '',
      isPublished: t.isPublished,
      sortOrder: t.sortOrder,
    });
    setEditing(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const reset = () => {
    setForm(EMPTY);
    setEditing(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      authorName: form.authorName.trim(),
      authorTitle: form.authorTitle.trim() || null,
      avatarUrl: form.avatarUrl.trim() || null,
      quote: form.quote.trim(),
      rating: form.rating === '' ? null : Number(form.rating),
      isPublished: form.isPublished,
      sortOrder: Number(form.sortOrder),
    };
    try {
      if (editing && form.id) {
        await updateTestimonial(form.id, payload);
        flash('Testimonial updated.');
      } else {
        await createTestimonial(payload);
        flash('Testimonial created.');
      }
      reset();
      load();
    } catch (err) {
      setError(describeError(err, 'Failed to save.'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (t: TestimonialDto) => {
    if (!window.confirm(`Delete testimonial from ${t.authorName}?`)) return;
    try {
      await deleteTestimonial(t.id);
      flash('Testimonial deleted.');
      if (form.id === t.id) reset();
      load();
    } catch (err) {
      setError(describeError(err, 'Failed to delete.'));
    }
  };

  return (
    <div className="space-y-5">
      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          <BadgeCheck className="size-4 shrink-0" /> {success}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <XCircle className="size-4 shrink-0" /> {error}
        </div>
      )}

      <form onSubmit={submit} className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
        <p className="sm:col-span-2 text-sm font-bold text-navy">
          {editing ? 'Edit testimonial' : 'New testimonial'}
        </p>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">Author name</span>
          <input required value={form.authorName} onChange={(e) => setForm({ ...form, authorName: e.target.value })} className={inputCls} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">Author title / company</span>
          <input value={form.authorTitle} onChange={(e) => setForm({ ...form, authorTitle: e.target.value })} className={inputCls} />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-medium text-slate-600">Quote</span>
          <textarea required rows={3} value={form.quote} onChange={(e) => setForm({ ...form, quote: e.target.value })} className={inputCls} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">Avatar URL</span>
          <input value={form.avatarUrl} onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })} className={inputCls} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">Rating (1–5)</span>
          <input type="number" min={1} max={5} value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value === '' ? '' : Number(e.target.value) })} className={inputCls} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">Sort order</span>
          <input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} className={inputCls} />
        </label>
        <label className="flex items-center gap-2 pt-6">
          <input type="checkbox" checked={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} className="size-4 rounded border-slate-300" />
          <span className="text-sm text-slate-600">Published</span>
        </label>
        <div className="sm:col-span-2 flex gap-2">
          <button type="submit" disabled={saving || !form.authorName.trim() || !form.quote.trim()} className="inline-flex items-center gap-2 rounded-lg bg-orange px-4 py-2 text-sm font-semibold text-[#171717] hover:bg-orange/90 disabled:opacity-50">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            {editing ? 'Save changes' : 'Create testimonial'}
          </button>
          {editing && (
            <button type="button" onClick={reset} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
          )}
        </div>
      </form>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="size-6 animate-spin text-slate-500" /></div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">No testimonials yet.</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((t) => (
              <li key={t.id} className="flex items-start justify-between gap-4 p-4 hover:bg-slate-50">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-navy">{t.authorName}</p>
                    {t.authorTitle && <span className="text-xs text-slate-500">· {t.authorTitle}</span>}
                    {!t.isPublished && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">HIDDEN</span>}
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-600">“{t.quote}”</p>
                  {t.rating != null && (
                    <div className="mt-1 flex gap-0.5">
                      {Array.from({ length: t.rating }).map((_, i) => (
                        <Star key={i} className="size-3 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button onClick={() => edit(t)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-navy hover:bg-slate-50">Edit</button>
                  <button onClick={() => remove(t)} className="rounded-lg border border-red-200 p-1.5 text-red-600 hover:bg-red-50" aria-label="Delete"><Trash2 className="size-4" /></button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
