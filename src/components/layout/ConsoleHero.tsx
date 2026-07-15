import type { ComponentType, ReactNode } from 'react';

/**
 * Shared page hero for the TPO / Admin / Super-Admin consoles — the student
 * "Night Lab" canvas (deep ink → indigo, white text, gold + violet corner blurs)
 * so every console page opens with a prominent branded banner like the student
 * app, instead of a plain text heading. Eyebrow chip + big title + description,
 * with an optional right-side `actions` slot (stat, button, filter).
 */
export function ConsoleHero({
  icon: Icon,
  eyebrow,
  title,
  description,
  actions,
  className = '',
}: {
  icon?: ComponentType<{ className?: string }>;
  eyebrow: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0a0a0c] via-[#0d0e13] to-[#141a2e] p-6 text-white sm:p-7 ${className}`}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-[#ffc42d]/20 blur-3xl"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-20 -left-10 size-56 rounded-full bg-[#6d3bf5]/25 blur-3xl"
      />
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-white/70 ring-1 ring-inset ring-white/15">
            {Icon ? <Icon className="size-3.5" /> : null}
            {eyebrow}
          </span>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-[34px]">{title}</h1>
          {description ? (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/60">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="relative shrink-0">{actions}</div> : null}
      </div>
    </section>
  );
}
