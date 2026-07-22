import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * The company-content disclaimer. ONE source of truth for the wording.
 *
 * This is a legal notice, not decoration: it disclaims affiliation with the companies whose
 * names and logos the platform uses, and disclaims any promise of placement or of questions
 * recurring. It must be authored once - three hand-copied versions would drift, and a legal
 * notice that says something slightly different on each page is worse than none.
 *
 * Rendered wherever company-branded prep content appears: the landing page, the company
 * hub (so it shows on EVERY company), and the companies listing.
 */
export const DISCLAIMER_TEXT =
  'This content is for preparation purposes only and is not affiliated with or endorsed by the respective company. prephasz does not guarantee placement or selection, nor any assurance that a similar pattern or the same questions will recur in future screening processes. Questions are based on previous patterns and research, and may differ from those asked in actual recruitment assessments.';

export function Disclaimer({
  className,
  tone = 'light',
}: {
  className?: string;
  /** `dark` for the navy hub hero / dark footers; `light` for white surfaces. */
  tone?: 'light' | 'dark';
}) {
  const dark = tone === 'dark';
  return (
    <aside
      // `note` + a label rather than a bare <p>: assistive tech should announce this as a
      // distinct advisory region, not as trailing body copy.
      role="note"
      aria-label="Disclaimer"
      className={cn(
        'flex items-start gap-2.5 rounded-2xl border px-4 py-3',
        dark
          ? 'border-white/10 bg-white/[0.04] text-white/60'
          : 'border-slate-200 bg-slate-50/70 text-slate-600',
        className,
      )}
    >
      <Info className={cn('mt-0.5 size-3.5 shrink-0', dark ? 'text-white/40' : 'text-slate-500')} />
      <p className="text-[11px] leading-relaxed">
        <span className={cn('font-bold', dark ? 'text-white/75' : 'text-slate-600')}>Disclaimer:</span>{' '}
        {DISCLAIMER_TEXT}
      </p>
    </aside>
  );
}
