'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AlertTriangle, Check, Clock, Code2, Layers, ListChecks, Loader2, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { listTopicsWithCounts, type ApiTopic } from '@/lib/api/catalog';
import { createCustomMock, listCodingTopics, type CodingTopic } from '@/lib/api/mocks';
import { ApiRequestError } from '@/lib/api/types';
import { UpgradeModal } from '@/components/billing/UpgradeModal';
import { HIDDEN_ROOT_SLUGS, sectionMetaFor } from './section-meta';

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
  const [codingAll, setCodingAll] = useState(false);
  const [count, setCount] = useState(20);
  const [codingCount, setCodingCount] = useState(3);
  const [duration, setDuration] = useState(30);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upgradeMsg, setUpgradeMsg] = useState<string | null>(null);

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
      .filter((t) => t.parentId === null && !HIDDEN_ROOT_SLUGS.has(t.slug) && (t.questionCount ?? 0) > 0)
      .map((r, i) => ({
        ...r,
        children: topics.filter((c) => c.parentId === r.id && (c.questionCount ?? 0) > 0),
        order: sectionMetaFor(r.slug, i).order,
      }))
      .filter((r) => r.children.length > 0)
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  }, [topics]);

  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, slug: string) => {
    const next = new Set(set);
    if (next.has(slug)) next.delete(slug);
    else next.add(slug);
    setter(next);
  };

  const hasQuiz = sections.size + chosenTopics.size > 0;
  const codingChosen = codingAll || codingTopics.size > 0;
  const hasScope = hasQuiz || codingChosen;

  /**
   * How many MCQs the current selection can actually yield.
   *
   * The bank is very unevenly stocked — several leaf topics hold 1-2 questions ("Ages" has
   * 2, "Data Structures & Algorithms" has 1) — so asking for 20 from them was silently
   * producing a 1-question mock. Cap the stepper at what exists rather than letting the
   * student request questions that cannot be served.
   *
   * An UPPER bound, not a promise: the sampler is seen-aware, so questions already answered
   * are skipped and the real yield can still be lower. That is why the build also reports
   * what it actually assembled.
   */
  const availableMcqs = useMemo(() => {
    if (!topics) return 0;
    const bySlug = new Map(topics.map((t) => [t.slug, t]));
    const counted = new Set<string>();
    let n = 0;
    for (const rootSlug of sections) {
      const root = bySlug.get(rootSlug);
      if (!root) continue;
      for (const c of topics.filter((t) => t.parentId === root.id)) {
        if (counted.has(c.id)) continue;
        counted.add(c.id);
        n += c.questionCount ?? 0;
      }
    }
    for (const slug of chosenTopics) {
      const t = bySlug.get(slug);
      if (!t || counted.has(t.id)) continue;
      counted.add(t.id);
      n += t.questionCount ?? 0;
    }
    return n;
  }, [topics, sections, chosenTopics]);

  // Never let the request exceed the pool. Without this the builder happily accepted "20"
  // for a topic holding 1 question and then shipped a 1-question mock.
  const maxCount = hasQuiz ? Math.max(1, Math.min(100, availableMcqs)) : 100;
  const effectiveCount = Math.min(count, maxCount);

  const start = async () => {
    if (!hasScope || busy) return;
    setBusy(true);
    setError(null);
    try {
      const built = await createCustomMock({
        sectionSlugs: [...sections],
        topicSlugs: [...chosenTopics],
        questionCount: effectiveCount,
        durationMinutes: duration,
        codingTopics: codingAll ? codingTopicList.map((c) => c.topic) : [...codingTopics],
        codingCount: codingChosen ? codingCount : undefined,
      });

      // Say so when it came up short. The stepper is capped at the topic pool, but the
      // sampler is seen-aware and free students are capped per topic, so the real yield can
      // still land under the ask. Silently opening a 2-question "20-question mock" is the
      // bug being fixed — don't reintroduce it one layer up.
      const short = built.mcqCount < effectiveCount;
      if (short) {
        toast.warning(
          `Built with ${built.mcqCount} question${built.mcqCount === 1 ? '' : 's'} - that's all these topics could serve right now.`,
          { description: 'Pick more topics (or a whole section) for a longer mock.' },
        );
      }
      router.push(`/dashboard/quiz?mock=${built.mockId}&proctored=1`);
    } catch (e) {
      // Free-tier limit (backend 403 PAYWALL) → prompt to upgrade in a modal
      // instead of a tiny inline note, so the moment actually converts.
      if (e instanceof ApiRequestError && e.code === 'PAYWALL') {
        setUpgradeMsg(e.message);
      } else {
        // Surface the EXACT backend message in a popup — never a bare "Something
        // went wrong". Include the support reference (requestId) on a server fault
        // so it isn't a dead end.
        const msg =
          e instanceof Error && e.message ? e.message : 'Could not build the mock. Try different topics.';
        const ref = e instanceof ApiRequestError ? e.requestId : undefined;
        setError(msg);
        toast.error("Couldn't start the mock assessment", {
          description: ref ? `${msg}  ·  ref ${ref}` : msg,
        });
      }
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
          Topic catalog is unavailable right now - try again shortly.
        </div>
      ) : (
        <div data-tour="mock:pick-scope" className="grid gap-4 lg:grid-cols-2">
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
                      whole section
                    </span>
                  </span>
                  <span className={cn('grid size-5 place-items-center rounded-md border', sectionOn ? 'border-orange bg-orange text-[#171717]' : 'border-slate-300')}>
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

      {/* Coding topics (optional) - pick the coding topics to mix in */}
      {codingTopicList.length ? (
        <div data-tour="mock:coding-topics" className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            <Code2 className="size-3.5" /> Coding topics
            <span className="font-medium normal-case tracking-normal text-slate-400">(optional)</span>
          </p>

          {/* Whole coding section - parity with the MCQ "whole section" toggle. */}
          <button
            onClick={() => setCodingAll((v) => !v)}
            className={cn(
              'mt-3 flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-bold transition-colors',
              codingAll ? 'border-orange bg-orange/10 text-navy' : 'border-slate-200 text-navy hover:bg-slate-50',
            )}
          >
            <span className="flex items-center gap-2">
              <Code2 className="size-4 text-slate-400" /> Full coding section
              <span className="text-[11px] font-semibold text-slate-400">
                all {codingTopicList.length} topics
              </span>
            </span>
            <span className={cn('grid size-5 place-items-center rounded-md border', codingAll ? 'border-orange bg-orange text-[#171717]' : 'border-slate-300')}>
              {codingAll ? <Check className="size-3.5" /> : null}
            </span>
          </button>

          {codingAll ? (
            <p className="mt-2 text-[11px] font-medium text-orange">Whole coding section selected</p>
          ) : (
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
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      {/* config bar */}
      <div data-tour="mock:config" className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="grid gap-5 sm:grid-cols-3">
          {/* max is the real pool for the current selection, not a flat 100 - asking for 20
              from a topic that holds 1 was the reported bug. */}
          <Stepper
            label="MCQ questions"
            icon={ListChecks}
            value={effectiveCount}
            min={Math.min(5, maxCount)}
            max={maxCount}
            step={5}
            onChange={setCount}
          />
          <Stepper label="Duration (min)" icon={Clock} value={duration} min={5} max={180} step={5} onChange={setDuration} />
          {codingChosen ? (
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
            className="inline-flex items-center gap-2 rounded-full bg-orange px-6 py-2.5 text-sm font-extrabold text-[#171717] transition enabled:hover:brightness-105 disabled:opacity-40"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            {busy ? 'Building…' : 'Start mock assessment'}
          </button>
        </div>
      </div>

      <UpgradeModal
        open={upgradeMsg !== null}
        onClose={() => setUpgradeMsg(null)}
        title="Upgrade to build full mocks"
        message={upgradeMsg ?? undefined}
      />
    </div>
  );
}

// The local UpgradeModal that used to live here has been folded into
// @/components/billing/UpgradeModal. Three surfaces now raise the same prompt — the
// custom-mock builder, the mock runner's free-mock limit, and the recommendations hub —
// and two of them were about to ship with different designs, different copy, and
// different destinations (/upgrade vs /shop). One modal, one upgrade path.

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
