'use client';

import { useEffect, useId, useState } from 'react';
import { BadgeCheck, Check, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { StatusPill } from '@/components/student/StatusPill';
import { previewQuestions, type AdminQuestionPreview } from '@/lib/api/admin';
import { previewAdminCodingProblems } from '@/lib/api/coding';
import { describeApiError } from '@/lib/api/types';
import type { AssessmentItemType } from '@/lib/api/assessment-builder';
import type { AdminCodingProblemPreviewDto } from '@/shared/dto/admin-coding-search.dto';
import { DialogShell } from './DialogShell';
import { DifficultyPill, ErrorAlert, eyebrowCls } from './ui';

/** MCQ body: stem + options with the correct answer marked (text + icon, not colour alone). */
export function McqPreviewBody({ q }: { q: AdminQuestionPreview }) {
  return (
    <>
      <p className="whitespace-pre-wrap text-sm font-medium leading-relaxed text-navy">{q.stem}</p>
      {q.options.length ? (
        <ul className="mt-2 space-y-1">
          {q.options.map((o, i) => (
            <li
              key={i}
              className={cn(
                'flex items-start gap-2 rounded-lg px-2 py-1.5 text-sm',
                o.isCorrect ? 'bg-emerald-50 font-semibold text-emerald-800 ring-1 ring-emerald-200' : 'text-slate-600',
              )}
            >
              {o.isCorrect ? (
                <Check className="mt-0.5 size-4 shrink-0 text-emerald-700" aria-hidden />
              ) : (
                <span className="mt-0.5 size-4 shrink-0" aria-hidden />
              )}
              <span className="whitespace-pre-wrap">
                {o.text}
                {o.isCorrect ? <span className="sr-only"> (correct answer)</span> : null}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {q.answer ? (
        <p className="mt-2 text-sm text-slate-600">
          <span className="font-semibold text-navy">Answer:</span> {q.answer}
        </p>
      ) : null}
    </>
  );
}

/** Coding summary chips: difficulty, topic, companies, verified. */
export function CodingMeta({
  p,
  companyName,
}: {
  p: Pick<AdminCodingProblemPreviewDto, 'difficulty' | 'topic' | 'companies' | 'verified' | 'isActive'>;
  companyName: (slug: string) => string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <DifficultyPill value={p.difficulty} />
      {p.verified ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
          <BadgeCheck className="size-3" aria-hidden /> Verified
        </span>
      ) : (
        <StatusPill tone="neutral" label="Unverified" />
      )}
      {!p.isActive ? <StatusPill tone="negative" label="Deactivated" /> : null}
      {p.topic ? <span className="text-xs text-slate-500">{p.topic}</span> : null}
      {p.companies.length ? (
        <span className="text-xs text-slate-500">· {p.companies.map(companyName).join(', ')}</span>
      ) : null}
    </div>
  );
}

/** Full coding body for the preview drawer: statement, formats, constraints, visible examples. */
export function CodingPreviewBody({ p }: { p: AdminCodingProblemPreviewDto }) {
  return (
    <div className="space-y-4">
      <div>
        <p className={eyebrowCls}>Statement</p>
        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{p.statement}</p>
      </div>
      {p.inputFormat || p.outputFormat ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {p.inputFormat ? (
            <div>
              <p className={eyebrowCls}>Input format</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{p.inputFormat}</p>
            </div>
          ) : null}
          {p.outputFormat ? (
            <div>
              <p className={eyebrowCls}>Output format</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{p.outputFormat}</p>
            </div>
          ) : null}
        </div>
      ) : null}
      {p.constraints ? (
        <div>
          <p className={eyebrowCls}>Constraints</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{p.constraints}</p>
        </div>
      ) : null}
      {p.examples.length ? (
        <div>
          <p className={eyebrowCls}>Examples ({p.examples.length})</p>
          <div className="mt-1 space-y-2">
            {p.examples.map((ex, i) => (
              <div key={i} className="grid gap-2 rounded-lg border border-slate-200 p-2 sm:grid-cols-2">
                <IoBlock label="Input" text={ex.input} />
                <IoBlock label="Expected output" text={ex.expectedOutput} />
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function IoBlock({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{label}</p>
      <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap break-words rounded-md border border-slate-200 bg-white px-2 py-1.5 font-mono text-xs text-slate-700">
        {text || '(empty)'}
      </pre>
    </div>
  );
}

export interface PreviewTarget {
  type: AssessmentItemType;
  id: string;
  label: string;
}

/**
 * Side drawer previewing ONE question / coding problem from a manual browser, with the
 * same add/remove action as the row's checkbox.
 */
export function PreviewDrawer({
  target,
  onClose,
  companyName,
  selected,
  blockedReason,
  onToggle,
}: {
  target: PreviewTarget | null;
  onClose: () => void;
  companyName: (slug: string) => string;
  /** Whether the item is in the current section. */
  selected: boolean;
  /** Why it can't be toggled here (in another section / already in the assessment). */
  blockedReason?: string | null;
  onToggle: () => void;
}) {
  const titleId = useId();
  const [mcq, setMcq] = useState<AdminQuestionPreview | null>(null);
  const [coding, setCoding] = useState<AdminCodingProblemPreviewDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!target) return;
    let alive = true;
    setMcq(null);
    setCoding(null);
    setErr(null);
    setLoading(true);
    const run =
      target.type === 'MCQ'
        ? previewQuestions([target.id]).then((qs) => {
            if (!alive) return;
            if (qs[0]) setMcq(qs[0]);
            else setErr('This question no longer exists.');
          })
        : previewAdminCodingProblems([target.id]).then((r) => {
            if (!alive) return;
            if (r.items[0]) setCoding(r.items[0]);
            else setErr('This coding problem no longer exists.');
          });
    run
      .catch((e) => alive && setErr(describeApiError(e, 'Could not load the preview.')))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [target]);

  return (
    <DialogShell open={!!target} onClose={onClose} labelledBy={titleId} variant="drawer" maxWidth="max-w-xl">
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-6 py-4">
        <div className="min-w-0">
          <p className={eyebrowCls}>{target?.type === 'CODING' ? 'Coding problem preview' : 'Question preview'}</p>
          <h3 id={titleId} className="mt-1 line-clamp-2 text-base font-bold text-navy">
            {coding?.title ?? target?.label ?? 'Preview'}
          </h3>
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close preview">
          <X />
        </Button>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
        {loading ? (
          <p className="inline-flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="size-4 animate-spin" aria-hidden /> Loading preview…
          </p>
        ) : null}
        {err ? <ErrorAlert>{err}</ErrorAlert> : null}
        {mcq ? (
          <>
            <div className="flex flex-wrap items-center gap-1.5">
              <DifficultyPill value={mcq.difficulty} />
              <span className="text-xs text-slate-500">{mcq.code}</span>
            </div>
            <McqPreviewBody q={mcq} />
          </>
        ) : null}
        {coding ? (
          <>
            <CodingMeta p={coding} companyName={companyName} />
            <CodingPreviewBody p={coding} />
          </>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 px-6 py-4">
        {blockedReason ? <p className="mr-auto text-xs text-slate-500">{blockedReason}</p> : null}
        <Button type="button" variant="outline" onClick={onClose}>
          Close
        </Button>
        {!blockedReason ? (
          <Button type="button" variant={selected ? 'outline' : 'default'} onClick={onToggle}>
            {selected ? 'Remove from section' : 'Add to section'}
          </Button>
        ) : null}
      </div>
    </DialogShell>
  );
}
