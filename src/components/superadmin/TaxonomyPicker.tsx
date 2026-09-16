'use client';

import { useMemo, useState } from 'react';
import { Check, Loader2, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createQuestionTopic } from '@/lib/api/admin';
import { describeApiError } from '@/lib/api/types';
import type { AdminTopicNodeDto } from '@/shared/dto/admin-questions.dto';

/**
 * Section → Topic → Subtopic pickers, shared by the "Author a practice question" form and
 * the bulk-upload wizard.
 *
 * Replaces a single flat Topic `<select>` that listed every node at every depth with no
 * hint of where it sat, and had no way to add one — so an author with a new topic either
 * filed the question under something roughly right or left it unfiled.
 *
 * Creating goes through POST /admin/questions/topics: the SERVER mints the slug. Nothing
 * here builds one. The browser used to, which is how a "Strings" section could silently
 * attach itself under an unrelated node whose guessed slug happened to match.
 */

/** Every ancestor of `id`, outermost first. Empty when the id isn't in the tree. */
export function findTopicPath(
  nodes: AdminTopicNodeDto[],
  id: string | null | undefined,
): AdminTopicNodeDto[] {
  if (!id) return [];
  for (const n of nodes) {
    if (n.id === id) return [n];
    const below = findTopicPath(n.children, id);
    if (below.length > 0) return [n, ...below];
  }
  return [];
}

/** "Section › Topic › Subtopic" for a node id. */
export function topicPathLabel(tree: AdminTopicNodeDto[], id: string | null | undefined): string {
  return findTopicPath(tree, id)
    .map((n) => n.name)
    .join(' › ');
}

/** Roots worth offering. The `*-ai` / `ai-practice-topics` scratch roots (the server marks
 *  them `hidden`) are left out unless the caller explicitly asks for them. */
export function visibleRoots(
  tree: AdminTopicNodeDto[],
  includeHidden: boolean,
): AdminTopicNodeDto[] {
  return includeHidden ? tree : tree.filter((n) => !n.hidden);
}

const selectCls =
  'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy focus:border-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/30 disabled:bg-slate-50 disabled:text-slate-400';

export interface CascadingTopicSelectProps {
  tree: AdminTopicNodeDto[];
  /** The node the question is filed under — any of the three levels. '' when unfiled. */
  leafId: string;
  onChange: (node: AdminTopicNodeDto | null) => void;
  /** Re-read the tree after a create, then resolve. */
  onTreeChanged: () => Promise<AdminTopicNodeDto[]>;
  includeHidden?: boolean;
  disabled?: boolean;
  /** Prefix for the generated input ids, so two pickers on one page stay distinct. */
  idPrefix?: string;
}

export function CascadingTopicSelect({
  tree,
  leafId,
  onChange,
  onTreeChanged,
  includeHidden = false,
  disabled = false,
  idPrefix = 'tax',
}: CascadingTopicSelectProps) {
  const path = useMemo(() => findTopicPath(tree, leafId), [tree, leafId]);
  const section = path[0] ?? null;
  const topic = path[1] ?? null;
  const subtopic = path[2] ?? null;
  const roots = useMemo(() => visibleRoots(tree, includeHidden), [tree, includeHidden]);

  /** Select a node by id at one level — picking '' falls back to the level above. */
  const pick = (options: AdminTopicNodeDto[], id: string, fallback: AdminTopicNodeDto | null) => {
    onChange(id ? (options.find((o) => o.id === id) ?? null) : fallback);
  };

  /** After a create, re-read the tree and select the new node from the FRESH copy. */
  const selectCreated = async (id: string) => {
    const next = await onTreeChanged();
    const created = findTopicPath(next, id).at(-1) ?? null;
    onChange(created);
  };

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <Level
        id={`${idPrefix}-section`}
        label="Section"
        options={roots}
        value={section?.id ?? ''}
        placeholder="Select a section…"
        disabled={disabled}
        onSelect={(id) => pick(roots, id, null)}
        onCreate={selectCreated}
        parentId={null}
        createLabel="Create new section"
      />
      <Level
        id={`${idPrefix}-topic`}
        label="Topic"
        options={section?.children ?? []}
        value={topic?.id ?? ''}
        placeholder={section ? 'Whole section' : 'Pick a section first'}
        disabled={disabled || !section}
        onSelect={(id) => pick(section?.children ?? [], id, section)}
        onCreate={selectCreated}
        parentId={section?.id ?? null}
        createLabel="Create new topic"
      />
      <Level
        id={`${idPrefix}-subtopic`}
        label="Subtopic (optional)"
        options={topic?.children ?? []}
        value={subtopic?.id ?? ''}
        placeholder={topic ? 'Whole topic' : 'Pick a topic first'}
        disabled={disabled || !topic}
        onSelect={(id) => pick(topic?.children ?? [], id, topic)}
        onCreate={selectCreated}
        parentId={topic?.id ?? null}
        createLabel="Create new subtopic"
      />
    </div>
  );
}

/** One level: a native select plus an inline "+ Create new …" that POSTs and selects it. */
function Level({
  id,
  label,
  options,
  value,
  placeholder,
  disabled,
  onSelect,
  onCreate,
  parentId,
  createLabel,
}: {
  id: string;
  label: string;
  options: AdminTopicNodeDto[];
  value: string;
  placeholder: string;
  disabled: boolean;
  onSelect: (id: string) => void;
  onCreate: (createdId: string) => Promise<void>;
  parentId: string | null;
  createLabel: string;
}) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A subtopic needs a parent; only a Section can be created with none.
  const canCreate = !disabled && (parentId !== null || label === 'Section');

  const submit = async () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError('Give it a name of at least two characters.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const created = await createQuestionTopic({ name: trimmed, parentId });
      await onCreate(created.id);
      setCreating(false);
      setName('');
    } catch (err) {
      setError(describeApiError(err, 'Could not create that.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="block text-sm font-medium text-navy">
          {label}
        </label>
        {canCreate && !creating ? (
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto px-0"
            onClick={() => {
              setCreating(true);
              setError(null);
            }}
          >
            <Plus aria-hidden="true" /> New
          </Button>
        ) : null}
      </div>

      {creating ? (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void submit();
                }
                if (e.key === 'Escape') setCreating(false);
              }}
              placeholder={createLabel}
              aria-label={createLabel}
              className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy placeholder:text-slate-400 focus:border-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/30"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="shrink-0 px-2.5"
              onClick={() => void submit()}
              disabled={busy}
              aria-label={createLabel}
            >
              {busy ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <Check aria-hidden="true" />
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="shrink-0 px-2.5"
              onClick={() => {
                setCreating(false);
                setError(null);
              }}
              aria-label="Cancel"
            >
              <X aria-hidden="true" />
            </Button>
          </div>
          {error ? (
            <p role="alert" className="text-xs font-medium text-red-700">
              {error}
            </p>
          ) : null}
        </div>
      ) : (
        <select
          id={id}
          className={selectCls}
          value={value}
          disabled={disabled}
          onChange={(e) => onSelect(e.target.value)}
        >
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
              {o.subtreeQuestionCount > 0 ? ` (${o.subtreeQuestionCount})` : ''}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
