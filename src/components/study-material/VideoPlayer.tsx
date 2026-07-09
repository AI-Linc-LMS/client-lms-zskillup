'use client';

import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Loader2, Play, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StudyMaterialItemDto } from '@/lib/api/study-material';

const PROVIDER_LABEL: Record<string, string> = { VIMEO: 'Vimeo', GDRIVE: 'Google Drive', YOUTUBE: 'YouTube' };

/** A native-feel video overlay — branded chrome wrapping the provider embed, with
 *  a "mark as watched" control that drives progress. */
function Player({
  item,
  busy,
  onToggleDone,
  onClose,
}: {
  item: StudyMaterialItemDto;
  busy: boolean;
  onToggleDone: (done: boolean) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

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
        className="relative w-full max-w-3xl overflow-hidden rounded-3xl bg-[#0b1220] shadow-2xl ring-1 ring-white/10"
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
              {item.durationLabel ? ` · ${item.durationLabel}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full bg-white/10 p-1.5 text-white transition hover:bg-white/20"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* 16:9 stage */}
        <div className="relative aspect-video w-full bg-black">
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
        </div>

        {/* controls */}
        <div className="flex items-center justify-between gap-3 px-5 py-3">
          <p className="hidden text-[11px] text-white/40 sm:block">Mark it watched to track your progress.</p>
          <button
            type="button"
            onClick={() => onToggleDone(!item.done)}
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
  item,
  busy,
  onToggleDone,
  onClose,
}: {
  item: StudyMaterialItemDto | null;
  busy: boolean;
  onToggleDone: (done: boolean) => void;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {item && <Player item={item} busy={busy} onToggleDone={onToggleDone} onClose={onClose} />}
    </AnimatePresence>
  );
}
