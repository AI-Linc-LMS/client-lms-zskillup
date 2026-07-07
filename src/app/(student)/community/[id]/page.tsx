'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ExternalLink, Loader2, MessageCircle, Pin, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import {
  addCommunityComment,
  deleteCommunityPost,
  getCommunityPost,
  likeCommunityPost,
  pinCommunityPost,
  type CommunityPostDetailDto,
} from '@/lib/api/community';
import { AuthorMeta, CommunityAvatar, LikeButton, safeHttpUrl, TypeBadge } from '@/components/community/ui';
import { CommentThread } from '@/components/community/CommentThread';

export default function CommunityPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [post, setPost] = useState<CommunityPostDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [comment, setComment] = useState('');
  const [posting, setPosting] = useState(false);

  const load = useCallback(async () => {
    try {
      const p = await getCommunityPost(id);
      setPost(p);
      setLiked(p.likedByMe);
      setLikeCount(p.likeCount);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleLike = async () => {
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    try {
      const res = await likeCommunityPost(id);
      setLiked(res.liked);
      setLikeCount(res.likeCount);
    } catch {
      setLiked(!next);
      setLikeCount((c) => c + (next ? -1 : 1));
    }
  };

  const submitComment = async () => {
    if (comment.trim().length === 0) return;
    setPosting(true);
    try {
      await addCommunityComment(id, { body: comment.trim() });
      setComment('');
      await load();
    } catch {
      toast.error('Could not post your comment.');
    } finally {
      setPosting(false);
    }
  };

  const removePost = async () => {
    if (!post || !window.confirm('Delete this post? This cannot be undone.')) return;
    try {
      await deleteCommunityPost(id);
      toast.success('Post deleted.');
      router.push('/community');
    } catch {
      toast.error('Could not delete the post.');
    }
  };

  const togglePin = async () => {
    if (!post) return;
    try {
      const updated = await pinCommunityPost(id, !post.isPinned);
      setPost({ ...post, isPinned: updated.isPinned });
      toast.success(updated.isPinned ? 'Pinned.' : 'Unpinned.');
    } catch {
      toast.error('Could not update pin.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-slate-400" />
      </div>
    );
  }
  if (error || !post) {
    return (
      <div className="py-24 text-center">
        <p className="text-sm text-slate-500">This post could not be found.</p>
        <Link href="/community" className="mt-3 inline-block text-sm font-semibold text-orange hover:underline">
          ← Back to community
        </Link>
      </div>
    );
  }

  const canPin = post.canPin;

  return (
    <div className="mx-auto max-w-3xl">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Community', href: '/community' },
          { label: post.title },
        ]}
      />
      <Link
        href="/community"
        className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-navy"
      >
        <ArrowLeft className="size-4" /> Back to community
      </Link>

      {/* Post */}
      <article className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-3">
          <CommunityAvatar author={post.author} className="size-11" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-bold text-navy">{post.author.name}</p>
              {post.isPinned && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-orange">
                  <Pin className="size-3" /> Pinned
                </span>
              )}
            </div>
            <AuthorMeta author={post.author} at={post.createdAt} />
          </div>
          <TypeBadge type={post.type} />
        </div>

        <h1 className="mt-4 text-2xl font-black leading-tight text-navy">{post.title}</h1>
        {post.body && (
          <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-slate-700">{post.body}</p>
        )}

        {safeHttpUrl(post.linkUrl) && (
          <a
            href={safeHttpUrl(post.linkUrl)!}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex max-w-full items-center gap-1.5 truncate rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
          >
            <ExternalLink className="size-4 shrink-0" /> <span className="truncate">{post.linkUrl}</span>
          </a>
        )}

        {post.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {post.tags.map((t) => (
              <Link
                key={t}
                href={`/community?tag=${encodeURIComponent(t)}`}
                className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500 hover:bg-slate-200"
              >
                #{t}
              </Link>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center gap-1 border-t border-slate-100 pt-3">
          <LikeButton liked={liked} count={likeCount} onToggle={toggleLike} />
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-slate-500">
            <MessageCircle className="size-4" /> {post.comments.length} comment{post.comments.length === 1 ? '' : 's'}
          </span>
          {canPin && (
            <button
              onClick={togglePin}
              className="ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold text-slate-400 hover:bg-orange/10 hover:text-orange"
              title={post.isPinned ? 'Unpin' : 'Pin'}
            >
              <Pin className="size-3.5" />
            </button>
          )}
          {post.canModerate && (
            <button
              onClick={removePost}
              className={cnMod(canPin)}
            >
              <Trash2 className="size-3.5" />
            </button>
          )}
        </div>
      </article>

      {/* Add comment */}
      <div className="mt-5 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <input
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submitComment()}
          placeholder="Write a comment…"
          className="flex-1 rounded-full border border-slate-200 px-4 py-2 text-sm shadow-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
        />
        <button
          onClick={submitComment}
          disabled={posting || !comment.trim()}
          className="inline-flex items-center gap-1.5 rounded-full bg-orange px-4 py-2 text-sm font-bold text-white hover:bg-orange/90 disabled:opacity-50"
        >
          {posting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Post
        </button>
      </div>

      {/* Comments */}
      <div className="mt-5">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-slate-400">
          {post.comments.length} comment{post.comments.length === 1 ? '' : 's'}
        </h2>
        <CommentThread postId={id} comments={post.comments} onChanged={load} />
      </div>
    </div>
  );
}

/** Delete button classes — pushed to the far right only when no pin button precedes it. */
function cnMod(hasPinBefore: boolean): string {
  return `${hasPinBefore ? '' : 'ml-auto '}inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold text-slate-400 hover:bg-red-50 hover:text-red-500`;
}
