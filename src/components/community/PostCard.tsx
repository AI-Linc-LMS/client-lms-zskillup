'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ExternalLink, MessageCircle, Pin, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  deleteCommunityPost,
  likeCommunityPost,
  type CommunityPostDto,
} from '@/lib/api/community';
import { AuthorMeta, CommunityAvatar, LikeButton, safeHttpUrl, TypeBadge } from './ui';

/** One post in the feed. Title/body link to the detail thread; like + delete are inline. */
export function PostCard({
  post,
  onDeleted,
}: {
  post: CommunityPostDto;
  onDeleted?: (id: string) => void;
}) {
  const [liked, setLiked] = useState(post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [busy, setBusy] = useState(false);

  const toggleLike = async () => {
    // optimistic
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    try {
      const res = await likeCommunityPost(post.id);
      setLiked(res.liked);
      setLikeCount(res.likeCount);
    } catch {
      setLiked(!next);
      setLikeCount((c) => c + (next ? -1 : 1));
      toast.error('Could not update your like.');
    }
  };

  const remove = async () => {
    if (!window.confirm('Delete this post?')) return;
    setBusy(true);
    try {
      await deleteCommunityPost(post.id);
      toast.success('Post deleted.');
      onDeleted?.(post.id);
    } catch {
      toast.error('Could not delete the post.');
      setBusy(false);
    }
  };

  return (
    <article
      className={cn(
        'rounded-2xl border bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5',
        post.isPinned ? 'border-orange/40 ring-1 ring-orange/20' : 'border-slate-200',
      )}
    >
      <div className="flex items-start gap-3">
        <CommunityAvatar author={post.author} className="size-10" />
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

      <Link href={`/community/${post.id}`} className="mt-3 block">
        <h3 className="text-lg font-black leading-snug text-navy hover:text-orange">{post.title}</h3>
        {post.body && (
          <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
            {post.body}
          </p>
        )}
      </Link>

      {safeHttpUrl(post.linkUrl) && (
        <a
          href={safeHttpUrl(post.linkUrl)!}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex max-w-full items-center gap-1.5 truncate rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
        >
          <ExternalLink className="size-3.5 shrink-0" /> <span className="truncate">{post.linkUrl}</span>
        </a>
      )}

      {post.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {post.tags.map((t) => (
            <span key={t} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
              #{t}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center gap-1 border-t border-slate-100 pt-2">
        <LikeButton liked={liked} count={likeCount} onToggle={toggleLike} />
        <Link
          href={`/community/${post.id}`}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-slate-500 hover:bg-slate-100"
        >
          <MessageCircle className="size-4" /> {post.commentCount > 0 && <span>{post.commentCount}</span>}
          <span className={post.commentCount > 0 ? 'sr-only' : ''}>Comment</span>
        </Link>
        {post.canModerate && (
          <button
            onClick={remove}
            disabled={busy}
            className="ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold text-slate-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
          >
            <Trash2 className="size-3.5" />
          </button>
        )}
      </div>
    </article>
  );
}
