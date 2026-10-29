'use client';

/**
 * Assigned mock interviews — rendered by /admin, /superadmin AND /tpo.
 *
 * One component behind three thin routes (navForPath picks the rail by PATHNAME, so
 * sending a TPO into /admin loses their sidebar). The API applies the college tenant
 * boundary; this component does no scoping of its own and must not pretend to.
 */

import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Check, Loader2, Plus, RefreshCw, Trash2, Users, X } from 'lucide-react';
import {
  createInterviewAssignment,
  deleteInterviewAssignment,
  getInterviewAssignment,
  getInterviewAssignmentResults,
  listInterviewAssignments,
  updateInterviewAssignment,
  type AssignmentPayload,
  type InterviewAssignmentDetail,
  type InterviewAssignmentResult,
  type InterviewAssignmentRow,
  type InterviewTarget,
  type InterviewTargetType,
} from '@/lib/api/interview-assignments';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const inputCls =
  'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy focus:border-orange focus:outline-none focus-visible:ring-2 focus-visible:ring-orange/30';

const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

/** BATCH and BRANCH are value-typed; the rest point at a row. */
const VALUE_TYPED: InterviewTargetType[] = ['BATCH', 'BRANCH'];

const TARGET_LABEL: Record<InterviewTargetType, string> = {
  USER: 'Individual student (user id)',
  COHORT: 'Cohort (cohort id)',
  COLLEGE: 'College (college id)',
  COMPANY: 'Registered for a company (company id)',
  BATCH: 'Batch — passout year',
  BRANCH: 'Branch',
};

