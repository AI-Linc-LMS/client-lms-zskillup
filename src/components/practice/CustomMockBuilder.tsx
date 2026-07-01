'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Check, Clock, Code2, Layers, ListChecks, Loader2, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { listTopicsWithCounts, type ApiTopic } from '@/lib/api/catalog';
import { createCustomMock, listCodingTopics, type CodingTopic } from '@/lib/api/mocks';

/**
 * Mode 3 — self-serve Mock Assessment builder. Pick whole sections and/or single
 * topics, set size + duration, then launch a PROCTORED, unlimited, non-adaptive
 * mock assembled from the published bank.
 */
export function CustomMockBuilder() {
  const router = useRouter();
  const [topics, setTopics] = useState<ApiTopic[] | null>(null);
  const [codingTopicList, setCodingTopicList] = useState<CodingTopic[]>([]);
  const [sections, setSections] = useState<Set<string>>(new Set());
  const [chosenTopics, setChosenTopics] = useState<Set<string>>(new Set());
  const [codingTopics, setCodingTopics] = useState<Set<string>>(new Set());
  const [count, setCount] = useState(20);
  const [codingCount, setCodingCount] = useState(3);
  const [duration, setDuration] = useState(30);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listTopicsWithCounts()
      .then((t) => setTopics(t))
      .catch(() => setTopics([]));
    listCodingTopics()
      .then((t) => setCodingTopicList(t))
      .catch(() => setCodingTopicList([]));
  }, []);

  const roots = useMemo(() => {
    if (!topics) return [];
    return topics
      .filter((t) => t.parentId === null && (t.questionCount ?? 0) > 0)
      .map((r) => ({ ...r, children: topics.filter((c) => c.parentId === r.id && (c.questionCount ?? 0) > 0) }))
      .filter((r) => r.children.length > 0);
  }, [topics]);

  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, slug: string) => {
    const next = new Set(set);
    if (next.has(slug)) next.delete(slug);
    else next.add(slug);
    setter(next);
  };

  const hasQuiz = sections.size + chosenTopics.size > 0;
  const hasScope = hasQuiz || codingTopics.size > 0;

  const start = async () => {
    if (!hasScope || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { mockId } = await createCustomMock({
        sectionSlugs: [...sections],
        topicSlugs: [...chosenTopics],
        questionCount: count,
        durationMinutes: duration,
        codingTopics: [...codingTopics],
        codingCount: codingTopics.size ? codingCount : undefined,
      });
      router.push(`/dashboard/quiz?mock=${mockId}&proctored=1`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not build the mock. Try different topics.');
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* selection */}
      {topics === null ? (
        <div className="flex items-center gap-2 py-8 text-sm text-slate-400">
          <Loader2 className="size-4 animate-spin" /> Loading topics…
        </div>
      ) : roots.length === 0 ? (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 text-sm text-slate-500">
          Topic catalog is unavailable right now — try again shortly.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {roots.map((root) => {
            const sectionOn = sections.has(root.slug);
            return (
              <div key={root.id} className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
                <button
                  onClick={() => toggle(sections, setSections, root.slug)}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-bold transition-colors',
                    sectionOn ? 'border-orange bg-orange/10 text-navy' : 'border-slate-200 text-navy hover:bg-slate-50',
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Layers className="size-4 text-slate-400" /> {root.name}
                    <span className="text-[11px] font-semibold text-slate-400">
                      whole section · {root.questionCount ?? 0} Qs
                    </span>
                  </span>
                  <span className={cn('grid size-5 place-items-center rounded-md border', sectionOn ? 'border-orange bg-orange text-white' : 'border-slate-300')}>
                    {sectionOn ? <Check className="size-3.5" /> : null}
                  </span>
                </button>
                {!sectionOn ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {root.children.map((c) => {
                      const on = chosenTopics.has(c.slug);
                      return (
                        <button
                          key={c.id}
                          onClick={() => toggle(chosenTopics, setChosenTopics, c.slug)}
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                            on ? 'border-orange bg-orange/10 text-navy' : 'border-slate-200 text-slate-600 hover:bg-slate-50',
                          )}
                        >
                          {on ? <Check className="size-3" /> : null}
                          {c.name}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-2 text-[11px] font-medium text-orange">Whole section selected</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Coding topics (optional) — pick the coding topics to mix in */}
      {codingTopicList.length ? (
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            <Code2 className="size-3.5" /> Coding topics
            <span className="font-medium normal-case tracking-normal text-slate-400">(optional)</span>
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {codingTopicList.map((c) => {
              const on = codingTopics.has(c.topic);
              return (
                <button
                  key={c.topic}
                  onClick={() => toggle(codingTopics, setCodingTopics, c.topic)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                    on ? 'border-orange bg-orange/10 text-navy' : 'border-slate-200 text-slate-600 hover:bg-slate-50',
                  )}
                >
                  {on ? <Check className="size-3" /> : <Code2 className="size-3 text-slate-400" />}
                  {c.topic}
                  <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
                    {c.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* config bar */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="grid gap-5 sm:grid-cols-3">
          <Stepper label="MCQ questions" icon={ListChecks} value={count} min={5} max={100} step={5} onChange={setCount} />
          <Stepper label="Duration (min)" icon={Clock} value={duration} min={5} max={180} step={5} onChange={setDuration} />
          {codingTopics.size ? (
            <Stepper label="Coding problems" icon={Code2} value={codingCount} min={1} max={20} step={1} onChange={setCodingCount} />
          ) : (
            <div>
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <Code2 className="size-3.5" /> Coding problems
              </p>
              <p className="mt-2 text-xs text-slate-400">Pick coding topics above to add coding.</p>
            </div>
          )}
        </div>

        {error ? (
          <p className="mt-4 flex items-center gap-1.5 text-sm font-medium text-rose-600">
            <AlertTriangle className="size-4" /> {error}
          </p>
        ) : null}

        <div className="mt-5 flex items-center justify-between gap-4">
          <p className="text-xs text-slate-500">
            <ShieldCheck className="mr-1 inline size-3.5 text-emerald-500" />
            Proctored · unlimited attempts · does not count toward leaderboards.
          </p>
          <button
            onClick={start}
            disabled={!hasScope || busy}
            className="inline-flex items-center gap-2 rounded-full bg-orange px-6 py-2.5 text-sm font-extrabold text-white transition enabled:hover:brightness-105 disabled:opacity-40"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            {busy ? 'Building…' : 'Start mock assessment'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Stepper({
  label,
  icon: Icon,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  icon: typeof Clock;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  const clamp = (v: number) => Math.max(min, Math.min(max, v));
  return (
    <div>
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
        <Icon className="size-3.5" /> {label}
      </p>
      <div className="mt-2 inline-flex items-center gap-2">
        <button
          onClick={() => onChange(clamp(value - step))}
          className="grid size-8 place-items-center rounded-lg border border-slate-200 text-lg font-bold text-slate-500 hover:bg-slate-50"
        >
          −
        </button>
        <span className="w-12 text-center text-xl font-black tabular-nums text-navy">{value}</span>
        <button
          onClick={() => onChange(clamp(value + step))}
          className="grid size-8 place-items-center rounded-lg border border-slate-200 text-lg font-bold text-slate-500 hover:bg-slate-50"
        >
          +
        </button>
      </div>
    </div>
  );
}
