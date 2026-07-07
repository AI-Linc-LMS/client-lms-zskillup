import Link from 'next/link';
import { ArrowRight, CalendarDays } from 'lucide-react';
import type { BlogPostDto } from '@/shared/dto/content.dto';

/**
 * "From the blog" section on the public landing page. Server-fed the latest
 * published posts (see `getPublicBlogs`). Renders nothing when there are none,
 * so the homepage never shows an empty shell.
 */
export function HomeBlogSection({ posts }: { posts: BlogPostDto[] }) {
  if (posts.length === 0) return null;
  return (
    <section className="bg-white py-16 lg:py-20">
      <div className="mx-auto max-w-[1400px] px-5 md:px-8">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <p className="section-tag">Insights</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">From the blog</h2>
            <p className="mt-2 text-[var(--color-text-muted)]">
              Placement strategy, prep guides, and product updates.
            </p>
          </div>
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-[var(--color-primary)] hover:underline"
          >
            View all posts <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {posts.map((p) => (
            <Link
              key={p.id}
              href={`/blog/${p.slug}`}
              className="hover-lift group flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-line)] bg-white"
            >
              {p.coverUrl ? (
                <span className="block aspect-[16/9] overflow-hidden bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.coverUrl}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </span>
              ) : (
                <span className="block aspect-[16/9] bg-gradient-to-br from-[var(--color-primary)]/10 to-[var(--color-accent)]/10" />
              )}
              <div className="flex flex-1 flex-col p-5">
                {p.tags?.[0] ? (
                  <span className="mb-2 w-fit rounded-full bg-[var(--color-bg)] px-2.5 py-0.5 text-[11px] font-bold text-[var(--color-primary)]">
                    {p.tags[0]}
                  </span>
                ) : null}
                <h3 className="text-lg font-extrabold leading-snug text-[var(--color-text)] group-hover:text-[var(--color-primary)]">
                  {p.title}
                </h3>
                {p.excerpt ? (
                  <p className="mt-2 line-clamp-3 flex-1 text-sm text-[var(--color-text-muted)]">{p.excerpt}</p>
                ) : (
                  <span className="flex-1" />
                )}
                <p className="mt-4 flex items-center gap-1.5 border-t border-[var(--color-line)] pt-3 text-xs text-[var(--color-text-muted)]">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {p.publishedAt
                    ? new Date(p.publishedAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : 'New'}
                  {p.author ? <span>· {p.author}</span> : null}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
