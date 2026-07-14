import { Play } from 'lucide-react';

/**
 * A 16:9 intro-video placeholder styled like a real embed (poster + play button),
 * so layouts read correctly before the actual videos are produced. Swap the inner
 * content for an <iframe>/<video> once clips exist.
 */
export function VideoPlaceholder({
  title,
  subtitle,
  eyebrow = 'Intro video',
  accent = '#f5b400',
  className = '',
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  accent?: string;
  className?: string;
}) {
  return (
    <div
      className={`group relative isolate aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#0a1120] via-[#0f1c38] to-[#0a1120] ${className}`}
    >
      {/* ambient accent glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-1/2 h-[160%] w-2/3 -translate-y-1/2 rounded-full opacity-25 blur-3xl"
        style={{ background: accent }}
      />
      {/* faint grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
          backgroundSize: '34px 34px',
        }}
      />

      <div className="relative flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <span className="grid size-16 place-items-center rounded-full bg-white/95 shadow-[0_14px_44px_-10px_rgba(0,0,0,0.6)] transition duration-300 group-hover:scale-105">
          <Play className="size-6 translate-x-0.5 fill-navy text-navy" aria-hidden />
        </span>
        {eyebrow && (
          <span className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-white/70">
            {eyebrow}
          </span>
        )}
        <h3 className="text-balance text-lg font-bold text-white sm:text-xl">{title}</h3>
        {subtitle && <p className="max-w-md text-pretty text-sm text-white/55">{subtitle}</p>}
      </div>

      <span className="absolute right-3 top-3 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white/60 backdrop-blur">
        Coming soon
      </span>
    </div>
  );
}
