import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getPublicBlogs } from '@/lib/server/public-content';
import type { BlogPostDto } from '@/shared';
import RotatingText from '@/components/reactbits/RotatingText';
import ShinyText from '@/components/reactbits/ShinyText';
import CountUp from '@/components/reactbits/CountUp';
import SpotlightCard from '@/components/reactbits/SpotlightCard';
import { readingMinutes } from '@/components/blog/BlogContent';

export const revalidate = 300;

export const metadata = {
  title: 'Blog · ZSkillup',
  description: 'Placement prep insights, company-wise guides, coding patterns, and success stories.',
};

const HERO_TOPICS = ['DSA', 'aptitude', 'TCS NQT', 'interviews', 'resumes', 'company drives'];

function fmtDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function Meta({ post }: { post: BlogPostDto }) {
  const date = fmtDate(post.publishedAt);
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--color-text-muted)]">
      {post.author && <span className="font-medium text-[var(--color-text)]">{post.author}</span>}
      {date && <span>· {date}</span>}
      <span>· {readingMinutes(post.body)} min read</span>
    </div>
  );
}

function FeaturedCard({ post }: { post: BlogPostDto }) {
  return (
    <Link href={`/blog/${post.slug}`} className="group block">
      <SpotlightCard
        className="grid overflow-hidden rounded-[var(--radius-card-lg)] border border-[var(--color-line)] bg-white transition duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-lg)] lg:grid-cols-2"
        spotlightColor="rgba(245, 180, 0, 0.16)"
      >
        {post.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.coverUrl} alt="" className="h-60 w-full object-cover lg:h-full" />
        )}
        <div className="flex flex-col justify-center p-7 lg:p-10">
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-brand-strong)]">
            Featured{post.tags[0] ? ` · ${post.tags[0]}` : ''}
          </span>
          <h2 className="mt-3 text-2xl font-extrabold leading-tight tracking-tight text-[var(--color-text)] lg:text-3xl">
            {post.title}
          </h2>
          {post.excerpt && (
            <p className="mt-3 line-clamp-3 text-[15px] leading-relaxed text-[var(--color-text-muted)]">
              {post.excerpt}
            </p>
          )}
          <div className="mt-5">
            <Meta post={post} />
          </div>
          <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold text-[var(--color-text)] transition group-hover:text-[var(--color-brand-strong)]">
            Read guide <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </span>
        </div>
      </SpotlightCard>
    </Link>
  );
}

function BlogCard({ post }: { post: BlogPostDto }) {
  return (
    <Link href={`/blog/${post.slug}`} className="group block h-full">
      <SpotlightCard
        className="flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-line)] bg-white transition duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-lg)]"
        spotlightColor="rgba(245, 180, 0, 0.14)"
      >
        {post.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.coverUrl} alt="" className="h-44 w-full object-cover" />
        ) : (
          <div className="h-44 w-full bg-gradient-to-br from-[#141a2e] to-[#0a0a0c]" />
        )}
        <div className="flex flex-1 flex-col p-5">
          {post.tags[0] && (
            <span className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[var(--color-brand-strong)]">
              {post.tags[0]}
            </span>
          )}
          <h3 className="text-lg font-bold leading-snug text-[var(--color-text)]">{post.title}</h3>
          {post.excerpt && (
            <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-[var(--color-text-muted)]">
              {post.excerpt}
            </p>
          )}
          <div className="mt-auto pt-4">
            <Meta post={post} />
          </div>
        </div>
      </SpotlightCard>
    </Link>
  );
}

export default async function BlogIndexPage() {
  const posts = await getPublicBlogs();
  const [featured, ...rest] = posts;

  return (
    <main>
      {/* ── Full-width hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0a0a0c] via-[#0d0e13] to-[#141a2e] text-white">
        <div aria-hidden className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[#f5b400]/20 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-40 right-0 h-96 w-96 rounded-full bg-white/[0.06] blur-3xl" />
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.05]"
          style={{ backgroundImage: 'radial-gradient(rgb(255 255 255 / 0.8) 1px, transparent 1px)', backgroundSize: '22px 22px' }}
        />
        <div className="relative mx-auto max-w-[1400px] px-5 py-16 md:px-8 lg:py-24">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.08] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em]">
            <ShinyText text="The prephasz blog" speed={4} color="rgba(255,255,255,0.75)" shineColor="#ffffff" />
          </span>
          <h1 className="mt-5 max-w-3xl text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">
            Guides for cracking{' '}
            <RotatingText
              texts={HERO_TOPICS}
              mainClassName="inline-flex overflow-hidden py-1 -my-1 text-[#ffc42d]"
              staggerFrom="last"
              staggerDuration={0.02}
              rotationInterval={2000}
              splitBy="characters"
              transition={{ type: 'spring', damping: 26, stiffness: 340 }}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '-120%' }}
            />
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/70 sm:text-lg">
            Company-wise prep, coding patterns, aptitude shortcuts and interview playbooks — written by the
            team behind India&apos;s #1 campus prep platform.
          </p>
          {posts.length > 0 && (
            <p className="mt-8 text-sm font-semibold text-white/80">
              <CountUp to={posts.length} duration={1.6} className="num-tab text-[#ffc42d]" /> guides and counting
            </p>
          )}
        </div>
      </section>

      {posts.length === 0 ? (
        <div className="mx-auto max-w-[1400px] px-5 py-16 md:px-8">
          <p className="rounded-xl border border-[var(--color-line)] bg-white p-10 text-center text-sm text-[var(--color-text-muted)]">
            No posts yet - check back soon.
          </p>
        </div>
      ) : (
        <div className="mx-auto max-w-[1400px] px-5 py-14 md:px-8 lg:py-16">
          {featured && <FeaturedCard post={featured} />}
          {rest.length > 0 && (
            <>
              <h2 className="mb-6 mt-14 text-sm font-bold uppercase tracking-[0.14em] text-[var(--color-text-subtle)]">
                Latest guides
              </h2>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((p) => (
                  <BlogCard key={p.id} post={p} />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </main>
  );
}
