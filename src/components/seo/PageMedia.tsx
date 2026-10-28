import Image from 'next/image';
import type { SeoPageMedia } from '@/lib/seo/page-metadata';

/**
 * The admin-attached video and image for one page — the right-hand panel on a company
 * feature page.
 *
 * The embed URL is normalised server-side (`toEmbedUrl`) and is null unless it resolved
 * to a YouTube or Vimeo player, so an operator typo renders nothing rather than framing
 * an arbitrary third-party page. Renders nothing at all when both are unset, which is
 * the state of most pages most of the time.
 *
 * A server component: it is static markup fed by an already-cached fetch, and these
 * pages must stay prerendered.
 */
export function PageMedia({ media }: { media: SeoPageMedia }) {
  if (!media.embedUrl && !media.heroImageUrl) return null;

  return (
    <div className="space-y-4">
      {media.embedUrl && (
        <figure className="overflow-hidden rounded-xl border border-[var(--color-line)] bg-white shadow-sm">
          {/* 16:9 via aspect-video so the box is reserved before the frame loads — an
              unsized iframe is a guaranteed layout shift on every view. */}
          <div className="aspect-video w-full">
            <iframe
              src={media.embedUrl}
              title={media.embedTitle ?? 'Preparation video'}
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
              className="h-full w-full border-0"
            />
          </div>
          {media.embedTitle && (
            <figcaption className="border-t border-[var(--color-line)] px-4 py-3 text-sm font-semibold text-[var(--color-text)]">
              {media.embedTitle}
            </figcaption>
          )}
        </figure>
      )}

      {media.heroImageUrl && (
        <Image
          src={media.heroImageUrl}
          // Alt is required for an informational image (WCAG 2.1 AA, §10). Falling back
          // to the caption beats an empty alt, which would mark it decorative.
          alt={media.heroImageAlt ?? media.embedTitle ?? ''}
          width={800}
          height={600}
          sizes="(max-width: 1024px) 100vw, 340px"
          className="h-auto w-full rounded-xl border border-[var(--color-line)]"
        />
      )}
    </div>
  );
}
