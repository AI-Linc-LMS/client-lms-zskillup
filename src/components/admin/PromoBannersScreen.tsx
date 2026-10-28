'use client';

/**
 * PromoBannersScreen — rendered by BOTH /admin and /superadmin.
 *
 * It lives here rather than in one route because `navForPath` picks the sidebar from
 * the PATHNAME, not the role: a super-admin clicking a link into /admin had the whole
 * rail flip to the admin console, which reads as being thrown out of your own console.
 * Two thin route files render this one screen, so each console keeps its own nav.
 */

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import {
  createPromoBanner,
  deletePromoBanner,
  listPromoBanners,
  updatePromoBanner,
  type PromoBannerDto,
  type UpsertPromoBanner,
} from '@/lib/api/promo';
import { PROMO_PLACEMENTS, type PromoPlacement } from '@/shared/promo-placements';
import { Button } from '@/components/ui/button';

const inputCls =
  'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy focus:border-orange focus:outline-none focus-visible:ring-2 focus-visible:ring-orange/30';
const areaCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-navy focus:border-orange focus:outline-none focus-visible:ring-2 focus-visible:ring-orange/30';

/** The form's shape. Dates are kept as `datetime-local` strings and converted on save. */
type Draft = {
  placement: PromoPlacement;
  title: string;
  body: string;
  imageUrl: string;
  alt: string;
  ctaLabel: string;
  ctaHref: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  sortOrder: number;
};

const EMPTY: Draft = {
  placement: 'DASHBOARD',
  title: '',
  body: '',
  imageUrl: '',
  alt: '',
  ctaLabel: '',
  ctaHref: '',
  startsAt: '',
  endsAt: '',
  isActive: true,
  sortOrder: 0,
};

