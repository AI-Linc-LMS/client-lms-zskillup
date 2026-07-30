'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  Maximize2,
  Minimize2,
  Play,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StudyMaterialItemDto } from '@/lib/api/study-material';

/** A video counts as complete once this fraction is watched (matches the server). */
const COMPLETE_RATIO = 0.9;
/** Only persist progress this often (seconds of playback) to avoid hammering the API. */
const SAVE_EVERY_SECONDS = 10;

const isVimeo = (url: string | null | undefined) => !!url && /player\.vimeo\.com/.test(url);

/**
 * Talk to a Vimeo embed over its postMessage API (no SDK). Emits playback time and
 * resumes from `resumeAt`. Robust to the `ready` event firing before we attach: we
 * also (idempotently) re-request the listeners shortly after mount.
 */
function useVimeoTracking({
  iframeRef,
  enabled,
  resumeAt,
  onProgress,
  onEnded,
}: {
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  enabled: boolean;
  resumeAt: number;
  onProgress: (seconds: number, duration: number) => void;
  onEnded: () => void;
}) {
  const progressRef = useRef(onProgress);
  const endedRef = useRef(onEnded);
  progressRef.current = onProgress;
  endedRef.current = onEnded;

  useEffect(() => {
    if (!enabled) return;
    const iframe = iframeRef.current;
    if (!iframe) return;
    const ORIGIN = 'https://player.vimeo.com';
    const post = (method: string, value?: unknown) => {
      try {
        iframe.contentWindow?.postMessage(value === undefined ? { method } : { method, value }, ORIGIN);
      } catch {
        /* iframe not ready yet */
      }
    };
    let resumed = false;
    const subscribe = () => {
      post('addEventListener', 'timeupdate');
      post('addEventListener', 'ended');
      if (!resumed && resumeAt > 3) {
        resumed = true;
        post('setCurrentTime', resumeAt);
      }
    };
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== ORIGIN) return;
      let d: { event?: string; method?: string; data?: { seconds?: number; duration?: number } };
      try {
        d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
      } catch {
        return;
      }
      if (!d) return;
      if (d.event === 'ready') {
        subscribe();
      } else if (d.event === 'timeupdate' && d.data) {
        progressRef.current(d.data.seconds ?? 0, d.data.duration ?? 0);
      } else if (d.event === 'ended') {
        endedRef.current();
      }
    };
    window.addEventListener('message', onMsg);
    // Fallback: if `ready` fired before this listener attached, subscribe anyway.
    const t = setTimeout(subscribe, 900);
    return () => {
      window.removeEventListener('message', onMsg);
      clearTimeout(t);
    };
  }, [enabled, iframeRef, resumeAt]);
}

