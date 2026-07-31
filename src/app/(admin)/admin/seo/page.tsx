'use client';

import { useEffect, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { listSeo, upsertSeo, type SeoMetadata } from '@/lib/api/seo';
import { cn } from '@/lib/utils';

const inputCls =
  'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy focus:border-orange focus:outline-none focus-visible:ring-2 focus-visible:ring-orange/30';

export default function AdminSeoPage() {
  const [rows, setRows] = useState<SeoMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    listSeo()
      .then(setRows)
      .catch(() => setErr('Could not load SEO metadata.'))
      .finally(() => setLoading(false));
  }, []);

  const patch = (key: string, field: keyof SeoMetadata, value: string) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, [field]: value } : r)));

  if (loading) {
    return (
      <div className="grid place-items-center py-24">
        <Loader2 className="size-6 animate-spin text-slate-400" />
      </div>
    );
  }

  const sections = groupBySection(rows);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Admin</p>
        <h1 className="text-[28px] font-extrabold tracking-tight text-navy">SEO metadata</h1>
        <p className="mt-1 text-sm text-slate-600">
          Meta title, description, keywords and social image for every page, grouped by audience.
          Each page ships with a sensible default — edit only what you want to override. Changes go
          live within ~5 minutes — no deploy needed.
        </p>
      </div>
      {err && (
        <div className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200" role="alert">
          {err}
        </div>
      )}
      {sections.map(({ section, rows: sectionRows }) => (
        <section key={section} className="space-y-5">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-navy">{section}</h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500">
              {sectionRows.length} {sectionRows.length === 1 ? 'page' : 'pages'}
            </span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>
          <div className="space-y-5">
            {sectionRows.map((r) => (
              <SeoRow key={r.key} row={r} onPatch={(f, v) => patch(r.key, f, v)} />
            ))}
          </div>
        </section>
      ))}
      {rows.length === 0 && !err && (
        <p className="text-sm text-slate-500">No pages configured yet.</p>
      )}
    </div>
  );
}

/** Canonical section order for display; anything else falls to the end (A→Z). */
const SECTION_ORDER = ['Public', 'Auth', 'Student', 'Admin', 'Super Admin', 'College (TPO)', 'Other'];

function groupBySection(rows: SeoMetadata[]): { section: string; rows: SeoMetadata[] }[] {
  const map = new Map<string, SeoMetadata[]>();
  for (const r of rows) {
    const s = r.section ?? 'Other';
    (map.get(s) ?? map.set(s, []).get(s)!).push(r);
  }
  return [...map.entries()]
    .sort(([a], [b]) => {
      const ia = SECTION_ORDER.indexOf(a);
      const ib = SECTION_ORDER.indexOf(b);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.localeCompare(b);
    })
    .map(([section, sectionRows]) => ({ section, rows: sectionRows }));
}

function SeoRow({
  row,
  onPatch,
}: {
  row: SeoMetadata;
  onPatch: (field: keyof SeoMetadata, value: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await upsertSeo({
        key: row.key,
        title: row.title,
        description: row.description,
        keywords: row.keywords,
        ogImageUrl: row.ogImageUrl,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError('Save failed — try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          {row.label ? <span className="text-sm font-bold text-navy">{row.label}</span> : null}
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-mono text-xs font-semibold text-slate-600">
            {row.key}
          </span>
        </span>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-full bg-navy px-4 py-1.5 text-xs font-bold text-white transition-colors hover:bg-navy/90 disabled:opacity-60"
        >
          {saving ? <Loader2 className="size-3.5 animate-spin" /> : saved ? <Check className="size-3.5" /> : null}
          {saved ? 'Saved' : 'Save'}
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 sm:col-span-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Meta title</span>
          <input
            className={inputCls}
            value={row.title ?? ''}
            onChange={(e) => onPatch('title', e.target.value)}
            maxLength={200}
            placeholder="Title shown in search results + the browser tab"
          />
        </label>
        <label className="space-y-1 sm:col-span-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Meta description
          </span>
          <textarea
            className={cn(inputCls, 'h-auto py-2 leading-relaxed')}
            rows={2}
            value={row.description ?? ''}
            onChange={(e) => onPatch('description', e.target.value)}
            maxLength={500}
            placeholder="~155 characters — the snippet under the title in Google"
          />
        </label>
        <label className="space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Keywords (comma-separated)
          </span>
          <input
            className={inputCls}
            value={row.keywords ?? ''}
            onChange={(e) => onPatch('keywords', e.target.value)}
            placeholder="placement, aptitude, coding"
          />
        </label>
        <label className="space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Social / OG image URL
          </span>
          <input
            className={inputCls}
            value={row.ogImageUrl ?? ''}
            onChange={(e) => onPatch('ogImageUrl', e.target.value)}
            placeholder="https://…"
          />
        </label>
      </div>
      {error && <p className="mt-2 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}
