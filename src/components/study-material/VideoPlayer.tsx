'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Loader2,
  Maximize2,
  Minimize2,
  Play,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StudyMaterialItemDto } from '@/lib/api/study-material';

const PROVIDER_LABEL: Record<string, string> = { VIMEO: 'Vimeo', GDRIVE: 'Google Drive', YOUTUBE: 'YouTube' };
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/** A native-feel video theatre — branded chrome around the provider embed, with
 *  fullscreen + theater modes, a watch-session timer, prev/next playlist navigation
 *  through the topic's videos, keyboard shortcuts, and a "mark as watched" control. */
function Player({
  playlist,
  index,
  onIndex,
  onToggleDone,
  busy,
  onClose,
}: {
  playlist: StudyMaterialItemDto[];
  index: number;
  onIndex: (i: number) => void;
  onToggleDone: (item: StudyMaterialItemDto) => void;
  busy: boolean;
  onClose: () => void;
}) {
  const item = playlist[index];
  const stageRef = useRef<HTMLDivElement>(null);
  const [full, setFull] = useState(false);
  const [theater, setTheater] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const hasPrev = index > 0;
  const hasNext = index < playlist.length - 1;

  const toggleFull = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void stageRef.current?.requestFullscreen?.();
  }, []);

  // watch-session timer — resets when the video changes.
  useEffect(() => {
    setElapsed(0);
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [index]);

  useEffect(() => {
    const onFs = () => setFull(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (document.fullscreenElement) return; // let fullscreen swallow Esc
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

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <motion.div
        className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className={cn(
          'relative w-full overflow-hidden rounded-3xl bg-[#0b1220] shadow-2xl ring-1 ring-white/10 transition-[max-width] duration-300',
          theater ? 'max-w-6xl' : 'max-w-3xl',
        )}
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
            <p className="text-[11px] text-white/50">
              {item.provider ? PROVIDER_LABEL[item.provider] ?? 'Video' : 'Video'}
              {playlist.length > 1 ? ` · ${index + 1} of ${playlist.length}` : ''}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full bg-white/10 p-1.5 text-white transition hover:bg-white/20">
            <X className="size-4" />
          </button>
        </div>

        {/* stage */}
        <div ref={stageRef} className="group relative aspect-video w-full bg-black">
          {item.embedUrl ? (
            <iframe
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

          {/* prev / next side rails */}
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

          {/* top-right stage controls */}
          <div className="absolute right-2 top-2 z-10 flex items-center gap-1.5 opacity-0 transition group-hover:opacity-100">
            {item.embedUrl && (
              <a href={item.embedUrl.replace('/preview', '/view')} target="_blank" rel="noopener noreferrer" aria-label="Open in Google Drive" className="rounded-lg bg-black/50 p-1.5 text-white/90 transition hover:bg-black/70">
                <ExternalLink className="size-4" />
              </a>
            )}
            <button type="button" onClick={() => setTheater((t) => !t)} aria-label="Theater mode" className="hidden rounded-lg bg-black/50 p-1.5 text-white/90 transition hover:bg-black/70 sm:block">
              {theater ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </button>
            <button type="button" onClick={toggleFull} aria-label="Fullscreen" className="rounded-lg bg-black/50 p-1.5 text-white/90 transition hover:bg-black/70">
              {full ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </button>
          </div>
        </div>

        {/* controls footer */}
        <div className="flex flex-wrap items-center gap-3 px-5 py-3">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-white/50">
            <Clock className="size-3.5" /> Watching · {fmt(elapsed)}
          </span>
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
          <button
            type="button"
            onClick={() => onToggleDone(item)}
            disabled={busy}
            className={cn(
              'ml-auto inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition',
              item.done ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30' : 'bg-orange text-white hover:bg-orange/90',
            )}
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
            {item.done ? 'Watched' : 'Mark as watched'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export function VideoPlayer({
  playlist,
  index,
  onIndex,
  onToggleDone,
  busy,
  onClose,
}: {
  playlist: StudyMaterialItemDto[];
  index: number | null;
  onIndex: (i: number) => void;
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
          onToggleDone={onToggleDone}
          busy={busy}
          onClose={onClose}
        />
      )}
    </AnimatePresence>
  );
}