function Player({
  playlist,
  index,
  onIndex,
  onSaveWatch,
  onToggleDone,
  busy,
  onClose,
}: {
  playlist: StudyMaterialItemDto[];
  index: number;
  onIndex: (i: number) => void;
  onSaveWatch: (item: StudyMaterialItemDto, positionSeconds: number, durationSeconds: number) => Promise<boolean>;
  onToggleDone: (item: StudyMaterialItemDto) => void;
  busy: boolean;
  onClose: () => void;
}) {
  const item = playlist[index];
  const stageRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [full, setFull] = useState(false);

  // Live watch state for the CURRENT item (reset whenever the item changes).
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(item?.durationSeconds ?? 0);
  const [completed, setCompleted] = useState(Boolean(item?.done));
  const latest = useRef({ position: 0, duration: 0 });
  const lastSaved = useRef(0);
  const savingRef = useRef(false);

  const hasPrev = index > 0;
  const hasNext = index < playlist.length - 1;
  const vimeo = isVimeo(item?.embedUrl);

  // Reset per-item state on navigation (the iframe remounts via key={item.id}).
  useEffect(() => {
    setPosition(item?.positionSeconds ?? 0);
    setDuration(item?.durationSeconds ?? 0);
    setCompleted(Boolean(item?.done));
    latest.current = { position: item?.positionSeconds ?? 0, duration: item?.durationSeconds ?? 0 };
    lastSaved.current = item?.positionSeconds ?? 0;
  }, [item?.id, item?.positionSeconds, item?.durationSeconds, item?.done]);

  const flush = useCallback(
    async (force = false) => {
      if (!item || !vimeo || savingRef.current) return;
      const { position: p, duration: d } = latest.current;
      if (d <= 0) return;
      if (!force && Math.abs(p - lastSaved.current) < SAVE_EVERY_SECONDS) return;
      savingRef.current = true;
      lastSaved.current = p;
      try {
        const done = await onSaveWatch(item, p, d);
        if (done) setCompleted(true);
      } catch {
        /* best-effort; a later ping retries */
      } finally {
        savingRef.current = false;
      }
    },
    [item, vimeo, onSaveWatch],
  );

  const onProgress = useCallback((seconds: number, dur: number) => {
    latest.current = { position: seconds, duration: dur || latest.current.duration };
    setPosition(seconds);
    if (dur) setDuration(dur);
    // Throttled persist; completion is decided server-side from max-watched.
    void flushRef.current();
  }, []);
  // Keep a stable ref to the latest `flush` so the timeupdate handler need not resubscribe.
  const flushRef = useRef(flush);
  flushRef.current = flush;

  const onEnded = useCallback(() => {
    latest.current = { position: latest.current.duration, duration: latest.current.duration };
    void flush(true);
  }, [flush]);

  useVimeoTracking({
    iframeRef,
    enabled: vimeo,
    resumeAt: !item?.done ? item?.positionSeconds ?? 0 : 0,
    onProgress,
    onEnded,
  });

  // Persist on close/unmount (best-effort) so progress is never lost.
  useEffect(() => {
    return () => {
      void flush(true);
    };
  }, [flush]);

  const toggleFull = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void stageRef.current?.requestFullscreen?.();
  }, []);

  useEffect(() => {
    const onFs = () => setFull(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (document.fullscreenElement) return;
        onClose();
      } else if (e.key.toLowerCase() === 'f') {
        toggleFull();
      } else if (e.key === 'ArrowRight' && hasNext) {
        onIndex(index + 1);
      } else if (e.key === 'ArrowLeft' && hasPrev) {
        onIndex(index - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, hasNext, hasPrev, onIndex, onClose, toggleFull]);

  if (!item) return null;

  const watchedPct = duration > 0 ? Math.min(100, Math.round((position / duration) * 100)) : 0;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <motion.div
        className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => {
          void flush(true);
          onClose();
        }}
      />
      <motion.div
        className={cn('relative w-full max-w-3xl overflow-hidden rounded-3xl bg-[#0a0a0c] shadow-2xl ring-1 ring-white/10')}
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      >
        {/* header */}
        <div className="flex items-center gap-3 px-5 py-3 text-white">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-orange/20 text-orange">
            <Play className="size-4 fill-current" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{item.title}</p>
            {playlist.length > 1 ? (
              <p className="text-[11px] text-white/50">Lesson {index + 1} of {playlist.length}</p>
            ) : null}
          </div>
          <button type="button" onClick={() => { void flush(true); onClose(); }} aria-label="Close" className="rounded-full bg-white/10 p-1.5 text-white transition hover:bg-white/20">
            <X className="size-4" />
          </button>
        </div>

        {/* stage */}
        <div ref={stageRef} className="group relative aspect-video w-full bg-black">
          {item.embedUrl ? (
            <iframe
              ref={iframeRef}
              key={item.id}
              src={item.embedUrl}
              className="absolute inset-0 size-full"
              allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
              allowFullScreen
              title={item.title}
            />
          ) : (
            <div className="grid size-full place-items-center text-sm text-white/40">No video source set</div>
          )}

          {hasPrev && (
            <button
              type="button"
              onClick={() => onIndex(index - 1)}
              aria-label="Previous video"
              className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white opacity-0 transition hover:bg-black/70 group-hover:opacity-100"
            >
              <ChevronLeft className="size-5" />
            </button>
          )}
          {hasNext && (
            <button
              type="button"
              onClick={() => onIndex(index + 1)}
              aria-label="Next video"
              className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white opacity-0 transition hover:bg-black/70 group-hover:opacity-100"
            >
              <ChevronRight className="size-5" />
            </button>
          )}

          <div className="absolute right-2 top-2 z-10 flex items-center gap-1.5 opacity-0 transition group-hover:opacity-100">
            {item.embedUrl && (
              <a href={item.embedUrl.replace('/preview', '/view')} target="_blank" rel="noopener noreferrer" aria-label="Open in new tab" className="rounded-lg bg-black/50 p-1.5 text-white/90 transition hover:bg-black/70">
                <ExternalLink className="size-4" />
              </a>
            )}
            <button type="button" onClick={toggleFull} aria-label="Fullscreen" className="rounded-lg bg-black/50 p-1.5 text-white/90 transition hover:bg-black/70">
              {full ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </button>
          </div>
        </div>

        {/* watch progress bar (Vimeo only — reflects real playback) */}
        {vimeo && (
          <div className="h-1 w-full bg-white/10">
            <div
              className={cn('h-full transition-[width] duration-500', completed ? 'bg-emerald-400' : 'bg-orange')}
              style={{ width: `${completed ? 100 : watchedPct}%` }}
            />
          </div>
        )}

        {/* controls footer */}
        <div className="flex flex-wrap items-center gap-3 px-5 py-3">
          {playlist.length > 1 && (
            <div className="flex items-center gap-1">
              <button type="button" disabled={!hasPrev} onClick={() => onIndex(index - 1)} className="rounded-full bg-white/10 px-2.5 py-1.5 text-[11px] font-bold text-white transition hover:bg-white/20 disabled:opacity-40">
                <ChevronLeft className="size-3.5" />
              </button>
              <button type="button" disabled={!hasNext} onClick={() => onIndex(index + 1)} className="rounded-full bg-white/10 px-2.5 py-1.5 text-[11px] font-bold text-white transition hover:bg-white/20 disabled:opacity-40">
                <ChevronRight className="size-3.5" />
              </button>
            </div>
          )}

          {vimeo ? (
            // Auto-tracked: no manual button. Show live status so the student knows
            // completion is recorded once they've watched enough.
            <span
              className={cn(
                'ml-auto inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold',
                completed ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-white/80',
              )}
            >
              {completed ? (
                <>
                  <CheckCircle2 className="size-4" /> Completed
                </>
              ) : (
                <>
                  <span className="size-2 animate-pulse rounded-full bg-orange" />
                  Watching · {watchedPct}% (auto-completes at {Math.round(COMPLETE_RATIO * 100)}%)
                </>
              )}
            </span>
          ) : (
            // Legacy / non-Vimeo videos can't be auto-tracked — keep the manual control.
            <button
              type="button"
              onClick={() => onToggleDone(item)}
              disabled={busy}
              className={cn(
                'ml-auto inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition',
                item.done ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30' : 'bg-orange text-[#171717] hover:bg-orange/90',
              )}
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              {item.done ? 'Watched' : 'Mark as watched'}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export function VideoPlayer({
  playlist,
  index,
  onIndex,
  onSaveWatch,
  onToggleDone,
  busy,
  onClose,
}: {
  playlist: StudyMaterialItemDto[];
  index: number | null;
  onIndex: (i: number) => void;
  onSaveWatch: (item: StudyMaterialItemDto, positionSeconds: number, durationSeconds: number) => Promise<boolean>;
  onToggleDone: (item: StudyMaterialItemDto) => void;
  busy: boolean;
  onClose: () => void;
}) {
  const open = index !== null && index >= 0 && index < playlist.length;
  return (
    <AnimatePresence>
      {open && (
        <Player
          key="video-player"
          playlist={playlist}
          index={index}
          onIndex={onIndex}
          onSaveWatch={onSaveWatch}
          onToggleDone={onToggleDone}
          busy={busy}
          onClose={onClose}
        />
      )}
    </AnimatePresence>
  );
}
