'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { visibleRoots } from '@/components/superadmin/TaxonomyPicker';
import {
  createQuestionTopic,
  deleteQuestionTopic,
  getQuestionTopicUsage,
  getQuestionTopicsTree,
  updateQuestionTopic,
} from '@/lib/api/admin';
import { describeApiError } from '@/lib/api/types';
import type {
  AdminTopicNodeDto,
  AdminTopicUsageDto,
} from '@/shared/dto/admin-questions.dto';

/**
 * Section / Topic / Subtopic manager.
 *
 * Until now the taxonomy had no write endpoints at all — the only way a node was ever
 * created was an implicit get-or-create inside bulk import, which is how a stray root
 * literally named "strings" ended up polluting every picker with no way to remove it.
 *
 * DELETING IS THE DANGEROUS PART. Nothing in the database has a foreign key into
 * `assessments.topics`: questions hold a loose uuid, and study material, adaptive
 * sessions, study-plan days and billing scope refs hold a loose SLUG STRING. Postgres
 * would happily delete a node out from under all of them. So Delete here always asks
 * `/usage` FIRST and shows exactly what is pointing at the node — the server refuses it
 * anyway (409 TOPIC_IN_USE), but an operator should see the reason before clicking, not
 * after.
 */

const LEVEL_LABEL = ['Section', 'Topic', 'Subtopic'] as const;

export function TaxonomyManager({ onChanged }: { onChanged?: () => void }) {
  const [tree, setTree] = useState<AdminTopicNodeDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showHidden, setShowHidden] = useState(false);
  const [creatingRoot, setCreatingRoot] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // The delete flow: pick a node → fetch its usage → confirm (or be told what blocks it).
  const [target, setTarget] = useState<AdminTopicNodeDto | null>(null);
  const [usage, setUsage] = useState<AdminTopicUsageDto | null>(null);
  const [usageBusy, setUsageBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<AdminTopicNodeDto[]> => {
    const next = await getQuestionTopicsTree();
    setTree(next);
    return next;
  }, []);

  useEffect(() => {
    void load().catch((err) => {
      setError(describeApiError(err, 'Could not load the taxonomy.'));
      setTree([]);
    });
  }, [load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
      onChanged?.();
    } catch (err) {
      setError(describeApiError(err, 'Could not reload the taxonomy.'));
    } finally {
      setRefreshing(false);
    }
  }, [load, onChanged]);

  const roots = useMemo(() => visibleRoots(tree ?? [], showHidden), [tree, showHidden]);
  const hiddenCount = useMemo(() => (tree ?? []).filter((n) => n.hidden).length, [tree]);
  const totals = useMemo(() => {
    let nodes = 0;
    const walk = (list: AdminTopicNodeDto[]) => {
      for (const n of list) {
        nodes += 1;
        walk(n.children);
      }
    };
    walk(tree ?? []);
    return { nodes, sections: (tree ?? []).length };
  }, [tree]);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const askDelete = async (node: AdminTopicNodeDto) => {
    setTarget(node);
    setUsage(null);
    setDeleteError(null);
    setUsageBusy(true);
    try {
      setUsage(await getQuestionTopicUsage(node.id));
    } catch (err) {
      setDeleteError(describeApiError(err, 'Could not check what uses this.'));
    } finally {
      setUsageBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!target || !usage) return;
    const cascade = usage.self.childTopics > 0;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await deleteQuestionTopic(target.id, cascade);
      setTarget(null);
      setUsage(null);
      await refresh();
    } catch (err) {
      setDeleteError(describeApiError(err, 'Could not delete that.'));
      // Re-read: the server's own guard is the authority, and it may know more than the
      // usage snapshot this dialog opened with.
      setUsage(await getQuestionTopicUsage(target.id).catch(() => usage));
    } finally {
      setDeleteBusy(false);
    }
  };

  const cascade = (usage?.self.childTopics ?? 0) > 0;
  const blocked = usage ? (cascade ? !usage.cascadeDeletable : !usage.deletable) : true;

  return (
    <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Taxonomy
          </p>
          <h2 className="text-base font-bold text-navy">Sections, topics and subtopics</h2>
          <p className="mt-0.5 text-sm text-slate-600">
            Three levels: Section → Topic → Subtopic. A question can be filed at any of them.
            Counts are every question under a node, drafts and archived included.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={refreshing}>
            {refreshing ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <RefreshCw className="size-4" aria-hidden="true" />
            )}
            Refresh
          </Button>
          {hiddenCount > 0 ? (
            <Button variant="ghost" size="sm" onClick={() => setShowHidden((v) => !v)}>
              {showHidden ? (
                <EyeOff className="size-4" aria-hidden="true" />
              ) : (
                <Eye className="size-4" aria-hidden="true" />
              )}
              {showHidden ? 'Hide' : 'Show'} {hiddenCount} generated root
              {hiddenCount === 1 ? '' : 's'}
            </Button>
          ) : null}
          <Button size="sm" onClick={() => setCreatingRoot(true)}>
            <Plus className="size-4" aria-hidden="true" /> New section
          </Button>
        </div>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200"
        >
          {error}
        </p>
      ) : null}

      {creatingRoot ? (
        <InlineCreate
          label="New section name"
          parentId={null}
          onDone={async () => {
            setCreatingRoot(false);
            await refresh();
          }}
          onCancel={() => setCreatingRoot(false)}
        />
      ) : null}

      {tree === null ? (
        <div className="py-10 text-center">
          <Loader2 className="mx-auto size-5 animate-spin text-slate-500" aria-hidden="true" />
        </div>
      ) : roots.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
          No sections yet. Create one to start filing questions.
        </p>
      ) : (
        <>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            {totals.sections} section{totals.sections === 1 ? '' : 's'} · {totals.nodes} node
            {totals.nodes === 1 ? '' : 's'}
          </p>
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {roots.map((node) => (
              <TopicRow
                key={node.id}
                node={node}
                expanded={expanded}
                onToggle={toggle}
                onChanged={refresh}
                onDelete={askDelete}
              />
            ))}
          </ul>
        </>
      )}

      <ConfirmDialog
        open={target !== null}
        eyebrow="Permanent"
        title={
          target
            ? `Delete ${LEVEL_LABEL[target.depth] ?? 'node'} “${target.name}”?`
            : 'Delete node?'
        }
        confirmLabel={cascade ? 'Delete it and everything under it' : 'Delete it'}
        busyLabel="Deleting…"
        busy={deleteBusy}
        confirmDisabled={usageBusy || blocked}
        onConfirm={() => void confirmDelete()}
        onClose={() => {
          setTarget(null);
          setUsage(null);
          setDeleteError(null);
        }}
      >
        {usageBusy ? (
          <p className="inline-flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Checking what uses it…
          </p>
        ) : usage ? (
          <UsageBreakdown usage={usage} cascade={cascade} />
        ) : null}
        {deleteError ? (
          <p
            role="alert"
            className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200"
          >
            {deleteError}
          </p>
        ) : null}
      </ConfirmDialog>
    </div>
  );
}