/** `datetime-local` gives a local wall-clock string; the API wants an instant. */
const toIso = (v: string) => (v ? new Date(v).toISOString() : null);
const toLocal = (v: string | null) => {
  if (!v) return '';
  const d = new Date(v);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const draftOf = (b: PromoBannerDto): Draft => ({
  placement: b.placement,
  title: b.title,
  body: b.body ?? '',
  imageUrl: b.imageUrl ?? '',
  alt: b.alt ?? '',
  ctaLabel: b.ctaLabel ?? '',
  ctaHref: b.ctaHref ?? '',
  startsAt: toLocal(b.startsAt),
  endsAt: toLocal(b.endsAt),
  isActive: b.isActive,
  sortOrder: b.sortOrder,
});

const payloadOf = (d: Draft): UpsertPromoBanner => ({
  placement: d.placement,
  title: d.title.trim(),
  body: d.body.trim() || null,
  imageUrl: d.imageUrl.trim() || null,
  alt: d.alt.trim() || null,
  ctaLabel: d.ctaLabel.trim() || null,
  ctaHref: d.ctaHref.trim() || null,
  startsAt: toIso(d.startsAt),
  endsAt: toIso(d.endsAt),
  isActive: d.isActive,
  sortOrder: Number(d.sortOrder) || 0,
});

/**
 * The same rules the database enforces, checked before the request so an operator gets a
 * sentence instead of a 500. The DB constraints remain the real boundary — this is the
 * courtesy layer, not the guard.
 */
function validate(d: Draft): string | null {
  if (!d.title.trim()) return 'Give the banner a title.';
  if (!d.body.trim() && !d.imageUrl.trim())
    return 'A banner needs an image or some body text — otherwise it renders as an empty box.';
  if (Boolean(d.ctaLabel.trim()) !== Boolean(d.ctaHref.trim()))
    return 'A button needs both a label and a destination.';
  if (d.imageUrl.trim() && !d.alt.trim())
    return 'Image banners need alt text — a screen reader cannot read a poster.';
  if (d.startsAt && d.endsAt && new Date(d.endsAt) <= new Date(d.startsAt))
    return 'The end date must be after the start date.';
  return null;
}

export function PromoBannersScreen() {
  const [rows, setRows] = useState<PromoBannerDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string | null; draft: Draft } | null>(null);
  const [saving, setSaving] = useState(false);

  const reload = () =>
    listPromoBanners()
      .then(setRows)
      .catch(() => setErr('Could not load banners.'))
      .finally(() => setLoading(false));

  useEffect(() => {
    void reload();
  }, []);

  const grouped = useMemo(() => {
    const byPlacement = new Map<string, PromoBannerDto[]>();
    for (const r of rows) {
      const list = byPlacement.get(r.placement) ?? [];
      list.push(r);
      byPlacement.set(r.placement, list);
    }
    return PROMO_PLACEMENTS.map((p) => ({ ...p, banners: byPlacement.get(p.key) ?? [] }));
  }, [rows]);

  const save = async () => {
    if (!editing) return;
    const problem = validate(editing.draft);
    if (problem) {
      setErr(problem);
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      const payload = payloadOf(editing.draft);
      if (editing.id) await updatePromoBanner(editing.id, payload);
      else await createPromoBanner(payload);
      setEditing(null);
      await reload();
    } catch {
      setErr('Could not save the banner.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    setErr(null);
    try {
      await deletePromoBanner(id);
      await reload();
    } catch {
      setErr('Could not delete the banner.');
    }
  };

  if (loading) {
    return (
      <div className="grid place-items-center py-24">
        <Loader2 className="size-6 animate-spin text-slate-400" />
      </div>
    );
  }

  const d = editing?.draft;
  const set = (patch: Partial<Draft>) =>
    setEditing((e) => (e ? { ...e, draft: { ...e.draft, ...patch } } : e));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Admin</p>
          <h1 className="text-[28px] font-extrabold tracking-tight text-navy">Promo banners</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Campaign banners per module — masterclasses, mocks, live sessions, offers, upgrades and
            announcements. Each banner belongs to one placement, so different modules show different
            campaigns. Scheduled banners appear and disappear on their own.
          </p>
        </div>
        <Button onClick={() => setEditing({ id: null, draft: EMPTY })}>
          <Plus className="size-4" /> New banner
        </Button>
      </div>

      {err && (
        <div role="alert" className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200">
          {err}
        </div>
      )}

      {editing && d && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-navy">{editing.id ? 'Edit banner' : 'New banner'}</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Placement</span>
              <select
                className={inputCls}
                value={d.placement}
                onChange={(e) => set({ placement: e.target.value as PromoPlacement })}
              >
                {PROMO_PLACEMENTS.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.group} — {p.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Title</span>
              <input className={inputCls} value={d.title} onChange={(e) => set({ title: e.target.value })} />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Body</span>
              <textarea rows={3} className={areaCls} value={d.body} onChange={(e) => set({ body: e.target.value })} />
            </label>
            <label className="block">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Image URL</span>
              <input className={inputCls} value={d.imageUrl} onChange={(e) => set({ imageUrl: e.target.value })} placeholder="https://…" />
            </label>
            <label className="block">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Image alt text</span>
              <input className={inputCls} value={d.alt} onChange={(e) => set({ alt: e.target.value })} />
            </label>
            <label className="block">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Button label</span>
              <input className={inputCls} value={d.ctaLabel} onChange={(e) => set({ ctaLabel: e.target.value })} />
            </label>
            <label className="block">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Button destination</span>
              <input className={inputCls} value={d.ctaHref} onChange={(e) => set({ ctaHref: e.target.value })} placeholder="/upgrade" />
            </label>
            <label className="block">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Starts (blank = now)</span>
              <input type="datetime-local" className={inputCls} value={d.startsAt} onChange={(e) => set({ startsAt: e.target.value })} />
            </label>
            <label className="block">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Ends (blank = no end)</span>
              <input type="datetime-local" className={inputCls} value={d.endsAt} onChange={(e) => set({ endsAt: e.target.value })} />
            </label>
            <label className="block">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Sort order</span>
              <input type="number" className={inputCls} value={d.sortOrder} onChange={(e) => set({ sortOrder: Number(e.target.value) })} />
            </label>
            <label className="flex items-center gap-2 self-end pb-2">
              <input type="checkbox" checked={d.isActive} onChange={(e) => set({ isActive: e.target.checked })} />
              <span className="text-sm font-medium text-navy">Active</span>
            </label>
          </div>
          <div className="mt-5 flex gap-3">
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              {editing.id ? 'Save changes' : 'Create banner'}
            </Button>
            <Button variant="outline" onClick={() => { setEditing(null); setErr(null); }}>
              Cancel
            </Button>
          </div>
        </section>
      )}

      {grouped.map((g) => (
        <section key={g.key}>
          <div className="flex items-baseline gap-3">
            <h2 className="text-lg font-bold text-navy">{g.label}</h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500">
              {g.banners.length} {g.banners.length === 1 ? 'banner' : 'banners'}
            </span>
          </div>
          {g.banners.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">Nothing scheduled — this module shows no banner.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {g.banners.map((b) => (
                <li
                  key={b.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-navy">{b.title}</p>
                      <span
                        className={
                          b.isLive
                            ? 'rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200'
                            : 'rounded-full bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200'
                        }
                      >
                        {b.isLive ? 'Live now' : b.isActive ? 'Scheduled' : 'Off'}
                      </span>
                    </div>
                    {b.body && <p className="mt-1 line-clamp-1 text-sm text-slate-600">{b.body}</p>}
                    <p className="mt-1 text-xs text-slate-400">
                      {b.startsAt ? new Date(b.startsAt).toLocaleString() : 'from now'} →{' '}
                      {b.endsAt ? new Date(b.endsAt).toLocaleString() : 'no end'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditing({ id: b.id, draft: draftOf(b) })}>
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => remove(b.id)} aria-label={`Delete ${b.title}`}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
