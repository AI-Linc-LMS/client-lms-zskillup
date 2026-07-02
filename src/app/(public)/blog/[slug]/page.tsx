import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getPublicBlog } from '@/lib/server/public-content';

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPublicBlog(slug);
  if (!post) return { title: 'Blog · ZSkillup' };
  return { title: `${post.title} · ZSkillup`, description: post.excerpt ?? undefined };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPublicBlog(slug);
  if (!post) notFound();

  return (
    <main className="mx-auto max-w-[760px] px-5 py-16 md:px-8">
      <Link
        href="/blog"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
      >
        <ArrowLeft className="h-4 w-4" /> All posts
      </Link>

      <article className="mt-6">
        {post.tags.length > 0 && (
          <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-primary)]">
            {post.tags.join(' · ')}
          </p>
        )}
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">{post.title}</h1>
        <div className="mt-3 flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
          {post.author && <span>{post.author}</span>}
          {post.publishedAt && (
            <span>
              ·{' '}
              {new Date(post.publishedAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          )}
        </div>
        {post.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.coverUrl} alt="" className="mt-6 w-full rounded-[var(--radius-card)] object-cover" />
        )}
        {/* Body is authored markdown/plain text; render with preserved whitespace. */}
        <div className="mt-6 whitespace-pre-wrap text-[15px] leading-relaxed text-[var(--color-text)]">
          {post.body}
        </div>
      </article>
    </main>
  );
}
