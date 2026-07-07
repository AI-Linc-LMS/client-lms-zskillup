'use client';

import { useState } from 'react';
import { CornerDownRight, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  addCommunityComment,
  deleteCommunityComment,
  likeCommunityComment,
  type CommunityCommentDto,
} from '@/lib/api/community';
import { CommunityAvatar, LikeButton, timeAgo } from './ui';

/** The full comment thread for a post: root comments, each with one reply level. */
export function CommentThread({
  postId,
  comments,
  onChanged,
}: {
  postId: string;
  comments: CommunityCommentDto[];
  onChanged: () => void;
}) {
  if (comments.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
        No comments yet. Start the conversation.
      </p>
    );
  }
  return (
    <div className="space-y-4">
      {comments.map((c) => (
        <CommentItem key={c.id} postId={postId} comment={c} onChanged={onChanged} depth={0} />
      ))}
    </div>
  );
}

function CommentItem({
  postId,
  comment,
  onChanged,
  depth,
}: {
  postId: string;
  comment: CommunityCommentDto;
  onChanged: () => void;
  depth: number;
}) {
  const [liked, setLiked] = useState(comment.likedByMe);
  const [likeCount, setLikeCount] = useState(comment.likeCount);
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [busy, setBusy] = useState(false);

  const toggleLike = async () => {
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    try {
      const res = await likeCommunityComment(comment.id);
      setLiked(res.liked);
      setLikeCount(res.likeCount);
    } catch {
      setLiked(!next);
      setLikeCount((c) => c + (next ? -1 : 1));
    }
  };

  const submitReply = async () => {
    if (replyText.trim().length === 0) return;
    setBusy(true);
    try {
      await addCommunityComment(postId, { body: replyText.trim(), parentId: comment.id });
      setReplyText('');
      setReplying(false);
      onChanged();
    } catch {
      toast.error('Could not post your reply.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm('Delete this comment?')) return;
    setBusy(true);
    try {
      await deleteCommunityComment(comment.id);
      onChanged();
    } catch {
      toast.error('Could not delete the comment.');
      setBusy(false);
    }
  };

  return (
    <div className={cn(depth > 0 && 'ml-6 border-l-2 border-slate-100 pl-4 sm:ml-8')}>
      <div className="flex items-start gap-2.5">
        <CommunityAvatar author={comment.author} className="size-8" />
        <div className="min-w-0 flex-1">
          <div className="rounded-2xl rounded-tl-sm bg-slate-50 px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-navy">{comment.author.name}</span>
              <span className="text-[11px] text-slate-400">{timeAgo(comment.createdAt)}</span>
            </div>
            <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{comment.body}</p>
          </div>
          <div className="mt-1 flex items-center gap-1 pl-1">
            <LikeButton liked={liked} count={likeCount} onToggle={toggleLike} size="sm" />
            {depth === 0 && (
              <button
                onClick={() => setReplying((r) => !r)}
                className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100"
              >
                <CornerDownRight className="size-3.5" /> Reply
              </button>
            )}
            {comment.canModerate && (
              <button
                onClick={remove}
                disabled={busy}
                className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-slate-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
              >
                <Trash2 className="size-3.5" />
              </button>
            )}
          </div>

          {replying && (
            <div className="mt-2 flex items-center gap-2">
              <input
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitReply()}
                placeholder={`Reply to ${comment.author.name}…`}
                className="flex-1 rounded-full border border-slate-200 px-3 py-1.5 text-sm shadow-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                autoFocus
              />
              <button
                onClick={submitReply}
                disabled={busy || !replyText.trim()}
                className="rounded-full bg-orange px-3 py-1.5 text-xs font-bold text-white hover:bg-orange/90 disabled:opacity-50"
              >
                {busy ? <Loader2 className="size-3.5 animate-spin" /> : 'Reply'}
              </button>
            </div>
          )}

          {/* Replies */}
          {comment.replies.length > 0 && (
            <div className="mt-3 space-y-3">
              {comment.replies.map((r) => (
                <CommentItem key={r.id} postId={postId} comment={r} onChanged={onChanged} depth={depth + 1} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