export function InterviewAssignmentsScreen() {
  const [rows, setRows] = useState<InterviewAssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);

  const load = useCallback(
    () =>
      listInterviewAssignments()
        .then(setRows)
        .catch(() => setErr('Could not load assigned interviews.')),
    [],
  );

  useEffect(() => {
    void load().finally(() => setLoading(false));
  }, [load]);

  if (openId) {
    return (
      <AssignmentDetail
        id={openId}
        onBack={() => {
          setOpenId(null);
          void load();
        }}
      />
    );
  }

  if (composing) {
    return (
      <Composer
        onDone={() => {
          setComposing(false);
          void load();
        }}
        onCancel={() => setComposing(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Interviews
          </p>
          <h1 className="text-[28px] font-extrabold tracking-tight text-navy">
            Assigned mock interviews
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">
            Define an interview once and aim it at an individual, a selected list, a batch or a
            cohort. Students see it in their account; you see their results here. An assigned
            interview never counts against a student&apos;s free-interview allowance.
          </p>
        </div>
        <span className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
            <RefreshCw /> Refresh
          </Button>
          <Button type="button" size="sm" onClick={() => setComposing(true)}>
            <Plus /> New assignment
          </Button>
        </span>
      </div>

      {err && (
        <div className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200" role="alert">
          {err}
        </div>
      )}

      {loading ? (
        <div className="grid place-items-center rounded-xl border border-slate-200 bg-white p-12 shadow-sm">
          <Loader2 className="size-5 animate-spin text-slate-400" aria-hidden />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <span className="mx-auto grid size-11 place-items-center rounded-xl bg-violet-50 text-violet-600 ring-1 ring-violet-100">
            <Users className="size-5" aria-hidden />
          </span>
          <p className="mt-3 text-base font-bold text-navy">No assignments yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-600">
            Create one to put a mock interview in front of a batch or a cohort.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-base font-bold text-navy">{r.title}</span>
                  <span
                    className={cn(
                      'rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1',
                      r.isPublished
                        ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                        : 'bg-slate-50 text-slate-600 ring-slate-200',
                    )}
                  >
                    {r.isPublished ? 'Published' : 'Draft'}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {r.topic} · {r.difficulty} · {r.durationMinutes} min · {r.interviewType}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {r.targetRules} audience rule{r.targetRules === 1 ? '' : 's'} · {r.started} started ·{' '}
                  {r.completed} completed{r.dueAt ? ` · due ${when(r.dueAt)}` : ''}
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setOpenId(r.id)}>
                Open
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ── Composer ───────────────────────────────────────────────────────────────── */

function TargetEditor({
  targets,
  onChange,
}: {
  targets: InterviewTarget[];
  onChange: (t: InterviewTarget[]) => void;
}) {
  const set = (i: number, patch: Partial<InterviewTarget>) =>
    onChange(targets.map((t, j) => (j === i ? { ...t, ...patch } : t)));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Audience{targets.length ? ` (${targets.length} rule${targets.length === 1 ? '' : 's'})` : ''}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...targets, { targetType: 'BATCH', targetValue: '' }])}
        >
          <Plus /> Add rule
        </Button>
      </div>
      {targets.length === 0 ? (
        <p className="text-xs text-slate-400">
          No audience yet. A published assignment needs at least one — otherwise it reaches nobody.
        </p>
      ) : (
        targets.map((t, i) => {
          const valueTyped = VALUE_TYPED.includes(t.targetType);
          return (
            <div key={i} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                <label className="block space-y-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                    Rule
                  </span>
                  <select
                    className={inputCls}
                    value={t.targetType}
                    onChange={(e) => {
                      const next = e.target.value as InterviewTargetType;
                      // Swap which field carries the value, so a half-built rule (which
                      // the API refuses) cannot be produced by changing the type.
                      set(i, {
                        targetType: next,
                        targetId: VALUE_TYPED.includes(next) ? null : '',
                        targetValue: VALUE_TYPED.includes(next) ? '' : null,
                      });
                    }}
                  >
                    {(Object.keys(TARGET_LABEL) as InterviewTargetType[]).map((k) => (
                      <option key={k} value={k}>
                        {TARGET_LABEL[k]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                    {valueTyped ? (t.targetType === 'BATCH' ? 'Passout year' : 'Branch') : 'Id'}
                  </span>
                  <input
                    className={inputCls}
                    value={(valueTyped ? t.targetValue : t.targetId) ?? ''}
                    onChange={(e) =>
                      set(i, valueTyped ? { targetValue: e.target.value } : { targetId: e.target.value })
                    }
                    placeholder={valueTyped ? (t.targetType === 'BATCH' ? '2027' : 'CSE') : 'uuid'}
                  />
                </label>
                <div className="flex items-end gap-2">
                  <Button
                    type="button"
                    variant={t.isExclusion ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => set(i, { isExclusion: !t.isExclusion })}
                    title="An exclusion subtracts from the audience the other rules build"
                  >
                    {t.isExclusion ? 'Excluding' : 'Including'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove rule ${i + 1}`}
                    onClick={() => onChange(targets.filter((_, j) => j !== i))}
                  >
                    <X className="size-4 text-slate-400" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function AssignmentForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: AssignmentPayload;
  submitLabel: string;
  onSubmit: (dto: AssignmentPayload) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<AssignmentPayload>(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const targets = form.targets ?? [];
  const hasInclude = targets.some((t) => !t.isExclusion);

  const save = async (publish: boolean) => {
    setBusy(true);
    setErr(null);
    try {
      await onSubmit({ ...form, isPublished: publish, targets });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save that assignment.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      {err && (
        <div className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200" role="alert">
          {err}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1.5 sm:col-span-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Title — what the student sees
          </span>
          <input
            className={inputCls}
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Pre-placement technical interview"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Topic — drives the AI&apos;s questions
          </span>
          <input
            className={inputCls}
            value={form.topic}
            onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
            placeholder="Data structures and problem solving"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Difficulty
          </span>
          <select
            className={inputCls}
            value={form.difficulty ?? 'Medium'}
            onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value }))}
          >
            {['Easy', 'Medium', 'Hard'].map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Interview type
          </span>
          <select
            className={inputCls}
            value={form.interviewType ?? 'mixed'}
            onChange={(e) => setForm((f) => ({ ...f, interviewType: e.target.value }))}
          >
            {['mixed', 'behavioral', 'technical', 'conceptual', 'situational'].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Duration (minutes)
          </span>
          <input
            type="number"
            min={1}
            max={120}
            className={inputCls}
            value={form.durationMinutes ?? 7}
            onChange={(e) => setForm((f) => ({ ...f, durationMinutes: Number(e.target.value) }))}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Due date (optional)
          </span>
          <input
            type="date"
            className={inputCls}
            value={form.dueAt ? form.dueAt.slice(0, 10) : ''}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                dueAt: e.target.value ? new Date(`${e.target.value}T23:59:59`).toISOString() : null,
              }))
            }
          />
          <span className="block text-xs text-slate-400">
            After this it stops being offered. An interview already in progress is never cut off.
          </span>
        </label>
        <label className="block space-y-1.5 sm:col-span-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Instructions (optional) — shown to the student before they start
          </span>
          <textarea
            className="min-h-20 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-relaxed text-navy focus:border-orange focus:outline-none focus-visible:ring-2 focus-visible:ring-orange/30"
            value={form.instructions ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, instructions: e.target.value }))}
            maxLength={4000}
          />
        </label>
      </div>

      <TargetEditor targets={targets} onChange={(t) => setForm((f) => ({ ...f, targets: t }))} />

      {!hasInclude ? (
        <p className="text-xs font-medium text-amber-700">
          Add at least one including rule to publish. You can still save it as a draft.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => void save(true)} disabled={busy || !hasInclude}>
          {busy ? <Loader2 className="animate-spin" /> : <Check />} {submitLabel} &amp; publish
        </Button>
        <Button type="button" variant="outline" onClick={() => void save(false)} disabled={busy}>
          Save as draft
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function Composer({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  return (
    <div className="space-y-6">
      <div>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          <ArrowLeft /> Back
        </Button>
        <h1 className="mt-2 text-[28px] font-extrabold tracking-tight text-navy">New assignment</h1>
      </div>
      <AssignmentForm
        initial={{ title: '', topic: '', difficulty: 'Medium', interviewType: 'mixed', durationMinutes: 7, targets: [] }}
        submitLabel="Create"
        onSubmit={async (dto) => {
          await createInterviewAssignment(dto);
          onDone();
        }}
        onCancel={onCancel}
      />
    </div>
  );
}

/* ── Detail + results ───────────────────────────────────────────────────────── */

function AssignmentDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const [a, setA] = useState<InterviewAssignmentDetail | null>(null);
  const [results, setResults] = useState<InterviewAssignmentResult[]>([]);
  const [editing, setEditing] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(() => {
    void getInterviewAssignment(id).then(setA).catch(() => setErr('Could not load that assignment.'));
    void getInterviewAssignmentResults(id).then(setResults).catch(() => {});
  }, [id]);

  useEffect(load, [load]);

  if (!a) {
    return (
      <div className="grid place-items-center rounded-xl border border-slate-200 bg-white p-12 shadow-sm">
        {err ? <p className="text-sm text-red-600">{err}</p> : <Loader2 className="size-5 animate-spin text-slate-400" aria-hidden />}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Button type="button" variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft /> Back to assignments
        </Button>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-[28px] font-extrabold tracking-tight text-navy">{a.title}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {a.topic} · {a.difficulty} · {a.durationMinutes} min · {a.interviewType}
              {a.dueAt ? ` · due ${when(a.dueAt)}` : ''}
            </p>
            <p className="mt-1 text-sm font-semibold text-navy">
              Reaches {a.reach} student{a.reach === 1 ? '' : 's'}
              <span className="ml-2 font-normal text-slate-500">
                ({a.targets.filter((t) => !t.isExclusion).length} including,{' '}
                {a.targets.filter((t) => t.isExclusion).length} excluding)
              </span>
            </p>
          </div>
          <span className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setEditing((e) => !e)}>
              {editing ? 'Stop editing' : 'Edit'}
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={async () => {
                await deleteInterviewAssignment(id);
                onBack();
              }}
            >
              <Trash2 /> Delete
            </Button>
          </span>
        </div>
      </div>

      {editing ? (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <AssignmentForm
            initial={{
              title: a.title,
              topic: a.topic,
              difficulty: a.difficulty,
              interviewType: a.interviewType,
              durationMinutes: a.durationMinutes,
              instructions: a.instructions,
              dueAt: a.dueAt,
              isPublished: a.isPublished,
              targets: a.targets,
            }}
            submitLabel="Save"
            onSubmit={async (dto) => {
              await updateInterviewAssignment(id, dto);
              setEditing(false);
              load();
            }}
            onCancel={() => setEditing(false)}
          />
        </div>
      ) : null}

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Results ({results.length})
        </p>
        {results.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Nobody has started this yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead className="border-b border-slate-100 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="px-3 py-2">Student</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2 text-right">Score</th>
                  <th className="px-3 py-2">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {results.map((r) => (
                  <tr key={r.interviewId}>
                    <td className="px-3 py-2.5">
                      <span className="block font-semibold text-navy">{r.studentName ?? r.email}</span>
                      <span className="block text-xs text-slate-500">{r.email}</span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-slate-600">{r.status}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">
                      {/* Null means not graded yet — an em dash, never a 0%. */}
                      {r.overallPct === null ? '—' : `${Math.round(r.overallPct)}%`}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-slate-500">{when(r.submittedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
