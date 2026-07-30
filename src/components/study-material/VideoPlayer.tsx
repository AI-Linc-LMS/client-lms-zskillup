'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import VimeoPlayer from '@vimeo/player';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Gauge,
  Loader2,
  Lock,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StudyMaterialItemDto } from '@/lib/api/study-material';

/** A video counts as complete once this fraction is watched (matches the server). */
const COMPLETE_RATIO = 0.9;
/** Only persist progress this often (seconds of playback) to avoid hammering the API. */
const SAVE_EVERY_SECONDS = 10;
/** Grace when snapping a forward-seek back, so normal timeupdate jitter isn't caught. */
const SEEK_GRACE = 1.25;
const SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const;

const isVimeo = (url: string | null | undefined) => !!url && /player\.vimeo\.com/.test(url);
const fmt = (s: number) => {
  if (!Number.isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

/**
 * Vimeo video with CUSTOM controls (native bar hidden via controls:false). This is
 * what makes the first-attempt lock possible: until the student has finished the
 * video once, seeking FORWARD past the furthest point they've reached is blocked and
 * the speed control is hidden — they can still pause/resume, scrub BACK over what
 * they've seen, adjust volume, and go fullscreen. After completion everything unlocks.
 * Also carries the watch tracking (resume + auto-complete at the threshold).
 */
function VimeoStage({
  item,
  full,
  onToggleFull,
  onSaveWatch,
}: {
  item: StudyMaterialItemDto;
  full: boolean;
  onToggleFull: () => void;
  onSaveWatch: (item: StudyMaterialItemDto, positionSeconds: number, durationSeconds: number) => Promise<boolean>;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<VimeoPlayer | null>(null);

  const [loaded, setLoaded] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(item.positionSeconds ?? 0);
  const [duration, setDuration] = useState(item.durationSeconds ?? 0);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [rate, setRate] = useState(1);
  const [showSpeed, setShowSpeed] = useState(false);
  const [completed, setCompleted] = useState(Boolean(item.done));

  // Refs the SDK event handlers (created once per item) read so they see live values.
  const maxWatchedRef = useRef(item.maxWatchedSeconds ?? 0);
  const completedRef = useRef(Boolean(item.done));
  const latest = useRef({ position: item.positionSeconds ?? 0, duration: item.durationSeconds ?? 0 });
  const lastSaved = useRef(item.positionSeconds ?? 0);
  const savingRef = useRef(false);
  const saveRef = useRef<(force?: boolean) => Promise<void>>(async () => {});
  completedRef.current = completed;

  // Stable save fn (kept in a ref so the per-item effect need not depend on it).
  saveRef.current = useCallback(
    async (force = false) => {
      if (savingRef.current) return;
      const { position: p, duration: d } = latest.current;
      if (d <= 0) return;
      if (!force && Math.abs(p - lastSaved.current) < SAVE_EVERY_SECONDS) return;
      savingRef.current = true;
      lastSaved.current = p;
      try {
        const done = await onSaveWatch(item, p, d);
        if (done) {
          setCompleted(true);
          completedRef.current = true;
        }
      } catch {
        /* best-effort */
      } finally {
        savingRef.current = false;
      }
    },
    [item, onSaveWatch],
  );

  // Create + tear down the SDK player for THIS item.
  useEffect(() => {
    const el = mountRef.current;
    if (!el || !item.embedUrl) return;
    // VimeoStage only renders for Vimeo items, so embedUrl is a player.vimeo URL —
    // narrow the string to the SDK's branded template type.
    const url = item.embedUrl as `https://player.vimeo.com/video/${string}`;
    const player = new VimeoPlayer(el, { url, controls: false, responsive: false });
    playerRef.current = player;
    let disposed = false;

    player.on('play', () => setPlaying(true));
    player.on('pause', () => {
      setPlaying(false);
      void saveRef.current(true);
    });
    player.on('timeupdate', (d: { seconds: number; duration: number }) => {
      const s = d.seconds ?? 0;
      const dur = d.duration || latest.current.duration;
      setCurrent(s);
      if (d.duration) setDuration(d.duration);
      if (s > maxWatchedRef.current) maxWatchedRef.current = s;
      latest.current = { position: s, duration: dur };
      if (Math.abs(s - lastSaved.current) >= SAVE_EVERY_SECONDS) void saveRef.current();
    });
    player.on('seeked', (d: { seconds: number }) => {
      // First-attempt lock: never let a forward seek land past the watched ceiling.
      if (!completedRef.current && d.seconds > maxWatchedRef.current + SEEK_GRACE) {
        void player.setCurrentTime(maxWatchedRef.current);
      }
    });
    player.on('ended', () => {
      latest.current = { position: latest.current.duration, duration: latest.current.duration };
      void saveRef.current(true);
    });
    player.on('volumechange', (d: { volume: number }) => {
      setVolume(d.volume);
      setMuted(d.volume === 0);
    });

    void player
      .ready()
      .then(async () => {
        if (disposed) return;
        setLoaded(true);
        const dur = await player.getDuration().catch(() => 0);
        if (dur) {
          setDuration(dur);
          latest.current = { ...latest.current, duration: dur };
        }
        // Resume where they left off (only if not yet completed).
        const resumeAt = item.positionSeconds ?? 0;
        if (!completedRef.current && resumeAt > 3) {
          await player.setCurrentTime(resumeAt).catch(() => {});
        }
      })
      .catch(() => {});

    return () => {
      disposed = true;
      void saveRef.current(true);
      player.destroy().catch(() => {});
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id, item.embedUrl]);

  const unlocked = completed;
  const seekCeiling = unlocked ? duration : Math.max(maxWatchedRef.current, current);
  const watchedPct = duration > 0 ? Math.min(100, (current / duration) * 100) : 0;
  const ceilingPct = duration > 0 ? Math.min(100, (seekCeiling / duration) * 100) : 0;

  const togglePlay = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    if (playing) void p.pause();
    else void p.play();
  }, [playing]);

  const onSeek = useCallback(
    (clientX: number) => {
      const p = playerRef.current;
      const bar = barRef.current;
      if (!p || !bar || duration <= 0) return;
      const rect = bar.getBoundingClientRect();
      const frac = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      let target = frac * duration;
      if (!unlocked) target = Math.min(target, seekCeiling); // block forward-seek on first watch
      void p.setCurrentTime(target);
    },
    [duration, unlocked, seekCeiling],
  );

  const toggleMute = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    void p.setMuted(!muted);
    setMuted((m) => !m);
  }, [muted]);

  const changeVolume = useCallback((v: number) => {
    const p = playerRef.current;
    if (!p) return;
    void p.setVolume(v);
    setVolume(v);
    setMuted(v === 0);
  }, []);

  const changeRate = useCallback((r: number) => {
    const p = playerRef.current;
    if (!p) return;
    void p.setPlaybackRate(r);
    setRate(r);
    setShowSpeed(false);
  }, []);

  return (
    <>
      {/* video surface (native controls hidden) — click toggles play */}
      <button
        type="button"
        onClick={togglePlay}
        aria-label={playing ? 'Pause' : 'Play'}
        className="absolute inset-0 z-[1] [&_iframe]:pointer-events-none [&_iframe]:absolute [&_iframe]:inset-0 [&_iframe]:size-full"
      >
        <div ref={mountRef} className="absolute inset-0 size-full" />
      </button>

      {!loaded && (
        <div className="pointer-events-none absolute inset-0 z-[2] grid place-items-center">
          <Loader2 className="size-7 animate-spin text-white/70" />
        </div>
      )}

      {/* center play affordance when paused */}
      {loaded && !playing && (
        <div className="pointer-events-none absolute inset-0 z-[2] grid place-items-center">
          <span className="grid size-16 place-items-center rounded-full bg-black/50 text-white">
            <Play className="size-7 fill-current" />
          </span>
        </div>
      )}

      {/* custom control bar */}
      <div className="absolute inset-x-0 bottom-0 z-[3] bg-gradient-to-t from-black/80 to-transparent px-3 pb-2.5 pt-6">
        {/* seek bar */}
        <div
          ref={barRef}
          onClick={(e) => onSeek(e.clientX)}
          role="slider"
          aria-label="Seek"
          aria-valuenow={Math.round(current)}
          aria-valuemax={Math.round(duration)}
          tabIndex={0}
          className="group/bar relative mb-2 h-3 cursor-pointer"
        >
          <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 overflow-hidden rounded-full bg-white/25">
            {/* the seek ceiling on a first watch (dim = still locked) */}
            {!unlocked && <div className="absolute inset-y-0 left-0 bg-white/25" style={{ width: `${ceilingPct}%` }} />}
            {/* played */}
            <div className={cn('absolute inset-y-0 left-0', completed ? 'bg-emerald-400' : 'bg-orange')} style={{ width: `${watchedPct}%` }} />
          </div>
          <span
            className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white opacity-0 transition group-hover/bar:opacity-100"
            style={{ left: `${watchedPct}%` }}
          />
        </div>

        <div className="flex items-center gap-2 text-white">
          <button type="button" onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'} className="rounded p-1 hover:bg-white/10">
            {playing ? <Pause className="size-4 fill-current" /> : <Play className="size-4 fill-current" />}
          </button>

          {/* volume */}
          <div className="flex items-center gap-1">
            <button type="button" onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'} className="rounded p-1 hover:bg-white/10">
              {muted || volume === 0 ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(e) => changeVolume(Number(e.target.value))}
              aria-label="Volume"
              className="hidden h-1 w-16 cursor-pointer accent-orange sm:block"
            />
          </div>

          <span className="ml-1 text-[11px] font-semibold tabular-nums text-white/80">
            {fmt(current)} / {fmt(duration)}
          </span>

          <div className="ml-auto flex items-center gap-1.5">
            {/* speed — only once the video has been completed */}
            {unlocked ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowSpeed((s) => !s)}
                  aria-label="Playback speed"
                  className="flex items-center gap-1 rounded px-1.5 py-1 text-[11px] font-bold hover:bg-white/10"
                >
                  <Gauge className="size-3.5" /> {rate}×
                </button>
                {showSpeed && (
                  <div className="absolute bottom-full right-0 mb-1 overflow-hidden rounded-lg bg-[#12121a] p-1 shadow-lg ring-1 ring-white/10">
                    {SPEEDS.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => changeRate(r)}
                        className={cn(
                          'block w-16 rounded px-2 py-1 text-left text-[11px] font-semibold hover:bg-white/10',
                          r === rate ? 'text-orange' : 'text-white/80',
                        )}
                      >
                        {r}×
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <span className="hidden items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/70 sm:inline-flex">
                <Lock className="size-3" /> Seek &amp; speed unlock after you finish once
              </span>
            )}
            <button type="button" onClick={onToggleFull} aria-label="Fullscreen" className="rounded p-1 hover:bg-white/10">
              {full ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </button>
          </div>
        </div>
      </div>
    </>
  );
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
  const [full, setFull] = useState(false);

  const hasPrev = index > 0;
  const hasNext = index < playlist.length - 1;
  const vimeo = isVimeo(item?.embedUrl);

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
            {playlist.length > 1 ? <p className="text-[11px] text-white/50">Lesson {index + 1} of {playlist.length}</p> : null}
          </div>
          {item.done && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
              <CheckCircle2 className="size-3.5" /> Completed
            </span>
          )}
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full bg-white/10 p-1.5 text-white transition hover:bg-white/20">
            <X className="size-4" />
          </button>
        </div>

        {/* stage */}
        <div ref={stageRef} className="group relative aspect-video w-full bg-black">
          {!item.embedUrl ? (
            <div className="grid size-full place-items-center text-sm text-white/40">No video source set</div>
          ) : vimeo ? (
            <VimeoStage key={item.id} item={item} full={full} onToggleFull={toggleFull} onSaveWatch={onSaveWatch} />
          ) : (
            // Legacy / non-Vimeo: plain embed with native controls (can't be tracked).
            <iframe
              key={item.id}
              src={item.embedUrl}
              className="absolute inset-0 size-full"
              allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
              allowFullScreen
              title={item.title}
            />
          )}

          {hasPrev && (
            <button
              type="button"
              onClick={() => onIndex(index - 1)}
              aria-label="Previous video"
              className="absolute left-2 top-1/2 z-[4] -translate-y-1/2 rounded-full bg-black/50 p-2 text-white opacity-0 transition hover:bg-black/70 group-hover:opacity-100"
            >
              <ChevronLeft className="size-5" />
            </button>
          )}
          {hasNext && (
            <button
              type="button"
              onClick={() => onIndex(index + 1)}
              aria-label="Next video"
              className="absolute right-2 top-1/2 z-[4] -translate-y-1/2 rounded-full bg-black/50 p-2 text-white opacity-0 transition hover:bg-black/70 group-hover:opacity-100"
            >
              <ChevronRight className="size-5" />
            </button>
          )}

          <div className="absolute right-2 top-2 z-[4] flex items-center gap-1.5 opacity-0 transition group-hover:opacity-100">
            {item.embedUrl && (
              <a href={item.embedUrl.replace('/preview', '/view')} target="_blank" rel="noopener noreferrer" aria-label="Open in new tab" className="rounded-lg bg-black/50 p-1.5 text-white/90 transition hover:bg-black/70">
                <ExternalLink className="size-4" />
              </a>
            )}
          </div>
        </div>

        {/* footer: playlist nav + (non-Vimeo) manual completion fallback */}
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
            <span className="ml-auto text-[11px] font-semibold text-white/50">
              Progress saves automatically · completes at {Math.round(COMPLETE_RATIO * 100)}% watched
            </span>
          ) : (
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
