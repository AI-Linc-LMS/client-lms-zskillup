'use client';

import { useState } from 'react';
import { BookOpen, Heart, HelpCircle, Megaphone, MessageSquare, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CommunityPostType } from '@/shared/enums';
import type { CommunityAuthorDto } from '@/lib/api/community';

export const POST_TYPES: Record<
  CommunityPostType,
  { label: string; icon: LucideIcon; color: string; chip: string }
> = {
  [CommunityPostType.DISCUSSION]: {
    label: 'Discussion',
    icon: MessageSquare,
    color: '#2563eb',
    chip: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  [CommunityPostType.QUESTION]: {
    label: 'Question',
    icon: HelpCircle,
    color: '#f37021',
    chip: 'bg-orange-50 text-orange-700 border-orange-200',
  },
  [CommunityPostType.RESOURCE]: {
    label: 'Resource',
    icon: BookOpen,
    color: '#059669',
    chip: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  [CommunityPostType.ANNOUNCEMENT]: {
    label: 'Announcement',
    icon: Megaphone,
    color: '#7c3aed',
    chip: 'bg-violet-50 text-violet-700 border-violet-200',
  },
};

export const POST_TYPE_LIST = Object.values(CommunityPostType);

/** Compact relative time — "just now", "3h", "2d", or a date. */
export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const secs = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (secs < 45) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function TypeBadge({ type }: { type: CommunityPostType }) {
  const t = POST_TYPES[type] ?? POST_TYPES[CommunityPostType.DISCUSSION];
  const Icon = t.icon;
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold', t.chip)}>
      <Icon className="size-3" /> {t.label}
    </span>
  );
}

export function CommunityAvatar({
  author,
  className,
}: {
  author: Pick<CommunityAuthorDto, 'name' | 'avatarUrl'>;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const initials = (author.name || '?').slice(0, 2).toUpperCase();
  return (
    <span
      className={cn(
        'grid shrink-0 place-items-center overflow-hidden rounded-full bg-navy text-xs font-bold text-white',
        className,
      )}
    >
      {author.avatarUrl && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={author.avatarUrl}
          alt={author.name}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="size-full object-cover"
        />
      ) : (
        initials
      )}
    </span>
  );
}

/** Heart like toggle with optimistic count. */
export function LikeButton({
  liked,
  count,
  onToggle,
  size = 'md',
}: {
  liked: boolean;
  count: number;
  onToggle: () => void;
  size?: 'sm' | 'md';
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-semibold transition-colors',
        size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm',
        liked ? 'bg-rose-50 text-rose-600' : 'text-slate-500 hover:bg-slate-100 hover:text-rose-500',
      )}
      aria-pressed={liked}
    >
      <Heart className={cn(size === 'sm' ? 'size-3.5' : 'size-4', liked && 'fill-rose-500 text-rose-500')} />
      {count > 0 && <span className="tabular-nums">{count}</span>}
    </button>
  );
}

/** A subtle role/college line under an author's name. */
export function AuthorMeta({ author, at }: { author: CommunityAuthorDto; at: string }) {
  const roleLabel =
    author.role === 'SUPER_ADMIN' || author.role === 'ADMIN'
      ? 'Staff'
      : author.role === 'COLLEGE_ADMIN'
        ? 'Placement Officer'
        : null;
  return (
    <p className="truncate text-xs text-slate-400">
      {author.collegeName ?? 'ZSkillup'} · {timeAgo(at)}
      {roleLabel && (
        <span className="ml-1.5 rounded bg-navy/10 px-1.5 py-0.5 text-[10px] font-bold text-navy">{roleLabel}</span>
      )}
    </p>
  );
}
