import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { CodingTopic } from '@/lib/api/mocks';
import { ACCENT_CLASS, CODING_META } from './section-meta';

/**
 * The "Coding" section block — a card with a "Practice all coding" CTA plus a
 * chip per coding topic that deep-links to `/coding?topic=`. Shared by the
 * Practice picker and Practice-as-wish so both offer on-the-go coding practice.
 */
export function CodingBlock({ topics }: { topics: CodingTopic[] }) {
  const Icon = CODING_META.icon;
  const a = ACCENT_CLASS[CODING_META.accent];
  return (
    <div data-tour="aswish:coding" className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_18px_50px_-30px_rgba(99,102,241,0.25)]">
      <span aria-hidden className="pointer-events-none absolute -right-10 -top-12 size-32 rounded-full bg-indigo-400/10 blur-2xl" />
      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`grid size-12 place-items-center rounded-2xl ring-1 ${a.tile}`}>
            <Icon className="size-6" aria-hidden="true" />
          </span>
          <div>
            <p className="text-base font-bold leading-snug text-navy">Coding</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {topics.length
                ? `${topics.length} topic${topics.length === 1 ? '' : 's'} · Judge0-evaluated DSA problems`
                : 'DSA problems — Judge0-evaluated'}
            </p>
          </div>
        </div>
        <Link
          href="/coding"
          className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-4 py-2 text-xs font-extrabold text-white transition-transform hover:-translate-y-0.5"
        >
          Practice all coding <ArrowRight className="size-3.5" />
        </Link>
      </div>

      {topics.length ? (
        <div className="relative mt-4 flex flex-wrap gap-2">
          {topics.map((t) => (
            <Link
              key={t.topic}
              href={`/coding?topic=${encodeURIComponent(t.topic)}`}
              className={`inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-navy transition-colors ${a.chip}`}
            >
              {t.topic}
            </Link>
          ))}
        </div>
      ) : (
        <p className="relative mt-3 text-xs text-slate-500">
          Coding problems are on the way — check back soon.
        </p>
      )}
    </div>
  );
}
