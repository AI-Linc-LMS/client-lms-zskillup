'use client';

import { useMemo, type ReactNode } from 'react';
import { Code2, ListChecks, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { StatusPill } from '@/components/student/StatusPill';
import type { AdminQuestionPreview } from '@/lib/api/admin';
import type { FlaggedIdGroup, SelectionError } from '@/lib/api/question-selection-errors';
import type { AdminCodingProblemPreviewDto } from '@/shared/dto/admin-coding-search.dto';
import { CodingMeta, McqPreviewBody } from './previews';
import type { PickedItem, WizardSection } from './selection';
import { DifficultyPill, ErrorAlert, FixedMarker, OriginBadge, eyebrowCls, shortId } from './ui';

/** How the runner orders the published set (Part A MCQs, then Part B coding). */
export const QUESTION_ORDER_NOTE = 'Students see MCQs first, then coding problems, in the order shown.';

/**
 * Review before publishing: every MCQ with its answer key, every coding problem as a card
 * (statement excerpt + metadata), each marked Fixed. Items the server refused on the last
 * publish attempt are flagged in place and can be removed right here.
 */
export function ReviewStep({
  sections,
  canPreview,
  companyName,
  mcqPreview,
  codingPreview,
  missingIds,
  previewLoading,
  previewError,
  onRetryPreview,
  flagged,
  onRemove,
}: {
  sections: WizardSection[];
  /** Answer keys + statements come from admin-only endpoints; a TPO reviews labels. */
  canPreview: boolean;
  companyName: (slug: string) => string;
  mcqPreview: Record<string, AdminQuestionPreview>;
  codingPreview: Record<string, AdminCodingProblemPreviewDto>;
  /** Ids the preview endpoints no longer know. */
  missingIds: Set<string>;
  previewLoading: boolean;
  previewError: string | null;
  /** Fetch the previews that failed again. */
  onRetryPreview: () => void;
  /** id → why the server refused it on the last publish attempt. */
  flagged: Map<string, string>;
  onRemove: (sectionKey: string, id: string) => void;
}) {
  // The same stem under two different ids is a content duplicate the id checks can't see.
  const stemCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of sections)
      for (const it of s.items) {
        if (it.type !== 'MCQ') continue;
        const stem = (mcqPreview[it.id]?.stem ?? it.label).trim().toLowerCase();
        counts.set(stem, (counts.get(stem) ?? 0) + 1);
      }
    return counts;
  }, [sections, mcqPreview]);
  const hasStemDupes = [...stemCounts.values()].some((n) => n > 1);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={eyebrowCls}>Question review</p>
        {previewLoading ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500" aria-live="polite">
            <Loader2 className="size-3.5 animate-spin" aria-hidden /> Loading full questions…
          </span>
        ) : null}
      </div>
      <p className="text-sm text-slate-500">{QUESTION_ORDER_NOTE}</p>
      {!canPreview ? (
        <p className="text-sm text-slate-500">
          You’re reviewing question titles. Answer keys and full statements are visible to platform admins.
        </p>
      ) : null}
      {previewError ? (
        <ErrorAlert>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>{previewError}</span>
            <Button type="button" size="sm" variant="outline" onClick={onRetryPreview} disabled={previewLoading}>
              <RefreshCw aria-hidden /> Retry
            </Button>
          </div>
        </ErrorAlert>
      ) : null}
      {hasStemDupes ? (
        <ErrorAlert>The same question text appears more than once — check the items marked “Same text” and remove the repeats.</ErrorAlert>
      ) : null}

      {sections.map((s) => {
        const mcq = s.items.filter((i) => i.type === 'MCQ');
        const coding = s.items.filter((i) => i.type === 'CODING');
        if (mcq.length + coding.length === 0) return null;
        return (
          <section key={s.key} aria-label={s.name} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-base font-bold text-navy">{s.name}</h3>
              <p className="text-xs text-slate-500">
                {mcq.length} MCQ × {s.mcqMarks} · {coding.length} coding × {s.codingMarks} marks
              </p>
            </div>

            {mcq.length ? (
              <div className="mt-4">
                <p className={cn(eyebrowCls, 'flex items-center gap-1.5')}>
                  <ListChecks className="size-3.5" aria-hidden /> Multiple choice
                </p>
                <ol className="mt-2 space-y-2">
                  {mcq.map((it, i) => {
                    const q = mcqPreview[it.id];
                    const sameText = (stemCounts.get((q?.stem ?? it.label).trim().toLowerCase()) ?? 0) > 1;
                    return (
                      <ReviewRow
                        key={it.id}
                        index={i + 1}
                        item={it}
                        flag={flagged.get(it.id) ?? (missingIds.has(it.id) ? 'No longer exists' : null)}
                        extraPills={sameText ? <StatusPill tone="negative" label="Same text" /> : null}
                        onRemove={() => onRemove(s.key, it.id)}
                      >
                        {q ? (
                          <McqPreviewBody q={q} />
                        ) : (
                          <p className="text-sm text-navy">
                            {it.label}
                            {canPreview && previewLoading ? <span className="ml-2 text-xs text-slate-400">Loading…</span> : null}
                          </p>
                        )}
                      </ReviewRow>
                    );
                  })}
                </ol>
              </div>
            ) : null}

            {coding.length ? (
              <div className="mt-5">
                <p className={cn(eyebrowCls, 'flex items-center gap-1.5')}>
                  <Code2 className="size-3.5" aria-hidden /> Coding
                </p>
                <ol className="mt-2 space-y-2">
                  {coding.map((it, i) => {
                    const p = codingPreview[it.id];
                    return (
                      <ReviewRow
                        key={it.id}
                        index={i + 1}
                        item={it}
                        prefix="C"
                        flag={flagged.get(it.id) ?? (missingIds.has(it.id) ? 'No longer exists' : null)}
                        onRemove={() => onRemove(s.key, it.id)}
                      >
                        <p className="text-sm font-semibold text-navy">{p?.title ?? it.label}</p>
                        {p ? (
                          <div className="mt-1.5 space-y-1.5">
                            <CodingMeta p={p} companyName={companyName} />
                            <p className="line-clamp-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{p.statement}</p>
                          </div>
                        ) : null}
                      </ReviewRow>
                    );
                  })}
                </ol>
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

function ReviewRow({
  index,
  prefix = 'Q',
  item,
  flag,
  extraPills,
  onRemove,
  children,
}: {
  index: number;
  prefix?: string;
  item: PickedItem;
  flag: string | null;
  extraPills?: ReactNode;
  onRemove: () => void;
  children: ReactNode;
}) {
  return (
    <li
      className={cn(
        'rounded-lg border bg-white p-3',
        flag ? 'border-red-200 ring-1 ring-red-200' : 'border-slate-200',
      )}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs font-semibold text-slate-400">
          {prefix}
          {index}
        </span>
        <DifficultyPill value={item.difficulty} />
        <OriginBadge origin={item.origin} />
        <FixedMarker />
        {extraPills}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="ml-auto"
          onClick={onRemove}
          aria-label={`Remove ${prefix}${index}: ${item.label.slice(0, 60)}`}
        >
          <Trash2 aria-hidden /> Remove
        </Button>
      </div>
      {flag ? <p className="mt-1.5 text-xs font-semibold text-red-700">{flag} — remove it to publish.</p> : null}
      <div className="mt-2">{children}</div>
    </li>
  );
}

/**
 * The server refused the publish because of specific ids (INVALID_QUESTION_IDS /
 * DUPLICATE_QUESTION_IDS): name each one and let the admin remove them in one go.
 */
export function SelectionErrorPanel({
  error,
  labelFor,
  onRemoveGroup,
}: {
  error: SelectionError;
  labelFor: (id: string) => string | null;
  /** Remove the group's ids; `keepFirst` keeps one copy of an id picked twice. */
  onRemoveGroup: (group: FlaggedIdGroup, keepFirst: boolean) => void;
}) {
  return (
    <ErrorAlert>
      <p>{error.message}</p>
      {error.groups.map((g) => {
        const keepFirst = /more than once/i.test(g.reason);
        return (
          <div key={g.reason} className="mt-3 rounded-lg bg-white p-3 ring-1 ring-red-200">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">
                {g.reason} ({g.ids.length})
              </p>
              <Button type="button" size="sm" variant="outline" onClick={() => onRemoveGroup(g, keepFirst)}>
                {keepFirst ? 'Remove the extra copies' : `Remove ${g.ids.length === 1 ? 'it' : `all ${g.ids.length}`}`}
              </Button>
            </div>
            <ul className="mt-2 space-y-1 font-normal text-slate-700">
              {g.ids.map((id) => (
                <li key={id} className="truncate text-sm">
                  {labelFor(id) ?? `Item ${shortId(id)} (no longer in your selection)`}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </ErrorAlert>
  );
}
