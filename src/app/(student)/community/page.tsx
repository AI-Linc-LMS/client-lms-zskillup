'use client';

import { useCallback, useEffect, useState } from 'react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { Loader2, MessagesSquare, PenSquare, Search, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getCommunityStats,
  listCommunityPosts,
  type CommunityPostDto,
  type CommunityStatsDto,
} from '@/lib/api/community';
import { CommunityPostType } from '@/shared/enums';
import { PostCard } from '@/components/community/PostCard';
import { PostComposer } from '@/components/community/PostComposer';
import { POST_TYPES, POST_TYPE_LIST } from '@/components/community/ui';

const PAGE = 20;

export default function CommunityPage() {
  const [posts, setPosts] = useState<CommunityPostDto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [type, setType] = useState<string>('');
  const [sort, setSort] = useState<'recent' | 'top'>('recent');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [tag, setTag] = useState('');

  const [stats, setStats] = useState<CommunityStatsDto | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);

  const refreshStats = useCallback(() => {
    getCommunityStats().then(setStats).catch(() => {});
  }, []);
  useEffect(() => refreshStats(), [refreshStats]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    listCommunityPosts({
      type: type || undefined,
      tag: tag || undefined,
      search: debounced || undefined,
      sort,
      limit: PAGE,
      offset: 0,
    })
      .then((r) => {
        if (alive) {
          setPosts(r.posts);
          setTotal(r.total);
        }
      })
      .catch(() => alive && setPosts([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [type, sort, debounced, tag]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const r = await listCommunityPosts({
        type: type || undefined,
        tag: tag || undefined,
        search: debounced || undefined,
        sort,
        limit: PAGE,
        offset: posts.length,
      });
      setPosts((p) => [...p, ...r.posts]);
      setTotal(r.total);
    } finally {
      setLoadingMore(false);
    }
  };

  const typeTabs = [{ key: '', label: 'All' }, ...POST_TYPE_LIST.map((t) => ({ key: t, label: POST_TYPES[t].label }))];

  return (
    <div>
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Community' }]} />

      <div className="mt-2 grid gap-6 xl:grid-cols-[1fr_18rem]">
        <div className="min-w-0 space-y-5">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-navy">
                <MessagesSquare className="size-6 text-orange" /> Community
              </h1>
              <p className="mt-0.5 text-sm text-slate-500">
                Ask, share, and discuss with fellow learners across ZSkillup.
              </p>
            </div>
            <button
              onClick={() => setComposerOpen(true)}
              className="inline-flex items-center gap-2 rounded-full bg-orange px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-orange/90"
            >
              <PenSquare className="size-4" /> New post
            </button>
          </div>

          {/* Prompt card */}
          <button
            onClick={() => setComposerOpen(true)}
            className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 text-left shadow-sm transition-colors hover:border-orange/40"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-orange/10 text-orange">
              <PenSquare className="size-4" />
            </span>
            <span className="text-sm text-slate-400">Start a discussion, ask a question, share a resource…</span>
          </button>

          {/* Filters */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {typeTabs.map((t) => (
                <button
                  key={t.key || 'all'}
                  onClick={() => setType(t.key)}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-sm font-semibold transition-colors',
                    type === t.key ? 'bg-navy text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200',
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[200px] flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search posts…"
                  className="w-full rounded-full border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm shadow-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                />
              </div>
              <div className="inline-flex gap-1 rounded-full bg-slate-100 p-1">
                {(['recent', 'top'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSort(s)}
                    className={cn(
                      'rounded-full px-3 py-1 text-xs font-bold capitalize transition-colors',
                      sort === s ? 'bg-white text-navy shadow-sm' : 'text-slate-500',
                    )}
                  >
                    {s === 'top' ? 'Top' : 'Recent'}
                  </button>
                ))}
              </div>
            </div>
            {tag && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                Filtering by
                <span className="rounded-full bg-orange/10 px-2 py-0.5 font-bold text-orange">#{tag}</span>
                <button onClick={() => setTag('')} className="text-xs font-semibold text-slate-400 underline hover:text-navy">
                  clear
                </button>
              </div>
            )}
          </div>

          {/* Feed */}
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-40 animate-pulse rounded-2xl bg-slate-100" />
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
              <MessagesSquare className="mx-auto size-10 text-slate-300" />
              <p className="mt-3 text-sm text-slate-500">
                {search || tag || type ? 'No posts match your filters.' : 'No posts yet — be the first to start a discussion!'}
              </p>
              <button
                onClick={() => setComposerOpen(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-orange px-4 py-2 text-sm font-bold text-white hover:bg-orange/90"
              >
                <PenSquare className="size-4" /> Create a post
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {posts.map((p) => (
                <PostCard key={p.id} post={p} onDeleted={(id) => setPosts((prev) => prev.filter((x) => x.id !== id))} />
              ))}
              {posts.length < total && (
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="mx-auto flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-50"
                >
                  {loadingMore ? <Loader2 className="size-4 animate-spin" /> : null} Load more
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right rail */}
        <aside className="hidden space-y-4 xl:block">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Community</h2>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <Stat label="Posts" value={stats?.totalPosts ?? 0} />
              <Stat label="Replies" value={stats?.totalComments ?? 0} />
              <Stat label="Members" value={stats?.totalMembers ?? 0} />
            </div>
          </div>

          {stats && stats.topTags.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-slate-400">
                <Sparkles className="size-3.5" /> Popular tags
              </h2>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {stats.topTags.map((t) => (
                  <button
                    key={t.tag}
                    onClick={() => setTag(t.tag)}
                    className={cn(
                      'rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors',
                      tag === t.tag
                        ? 'border-orange bg-orange/10 text-orange'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50',
                    )}
                  >
                    #{t.tag} <span className="text-slate-400">{t.count}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-navy to-indigo-900 p-4 text-white shadow-sm">
            <h2 className="text-sm font-black">Be kind & helpful</h2>
            <p className="mt-1 text-xs leading-relaxed text-white/70">
              Keep it respectful, stay on topic, and give credit when you share resources. Great answers earn likes.
            </p>
          </div>
        </aside>
      </div>

      <PostComposer
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        onCreated={(post) => {
          setPosts((p) => [post, ...p]);
          setTotal((t) => t + 1);
          refreshStats();
        }}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-slate-50 py-2">
      <p className="text-lg font-black text-navy tabular-nums">{value.toLocaleString()}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
}
