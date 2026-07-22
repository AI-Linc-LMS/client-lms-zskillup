'use client';

import { useRef, useState } from 'react';
import { Play, Volume2 } from 'lucide-react';

/**
 * Self-hosted landing video in a player we fully control - no third-party chrome
 * (no pop-out button, no progress bar) until the viewer asks for it.
 *
 * - Resting: poster image + a branded play overlay.
 * - Hover: auto-plays a MUTED preview (browsers block autoplay WITH sound, so a
 *   hover preview is always silent).
 * - Click: unmutes, reveals native controls, and plays the full narrated tour.
 *
 * Respects prefers-reduced-motion: no hover-autoplay, the viewer clicks to play.
 */
export function HoverVideo({
  src,
  poster,
  title,
  eyebrow = 'Platform tour',
  className = '',
}: {
  src: string;
  poster?: string;
  title: string;
  eyebrow?: string;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [activated, setActivated] = useState(false); // clicked → sound + controls
  const [hovering, setHovering] = useState(false);

  const prefersReducedMotion = () =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function startPreview() {
    if (activated || prefersReducedMotion()) return;
    setHovering(true);
    const v = videoRef.current;
    if (v) {
      v.muted = true;
      void v.play().catch(() => {});
    }
  }

  function stopPreview() {
    setHovering(false);
    if (activated) return; // once playing with sound, hover no longer controls it
    videoRef.current?.pause();
  }

  function activate() {
    const v = videoRef.current;
    if (!v) return;
    setActivated(true);
    v.muted = false;
    void v.play().catch(() => {});
  }

  return (
    <div
      className={`group relative isolate aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-navy ${className}`}
      onMouseEnter={startPreview}
      onMouseLeave={stopPreview}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        muted
        loop
        playsInline
        preload="metadata"
        controls={activated}
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* Pre-activation overlay - click to watch with sound. Unmounts once activated
          so the native controls underneath become fully operable. */}
      {!activated && (
        <button
          type="button"
          onClick={activate}
          aria-label={`Play video with sound: ${title}`}
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center"
        >
          {/* dim scrim so the overlay stays readable over the playing preview */}
          <span
            aria-hidden
            className={`pointer-events-none absolute inset-0 bg-navy/50 transition-opacity duration-300 ${
              hovering ? 'opacity-40' : 'opacity-70'
            }`}
          />
          <span className="relative grid size-16 place-items-center rounded-full bg-white/95 shadow-[0_14px_44px_-10px_rgba(0,0,0,0.6)] transition duration-300 group-hover:scale-105">
            <Play className="size-6 translate-x-0.5 fill-navy text-navy" aria-hidden />
          </span>
          {eyebrow ? (
            <span className="relative inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-white/70">
              {eyebrow}
            </span>
          ) : null}
          <p className="relative max-w-sm text-lg font-bold leading-snug text-white">{title}</p>
          <span className="relative inline-flex items-center gap-1.5 text-xs font-medium text-white/60">
            <Volume2 className="size-3.5" aria-hidden />
            {hovering ? 'Muted preview - click for sound' : 'Hover to preview · click for sound'}
          </span>
        </button>
      )}
    </div>
  );
}
