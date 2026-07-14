import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, Clock } from 'lucide-react';
import { getPublicBlog, getPublicBlogs } from '@/lib/server/public-content';
import type { BlogPostDto } from '@/shared';
import ShinyText from '@/components/reactbits/ShinyText';
import SpotlightCard from '@/components/reactbits/SpotlightCard';
import { BlogContent, readingMinutes } from '@/components/blog/BlogContent';

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPublicBlog(slug);
  if (!post) return { title: 'Blog · ZSkillup' };
  return {
    title: `${post.title} · ZSkillup`,
    description: post.excerpt ?? undefined,
    openGraph: post.coverUrl ? { images: [{ url: post.coverUrl }] } : undefined,
  };
}

function fmtDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function RelatedCard({ post }: { post: BlogPostDto }) {
  return (
    <Link href={`/blog/${post.slug}`} className="group block h-full">
      <SpotlightCard
        className="flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-line)] bg-white transition duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-lg)]"
        spotlightColor="rgba(245, 180, 0, 0.14)"
      >
        {post.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.coverUrl} alt="" className="h-36 w-full object-cover" />
        ) : (
          <div className="h-36 w-full bg-gradient-to-br from-[#141a2e] to-[#0a0a0c]" />
        )}
        <div className="flex flex-1 flex-col p-5">
          {post.tags[0] && (
            <span className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[var(--color-brand-strong)]">
              {post.tags[0]}
            </span>
          )}
          <h3 className="text-base font-bold leading-snug text-[var(--color-text)]">{post.title}</h3>
          <span className="mt-auto pt-4 text-xs text-[var(--color-text-muted)]">
            {readingMinutes(post.body)} min read
          </span>
        </div>
      </SpotlightCard>
    </Link>
  );
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [post, all] = await Promise.all([getPublicBlog(slug), getPublicBlogs()]);
  if (!post) notFound();

  const date = fmtDate(post.publishedAt);
  const mins = readingMinutes(post.body);

  // Related: same-tag first, then fill with latest others.
  const others = all.filter((p) => p.slug !== post.slug);
  const sameTag = others.filter((p) => p.tags.some((t) => post.tags.includes(t)));
  const related = [...sameTag, ...others.filter((p) => !sameTag.includes(p))].slice(0, 3);

  return (
    <main>
      {/* ── Full-width magazine hero (cover as dimmed banner) ────────────── */}
      <section className="relative flex min-h-[52vh] items-end overflow-hidden bg-[#0a0a0c] text-white">
        {post.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-45" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/85 to-[#0a0a0c]/30" />
        <div className="relative mx-auto w-full max-w-[900px] px-5 pb-12 pt-28 md:px-8">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-white/70 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> All guides
          </Link>
          <div className="mt-6">
            {post.tags[0] && (
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.08] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em]">
                <ShinyText text={post.tags[0]} speed={4} color="rgba(255,255,255,0.78)" shineColor="#ffc42d" />
              </span>
            )}
            <h1 className="mt-4 max-w-3xl text-3xl font-extrabold leading-[1.12] tracking-tight sm:text-4xl lg:text-[2.9rem]">
              {post.title}
            </h1>
            <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/70">
              {post.author && <span className="font-semibold text-white">{post.author}</span>}
              {date && <span>· {date}</span>}
              <span className="inline-flex items-center gap-1.5">
                · <Clock className="h-3.5 w-3.5" /> {mins} min read
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Article body (readable column) ──────────────────────────────── */}
      <article className="mx-auto max-w-[820px] px-5 py-14 md:px-8">
        {post.excerpt && (
          <p className="mb-10 border-l-2 border-[var(--color-brand)] pl-5 text-lg font-medium leading-relaxed text-[var(--color-text)] sm:text-xl">
            {post.excerpt}
          </p>
        )}
        <BlogContent markdown={post.body} />

        {/* Inline product CTA */}
        <div className="mt-14 overflow-hidden rounded-[var(--radius-card-lg)] border border-[var(--color-line)] bg-gradient-to-br from-[#0a0a0c] via-[#0d0e13] to-[#141a2e] p-7 text-white sm:p-9">
          <h3 className="text-xl font-extrabold tracking-tight">Put this into practice</h3>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/70">
            Drill these exact patterns with adaptive practice, timed mocks and company-wise drives on prephasz.
          </p>
          <Link
            href="/signup"
            className="btn-brand mt-5 inline-flex rounded-full px-6 py-3 text-sm"
          >
            Start practising free <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </article>

      {/* ── Related ─────────────────────────────────────────────────────── */}
      {related.length > 0 && (
        <section className="border-t border-[var(--color-line)] bg-[var(--color-bg)]">
          <div className="mx-auto max-w-[1400px] px-5 py-14 md:px-8">
            <h2 className="mb-6 text-sm font-bold uppercase tracking-[0.14em] text-[var(--color-text-subtle)]">
              Keep reading
            </h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => (
                <RelatedCard key={p.id} post={p} />
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
