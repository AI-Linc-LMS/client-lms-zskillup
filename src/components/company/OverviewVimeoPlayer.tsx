'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import VimeoPlayer from '@vimeo/player';
import { Loader2, Maximize2, Pause, Play, Volume2, VolumeX } from 'lucide-react';

/**
 * Overview-tab video player. Uses the Vimeo SDK with `controls: false` so NONE of
 * Vimeo's own chrome is shown — no vimeo logo (which links out to vimeo.com), no
 * share / like / watch-later, no title/byline. Only our own minimal playback controls
 * appear. Unlike the study-material player it has NO seek/completion lock (overview
 * videos are freely watchable). Purely client-side; nothing is persisted.
 */
const fmt = (s: number) => {
  if (!Number.isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

export function OverviewVimeoPlayer({ embedUrl, title }: { embedUrl: string; title: string }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<VimeoPlayer | null>(null);

  const [loaded, setLoaded] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const url = embedUrl as `https://player.vimeo.com/video/${string}`;
    const player = new VimeoPlayer(el, { url, controls: false, responsive: false });
    playerRef.current = player;
    let disposed = false;

    player.on('play', () => setPlaying(true));
    player.on('pause', () => setPlaying(false));
    player.on('ended', () => setPlaying(false));
    player.on('timeupdate', (d: { seconds: number; duration: number }) => {
      if (disposed) return;
      setCurrent(d.seconds);
      if (d.duration) setDuration(d.duration);
    });
    player
      .ready()
      .then(async () => {
        if (disposed) return;
        setLoaded(true);
        try {
          setDuration(await player.getDuration());
        } catch {
          /* best-effort */
        }
      })
      .catch(() => {
        /* leave the loader; the frame still shows */
      });

    return () => {
      disposed = true;
      player.off('play');
      player.off('pause');
      player.off('ended');
      player.off('timeupdate');
      void player.destroy().catch(() => {});
      playerRef.current = null;
    };
  }, [embedUrl]);

  const toggle = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    void (playing ? p.pause() : p.play()).catch(() => {});
  }, [playing]);

  const seek = useCallback(
    (clientX: number) => {
      const bar = barRef.current;
      const p = playerRef.current;
      if (!bar || !p || duration <= 0) return;
      const rect = bar.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      void p.setCurrentTime(ratio * duration).catch(() => {});
    },
    [duration],
  );

  const toggleMute = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    const next = !muted;
    setMuted(next);
    void p.setMuted(next).catch(() => {});
  }, [muted]);

  const goFull = useCallback(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    else void wrap.requestFullscreen().catch(() => {});
  }, []);

  const pct = duration > 0 ? (current / duration) * 100 : 0;

  return (
    <div
      ref={wrapRef}
      className="group relative aspect-video w-full overflow-hidden rounded-xl border border-slate-200 bg-black"
    >
      <div ref={mountRef} className="absolute inset-0 size-full [&>iframe]:size-full" />

      {/* Click layer: play/pause without exposing any Vimeo control. */}
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? 'Pause' : 'Play'}
        className="absolute inset-0 z-[1] flex items-center justify-center"
      >
        {!loaded ? (
          <Loader2 className="size-8 animate-spin text-white/80" />
        ) : !playing ? (
          <span className="grid size-16 place-items-center rounded-full bg-white/90 text-navy shadow-lg transition group-hover:bg-white">
            <Play className="ml-0.5 size-7" />
          </span>
        ) : null}
      </button>

      {/* Custom control bar (appears on hover / when paused). */}
      <div
        className={`absolute inset-x-0 bottom-0 z-[2] flex items-center gap-3 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-6 transition-opacity ${
          playing ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'
        }`}
      >
        <button type="button" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'} className="text-white">
          {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
        </button>
        <div
          ref={barRef}
          role="slider"
          aria-label="Seek"
          aria-valuenow={Math.round(pct)}
          tabIndex={0}
          onClick={(e) => seek(e.clientX)}
          className="relative h-1.5 flex-1 cursor-pointer rounded-full bg-white/25"
        >
          <span className="absolute inset-y-0 left-0 rounded-full bg-orange" style={{ width: `${pct}%` }} />
        </div>
        <span className="tabular-nums text-[11px] font-semibold text-white/90">
          {fmt(current)} / {fmt(duration)}
        </span>
        <button type="button" onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'} className="text-white">
          {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
        </button>
        <button type="button" onClick={goFull} aria-label="Fullscreen" className="text-white">
          <Maximize2 className="size-4" />
        </button>
      </div>
      <span className="sr-only">{title}</span>
    </div>
  );
}
