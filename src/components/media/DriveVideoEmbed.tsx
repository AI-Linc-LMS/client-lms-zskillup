'use client';

import { useState } from 'react';
import { Play } from 'lucide-react';

/**
 * Google-Drive video embed with a branded click-to-play poster. The Drive
 * iframe is only mounted after the user clicks, so it never weighs down the
 * landing-page first paint. The poster mirrors VideoPlaceholder so it slots into
 * the same layout. The Drive file must be shared as "Anyone with the link".
 */
export function DriveVideoEmbed({
  fileId,
  title,
  eyebrow = 'Platform tour',
  accent = '#f5b400',
  className = '',
}: {
  fileId: string;
  title: string;
  eyebrow?: string;
  accent?: string;
  className?: string;
}) {
  const [play, setPlay] = useState(false);
  return (
    <div
      className={`group relative isolate aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#0a1120] via-[#0f1c38] to-[#0a1120] ${className}`}
    >
      {play ? (
        <iframe
          src={`https://drive.google.com/file/d/${fileId}/preview`}
          title={title}
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
          allowFullScreen
          loading="lazy"
          className="absolute inset-0 h-full w-full"
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlay(true)}
          aria-label={`Play video: ${title}`}
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center"
        >
          {/* ambient accent glow */}
          <span
            aria-hidden
            className="pointer-events-none absolute -left-24 top-1/2 h-[160%] w-2/3 -translate-y-1/2 rounded-full opacity-25 blur-3xl"
            style={{ background: accent }}
          />
          {/* faint grid */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
              backgroundSize: '34px 34px',
            }}
          />
          <span className="relative grid size-16 place-items-center rounded-full bg-white/95 shadow-[0_14px_44px_-10px_rgba(0,0,0,0.6)] transition duration-300 group-hover:scale-105">
            <Play className="size-6 translate-x-0.5 fill-navy text-navy" aria-hidden />
          </span>
          {eyebrow ? (
            <span className="relative mt-1 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-white/70">
              {eyebrow}
            </span>
          ) : null}
          <p className="relative max-w-sm text-lg font-bold leading-snug text-white">{title}</p>
        </button>
      )}
    </div>
  );
}
