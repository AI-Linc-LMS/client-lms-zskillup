'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Eye, Loader2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { StatusPill } from '@/components/student/StatusPill';
import { listAdminQuestions } from '@/lib/api/admin';
import { searchAdminCodingProblems } from '@/lib/api/coding';
import { describeApiError } from '@/lib/api/types';
import type { AssessmentItemType, CodingTopic } from '@/lib/api/assessment-builder';
import type { ApiCompany } from '@/lib/api/catalog';
import type { MAX_EXCLUDE_IDS } from '@/shared/dto/admin-questions.dto';
import { LIMITS, normId, sectionHolding, type PickedItem, type WizardSection } from './selection';
import { indentedLabel, type TopicOption } from './topic-tree';
import { PreviewDrawer, type PreviewTarget } from './previews';
import { DifficultyPill, ErrorAlert, NoticeBox, OriginBadge, checkboxCls, fieldLabelCls, inputCls } from './ui';

const PAGE_SIZE = 20;
/** Server cap for `excludeIds` on the browse GETs (a longer URL trips Node's header limit).
 *  Anything past it is still recognised client-side and shown as not selectable. */
const MAX_URL_EXCLUDES: typeof MAX_EXCLUDE_IDS = 300;

/** A browser row, normalised across the MCQ and coding sources. */
interface BrowseRow {
  id: string;
  label: string;
  difficulty: string;
  /** "Section › Topic" (MCQ) or the coding topic. */
  where: string | null;
  companies: string[];
  flags: Array<{ tone: 'neutral' | 'warning' | 'positive'; label: string }>;
}

/**
 * MANUAL selection (Admin / Super Admin only): browse the bank by section/topic, difficulty,
 * company and text, and tick questions one by one. A tick adds the item to THIS section
 * immediately, so the choice survives paging and filter changes. Items already elsewhere in
 * the assessment are left out of the results (`excludeIds`); past the 300-id URL cap they
 * still show, but can't be ticked — the UI never builds a duplicate.
 */
