'use client';

import { useEffect, useState } from 'react';
import { Check, Loader2, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { deleteSeo, listSeo, upsertSeo, type SeoMetadata } from '@/lib/api/seo';
import { Button } from '@/components/ui/button';
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

  const reload = () =>
    listSeo()
      .then(setRows)
      .catch(() => setErr('Could not load SEO metadata.'));

  /**
   * One operation, two meanings: on a catalog page this drops the stored override and
   * the page falls back to the defaults shipped in code; on an admin-added page it
   * removes the entry. The button says which, because they are not interchangeable.
   */
  const remove = async (row: SeoMetadata) => {
    setErr(null);
    try {
      await deleteSeo(row.key);
      await reload();
    } catch {
      setErr(
        row.isCustom
          ? 'Could not remove that page.'
          : 'Nothing stored for that page — it is already on the shipped defaults.',
      );
    }
  };

  const addPage = async (key: string) => {
    setErr(null);
    const path = key.trim();
    if (!path.startsWith('/') || /\s/.test(path)) {
      setErr('Enter a route path, e.g. /company/accenture/syllabus');
      return false;
    }
    if (rows.some((r) => r.key === path)) {
      setErr('That page is already in the list.');
      return false;
    }
    try {
      await upsertSeo({ key: path, title: '', description: '' });
      await reload();
      return true;
    } catch {
      setErr('Could not add that page.');
      return false;
    }
  };

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
      <AddPage onAdd={addPage} />
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
              <SeoRow key={r.key} row={r} onPatch={(f, v) => patch(r.key, f, v)} onRemove={() => remove(r)} />
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

/**
 * Add a page the code catalog does not list.
 *
 * The point is per-page overrides on templated routes: the 81 company x feature pages
 * are generated from 9 template rows, so adding the EXACT path here — e.g.
 * /company/accenture/syllabus — is how one company gets its own title or its own video
 * while the other eight keep the shared template. The page reads the exact key first.
 */
function AddPage({ onAdd }: { onAdd: (key: string) => Promise<boolean> }) {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="size-4" /> Add a page
      </Button>
    );
  }
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-bold text-navy">Add a page</h2>
      <p className="mt-1 max-w-2xl text-sm text-slate-600">
        Enter the route path. Use this to give one page its own title, description or video where
        it currently inherits a shared template — for example{' '}
        <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs">/company/accenture/syllabus</code>,
        which otherwise follows{' '}
        <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs">/company/[slug]/syllabus</code>.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <input
          className={cn(inputCls, 'max-w-md flex-1')}
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="/company/accenture/syllabus"
          aria-label="Route path"
        />
        <Button
          type="button"
          onClick={async () => {
            setBusy(true);
            const ok = await onAdd(key);
            setBusy(false);
            if (ok) {
              setKey('');
              setOpen(false);
            }
          }}
          disabled={busy}
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : null} Add
        </Button>
        <Button type="button" variant="ghost" onClick={() => { setOpen(false); setKey(''); }}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

/** Canonical section order for display; anything else falls to the end (A→Z). */
const SECTION_ORDER = ['Public', 'SEO Landing Pages', 'Auth', 'Student', 'Admin', 'Super Admin', 'College (TPO)', 'Other'];

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
  onRemove,
}: {
  row: SeoMetadata;
  onPatch: (field: keyof SeoMetadata, value: string) => void;
  onRemove: () => void;
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
        heroImageUrl: row.heroImageUrl ?? null,
        heroImageAlt: row.heroImageAlt ?? null,
        embedUrl: row.embedUrl ?? null,
        embedTitle: row.embedTitle ?? null,
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
        <span className="flex items-center gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="animate-spin" /> : saved ? <Check /> : null}
            {saved ? 'Saved' : 'Save'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemove}
            title={
              row.isCustom
                ? 'Remove this page from the module'
                : 'Reset to the defaults shipped in code'
            }
            aria-label={row.isCustom ? `Remove ${row.key}` : `Reset ${row.key} to defaults`}
          >
            {row.isCustom ? <Trash2 className="size-4" /> : <RotateCcw className="size-4" />}
          </Button>
        </span>
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

        <div className="sm:col-span-2 mt-1 border-t border-slate-100 pt-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            On-page media
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Shown in the right-hand panel of the page. Paste a normal YouTube or Vimeo link —
            it is converted to an embeddable one. Anything else is ignored rather than framed.
          </p>
        </div>
        <label className="space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Video link</span>
          <input
            className={inputCls}
            value={row.embedUrl ?? ''}
            onChange={(e) => onPatch('embedUrl', e.target.value)}
            placeholder="https://www.youtube.com/watch?v=…"
          />
        </label>
        <label className="space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Video caption</span>
          <input
            className={inputCls}
            value={row.embedTitle ?? ''}
            onChange={(e) => onPatch('embedTitle', e.target.value)}
            placeholder="Accenture Syllabus & Test Pattern"
          />
        </label>
        <label className="space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Image URL</span>
          <input
            className={inputCls}
            value={row.heroImageUrl ?? ''}
            onChange={(e) => onPatch('heroImageUrl', e.target.value)}
            placeholder="https://…"
          />
        </label>
        <label className="space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Image alt text
          </span>
          <input
            className={inputCls}
            value={row.heroImageAlt ?? ''}
            onChange={(e) => onPatch('heroImageAlt', e.target.value)}
            placeholder="What the image shows"
          />
        </label>
        {row.embedUrl ? (
          <div className="sm:col-span-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Preview</p>
            {/* Shows what visitors will see. A link that did not normalise renders the
                note instead of a blank box, so a bad paste is obvious before saving. */}
            <div className="mt-2 aspect-video w-full max-w-sm overflow-hidden rounded-lg border border-slate-200">
              <iframe
                src={row.embedUrl}
                title={row.embedTitle ?? 'Preview'}
                className="h-full w-full border-0"
                allowFullScreen
              />
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Preview updates after you save — the link is converted on the server.
            </p>
          </div>
        ) : null}
      </div>
      {error && <p className="mt-2 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}
