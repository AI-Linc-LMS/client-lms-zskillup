'use client';

/**
 * SeoScreen — rendered by BOTH /admin and /superadmin.
 *
 * It lives here rather than in one route because `navForPath` picks the sidebar from
 * the PATHNAME, not the role: a super-admin clicking a link into /admin had the whole
 * rail flip to the admin console, which reads as being thrown out of your own console.
 * Two thin route files render this one screen, so each console keeps its own nav.
 */

import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, Loader2, Plus, RotateCcw, Search, Trash2, X } from 'lucide-react';
import { deleteSeo, listSeo, upsertSeo, type SeoMetadata } from '@/lib/api/seo';
import {
  SEO_CONTENT_LIMITS,
  isSeoContentEmpty,
  type SeoPageContent,
} from '@/shared/seo-content';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const inputCls =
  'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy focus:border-orange focus:outline-none focus-visible:ring-2 focus-visible:ring-orange/30';

export function SeoScreen() {
  const [rows, setRows] = useState<SeoMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  // ONE section at a time. The catalog is ~110 pages and every row carries eight
  // fields, so rendering them all at once made the page unscrollable in practice —
  // finding /company/[slug]/syllabus meant paging past 60 admin screens.
  const [active, setActive] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    listSeo()
      .then(setRows)
      .catch(() => setErr('Could not load SEO metadata.'))
      .finally(() => setLoading(false));
  }, []);

  const patch = (key: string, field: keyof SeoMetadata, value: string) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, [field]: value } : r)));

  /** Body copy is a nested object, so it gets its own setter rather than the string one. */
  const patchContent = (key: string, content: SeoPageContent | null) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, content } : r)));

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
  const activeSection = active ?? sections[0]?.section ?? null;
  const q = query.trim().toLowerCase();
  const searching = q.length > 0;
  // While searching, ignore the section filter: the whole point is not knowing which
  // group the page is in.
  const visibleRows = searching
    ? rows.filter(
        (r) =>
          r.key.toLowerCase().includes(q) ||
          (r.label ?? '').toLowerCase().includes(q) ||
          (r.title ?? '').toLowerCase().includes(q),
      )
    : (sections.find((x) => x.section === activeSection)?.rows ?? []);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Admin</p>
        <h1 className="text-[28px] font-extrabold tracking-tight text-navy">SEO &amp; page content</h1>
        <p className="mt-1 text-sm text-slate-600">
          Everything editable about a page: meta title, description, keywords and social image,
          the video or image shown on it, and its body copy — heading, intro, content sections and
          FAQs. Pick an audience group below, or search for a path directly. Each page ships with a
          sensible default — open a row to override only what you want. Changes go live within ~5
          minutes — no deploy needed.
        </p>
      </div>
      {err && (
        <div className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200" role="alert">
          {err}
        </div>
      )}
      <AddPage onAdd={addPage} />

      {/* Search spans EVERY section — a path you half-remember is faster to type than
          to find by guessing which audience group it belongs to. */}
      <div className="sticky top-0 z-10 -mx-1 space-y-3 bg-background/95 px-1 py-3">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            className={cn(inputCls, 'pl-9')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by path or page name…"
            aria-label="Search pages"
          />
        </div>
        {!searching && (
          <div className="flex flex-wrap gap-2">
            {sections.map(({ section, rows: sr }) => (
              <button
                key={section}
                type="button"
                onClick={() => setActive(section)}
                aria-current={section === activeSection ? 'true' : undefined}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-semibold transition-colors',
                  section === activeSection
                    ? 'bg-navy text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                )}
              >
                {section}
                <span
                  className={cn(
                    'ml-1.5 rounded-full px-1.5 text-[10px]',
                    section === activeSection ? 'bg-white/20' : 'bg-white text-slate-500',
                  )}
                >
                  {sr.length}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        {searching && (
          <p className="text-sm text-slate-500">
            {visibleRows.length} {visibleRows.length === 1 ? 'page' : 'pages'} matching
            &ldquo;{query.trim()}&rdquo;
          </p>
        )}
        {visibleRows.map((r) => (
          <SeoRow
            key={r.key}
            row={r}
            showSection={searching}
            onPatch={(f, v) => patch(r.key, f, v)}
            onPatchContent={(c) => patchContent(r.key, c)}
            onRemove={() => remove(r)}
          />
        ))}
        {visibleRows.length === 0 && !err && (
          <p className="text-sm text-slate-500">
            {searching ? 'No pages match that search.' : 'No pages configured yet.'}
          </p>
        )}
      </div>
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
  onPatchContent,
  onRemove,
  showSection,
}: {
  row: SeoMetadata;
  onPatch: (field: keyof SeoMetadata, value: string) => void;
  onPatchContent: (content: SeoPageContent | null) => void;
  onRemove: () => void;
  /** Search results span groups, so each hit says which one it came from. */
  showSection?: boolean;
}) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Collapsed by default: a section holds up to 27 pages and each editor is eight
  // fields tall, so the list is only scannable when the rows are one line each.
  const [open, setOpen] = useState(false);

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
        // null clears the body back to the copy shipped in code.
        content: isSeoContentEmpty(row.content) ? null : row.content,
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
    <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <ChevronDown
            className={cn(
              'size-4 shrink-0 text-slate-400 transition-transform',
              open && 'rotate-180',
            )}
            aria-hidden
          />
          {row.label ? <span className="truncate text-sm font-bold text-navy">{row.label}</span> : null}
          <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 font-mono text-xs font-semibold text-slate-600">
            {row.key}
          </span>
          {showSection && row.section ? (
            <span className="shrink-0 rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-500 ring-1 ring-slate-200">
              {row.section}
            </span>
          ) : null}
          {row.isCustom ? (
            <span className="shrink-0 rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700 ring-1 ring-sky-200">
              Added
            </span>
          ) : null}
          {row.embedUrl ? (
            <span className="shrink-0 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700 ring-1 ring-violet-200">
              Video
            </span>
          ) : null}
          {row.heroImageUrl ? (
            <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
              Image
            </span>
          ) : null}
          {!isSeoContentEmpty(row.content) ? (
            <span className="shrink-0 rounded-full bg-orange/10 px-2 py-0.5 text-[10px] font-semibold text-orange ring-1 ring-orange/25">
              Content
            </span>
          ) : null}
        </button>
        <span className="flex shrink-0 items-center gap-2">
          {open && (
            <Button type="button" variant="secondary" size="sm" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="animate-spin" /> : saved ? <Check /> : null}
              {saved ? 'Saved' : 'Save'}
            </Button>
          )}
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
      {!open && row.title ? (
        <p className="mt-1.5 truncate pl-6 text-xs text-slate-500">{row.title}</p>
      ) : null}
      {!open ? null : (
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
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
      )}
      {open && <ContentEditor pageKey={row.key} content={row.content ?? null} onChange={onPatchContent} />}
      {error && <p className="mt-2 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}

/** The tokens a templated key may use, so the hint names the real ones per family. */
function tokensFor(pageKey: string): string[] {
  if (!pageKey.includes('[')) return [];
  if (pageKey.startsWith('/company/')) return ['{company}', '{year}'];
  if (pageKey.startsWith('/section/')) return ['{section}'];
  return [];
}

/**
 * The page BODY editor — H1, lead paragraph, content sections and FAQs.
 *
 * Why it sits next to the meta fields rather than in its own screen: an operator writing
 * a page thinks about the title and the first paragraph together, and the row is already
 * the unit of "everything editable about this page".
 *
 * Every field is optional and empty means "use the copy shipped in code", so a page left
 * untouched renders exactly as it did before this editor existed. That is also why Save
 * sends `null` for an empty body instead of an empty object — see the save() above.
 *
 * Bullets are one-per-line in a textarea rather than a nested add/remove list: the list
 * is short, reordering is a drag in either UI, and a textarea is the thing an operator
 * can paste into from a doc.
 */
function ContentEditor({
  pageKey,
  content,
  onChange,
}: {
  pageKey: string;
  content: SeoPageContent | null;
  onChange: (content: SeoPageContent | null) => void;
}) {
  const sections = content?.sections ?? [];
  const faqs = content?.faqs ?? [];
  const tokens = tokensFor(pageKey);

  const set = (next: Partial<SeoPageContent>) => onChange({ ...(content ?? {}), ...next });

  const setSection = (i: number, field: 'title' | 'body' | 'bullets', value: string) =>
    set({
      sections: sections.map((sec, j) =>
        j !== i
          ? sec
          : field === 'bullets'
            ? { ...sec, bullets: value.split('\n').map((b) => b.trim()).filter(Boolean) }
            : { ...sec, [field]: value },
      ),
    });

  const setFaq = (i: number, field: 'q' | 'a', value: string) =>
    set({ faqs: faqs.map((f, j) => (j === i ? { ...f, [field]: value } : f)) });

  return (
    <div className="mt-4 border-t border-slate-200 pt-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Page content
        </p>
        {tokens.length > 0 && (
          <p className="text-xs text-slate-400">
            This row covers every page in the family — use{' '}
            <span className="font-mono font-semibold text-slate-500">{tokens.join(' ')}</span> and it
            is filled in per page.
          </p>
        )}
      </div>

      <div className="mt-3 grid gap-4">
        <label className="block space-y-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Page heading (H1)
          </span>
          <input
            className={inputCls}
            value={content?.heading ?? ''}
            onChange={(e) => set({ heading: e.target.value })}
            maxLength={SEO_CONTENT_LIMITS.heading}
            placeholder="Leave empty to use the heading shipped in code"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Intro paragraph
          </span>
          <textarea
            className="min-h-20 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-relaxed text-navy focus:border-orange focus:outline-none focus-visible:ring-2 focus-visible:ring-orange/30"
            value={content?.intro ?? ''}
            onChange={(e) => set({ intro: e.target.value })}
            maxLength={SEO_CONTENT_LIMITS.intro}
            placeholder="The paragraph under the heading. Leave empty to keep the shipped copy."
          />
        </label>
      </div>

      {/* ── Sections ─────────────────────────────────────────────────────── */}
      <div className="mt-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Content sections{sections.length > 0 ? ` (${sections.length})` : ''}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={sections.length >= SEO_CONTENT_LIMITS.sections}
            onClick={() => set({ sections: [...sections, { title: '', body: '' }] })}
          >
            <Plus /> Add section
          </Button>
        </div>
        {sections.length === 0 ? (
          <p className="mt-2 text-xs text-slate-400">
            None — the page shows only what it builds from real data.
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {sections.map((sec, i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="flex items-start gap-2">
                  <input
                    className={inputCls}
                    value={sec.title}
                    onChange={(e) => setSection(i, 'title', e.target.value)}
                    maxLength={SEO_CONTENT_LIMITS.sectionTitle}
                    placeholder="Section heading"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove section ${i + 1}`}
                    onClick={() => set({ sections: sections.filter((_, j) => j !== i) })}
                  >
                    <X className="size-4 text-slate-400" />
                  </Button>
                </div>
                <textarea
                  className="mt-2 min-h-24 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-relaxed text-navy focus:border-orange focus:outline-none focus-visible:ring-2 focus-visible:ring-orange/30"
                  value={sec.body}
                  onChange={(e) => setSection(i, 'body', e.target.value)}
                  maxLength={SEO_CONTENT_LIMITS.sectionBody}
                  placeholder="Body text. Leave a blank line between paragraphs."
                />
                <label className="mt-2 block space-y-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                    Bullets — one per line
                  </span>
                  <textarea
                    className="min-h-16 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-relaxed text-navy focus:border-orange focus:outline-none focus-visible:ring-2 focus-visible:ring-orange/30"
                    value={(sec.bullets ?? []).join('\n')}
                    onChange={(e) => setSection(i, 'bullets', e.target.value)}
                    placeholder="Optional"
                  />
                </label>
                {!sec.title.trim() || (!sec.body.trim() && !(sec.bullets ?? []).length) ? (
                  <p className="mt-2 text-xs font-medium text-amber-700">
                    Needs a heading and either body text or bullets — otherwise it is dropped on save.
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── FAQs ─────────────────────────────────────────────────────────── */}
      <div className="mt-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            FAQs{faqs.length > 0 ? ` (${faqs.length})` : ''}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={faqs.length >= SEO_CONTENT_LIMITS.faqs}
            onClick={() => set({ faqs: [...faqs, { q: '', a: '' }] })}
          >
            <Plus /> Add question
          </Button>
        </div>
        <p className="mt-1.5 text-xs text-slate-400">
          Shown on the page and submitted to Google as FAQ structured data, which is what
          earns the expandable questions under a search result.
        </p>
        {faqs.length > 0 && (
          <div className="mt-3 space-y-3">
            {faqs.map((f, i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="flex items-start gap-2">
                  <input
                    className={inputCls}
                    value={f.q}
                    onChange={(e) => setFaq(i, 'q', e.target.value)}
                    maxLength={SEO_CONTENT_LIMITS.faqQuestion}
                    placeholder="Question"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove question ${i + 1}`}
                    onClick={() => set({ faqs: faqs.filter((_, j) => j !== i) })}
                  >
                    <X className="size-4 text-slate-400" />
                  </Button>
                </div>
                <textarea
                  className="mt-2 min-h-20 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-relaxed text-navy focus:border-orange focus:outline-none focus-visible:ring-2 focus-visible:ring-orange/30"
                  value={f.a}
                  onChange={(e) => setFaq(i, 'a', e.target.value)}
                  maxLength={SEO_CONTENT_LIMITS.faqAnswer}
                  placeholder="Answer"
                />
                {!f.q.trim() || !f.a.trim() ? (
                  <p className="mt-2 text-xs font-medium text-amber-700">
                    Needs both a question and an answer — a half-filled pair invalidates the
                    structured data for the whole page, so it is dropped on save.
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="mt-4 text-xs text-slate-400">
        Text only — formatting marks are shown literally, never rendered. Live within about
        five minutes of saving.
      </p>
    </div>
  );
}
