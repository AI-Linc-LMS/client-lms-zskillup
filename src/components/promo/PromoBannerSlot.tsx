import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { getPublicBanners } from '@/lib/server/public-content';
import type { PromoPlacement } from '@/shared/promo-placements';
import type { PromoBannerDto } from '@/lib/api/promo';

/**
 * The admin-managed promo slot for one module.
 *
 * A SERVER component, deliberately: the brief requires banners that "do not negatively
 * impact SEO or page speed". Fetching them in the browser would mean the slot is absent
 * from the HTML a crawler reads, and would add a request plus a layout shift on every
 * page view. Rendered server-side they cost one shared, cached fetch and ship inside the
 * document.
 *
 * Renders nothing when the slot is empty — no placeholder, no reserved space — so a
 * module with no active campaign looks exactly as it did before banners existed.
 */
export async function PromoBannerSlot({
  placement,
  className,
}: {
  placement: PromoPlacement;
  className?: string;
}) {
  const banners = await getPublicBanners(placement);
  if (banners.length === 0) return null;

  return (
    <div className={className}>
      <div className="space-y-4">
        {banners.map((b) => (
          <PromoCard key={b.id} banner={b} />
        ))}
      </div>
    </div>
  );
}

function PromoCard({ banner: b }: { banner: PromoBannerDto }) {
  const hasCta = Boolean(b.ctaLabel && b.ctaHref);

  // Image-only banners are a single responsive image; an unsized <img> is the classic
  // CLS regression, so width/height always come from the intrinsic box next/image keeps.
  if (b.imageUrl && !b.body) {
    const img = (
      <Image
        src={b.imageUrl}
        alt={b.alt ?? b.title}
        width={1200}
        height={300}
        sizes="(max-width: 768px) 100vw, 1100px"
        className="h-auto w-full rounded-xl border border-[var(--color-line)] object-cover"
      />
    );
    return hasCta ? (
      <Link href={b.ctaHref!} aria-label={b.ctaLabel!} className="block">
        {img}
      </Link>
    ) : (
      img
    );
  }

  return (
    <section className="overflow-hidden rounded-xl border border-[var(--color-line)] bg-white shadow-sm">
      <div className="flex flex-col gap-0 sm:flex-row">
        {b.imageUrl && (
          <div className="relative h-40 w-full shrink-0 sm:h-auto sm:w-64">
            <Image
              src={b.imageUrl}
              alt={b.alt ?? ''}
              fill
              sizes="(max-width: 640px) 100vw, 256px"
              className="object-cover"
            />
          </div>
        )}
        <div className="flex flex-1 flex-col justify-center gap-2 p-5">
          <h3 className="text-base font-bold text-[var(--color-text)]">{b.title}</h3>
          {b.body && (
            <p className="text-sm leading-relaxed text-[var(--color-text-muted)]">{b.body}</p>
          )}
          {hasCta && (
            <Link
              href={b.ctaHref!}
              className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-full bg-[var(--color-text)] px-4 py-2 text-xs font-bold text-white transition hover:opacity-90"
            >
              {b.ctaLabel} <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