export function ManualSelection({
  section,
  sections,
  type,
  topicOptions,
  codingTopics,
  companies,
  driveCompanySlug,
  existingItems,
  update,
}: {
  section: WizardSection;
  /** All new sections (to say where a row already is). */
  sections: WizardSection[];
  type: AssessmentItemType;
  topicOptions: TopicOption[];
  codingTopics: CodingTopic[];
  companies: ApiCompany[];
  driveCompanySlug: string;
  /** What the edited assessment already holds (can never be added again). */
  existingItems: Array<{ id: string; type: AssessmentItemType }>;
  update: (fn: (s: WizardSection) => WizardSection) => void;
}) {
  const uid = useId();
  const [topicId, setTopicId] = useState('');
  const [codingTopic, setCodingTopic] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [company, setCompany] = useState(driveCompanySlug);
  const [verifiedOnly, setVerifiedOnly] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const [rows, setRows] = useState<BrowseRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [limitNote, setLimitNote] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewTarget | null>(null);

  const companyName = useMemo(() => {
    const m = new Map(companies.map((c) => [c.slug, c.name]));
    return (slug: string) => m.get(slug) ?? slug;
  }, [companies]);

  // Debounce the text search; any filter change goes back to page 1.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setOffset(0);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const existingIds = useMemo(() => new Set(existingItems.map((e) => normId(e.id))), [existingItems]);

  // Keep everything already in the assessment OUT of the results — except this section's
  // own picks, which stay listed (ticked) so they can be unticked from here. Other
  // sections' picks go first (freshest), then the edited assessment's existing items.
  const excludeKey = useMemo(() => {
    const ids: string[] = [];
    for (const s of sections) {
      if (s.key === section.key) continue;
      for (const it of s.items) if (it.type === type) ids.push(it.id);
    }
    for (const e of existingItems) if (e.type === type) ids.push(normId(e.id));
    return [...new Set(ids)].slice(0, MAX_URL_EXCLUDES).join(',');
  }, [sections, section.key, existingItems, type]);

  useEffect(() => {
    const ctl = new AbortController();
    const excludeIds = excludeKey ? excludeKey.split(',') : undefined;
    setLoading(true);
    setErr(null);
    const run =
      type === 'MCQ'
        ? listAdminQuestions(
            {
              status: 'PUBLISHED',
              type: 'MCQ',
              topicId: topicId || undefined,
              difficulty: difficulty || undefined,
              company: company || undefined,
              search: search || undefined,
              excludeIds,
              limit: PAGE_SIZE,
              offset,
            },
            { signal: ctl.signal },
          ).then((r) => ({
            total: r.total,
            rows: r.rows.map<BrowseRow>((q) => ({
              id: normId(q.id),
              label: q.stem,
              difficulty: q.difficulty,
              where: q.sectionName && q.topicName && q.sectionName !== q.topicName ? `${q.sectionName} › ${q.topicName}` : q.topicName,
              companies: q.companies ?? [],
              flags: q.source === 'AI_GENERATED' && !q.verified ? [{ tone: 'warning', label: 'AI · unverified' }] : [],
            })),
          }))
        : searchAdminCodingProblems(
            {
              topic: codingTopic || undefined,
              difficulty: (difficulty || undefined) as 'EASY' | 'MEDIUM' | 'HARD' | undefined,
              company: company || undefined,
              verified: verifiedOnly ? true : undefined,
              search: search || undefined,
              excludeIds,
              limit: PAGE_SIZE,
              offset,
            },
            { signal: ctl.signal },
          ).then((r) => ({
            total: r.total,
            rows: r.rows.map<BrowseRow>((p) => ({
              id: normId(p.id),
              label: p.title,
              difficulty: p.difficulty,
              where: p.topic,
              companies: p.companies,
              flags: p.verified ? [{ tone: 'positive', label: 'Verified' }] : [{ tone: 'neutral', label: 'Unverified' }],
            })),
          }));
    run
      .then((r) => {
        // The list shrank under the current page (e.g. more ids excluded): step back to the last page.
        if (r.rows.length === 0 && offset > 0 && r.total > 0) {
          setOffset(Math.floor((r.total - 1) / PAGE_SIZE) * PAGE_SIZE);
          return;
        }
        setRows(r.rows);
        setTotal(r.total);
      })
      .catch((e) => {
        if (ctl.signal.aborted) return;
        setRows([]);
        setTotal(0);
        setErr(describeApiError(e, 'Could not load the question bank.'));
      })
      .finally(() => {
        if (!ctl.signal.aborted) setLoading(false);
      });
    return () => ctl.abort();
  }, [type, topicId, codingTopic, difficulty, company, verifiedOnly, search, offset, excludeKey]);

  const inThisSection = useMemo(() => new Set(section.items.map((i) => i.id)), [section.items]);
  const perSectionLimit = type === 'MCQ' ? LIMITS.mcqPerSection : LIMITS.codingPerSection;
  const ofType = section.items.filter((i) => i.type === type).length;

  /** Why a row can't be ticked here, or null when it can. */
  const blockedReason = (id: string): string | null => {
    if (inThisSection.has(id)) return null;
    if (existingIds.has(id)) return 'Already in this assessment';
    const other = sectionHolding(sections, id);
    return other ? `Already in ${other.name}` : null;
  };

  const toggle = (row: BrowseRow) => {
    setLimitNote(null);
    if (blockedReason(row.id)) return;
    if (inThisSection.has(row.id)) {
      update((s) => ({ ...s, items: s.items.filter((i) => i.id !== row.id) }));
      return;
    }
    if (ofType >= perSectionLimit) {
      setLimitNote(`A section can hold ${perSectionLimit} ${type === 'MCQ' ? 'MCQs' : 'coding problems'}. Add another section for more.`);
      return;
    }
    const item: PickedItem = { id: row.id, type, label: row.label, difficulty: row.difficulty, origin: 'MANUAL' };
    update((s) => (s.items.some((i) => i.id === item.id) ? s : { ...s, items: [...s.items, item] }));
  };

  const selectable = (rows ?? []).filter((r) => !blockedReason(r.id));
  const pageChecked = selectable.filter((r) => inThisSection.has(r.id)).length;
  const allOnPage = selectable.length > 0 && pageChecked === selectable.length;
  const pageBoxRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (pageBoxRef.current) pageBoxRef.current.indeterminate = pageChecked > 0 && !allOnPage;
  }, [pageChecked, allOnPage]);

  const togglePage = () => {
    setLimitNote(null);
    if (allOnPage) {
      const drop = new Set(selectable.map((r) => r.id));
      update((s) => ({ ...s, items: s.items.filter((i) => !drop.has(i.id)) }));
      return;
    }
    const toAdd = selectable.filter((r) => !inThisSection.has(r.id));
    const room = perSectionLimit - ofType;
    const accepted = toAdd.slice(0, Math.max(0, room));
    if (accepted.length < toAdd.length) {
      setLimitNote(`Only ${accepted.length} more fit in this section (limit ${perSectionLimit}).`);
    }
    update((s) => {
      const have = new Set(s.items.map((i) => i.id));
      const fresh = accepted
        .filter((r) => !have.has(r.id))
        .map<PickedItem>((r) => ({ id: r.id, type, label: r.label, difficulty: r.difficulty, origin: 'MANUAL' }));
      return { ...s, items: [...s.items, ...fresh] };
    });
  };

  const resetPage = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setOffset(0);
  };

  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + PAGE_SIZE, total);
  const previewRow = preview ? (rows ?? []).find((r) => r.id === preview.id) : undefined;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {type === 'MCQ' ? (
          <div className="sm:col-span-2">
            <label htmlFor={`${uid}-topic`} className={fieldLabelCls}>
              Section / topic
            </label>
            <select
              id={`${uid}-topic`}
              value={topicId}
              onChange={(e) => resetPage(setTopicId)(e.target.value)}
              className={`mt-1 ${inputCls}`}
            >
              <option value="">All sections</option>
              {topicOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {indentedLabel(o)}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <label htmlFor={`${uid}-coding`} className={fieldLabelCls}>
              Coding topic
            </label>
            <select
              id={`${uid}-coding`}
              value={codingTopic}
              onChange={(e) => resetPage(setCodingTopic)(e.target.value)}
              className={`mt-1 ${inputCls}`}
            >
              <option value="">All coding topics</option>
              {codingTopics.map((t) => (
                <option key={t.topic} value={t.topic}>
                  {t.topic}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label htmlFor={`${uid}-diff`} className={fieldLabelCls}>
            Difficulty
          </label>
          <select
            id={`${uid}-diff`}
            value={difficulty}
            onChange={(e) => resetPage(setDifficulty)(e.target.value)}
            className={`mt-1 ${inputCls}`}
          >
            <option value="">Any difficulty</option>
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </select>
        </div>
        <div>
          <label htmlFor={`${uid}-company`} className={fieldLabelCls}>
            Company
          </label>
          <select
            id={`${uid}-company`}
            value={company}
            onChange={(e) => resetPage(setCompany)(e.target.value)}
            className={`mt-1 ${inputCls}`}
          >
            <option value="">All companies</option>
            {companies.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
                {c.slug === driveCompanySlug ? ' (this drive)' : ''}
              </option>
            ))}
          </select>
        </div>
        <div className={type === 'MCQ' ? '' : 'sm:col-span-2'}>
          <label htmlFor={`${uid}-search`} className={fieldLabelCls}>
            Search
          </label>
          <div className="relative mt-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <input
              id={`${uid}-search`}
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={type === 'MCQ' ? 'Words in the question' : 'Problem title'}
              className={`${inputCls} pl-9`}
            />
          </div>
        </div>
        {type === 'CODING' ? (
          <label className="flex items-center gap-2 text-sm text-slate-600 sm:col-span-2">
            <input
              type="checkbox"
              checked={verifiedOnly}
              onChange={(e) => resetPage(setVerifiedOnly)(e.target.checked)}
              className={checkboxCls}
            />
            Judge0-verified problems only
          </label>
        ) : null}
      </div>

      {err ? <ErrorAlert>{err}</ErrorAlert> : null}
      {limitNote ? <NoticeBox>{limitNote}</NoticeBox> : null}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-2.5">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <input
              ref={pageBoxRef}
              type="checkbox"
              checked={allOnPage}
              disabled={selectable.length === 0 || loading}
              onChange={togglePage}
              className={checkboxCls}
            />
            Select this page
          </label>
          <span className="text-xs text-slate-500" aria-live="polite">
            {loading ? 'Loading…' : `${from}–${to} of ${total}`}
          </span>
        </div>

        {rows === null ? (
          <p className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-slate-500">
            <Loader2 className="size-4 animate-spin" aria-hidden /> Loading…
          </p>
        ) : rows.length === 0 && !loading ? (
          <p className="px-4 py-10 text-center text-sm text-slate-500">
            Nothing matches these filters{type === 'CODING' && verifiedOnly ? ' (verified problems only)' : ''}.
          </p>
        ) : (
          <ul className={cn('divide-y divide-slate-100', loading && 'opacity-60')} aria-busy={loading}>
            {rows.map((r) => {
              const checked = inThisSection.has(r.id);
              const blocked = blockedReason(r.id);
              const inSectionItem = checked ? section.items.find((i) => i.id === r.id) : undefined;
              return (
                <li key={r.id} className="flex items-start gap-3 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={checked || !!blocked}
                    disabled={!!blocked}
                    onChange={() => toggle(r)}
                    aria-label={`${checked ? 'Remove' : 'Add'}: ${r.label.slice(0, 80)}`}
                    className={cn(checkboxCls, 'mt-0.5')}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm text-navy">{r.label}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                      <DifficultyPill value={r.difficulty} />
                      {r.flags.map((f) => (
                        <StatusPill key={f.label} tone={f.tone} label={f.label} />
                      ))}
                      {inSectionItem ? <OriginBadge origin={inSectionItem.origin} /> : null}
                      {r.where ? <span>{r.where}</span> : null}
                      {r.companies.length ? <span>· {r.companies.map(companyName).join(', ')}</span> : null}
                    </div>
                    {blocked ? <p className="mt-1 text-xs font-semibold text-slate-500">{blocked}</p> : null}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setPreview({ type, id: r.id, label: r.label })}
                    aria-label={`Preview: ${r.label.slice(0, 80)}`}
                  >
                    <Eye aria-hidden /> Preview
                  </Button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="flex items-center justify-between gap-2 border-t border-slate-200 px-4 py-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={offset === 0 || loading}
            onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
          >
            <ChevronLeft aria-hidden /> Previous
          </Button>
          <span className="text-xs text-slate-500">
            {section.items.filter((i) => i.type === type && i.origin === 'MANUAL').length} picked by hand in {section.name}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={offset + PAGE_SIZE >= total || loading}
            onClick={() => setOffset((o) => o + PAGE_SIZE)}
          >
            Next <ChevronRight aria-hidden />
          </Button>
        </div>
      </div>

      <PreviewDrawer
        target={preview}
        onClose={() => setPreview(null)}
        companyName={companyName}
        selected={!!preview && inThisSection.has(preview.id)}
        blockedReason={preview ? blockedReason(preview.id) : null}
        onToggle={() => {
          if (previewRow) toggle(previewRow);
        }}
      />
    </div>
  );
}
