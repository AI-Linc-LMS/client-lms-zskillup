import Link from 'next/link';
import { getPublicBlogs } from '@/lib/server/public-content';

export const revalidate = 300;

export const metadata = {
  title: 'Blog · ZSkillup',
  description: 'Placement prep insights, product updates, and success stories.',
};

export default async function BlogIndexPage() {
  const posts = await getPublicBlogs();

  return (
    <main className="mx-auto max-w-[1100px] px-5 py-16 md:px-8">
      <header className="mb-10 max-w-2xl">
        <p className="section-tag">Blog</p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
          Insights for your placement journey
        </h1>
      </header>

      {posts.length === 0 ? (
        <p className="rounded-xl border border-[var(--color-line)] bg-white p-10 text-center text-sm text-[var(--color-text-muted)]">
          No posts yet — check back soon.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <Link
              key={p.id}
              href={`/blog/${p.slug}`}
              className="hover-lift flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-line)] bg-white"
            >
              {p.coverUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.coverUrl} alt="" className="h-40 w-full object-cover" />
              )}
              <div className="flex flex-1 flex-col p-5">
                {p.tags.length > 0 && (
                  <span className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[var(--color-primary)]">
                    {p.tags[0]}
                  </span>
                )}
                <h2 className="text-lg font-bold leading-snug text-[var(--color-text)]">{p.title}</h2>
                {p.excerpt && (
                  <p className="mt-2 line-clamp-3 text-sm text-[var(--color-text-muted)]">{p.excerpt}</p>
                )}
                <div className="mt-4 flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                  {p.author && <span>{p.author}</span>}
                  {p.publishedAt && (
                    <span>
                      ·{' '}
                      {new Date(p.publishedAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
