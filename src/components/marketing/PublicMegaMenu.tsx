import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { getPublicCompanies } from '@/lib/server/public-content';
import { COMPANY_FEATURES } from '@/shared/company-features';
import { PRODUCT_FEATURES } from '@/shared/product-features';

/**
 * The Companies / Preparation dropdowns in the marketing header.
 *
 * These exist for crawlers as much as for people: the company × feature matrix is ~80
 * pages, and without a site-wide link into them each one is reachable only from its own
 * hub and the sitemap — the weakest internal linking there is. A header menu puts every
 * company one link from every public page.
 *
 * CSS-only (group-hover + focus-within), deliberately. `PublicHeader` is a server
 * component and every page that renders it is static; a stateful dropdown would drag a
 * client boundary onto the whole marketing surface to save nothing. Keyboard users get
 * the same panel through `focus-within`, and the trigger is a real link to the index
 * page, so the menu is never the only route to the content.
 */
export async function PublicMegaMenu() {
  const companies = await getPublicCompanies();
  if (companies.length === 0) return null;

  return (
    <>
      <div className="group relative">
        <Link
          href="/company"
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-white/10 group-hover:bg-white/10 group-focus-within:bg-white/10"
        >
          Companies <ChevronDown className="size-3.5 text-white/55" aria-hidden />
        </Link>
        <div className="invisible absolute left-1/2 top-full z-50 w-[520px] -translate-x-1/2 pt-3 opacity-0 transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
          <div className="rounded-2xl border border-[var(--color-line)] bg-white p-5 shadow-md">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-subtle)]">
              Company preparation
            </p>
            <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1">
              {companies.map((c) => (
                <Link
                  key={c.slug}
                  href={`/company/${c.slug}`}
                  className="rounded-lg px-2 py-1.5 text-sm font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-line)]/30"
                >
                  {c.name}
                </Link>
              ))}
            </div>
            <Link
              href="/company"
              className="mt-3 inline-block border-t border-[var(--color-line)] pt-3 text-xs font-bold text-[var(--color-primary)]"
            >
              All companies →
            </Link>
          </div>
        </div>
      </div>

      <div className="group relative">
        <Link
          href="/section"
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-white/10 group-hover:bg-white/10 group-focus-within:bg-white/10"
        >
          Preparation <ChevronDown className="size-3.5 text-white/55" aria-hidden />
        </Link>
        <div className="invisible absolute left-1/2 top-full z-50 w-[460px] -translate-x-1/2 pt-3 opacity-0 transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
          <div className="rounded-2xl border border-[var(--color-line)] bg-white p-5 shadow-md">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-subtle)]">
              By module
            </p>
            <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1">
              {PRODUCT_FEATURES.map((f) => (
                <Link
                  key={f.slug}
                  href={`/features/${f.slug}`}
                  className="rounded-lg px-2 py-1.5 text-sm font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-line)]/30"
                >
                  {f.label}
                </Link>
              ))}
            </div>
            <p className="mt-4 border-t border-[var(--color-line)] pt-4 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-subtle)]">
              By company resource
            </p>
            {/* Each points at the FIRST company's page for that feature — a link to a real
                page beats a dead "category" URL that would have to be invented for it. */}
            <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1">
              {COMPANY_FEATURES.map((f) => (
                <Link
                  key={f.slug}
                  href={`/company/${companies[0].slug}/${f.slug}`}
                  className="rounded-lg px-2 py-1.5 text-sm font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-line)]/30"
                >
                  {f.label}
                </Link>
              ))}
            </div>
            <Link
              href="/section"
              className="mt-3 inline-block border-t border-[var(--color-line)] pt-3 text-xs font-bold text-[var(--color-primary)]"
            >
              Practice by section →
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