/** One node plus its subtree, rendered as a flat indented list so deep trees stay scannable. */
function TopicRow({
  node,
  expanded,
  onToggle,
  onChanged,
  onDelete,
}: {
  node: AdminTopicNodeDto;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onChanged: () => Promise<void>;
  onDelete: (node: AdminTopicNodeDto) => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [adding, setAdding] = useState(false);
  const open = expanded.has(node.id);
  const hasChildren = node.children.length > 0;

  return (
    <li>
      <div
        className="flex flex-wrap items-center gap-2 px-3 py-2.5 transition-colors hover:bg-slate-50"
        style={{ paddingLeft: `${12 + node.depth * 22}px` }}
      >
        {hasChildren ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="size-7 shrink-0 px-0"
            onClick={() => onToggle(node.id)}
            aria-label={open ? `Collapse ${node.name}` : `Expand ${node.name}`}
            aria-expanded={open}
          >
            {open ? (
              <ChevronDown aria-hidden="true" />
            ) : (
              <ChevronRight aria-hidden="true" />
            )}
          </Button>
        ) : (
          <span className="size-7 shrink-0" aria-hidden="true" />
        )}

        {renaming ? (
          <InlineCreate
            label="New name"
            parentId={node.parentId}
            renameId={node.id}
            initial={node.name}
            onDone={async () => {
              setRenaming(false);
              await onChanged();
            }}
            onCancel={() => setRenaming(false)}
          />
        ) : (
          <>
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-navy">
              {node.name}
            </span>
            <span className="rounded-full bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-inset ring-slate-200">
              {LEVEL_LABEL[node.depth] ?? `Level ${node.depth + 1}`}
            </span>
            {node.hidden ? (
              <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-200">
                Generated
              </span>
            ) : null}
            <span className="text-xs text-slate-400">
              {node.questionCount} here
              {node.subtreeQuestionCount !== node.questionCount
                ? ` · ${node.subtreeQuestionCount} below`
                : ''}
            </span>
            <span className="ml-auto inline-flex items-center gap-1">
              {node.depth < 2 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="px-2"
                  onClick={() => setAdding(true)}
                  aria-label={`Add a ${LEVEL_LABEL[node.depth + 1] ?? 'child'} under ${node.name}`}
                >
                  <Plus aria-hidden="true" />
                </Button>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="px-2"
                onClick={() => setRenaming(true)}
                aria-label={`Rename ${node.name}`}
              >
                <Pencil aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="px-2 hover:bg-red-50 hover:text-red-700"
                onClick={() => onDelete(node)}
                aria-label={`Delete ${node.name}`}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </span>
          </>
        )}
      </div>

      {adding ? (
        <div className="px-3 pb-3" style={{ paddingLeft: `${40 + node.depth * 22}px` }}>
          <InlineCreate
            label={`New ${(LEVEL_LABEL[node.depth + 1] ?? 'node').toLowerCase()} under ${node.name}`}
            parentId={node.id}
            onDone={async () => {
              setAdding(false);
              await onChanged();
            }}
            onCancel={() => setAdding(false)}
          />
        </div>
      ) : null}

      {open && hasChildren ? (
        <ul className="divide-y divide-slate-100 border-t border-slate-100">
          {node.children.map((child) => (
            <TopicRow
              key={child.id}
              node={child}
              expanded={expanded}
              onToggle={onToggle}
              onChanged={onChanged}
              onDelete={onDelete}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

/** Create a node (or rename one) inline. The slug is the SERVER's business either way. */
function InlineCreate({
  label,
  parentId,
  renameId,
  initial = '',
  onDone,
  onCancel,
}: {
  label: string;
  parentId: string | null;
  renameId?: string;
  initial?: string;
  onDone: () => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError('Give it a name of at least two characters.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (renameId) await updateQuestionTopic(renameId, { name: trimmed });
      else await createQuestionTopic({ name: trimmed, parentId });
      await onDone();
    } catch (err) {
      setError(describeApiError(err, 'Could not save that.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-w-0 flex-1 space-y-1.5">
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
            if (e.key === 'Escape') onCancel();
          }}
          placeholder={label}
          aria-label={label}
          className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy placeholder:text-slate-400 focus:border-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/30"
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="shrink-0 px-2.5"
          onClick={() => void submit()}
          disabled={busy}
          aria-label={renameId ? 'Save name' : 'Create'}
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
          onClick={onCancel}
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
  );
}

/** Exactly what points at the node, by source — so "can't delete" is never a mystery. */
function UsageBreakdown({ usage, cascade }: { usage: AdminTopicUsageDto; cascade: boolean }) {
  const counts = cascade ? usage.subtree : usage.self;
  const blocked = cascade ? !usage.cascadeDeletable : !usage.deletable;
  const rows: Array<[string, number]> = [
    ['Questions filed here', counts.questions],
    ['Study-material items', counts.studyMaterialItems],
    ['Adaptive practice sessions', counts.adaptiveSessions],
    ['Study-plan days', counts.studyPlanDays],
    ['Entitlements', counts.entitlements],
    ['Payment orders', counts.paymentOrders],
    ['Payment order items', counts.paymentOrderItems],
    ['Coupons', counts.coupons],
  ];
  const offenders = rows.filter(([, n]) => n > 0);

  return (
    <>
      {cascade ? (
        <p>
          <span className="font-semibold text-navy">“{usage.name}”</span> has{' '}
          {usage.subtreeSize - 1} node{usage.subtreeSize === 2 ? '' : 's'} beneath it. Deleting it
          removes the whole branch.
        </p>
      ) : null}

      {blocked ? (
        <>
          <p className="font-semibold text-navy">
            This can’t be deleted yet — something still points at it:
          </p>
          <ul className="space-y-1 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            {offenders.map(([label, n]) => (
              <li key={label} className="flex items-center justify-between gap-4 text-sm">
                <span className="text-slate-600">{label}</span>
                <span className="font-semibold text-navy">{n}</span>
              </li>
            ))}
            {offenders.length === 0 && !cascade && counts.childTopics > 0 ? (
              <li className="flex items-center justify-between gap-4 text-sm">
                <span className="text-slate-600">Topics underneath</span>
                <span className="font-semibold text-navy">{counts.childTopics}</span>
              </li>
            ) : null}
          </ul>
          <p>
            Move or delete those first. Nothing in the database has a foreign key to the taxonomy,
            so deleting it anyway would leave every one of them pointing at a node that no longer
            exists.
          </p>
        </>
      ) : (
        <p>
          Nothing references it — no questions, study material, practice sessions, study-plan days,
          entitlements, orders or coupons. This is permanent and can’t be undone.
        </p>
      )}
    </>
  );
}
