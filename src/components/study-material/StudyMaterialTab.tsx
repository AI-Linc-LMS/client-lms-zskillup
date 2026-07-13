'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  CheckCircle2,
  ChevronDown,
  Circle,
  FileText,
  ListChecks,
  Loader2,
  Lock,
  MonitorPlay,
  PlayCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  completeStudyMaterialItem,
  getStudyMaterial,
  type StudyMaterialDto,
  type StudyMaterialItemDto,
} from '@/lib/api/study-material';
import { VideoPlayer } from './VideoPlayer';

const pct = (done: number, total: number) => (total > 0 ? Math.round((done / total) * 100) : 0);

const ITEM_ICON = { VIDEO: PlayCircle, QUIZ: ListChecks, ARTICLE: FileText } as const;
const tone = (p: number) => (p >= 75 ? 'bg-emerald-500' : p >= 40 ? 'bg-amber-500' : p > 0 ? 'bg-orange' : 'bg-slate-300');

export function StudyMaterialTab({ slug }: { slug: string }) {
  const [data, setData] = useState<StudyMaterialDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [openTopics, setOpenTopics] = useState<Set<string>>(new Set());
  const [playing, setPlaying] = useState<{ topicId: string; index: number } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getStudyMaterial(slug)
      .then((d) => {
        if (!alive) return;
        setData(d);
        const first = d.sections[0];
        setActiveSection(first?.id ?? null);
        if (first?.topics[0]) setOpenTopics(new Set([first.topics[0].id]));
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [slug]);

  const section = useMemo(
    () => data?.sections.find((s) => s.id === activeSection) ?? data?.sections[0] ?? null,
    [data, activeSection],
  );

  // The video playlist the player navigates — the current topic's VIDEO items,
  // derived live from the tree so progress/done stays in sync after a toggle.
  const playlist = useMemo(() => {
    if (!playing || !data) return [] as StudyMaterialItemDto[];
    for (const s of data.sections)
      for (const t of s.topics) if (t.id === playing.topicId) return t.items.filter((i) => i.kind === 'VIDEO');
    return [] as StudyMaterialItemDto[];
  }, [playing, data]);

  const openVideo = useCallback((topicId: string, videoItems: StudyMaterialItemDto[], item: StudyMaterialItemDto) => {
    const i = videoItems.findIndex((v) => v.id === item.id);
    setPlaying({ topicId, index: Math.max(0, i) });
  }, []);

  const toggleItem = useCallback(
    async (item: StudyMaterialItemDto) => {
      const next = !item.done;
      setBusy(item.id);
      // Optimistic tick so the checkbox feels instant.
      setData((prev) => (prev ? recompute(mapItem(prev, item.id, (i) => ({ ...i, done: next }))) : prev));
      try {
        await completeStudyMaterialItem(slug, item.id, next);
        // Locks are computed SERVER-side, and `recompute` only fixes local progress numbers.
        // Finishing a module's last item unlocks the next one (and un-ticking re-locks it),
        // which the client cannot know — so resync the tree instead of duplicating the rule
        // here and letting the two drift. Cheap, and it happens behind the optimistic tick.
        const fresh = await getStudyMaterial(slug);
        setData(fresh);
      } catch (e) {
        // Roll back, and SAY WHY. The server refuses to complete an item inside a locked
        // module; without this the tick would just silently flick back.
        setData((prev) => (prev ? recompute(mapItem(prev, item.id, (i) => ({ ...i, done: !next }))) : prev));
        const msg = e instanceof Error ? e.message : '';
        toast.error(
          /unlock|locked|previous module/i.test(msg)
            ? 'Complete the previous module to unlock this one.'
            : "Couldn't update that just now - please try again.",
        );
      } finally {
        setBusy(null);
      }
    },
    [slug],
  );

  if (loading) {
    return (
      <div className="grid h-64 place-items-center">
        <Loader2 className="size-6 animate-spin text-slate-400" />
      </div>
    );
  }
  if (!data || !data.hasContent || !section) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-slate-200 bg-white p-14 text-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-slate-100 text-slate-500">
          <MonitorPlay className="size-6" />
        </span>
        <p className="text-sm font-bold text-navy">Study material is coming soon</p>
        <p className="max-w-sm text-xs text-slate-600">
          Concept videos, guided solutions and topic quizzes for this company are being prepared.
        </p>
      </div>
    );
  }

  const sectionIndex = data.sections.findIndex((s) => s.id === section.id);

  return (
    <div>
      {/* Overall progress banner */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-orange/10 text-orange">
            <MonitorPlay className="size-4" />
          </span>
          <div>
            <p className="text-sm font-bold text-navy">Study Material</p>
            <p className="text-[11px] text-slate-600">{data.doneCount} of {data.itemCount} items completed</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-40 overflow-hidden rounded-full bg-slate-100">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-[#f7a14e] to-[#f37021]"
              initial={{ width: 0 }}
              animate={{ width: `${data.progressPct}%` }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
          <span className="text-sm font-black tabular-nums text-navy">{data.progressPct}%</span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
        {/* Left rail - sections */}
        <aside className="rounded-2xl border border-slate-200 bg-white p-2.5 lg:sticky lg:top-20 lg:self-start">
          <p className="px-2 pb-1.5 pt-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">Topics</p>
          <ul className="space-y-1">
            {data.sections.map((s, i) => {
              const active = s.id === section.id;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setActiveSection(s.id)}
                    className={cn(
                      'w-full rounded-xl px-3 py-2.5 text-left transition',
                      active ? 'bg-orange/[0.07] ring-1 ring-orange/20' : 'hover:bg-slate-50',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn('truncate text-sm font-bold', active ? 'text-navy' : 'text-slate-600')}>
                        {i + 1}. {s.title}
                      </span>
                      <span className="shrink-0 text-xs font-bold tabular-nums text-slate-500">{s.progressPct}%</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className={cn('h-full rounded-full', tone(s.progressPct))} style={{ width: `${s.progressPct}%` }} />
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* Right - the selected section's topics */}
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2.5 font-display text-base font-bold text-navy">
              <span className="grid size-7 place-items-center rounded-full bg-orange text-xs font-black text-[#171717]">
                {sectionIndex + 1}
              </span>
              {section.title}
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Progress</span>
              <div className="h-2 w-28 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-gradient-to-r from-[#7c6cf5] to-[#5b4bd6]" style={{ width: `${section.progressPct}%` }} />
              </div>
              <span className="text-xs font-bold tabular-nums text-navy">{section.progressPct}%</span>
            </div>
          </div>

          <div className="space-y-2.5">
            {section.topics.map((t, ti) => {
              // A locked module never opens — its items are not rendered at all, so there is
              // nothing to click through to. The server rejects completing them anyway; this
              // is the visible half of the same rule.
              const open = openTopics.has(t.id) && !t.locked;
              return (
                <div
                  key={t.id}
                  className={cn(
                    'overflow-hidden rounded-2xl border',
                    t.locked ? 'border-slate-200/70 bg-slate-50/40' : 'border-slate-200',
                  )}
                >
                  <button
                    type="button"
                    disabled={t.locked}
                    aria-expanded={open}
                    onClick={() =>
                      setOpenTopics((prev) => {
                        const n = new Set(prev);
                        if (n.has(t.id)) n.delete(t.id);
                        else n.add(t.id);
                        return n;
                      })
                    }
                    className={cn(
                      'flex w-full items-center gap-3 px-4 py-3 text-left transition',
                      t.locked
                        ? 'cursor-not-allowed bg-slate-50/60'
                        : 'bg-slate-50/60 hover:bg-slate-50',
                    )}
                  >
                    {t.locked ? (
                      <Lock className="size-4 shrink-0 text-slate-500" />
                    ) : (
                      <ChevronDown
                        className={cn('size-4 shrink-0 text-slate-500 transition-transform', open && 'rotate-180')}
                      />
                    )}
                    <span
                      className={cn(
                        'flex-1 truncate text-sm font-bold',
                        t.locked ? 'text-slate-500' : 'text-navy',
                      )}
                    >
                      {sectionIndex + 1}.{ti + 1} {t.title}
                    </span>
                    {t.locked ? (
                      <span className="shrink-0 rounded-full bg-slate-200/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                        Locked
                      </span>
                    ) : (
                      <>
                        <span className="shrink-0 text-xs font-bold tabular-nums text-slate-600">{t.progressPct}%</span>
                        <div className="hidden h-1.5 w-20 shrink-0 overflow-hidden rounded-full bg-slate-200 sm:block">
                          <div className={cn('h-full rounded-full', tone(t.progressPct))} style={{ width: `${t.progressPct}%` }} />
                        </div>
                      </>
                    )}
                  </button>

                  {t.locked && (
                    <p className="flex items-center gap-1.5 border-t border-slate-200/70 px-4 py-2.5 text-xs text-slate-600">
                      <Lock className="size-3 shrink-0" />
                      {t.lockedReason ?? 'Complete the previous module to unlock this module.'}
                    </p>
                  )}

                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                      >
                        <ul className="divide-y divide-slate-100">
                          {t.items.map((item) => (
                            <li key={item.id}>
                              <ItemRow
                                item={item}
                                busy={busy === item.id}
                                onToggle={() => toggleItem(item)}
                                onPlay={() => openVideo(t.id, t.items.filter((i) => i.kind === 'VIDEO'), item)}
                              />
                            </li>
                          ))}
                          {t.items.length === 0 && <li className="px-4 py-3 text-xs text-slate-500">No items yet.</li>}
                        </ul>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <VideoPlayer
        playlist={playlist}
        index={playing?.index ?? null}
        onIndex={(i) => setPlaying((p) => (p ? { ...p, index: i } : p))}
        onToggleDone={(item) => toggleItem(item)}
        busy={playing != null && busy === playlist[playing.index]?.id}
        onClose={() => setPlaying(null)}
      />
    </div>
  );
}

function ItemRow({
  item,
  busy,
  onToggle,
  onPlay,
}: {
  item: StudyMaterialItemDto;
  busy: boolean;
  onToggle: () => void;
  onPlay: () => void;
}) {
  const Icon = ITEM_ICON[item.kind];
  const meta =
    item.kind === 'VIDEO'
      ? item.durationLabel ?? 'Video'
      : item.kind === 'QUIZ'
        ? item.quizQuestionCount
          ? `${item.quizQuestionCount} Questions`
          : 'Quiz'
        : 'Article';
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <button
        type="button"
        onClick={onToggle}
        disabled={busy}
        aria-pressed={item.done}
        aria-label={item.done ? 'Mark not done' : 'Mark done'}
        className="shrink-0"
      >
        {busy ? (
          <Loader2 className="size-5 animate-spin text-slate-400" />
        ) : item.done ? (
          <CheckCircle2 className="size-5 text-emerald-500" />
        ) : (
          <Circle className="size-5 text-slate-400 transition hover:text-orange" />
        )}
      </button>
      <span
        className={cn(
          'grid size-9 shrink-0 place-items-center rounded-xl',
          item.kind === 'VIDEO' ? 'bg-orange/10 text-orange' : item.kind === 'QUIZ' ? 'bg-amber-50 text-amber-600' : 'bg-sky-50 text-sky-600',
        )}
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn('truncate text-sm font-semibold', item.done ? 'text-slate-500' : 'text-navy')}>{item.title}</p>
        {item.description && <p className="truncate text-xs text-slate-600">{item.description}</p>}
      </div>
      <span className="hidden shrink-0 text-[11px] font-semibold text-slate-500 sm:block">{meta}</span>
      {item.kind === 'VIDEO' ? (
        <button
          type="button"
          onClick={onPlay}
          className="shrink-0 rounded-full bg-navy px-3 py-1.5 text-xs font-bold text-white transition hover:bg-navy/90"
        >
          Watch
        </button>
      ) : item.kind === 'QUIZ' && item.quizHref ? (
        <Link
          href={item.quizHref}
          className="shrink-0 rounded-full bg-navy px-3 py-1.5 text-xs font-bold text-white transition hover:bg-navy/90"
        >
          Take quiz
        </Link>
      ) : item.embedUrl ? (
        <a
          href={item.embedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-full bg-navy px-3 py-1.5 text-xs font-bold text-white transition hover:bg-navy/90"
        >
          Read
        </a>
      ) : null}
    </div>
  );
}

// ── local tree helpers (optimistic updates) ─────────────────────────────────
function mapItem(
  d: StudyMaterialDto,
  itemId: string,
  fn: (i: StudyMaterialItemDto) => StudyMaterialItemDto,
): StudyMaterialDto {
  return {
    ...d,
    sections: d.sections.map((s) => ({
      ...s,
      topics: s.topics.map((t) => ({ ...t, items: t.items.map((i) => (i.id === itemId ? fn(i) : i)) })),
    })),
  };
}

function recompute(d: StudyMaterialDto): StudyMaterialDto {
  let oTotal = 0;
  let oDone = 0;
  const sections = d.sections.map((s) => {
    let sTotal = 0;
    let sDone = 0;
    const topics = s.topics.map((t) => {
      const done = t.items.filter((i) => i.done).length;
      sTotal += t.items.length;
      sDone += done;
      return { ...t, doneCount: done, itemCount: t.items.length, progressPct: pct(done, t.items.length) };
    });
    oTotal += sTotal;
    oDone += sDone;
    return { ...s, topics, doneCount: sDone, itemCount: sTotal, progressPct: pct(sDone, sTotal) };
  });
  return { ...d, sections, itemCount: oTotal, doneCount: oDone, progressPct: pct(oDone, oTotal) };
}
